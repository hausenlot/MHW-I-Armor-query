/**
 * Armor Set Solver
 * Constraint propagation + branch-and-bound search.
 * Finds armor combinations that satisfy skill requirements.
 */

import { tryFillWithDecos, canDecosReachTarget } from './decoFiller.js';

/**
 * @typedef {Object} SearchParams
 * @property {Array<{skillId: number, level: number}>} requiredSkills
 * @property {Object|null} weapon - selected weapon object
 * @property {Object|null} charm - selected charm rank { skills: [{skillId, level}] }
 * @property {string} rankFilter - "all" | "low" | "high"
 * @property {number} maxResults
 */

/**
 * Run the armor set search.
 * @param {SearchParams} params
 * @param {Object} index - data index from dataIndex.js
 * @param {Function} onResult - callback(result) for each found set
 * @param {Function} onProgress - callback(searched, total) for progress
 * @returns {Object} { totalFound, elapsed }
 */
function solveSingle(params, index, onResult, onProgress) {
  const startTime = performance.now();
  const { requiredSkills, weapon, charm, rankFilter, includeTranscend, customDecoLimits, maxResults } = params;

  // ─── STEP 1: Compute initial skill needs ──────────────────────────
  const skillNeeds = new Map();
  for (const { skillId, level } of requiredSkills) {
    skillNeeds.set(skillId, level);
  }

  // ─── STEP 2: Subtract weapon's innate skills ─────────────────────
  if (weapon && weapon.skills) {
    for (const { skillId, level } of weapon.skills) {
      if (skillNeeds.has(skillId)) {
        skillNeeds.set(skillId, Math.max(0, skillNeeds.get(skillId) - level));
      }
    }
  }

  // ─── STEP 3: Subtract charm's skills ──────────────────────────────
  if (charm && charm.skills) {
    for (const { skillId, level } of charm.skills) {
      if (skillNeeds.has(skillId)) {
        skillNeeds.set(skillId, Math.max(0, skillNeeds.get(skillId) - level));
      }
    }
  }

  // Clean up fully satisfied skills
  for (const [skillId, level] of skillNeeds) {
    if (level <= 0) skillNeeds.delete(skillId);
  }

  // If all skills already satisfied by weapon + charm
  if (skillNeeds.size === 0) {
    const result = buildResult([], weapon, charm, requiredSkills, index, [], [], includeTranscend);
    onResult(result);
    return { totalFound: 1, elapsed: performance.now() - startTime };
  }

  // ─── STEP 4: Weapon decoration slots ──────────────────────────────
  const weaponSlots = weapon ? [...(weapon.slots || [])] : [];

  // ─── STEP 5: Build candidate lists per armor slot ─────────────────
  const SLOT_ORDER = ['head', 'chest', 'arms', 'waist', 'legs'];
  const candidates = {};
  const desiredSkillIds = new Set(skillNeeds.keys());
  // Also add original required skills that might have been partially satisfied
  for (const { skillId } of requiredSkills) {
    desiredSkillIds.add(skillId);
  }

  for (const slot of SLOT_ORDER) {
    const allPieces = index.armorBySlot.get(slot) || [];

    candidates[slot] = allPieces.filter(piece => {
      // Rank filter
      if (rankFilter !== 'all' && piece.rank !== rankFilter) return false;

      // Must contribute something useful: relevant skill OR deco slots
      const hasRelevantSkill = piece.skills.some(s =>
        desiredSkillIds.has(s.skillId) && (s.setPiecesRequired == null)
      );
      const pieceSlots = includeTranscend ? piece.slots : (piece.originalSlots || piece.slots);
      const hasDecoSlots = pieceSlots.length > 0;

      // Also include pieces from sets that have bonuses for desired skills
      let hasRelevantSetBonus = false;
      if (piece.setId) {
        const armorSet = index.setById.get(piece.setId);
        if (armorSet) {
          if (armorSet.setBonus) {
            // Check if the set bonus skill is desired
            const bonusSkillId = armorSet.setBonus.skillId;
            if (desiredSkillIds.has(bonusSkillId)) hasRelevantSetBonus = true;
          }
          if (armorSet.groupBonus) {
            const bonusSkillId = armorSet.groupBonus.skillId;
            if (desiredSkillIds.has(bonusSkillId)) hasRelevantSetBonus = true;
          }
        }
      }

      return hasRelevantSkill || hasDecoSlots || hasRelevantSetBonus;
    });

    // Sort by relevance score (more desired skills = higher priority)
    candidates[slot].sort((a, b) => {
      const aScore = a.skills.reduce((sum, s) =>
        sum + (desiredSkillIds.has(s.skillId) && s.setPiecesRequired == null ? s.level : 0), 0);
      const bScore = b.skills.reduce((sum, s) =>
        sum + (desiredSkillIds.has(s.skillId) && s.setPiecesRequired == null ? s.level : 0), 0);
      return bScore - aScore;
    });

    // Prune strictly worse pieces to dramatically optimize combination space
    candidates[slot] = pruneSubsumedPieces(candidates[slot], desiredSkillIds, index, includeTranscend);
  }

  // ─── STEP 6: Precomputations for pruning ───────────────────────────
  // Precompute max future armor points for each slotIndex and skillId
  const maxFutureArmorPoints = SLOT_ORDER.map((slot, slotIdx) => {
    const pointsMap = new Map();
    for (const skillId of desiredSkillIds) {
      let maxPoints = 0;
      for (let i = slotIdx + 1; i < SLOT_ORDER.length; i++) {
        const futureSlot = SLOT_ORDER[i];
        let maxInSlot = 0;
        for (const fp of candidates[futureSlot]) {
          const match = fp.skills.find(s => s.skillId === skillId && s.setPiecesRequired == null);
          if (match && match.level > maxInSlot) {
            maxInSlot = match.level;
          }
        }
        maxPoints += maxInSlot;
      }
      pointsMap.set(skillId, maxPoints);
    }
    return pointsMap;
  });

  // Precompute max future set pieces for each slotIndex and skillId
  const maxFutureSetPieces = SLOT_ORDER.map((slot, slotIdx) => {
    const piecesMap = new Map();
    for (const skillId of desiredSkillIds) {
      let maxPoints = 0;
      for (let i = slotIdx + 1; i < SLOT_ORDER.length; i++) {
        const futureSlot = SLOT_ORDER[i];
        let maxInSlot = 0;
        for (const fp of candidates[futureSlot]) {
          if (fp.contributesToSetSkills && fp.contributesToSetSkills.includes(skillId)) {
            maxInSlot = 1;
          }
        }
        maxPoints += maxInSlot;
      }
      piecesMap.set(skillId, maxPoints);
    }
    return piecesMap;
  });

  // Precompute decoration properties for each skillId
  const bestDecoForSkill = new Map();
  for (const skillId of desiredSkillIds) {
    let decos = index.decoBySkill.get(skillId) || [];
    if (customDecoLimits) {
      decos = decos.filter(d => (customDecoLimits[d.id] || 0) > 0);
    }
    let bestDecoLevel = 0;
    let bestDecoSlot = 99;
    for (const d of decos) {
      const l = d.skills.find(s => s.skillId === skillId)?.level || 0;
      if (l > bestDecoLevel) {
        bestDecoLevel = l;
        bestDecoSlot = d.slot;
      } else if (l === bestDecoLevel && d.slot < bestDecoSlot) {
        bestDecoSlot = d.slot;
      }
    }
    bestDecoForSkill.set(skillId, { bestDecoLevel, bestDecoSlot });
  }

  // Precompute max future slots of level >= 3, >= 2, >= 1
  // maxFutureSlotsGTE[slotIndex][level]
  const maxFutureSlotsGTE = SLOT_ORDER.map((slot, slotIdx) => {
    const slotsMap = new Map();
    for (const level of [1, 2, 3]) {
      let maxCount = 0;
      for (let i = slotIdx + 1; i < SLOT_ORDER.length; i++) {
        const futureSlot = SLOT_ORDER[i];
        let maxInSlot = 0;
        for (const fp of candidates[futureSlot]) {
          const fpSlots = includeTranscend ? fp.slots : (fp.originalSlots || fp.slots);
          const count = fpSlots.filter(s => s >= level).length;
          if (count > maxInSlot) maxInSlot = count;
        }
        maxCount += maxInSlot;
      }
      slotsMap.set(level, maxCount);
    }
    return slotsMap;
  });

  // ─── STEP 6.5: Set requirement precomputations ────────────────────
  const requiredSetSkills = new Map(); // skillId -> piecesRequired
  for (const [skillId, level] of skillNeeds) {
    const skill = index.skillById.get(skillId);
    if (!skill || !skill.ranks) continue;
    const rank = skill.ranks.find(r => r.level === level);
    if (!rank || rank.setPiecesRequired == null) continue;
    requiredSetSkills.set(skillId, rank.setPiecesRequired);
  }

  // ─── STEP 7: Branch and bound ─────────────────────────────────────
  let totalFound = 0;
  let totalSearched = 0;
  const totalCombinations = SLOT_ORDER.reduce((t, slot) =>
    t * (candidates[slot].length || 1), 1);
  const progressInterval = Math.max(1, Math.floor(totalCombinations / 100));

  const currentSkills = new Int32Array(1000);
  const currentSetIdCounts = new Int32Array(1000);
  const currentSetSkillCounts = new Int32Array(1000);
  const currentArmorSlots = [];
  const chosenPieces = [];

  let currentSlots3 = 0;
  let currentSlots2 = 0;
  let currentSlots1 = 0;

  let weaponSlots3 = 0;
  let weaponSlots2 = 0;
  let weaponSlots1 = 0;
  if (weapon && weapon.slots) {
    for (const s of weapon.slots) {
      if (s >= 3) { weaponSlots3++; weaponSlots2++; weaponSlots1++; }
      else if (s >= 2) { weaponSlots2++; weaponSlots1++; }
      else if (s >= 1) { weaponSlots1++; }
    }
  }

  if (weapon) {
    if (weapon.setId) {
      currentSetIdCounts[weapon.setId] = 1;
      const set = index.setById.get(weapon.setId);
      if (set) {
        if (set.setBonus) currentSetSkillCounts[set.setBonus.skillId] = 1;
        if (set.groupBonus) currentSetSkillCounts[set.groupBonus.skillId] = 1;
      }
    }
    if (weapon.skills) {
      for (const s of weapon.skills) {
        if (s.setPiecesRequired != null) {
          currentSetSkillCounts[s.skillId] = 1;
        }
      }
    }
  }

  function branch(slotIndex) {
    if (totalFound >= maxResults) return;

    if (slotIndex === SLOT_ORDER.length) {
      // All 5 armor pieces chosen — try deco filling
      totalSearched++;

      if (totalSearched % progressInterval === 0) {
        onProgress(totalSearched, totalCombinations, totalFound);
      }

      // Compute remaining needs
      const remaining = new Map();
      for (const [skillId, level] of skillNeeds) {
        const achieved = currentSkills[skillId];
        if (achieved < level) {
          remaining.set(skillId, level - achieved);
        }
      }

      // Also apply set/group bonuses
      const bonusSkills = [];
      for (let skillId = 0; skillId < currentSetSkillCounts.length; skillId++) {
        const count = currentSetSkillCounts[skillId];
        if (count === 0) continue;

        const skill = index.skillById.get(skillId);
        if (!skill || !skill.ranks) continue;

        let highestActiveRank = null;
        for (const rank of skill.ranks) {
          if (rank.setPiecesRequired != null && count >= rank.setPiecesRequired) {
            if (!highestActiveRank || rank.level > highestActiveRank.level) {
              highestActiveRank = rank;
            }
          }
        }

        if (highestActiveRank) {
          bonusSkills.push({
            skillId,
            skillName: skill.name,
            level: highestActiveRank.level,
            description: highestActiveRank.description,
            isSetBonus: skill.kind === 'set',
            isGroupBonus: skill.kind === 'group',
            piecesRequired: highestActiveRank.setPiecesRequired,
          });
        }
      }

      for (const { skillId, level } of bonusSkills) {
        if (remaining.has(skillId)) {
          remaining.set(skillId, Math.max(0, remaining.get(skillId) - level));
        }
      }

      // Clean up
      for (const [sid, slevel] of remaining) {
        if (slevel <= 0) remaining.delete(sid);
      }

      const result = tryFillWithDecos(
        remaining,
        currentArmorSlots,
        weaponSlots,
        index.decoBySkill,
        customDecoLimits
      );

      if (result && result.success) {
        totalFound++;
        const fullResult = buildResult(
          chosenPieces, weapon, charm, requiredSkills, index,
          result.decoAssignments, bonusSkills, includeTranscend
        );
        onResult(fullResult);
      }

      return;
    }

    const slot = SLOT_ORDER[slotIndex];
    const pieces = candidates[slot];

    for (const piece of pieces) {
      if (totalFound >= maxResults) return;

      const pieceSlots = includeTranscend ? piece.slots : (piece.originalSlots || piece.slots);

      // ─── PUSH / MUTATE ──────────────────────────────────────────
      // Add piece's skills
      for (const s of piece.skills) {
        if (s.setPiecesRequired != null) continue;
        currentSkills[s.skillId] += s.level;
      }

      // Add slots
      for (const s of pieceSlots) {
        currentArmorSlots.push(s);
        if (s >= 3) { currentSlots3++; currentSlots2++; currentSlots1++; }
        else if (s >= 2) { currentSlots2++; currentSlots1++; }
        else if (s >= 1) { currentSlots1++; }
      }

      // Track set pieces
      if (piece.setId) {
        currentSetIdCounts[piece.setId]++;
      }
      for (const skillId of piece.contributesToSetSkills || []) {
        currentSetSkillCounts[skillId]++;
      }

      chosenPieces.push(piece);

      // ─── PRUNING ──────────────────────────────────────────────
      let isPossible = true;

      // 1. Set piece count check (Prune early before heavy skill loops)
      if (requiredSetSkills.size > 0) {
        for (const [skillId, piecesRequired] of requiredSetSkills) {
          const currentSetCount = currentSetSkillCounts[skillId] || 0;
          const maxFuture = maxFutureSetPieces[slotIndex].get(skillId) || 0;
          if (currentSetCount + maxFuture < piecesRequired) {
            isPossible = false;
            break;
          }
        }
      }

      let neededDecos3 = 0;
      let neededDecos2 = 0;
      let neededDecos1 = 0;

      for (const [skillId, level] of skillNeeds) {
        const achieved = currentSkills[skillId];
        if (achieved >= level) continue;

        const needed = level - achieved;

        // 1. Max future armor points
        const futureArmorPoints = maxFutureArmorPoints[slotIndex].get(skillId) || 0;

        // 2. Set bonus points
        let futureSetBonusPoints = 0;
        const potentialPieces = (currentSetSkillCounts[skillId] || 0) + (maxFutureSetPieces[slotIndex].get(skillId) || 0);
        const skill = index.skillById.get(skillId);
        if (skill && skill.ranks) {
          for (const r of skill.ranks) {
            if (r.setPiecesRequired != null && potentialPieces >= r.setPiecesRequired) {
              futureSetBonusPoints = Math.max(futureSetBonusPoints, r.level);
            }
          }
        }

        const remainingPointsToFillWithDecos = needed - futureArmorPoints - futureSetBonusPoints;
        if (remainingPointsToFillWithDecos > 0) {
          let decos = index.decoBySkill.get(skillId) || [];
          if (customDecoLimits) {
            decos = decos.filter(d => (customDecoLimits[d.id] || 0) > 0);
          }
          if (decos.length === 0) {
            isPossible = false;
            break;
          }

          let minSlot = 99;
          for (const d of decos) {
            const match = d.skills.find(s => s.skillId === skillId);
            if (match && match.level >= remainingPointsToFillWithDecos) {
              if (d.slot < minSlot) {
                minSlot = d.slot;
              }
            }
          }

          let targetSlot, targetLevel;
          if (minSlot !== 99) {
            targetSlot = minSlot;
            targetLevel = remainingPointsToFillWithDecos;
          } else {
            const decoInfo = bestDecoForSkill.get(skillId);
            if (!decoInfo || decoInfo.bestDecoLevel === 0) {
              isPossible = false;
              break;
            }
            targetSlot = decoInfo.bestDecoSlot;
            targetLevel = decoInfo.bestDecoLevel;
          }

          const decosNeeded = Math.ceil(remainingPointsToFillWithDecos / targetLevel);
          if (targetSlot === 3) neededDecos3 += decosNeeded;
          else if (targetSlot === 2) neededDecos2 += decosNeeded;
          else neededDecos1 += decosNeeded;
        }
      }

      if (isPossible) {
        // Pigeonhole slot check
        const totalAvail3 = currentSlots3 + weaponSlots3 + (maxFutureSlotsGTE[slotIndex].get(3) || 0);
        const totalAvail2 = currentSlots2 + weaponSlots2 + (maxFutureSlotsGTE[slotIndex].get(2) || 0);
        const totalAvail1 = currentSlots1 + weaponSlots1 + (maxFutureSlotsGTE[slotIndex].get(1) || 0);

        // Only verify size 3 and size 2 slot availability.
        // We relax the total slot check (size 1) because hybrid decorations (size 3) 
        // can satisfy multiple skills simultaneously, causing independent count over-estimation.
        if (neededDecos3 > totalAvail3 ||
          (neededDecos3 + neededDecos2) > totalAvail2) {
          isPossible = false;
        }
      }



      if (isPossible) {
        branch(slotIndex + 1);
      }

      // ─── POP / BACKTRACK ────────────────────────────────────────
      chosenPieces.pop();
      if (piece.setId) {
        currentSetIdCounts[piece.setId]--;
      }
      for (const skillId of piece.contributesToSetSkills || []) {
        currentSetSkillCounts[skillId]--;
      }
      for (const s of pieceSlots) {
        currentArmorSlots.pop();
        if (s >= 3) { currentSlots3--; currentSlots2--; currentSlots1--; }
        else if (s >= 2) { currentSlots2--; currentSlots1--; }
        else if (s >= 1) { currentSlots1--; }
      }
      for (const s of piece.skills) {
        if (s.setPiecesRequired != null) continue;
        currentSkills[s.skillId] -= s.level;
      }
    }
  }

  branch(0);

  const elapsed = performance.now() - startTime;
  return { totalFound, elapsed, totalSearched };
}

/**
 * Compute set/group bonus skills from piece counts.
 */
function computeSetBonuses(pieces, weapon, index) {
  const currentSetSkillCounts = new Int32Array(1000);

  if (weapon) {
    if (weapon.setId) {
      const set = index.setById.get(weapon.setId);
      if (set) {
        if (set.setBonus) currentSetSkillCounts[set.setBonus.skillId] = 1;
        if (set.groupBonus) currentSetSkillCounts[set.groupBonus.skillId] = 1;
      }
    }
    if (weapon.skills) {
      for (const s of weapon.skills) {
        if (s.setPiecesRequired != null) {
          currentSetSkillCounts[s.skillId] = 1;
        }
      }
    }
  }

  for (const p of pieces) {
    for (const skillId of p.contributesToSetSkills || []) {
      currentSetSkillCounts[skillId]++;
    }
  }

  const bonusSkills = [];
  for (let skillId = 0; skillId < currentSetSkillCounts.length; skillId++) {
    const count = currentSetSkillCounts[skillId];
    if (count === 0) continue;

    const skill = index.skillById.get(skillId);
    if (!skill || !skill.ranks) continue;

    let highestActiveRank = null;
    for (const rank of skill.ranks) {
      if (rank.setPiecesRequired != null && count >= rank.setPiecesRequired) {
        if (!highestActiveRank || rank.level > highestActiveRank.level) {
          highestActiveRank = rank;
        }
      }
    }

    if (highestActiveRank) {
      bonusSkills.push({
        skillId,
        skillName: skill.name,
        level: highestActiveRank.level,
        description: highestActiveRank.description,
        isSetBonus: skill.kind === 'set',
        isGroupBonus: skill.kind === 'group',
        piecesRequired: highestActiveRank.setPiecesRequired,
      });
    }
  }

  return bonusSkills;
}

/**
 * Build a displayable result object.
 */
function buildResult(pieces, weapon, charm, requiredSkills, index, decoAssignments = [], bonusSkills = [], includeTranscend = true) {
  // Compute total defense
  let totalDefenseBase = 0;
  let totalDefenseMax = 0;
  const totalResistances = { fire: 0, water: 0, ice: 0, thunder: 0, dragon: 0 };

  for (const piece of pieces) {
    const defense = includeTranscend ? piece.defense : (piece.originalDefense || piece.defense);
    totalDefenseBase += defense.base;
    totalDefenseMax += defense.max;
    for (const [elem, val] of Object.entries(piece.resistances)) {
      totalResistances[elem] += val;
    }
  }

  if (weapon && weapon.defenseBonus) {
    totalDefenseBase += weapon.defenseBonus;
    totalDefenseMax += weapon.defenseBonus;
  }

  // Compute all active skills
  const skillLevels = new Map();
  for (const piece of pieces) {
    for (const s of piece.skills) {
      if (s.setPiecesRequired != null) continue;
      skillLevels.set(s.skillId, (skillLevels.get(s.skillId) || 0) + s.level);
    }
  }
  if (weapon && weapon.skills) {
    for (const s of weapon.skills) {
      skillLevels.set(s.skillId, (skillLevels.get(s.skillId) || 0) + s.level);
    }
  }
  if (charm && charm.skills) {
    for (const s of charm.skills) {
      skillLevels.set(s.skillId, (skillLevels.get(s.skillId) || 0) + s.level);
    }
  }
  for (const da of decoAssignments) {
    skillLevels.set(da.skillId, (skillLevels.get(da.skillId) || 0) + da.skillLevel);
  }
  for (const bs of bonusSkills) {
    skillLevels.set(bs.skillId, (skillLevels.get(bs.skillId) || 0) + bs.level);
  }

  // Build skill display list
  const activeSkills = [];
  for (const [skillId, level] of skillLevels) {
    const skill = index.skillById.get(skillId);
    const clampedLevel = skill ? Math.min(level, skill.maxLevel) : level;
    const isRequired = requiredSkills.some(rs => rs.skillId === skillId);
    activeSkills.push({
      skillId,
      name: skill ? skill.name : `Skill #${skillId}`,
      level: clampedLevel,
      maxLevel: skill ? skill.maxLevel : clampedLevel,
      isRequired,
      isBonusSkill: bonusSkills.some(bs => bs.skillId === skillId),
    });
  }

  // Sort: required first, then by name
  activeSkills.sort((a, b) => {
    if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  // Count spare deco slots
  const allArmorSlots = pieces.flatMap(p => includeTranscend ? p.slots : (p.originalSlots || p.slots));
  const usedSlotCount = decoAssignments.filter(d => d.slotSource === 'armor').length;
  const spareArmorSlots = allArmorSlots.length - usedSlotCount;
  const usedWeaponSlotCount = decoAssignments.filter(d => d.slotSource === 'weapon').length;
  const spareWeaponSlots = (weapon ? weapon.slots.length : 0) - usedWeaponSlotCount;

  return {
    pieces: pieces.map(p => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      rarity: p.rarity,
      defense: includeTranscend ? p.defense : (p.originalDefense || p.defense),
      resistances: p.resistances,
      skills: p.skills.filter(s => s.setPiecesRequired == null).map(s => ({
        skillId: s.skillId,
        name: index.skillById.get(s.skillId)?.name || `Skill #${s.skillId}`,
        level: s.level,
      })),
      slots: includeTranscend ? p.slots : (p.originalSlots || p.slots),
    })),
    weapon: weapon ? {
      id: weapon.id,
      name: weapon.name,
      kind: weapon.kind,
      damage: weapon.damage,
      affinity: weapon.affinity,
      slots: weapon.slots,
      skills: (weapon.skills || []).map(s => ({
        skillId: s.skillId,
        name: index.skillById.get(s.skillId)?.name || `Skill #${s.skillId}`,
        level: s.level,
      })),
    } : null,
    charm: charm ? {
      name: charm.name || 'Custom Charm',
      skills: charm.skills.map(s => ({
        skillId: s.skillId,
        name: index.skillById.get(s.skillId)?.name || `Skill #${s.skillId}`,
        level: s.level,
      })),
    } : null,
    decoAssignments,
    bonusSkills,
    totalDefense: { base: totalDefenseBase, max: totalDefenseMax },
    totalResistances,
    activeSkills,
    spareSlots: { armor: spareArmorSlots, weapon: spareWeaponSlots },
  };
}

/**
 * Filter candidates list by removing strictly worse pieces.
 */
function pruneSubsumedPieces(pieces, desiredSkillIds, index, includeTranscend) {
  const keepers = [];

  for (const piece of pieces) {
    let keep = true;

    for (let i = 0; i < keepers.length; i++) {
      const other = keepers[i];

      // Check if 'other' subsumes 'piece'
      if (comparePieces(other, piece, desiredSkillIds, index, includeTranscend)) {
        keep = false;
        break;
      }

      // Check if 'piece' subsumes 'other'
      if (comparePieces(piece, other, desiredSkillIds, index, includeTranscend)) {
        keepers.splice(i, 1);
        i--;
      }
    }

    if (keep) {
      keepers.push(piece);
    }
  }

  return keepers;
}

/**
 * Compare piece a and b. Returns true if a is better than or equal to b in every way.
 */
function comparePieces(a, b, desiredSkillIds, index, includeTranscend) {
  // 1. Compare relevant skills
  let aSkillsBetterOrEqual = true;
  let bSkillsBetterOrEqual = true;
  for (const skillId of desiredSkillIds) {
    const aSkill = a.skills.find(s => s.skillId === skillId && s.setPiecesRequired == null)?.level || 0;
    const bSkill = b.skills.find(s => s.skillId === skillId && s.setPiecesRequired == null)?.level || 0;
    if (aSkill < bSkill) aSkillsBetterOrEqual = false;
    if (bSkill < aSkill) bSkillsBetterOrEqual = false;
  }

  // 2. Compare slots
  const aSlotsRaw = includeTranscend ? a.slots : (a.originalSlots || a.slots);
  const bSlotsRaw = includeTranscend ? b.slots : (b.originalSlots || b.slots);
  const aSlots = [...aSlotsRaw].sort((x, y) => y - x);
  const bSlots = [...bSlotsRaw].sort((x, y) => y - x);

  let aSlotsBetterOrEqual = true;
  if (aSlots.length < bSlots.length) {
    aSlotsBetterOrEqual = false;
  } else {
    for (let i = 0; i < bSlots.length; i++) {
      if (aSlots[i] < bSlots[i]) {
        aSlotsBetterOrEqual = false;
        break;
      }
    }
  }

  let bSlotsBetterOrEqual = true;
  if (bSlots.length < aSlots.length) {
    bSlotsBetterOrEqual = false;
  } else {
    for (let i = 0; i < aSlots.length; i++) {
      if (bSlots[i] < aSlots[i]) {
        bSlotsBetterOrEqual = false;
        break;
      }
    }
  }

  // 3. Compare set bonuses using contributesToSetSkills
  let aSetBetterOrEqual = true;
  let bSetBetterOrEqual = true;

  const aSets = a.contributesToSetSkills || [];
  const bSets = b.contributesToSetSkills || [];

  for (const skillId of bSets) {
    if (desiredSkillIds.has(skillId) && !aSets.includes(skillId)) {
      aSetBetterOrEqual = false;
      break;
    }
  }

  for (const skillId of aSets) {
    if (desiredSkillIds.has(skillId) && !bSets.includes(skillId)) {
      bSetBetterOrEqual = false;
      break;
    }
  }

  if (aSkillsBetterOrEqual && aSlotsBetterOrEqual && aSetBetterOrEqual) {
    const skillsEqual = bSkillsBetterOrEqual;
    const slotsEqual = bSlotsBetterOrEqual;
    const setEqual = bSetBetterOrEqual;

    if (skillsEqual && slotsEqual && setEqual) {
      // functionally identical. Keep the one with better max defense.
      const aDefense = includeTranscend ? a.defense : (a.originalDefense || a.defense);
      const bDefense = includeTranscend ? b.defense : (b.originalDefense || b.defense);
      return aDefense.max >= bDefense.max;
    }

    return true; // a is strictly better than b
  }

  return false;
}

/**
 * Sort results by skill satisfaction, defense, and spare slots.
 */
function sortResults(results) {
  results.sort((a, b) => {
    // 1. Compare how many of the required skills are fully satisfied
    const aSatisfied = a.activeSkills.filter(s => s.isRequired && s.level >= s.maxLevel).length;
    const bSatisfied = b.activeSkills.filter(s => s.isRequired && s.level >= s.maxLevel).length;
    if (aSatisfied !== bSatisfied) return bSatisfied - aSatisfied;

    // 2. Compare total level of required skills achieved
    const aTotalReq = a.activeSkills.reduce((sum, s) => sum + (s.isRequired ? s.level : 0), 0);
    const bTotalReq = b.activeSkills.reduce((sum, s) => sum + (s.isRequired ? s.level : 0), 0);
    if (aTotalReq !== bTotalReq) return bTotalReq - aTotalReq;

    // 3. Compare total defense (max)
    if (a.totalDefense.max !== b.totalDefense.max) return b.totalDefense.max - a.totalDefense.max;

    // 4. Compare spare slots count (weighted by level)
    const aSlotsScore = (a.spareSlots.armor + a.spareSlots.weapon);
    const bSlotsScore = (b.spareSlots.armor + b.spareSlots.weapon);
    return bSlotsScore - aSlotsScore;
  });
}

/**
 * Run the armor set search, automatically iterating over charms if in search charms mode.
 */
export function solve(params, index, onResult, onProgress) {
  const { charm, rankFilter } = params;

  // Decide charm search mode:
  // If charm is explicitly a specific charm object or null (No Charm), run once.
  // If charm is undefined, or has mode === 'search', or is 'search', run search charms mode.
  const isSearchCharms = charm === undefined || charm === 'search' || (typeof charm === 'object' && charm !== null && charm.mode === 'search');

  if (!isSearchCharms) {
    return solveSingle(params, index, onResult, onProgress);
  }

  // Search charms mode
  const startTime = performance.now();
  const desiredSkillIds = new Set(params.requiredSkills.map(s => s.skillId));

  const candidateCharms = [null]; // Always include no-charm
  const bestOptionPerCharm = new Map();
  for (const option of index.charmOptions || []) {
    if (rankFilter && rankFilter !== 'all') {
      const isLowRank = option.rarity <= 4;
      if (rankFilter === 'low' && !isLowRank) continue;
      if (rankFilter === 'high' && isLowRank) continue;
    }
    const isRelevant = option.skills.some(s => desiredSkillIds.has(s.skillId));
    if (isRelevant) {
      const existing = bestOptionPerCharm.get(option.charmId);
      if (!existing || option.rankIndex > existing.rankIndex) {
        bestOptionPerCharm.set(option.charmId, option);
      }
    }
  }
  candidateCharms.push(...bestOptionPerCharm.values());

  const allResults = [];
  let totalSearched = 0;

  for (const candidateCharm of candidateCharms) {
    const singleParams = {
      ...params,
      charm: candidateCharm,
      maxResults: params.maxResults * 2 // check more candidates to sort them later
    };

    const singleSummary = solveSingle(
      singleParams,
      index,
      (res) => {
        allResults.push(res);
      },
      () => { } // silent progress during loop
    );
    totalSearched += singleSummary.totalSearched;
  }

  // Sort and filter results
  sortResults(allResults);

  // De-duplicate results that use different charms but are identical in armor/weapon/decos
  const uniqueResults = [];
  const seenSetKeys = new Set();

  for (const res of allResults) {
    const piecesKey = res.pieces.map(p => p.id).join(',');
    const charmKey = res.charm ? res.charm.name : 'none';
    const key = `${piecesKey}:${charmKey}`;
    if (!seenSetKeys.has(key)) {
      seenSetKeys.add(key);
      uniqueResults.push(res);
    }
  }

  // Take top maxResults
  const finalResults = uniqueResults.slice(0, params.maxResults);
  finalResults.forEach(onResult);

  const elapsed = performance.now() - startTime;
  return {
    totalFound: finalResults.length,
    elapsed,
    totalSearched
  };
}
