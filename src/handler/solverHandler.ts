// @ts-ignore
import SearchWorker from '../core/search/searchWorker.js?worker';
import { useStore } from '../state/store';
import type { RealSolverResult } from '../state/store';

let searchWorker: Worker | null = null;

export function initWorker(rawData: any) {
  if (searchWorker) return;

  try {
    searchWorker = new SearchWorker();
    searchWorker.postMessage({
      type: 'init',
      data: rawData
    });

    searchWorker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'ready') {
        console.log('Search worker initialized successfully and ready.');
      }
    };
  } catch (error) {
    console.error('Failed to initialize search worker:', error);
  }
}

export function solveArmorSets() {
  const store = useStore.getState();
  const {
    targetSkills,
    weaponSlots,
    selectedSetBonuses,
    selectedGroupSkills,
    selectedWeaponSkills,
    dataIndex,
    isLoading,
    maxResults,
    includeTranscend,
    rankFilter,
    searchAllDecos,
    customDecoLimits
  } = store;

  if (isLoading || !dataIndex || !searchWorker) return;

  const activeSkillsCount = targetSkills.filter((s) => s.level > 0).length;
  if (activeSkillsCount === 0) return;

  store.setIsLoading(true);

  // Cancel any running search before starting a new one
  searchWorker.postMessage({ type: 'cancel' });

  // Map inputs to required parameters
  const requiredSkills: Array<{ skillId: number; level: number }> = [];
  for (const reqSkill of targetSkills) {
    if (reqSkill.level <= 0) continue;
    const match = dataIndex.skillByName.get(reqSkill.name.toLowerCase());
    if (match) {
      requiredSkills.push({ skillId: match.id, level: reqSkill.level });
    }
  }

  const activeWeaponSlots = weaponSlots.filter((s) => s > 0);

  // Resolve weapon setId from the selected set bonus skill name
  // This mirrors how cli.js resolves weapon.setName → setId
  let weaponSetId: number | null = null;
  if (selectedSetBonuses.length > 0) {
    const setBonusSkill = dataIndex.skillByName.get(selectedSetBonuses[0].toLowerCase());
    if (setBonusSkill) {
      for (const [setId, armorSet] of dataIndex.setById) {
        if (armorSet.setBonus && armorSet.setBonus.skillId === setBonusSkill.id) {
          weaponSetId = setId;
          break;
        }
      }
    }
  }

  // Pass group skills as plain weapon skills (no setPiecesRequired)
  // The set/group bonus tracking is handled automatically via weapon.setId
  const weaponSkills: Array<{ skillId: number; level: number }> = [];
  if (selectedGroupSkills.length > 0) {
    const match = dataIndex.skillByName.get(selectedGroupSkills[0].toLowerCase());
    if (match) {
      weaponSkills.push({ skillId: match.id, level: 1 });
    }
  }

  // Pass selected regular weapon skills
  if (selectedWeaponSkills && selectedWeaponSkills.length > 0) {
    for (const wSkill of selectedWeaponSkills) {
      if (wSkill.level <= 0) continue;
      const match = dataIndex.skillByName.get(wSkill.name.toLowerCase());
      if (match) {
        weaponSkills.push({ skillId: match.id, level: wSkill.level });
      }
    }
  }

  const weapon = {
    id: 9999,
    name: 'Custom Weapon',
    slots: activeWeaponSlots,
    skills: weaponSkills,
    setId: weaponSetId,
  };

  const params = {
    requiredSkills,
    weapon,
    charm: 'search', // default to search charm mode
    rankFilter: rankFilter || 'all',
    includeTranscend: includeTranscend !== false,
    customDecoLimits: searchAllDecos ? null : customDecoLimits,
    maxResults: maxResults || 10,
  };

  // Local accumulator to collect results from the worker
  const resultsAccumulator: RealSolverResult[] = [];

  // Override message handler for this solve request
  searchWorker.onmessage = (e) => {
    const msg = e.data;

    switch (msg.type) {
      case 'result':
        resultsAccumulator.push(msg.result);
        break;

      case 'done': {
        const finalResults = resultsAccumulator.map((res, index) => ({
          ...res,
          id: index + 1,
        }));

        store.setResults(finalResults);
        store.setSearchSummary({
          elapsed: msg.elapsed,
          totalSearched: msg.totalSearched,
        });
        store.setIsLoading(false);
        break;
      }

      case 'error':
        console.error('Worker solver error:', msg.message);
        store.setIsLoading(false);
        break;

      case 'cancelled':
        console.log('Worker search cancelled.');
        break;
    }
  };

  // Post search query to worker
  searchWorker.postMessage({ type: 'search', params });
}
