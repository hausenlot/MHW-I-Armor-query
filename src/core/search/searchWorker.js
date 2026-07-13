/**
 * Search Web Worker
 * Runs the armor set solver off the main thread.
 * 
 * Protocol:
 *   Main → Worker: { type: 'init', data } | { type: 'search', params } | { type: 'cancel' }
 *   Worker → Main: { type: 'ready' } | { type: 'progress', ... } | { type: 'result', ... } | { type: 'done', ... }
 */

import { buildIndex } from '../data/dataIndex.js';
import { solve } from './solver.js';

let index = null;
let cancelled = false;

self.onmessage = function (e) {
  const msg = e.data;

  switch (msg.type) {
    case 'init': {
      // Build indices from received data
      index = buildIndex(msg.data);
      self.postMessage({ type: 'ready' });
      break;
    }

    case 'search': {
      if (!index) {
        self.postMessage({ type: 'error', message: 'Worker not initialized' });
        return;
      }

      cancelled = false;
      const params = msg.params;

      // Use custom weapon config
      let weapon = params.weapon || null;

      // Resolve charm
      let charm = params.charm || null;

      const searchParams = {
        requiredSkills: params.requiredSkills,
        weapon,
        charm,
        rankFilter: params.rankFilter || 'all',
        maxResults: params.maxResults || 50,
      };

      const results = [];

      const { totalFound, elapsed, totalSearched } = solve(
        searchParams,
        index,
        // onResult
        (result) => {
          if (cancelled) return;
          results.push(result);
          self.postMessage({ type: 'result', result, index: results.length });
        },
        // onProgress
        (searched, total, found) => {
          if (cancelled) return;
          self.postMessage({ type: 'progress', searched, total, found });
        }
      );

      if (!cancelled) {
        self.postMessage({
          type: 'done',
          totalFound,
          elapsed: Math.round(elapsed),
          totalSearched,
        });
      }
      break;
    }

    case 'cancel': {
      cancelled = true;
      self.postMessage({ type: 'cancelled' });
      break;
    }
  }
};
