/**
 * Decoration Filler
 * Given remaining skill needs and available decoration slots,
 * attempts to fill slots with decorations to satisfy all requirements.
 * 
 * Key constraint: "weapon" decos → weapon slots only, "armor" decos → armor slots only.
 */

/**
 * Try to fill decoration slots to meet remaining skill needs.
 * 
 * @param {Map<number, number>} remainingNeeds - skillId → levels still needed
 * @param {number[]} armorSlots - available armor deco slot levels (e.g., [3, 2, 1])
 * @param {number[]} weaponSlots - available weapon deco slot levels
 * @param {Map<number, object[]>} decoBySkill - index: skillId → decorations[]
 * @returns {{ success: boolean, decoAssignments: object[] } | null}
 */
export function tryFillWithDecos(remainingNeeds, armorSlots, weaponSlots, decoBySkill) {
  // Nothing to fill
  if (remainingNeeds.size === 0) {
    return { success: true, decoAssignments: [] };
  }

  // Build a map of remaining needs
  const needsMap = new Map();
  for (const [skillId, level] of remainingNeeds) {
    if (level > 0) {
      needsMap.set(skillId, level);
    }
  }

  if (needsMap.size === 0) {
    return { success: true, decoAssignments: [] };
  }

  // Sort available slots descending (for largest index to smallest search order)
  const availableArmorSlots = [...armorSlots].sort((a, b) => b - a);
  const availableWeaponSlots = [...weaponSlots].sort((a, b) => b - a);

  const assignments = [];
  const usedArmorSlots = new Set();
  const usedWeaponSlots = new Set();

  // Sort remaining skills by "fewest deco options" first (most constrained first)
  const sortedSkillIds = Array.from(needsMap.keys()).sort((a, b) => {
    const aDecos = decoBySkill.get(a) || [];
    const bDecos = decoBySkill.get(b) || [];
    return aDecos.length - bDecos.length;
  });

  for (const skillId of sortedSkillIds) {
    while ((needsMap.get(skillId) || 0) > 0) {
      let placed = false;
      const decos = decoBySkill.get(skillId) || [];

      if (decos.length === 0) {
        return null; // Impossible
      }

      // Sort decos by:
      // 1. highest level contribution of target skill first
      // 2. smallest slot size (save larger slots for other decos)
      // 3. tertiary: benefit to other remaining desired skills (hybrid decos)
      const sortedDecos = [...decos].sort((a, b) => {
        const aLevel = a.skills.find(s => s.skillId === skillId)?.level || 0;
        const bLevel = b.skills.find(s => s.skillId === skillId)?.level || 0;
        if (bLevel !== aLevel) return bLevel - aLevel;
        if (a.slot !== b.slot) return a.slot - b.slot;

        const getBonusScore = (d) => {
          let score = 0;
          for (const ds of d.skills) {
            if (needsMap.has(ds.skillId) && needsMap.get(ds.skillId) > 0) {
              score += Math.min(ds.level, needsMap.get(ds.skillId));
            }
          }
          return score;
        };
        return getBonusScore(b) - getBonusScore(a);
      });

      for (const deco of sortedDecos) {
        const level = deco.skills.find(s => s.skillId === skillId)?.level || 0;
        if (level <= 0) continue;

        let slotIdx = -1;
        let slotSource;

        if (deco.kind === 'armor') {
          // Must go in an armor slot (smallest first - right to left)
          for (let i = availableArmorSlots.length - 1; i >= 0; i--) {
            if (!usedArmorSlots.has(i) && availableArmorSlots[i] >= deco.slot) {
              slotIdx = i;
              slotSource = 'armor';
              break;
            }
          }
        } else if (deco.kind === 'weapon') {
          // Must go in a weapon slot (smallest first)
          for (let i = availableWeaponSlots.length - 1; i >= 0; i--) {
            if (!usedWeaponSlots.has(i) && availableWeaponSlots[i] >= deco.slot) {
              slotIdx = i;
              slotSource = 'weapon';
              break;
            }
          }
        }

        if (slotIdx >= 0) {
          if (slotSource === 'armor') {
            usedArmorSlots.add(slotIdx);
          } else {
            usedWeaponSlots.add(slotIdx);
          }

          assignments.push({
            decoId: deco.id,
            decoName: deco.name,
            slotLevel: deco.slot,
            slotSource,
            skillId: skillId,
            skillLevel: level,
          });

          // Deduct all skills provided by this decoration from the needs Map
          for (const ds of deco.skills) {
            if (needsMap.has(ds.skillId)) {
              needsMap.set(ds.skillId, Math.max(0, needsMap.get(ds.skillId) - ds.level));
            }
          }

          placed = true;
          break;
        }
      }

      if (!placed) {
        return null; // Can't place any deco — fail
      }
    }
  }

  return { success: true, decoAssignments: assignments };
}

/**
 * Quick check: can decorations possibly fill the remaining needs?
 * This is a fast upper-bound check (no actual assignment).
 * 
 * @param {Map<number, number>} remainingNeeds
 * @param {number[]} armorSlots - sorted descending
 * @param {number[]} weaponSlots - sorted descending
 * @param {Map<number, object[]>} decoBySkill
 * @returns {boolean}
 */
export function canDecosReachTarget(remainingNeeds, armorSlots, weaponSlots, decoBySkill) {
  let totalArmorSlotsAvailable = armorSlots.length;
  let totalWeaponSlotsAvailable = weaponSlots.length;

  for (const [skillId, level] of remainingNeeds) {
    if (level <= 0) continue;

    const decos = decoBySkill.get(skillId) || [];
    if (decos.length === 0) return false;

    // Find the best deco for this skill (highest level per slot)
    let bestArmorLevel = 0;
    let bestWeaponLevel = 0;
    for (const d of decos) {
      const l = d.skills.find(s => s.skillId === skillId)?.level || 0;
      if (d.kind === 'armor') bestArmorLevel = Math.max(bestArmorLevel, l);
      else bestWeaponLevel = Math.max(bestWeaponLevel, l);
    }

    // How many deco slots would we need at minimum?
    const bestLevel = Math.max(bestArmorLevel, bestWeaponLevel);
    if (bestLevel <= 0) return false;

    const minSlotsNeeded = Math.ceil(level / bestLevel);

    // We need at least this many slots of the right kind
    if (bestArmorLevel > 0 && bestWeaponLevel > 0) {
      // Can use either kind — just check total
      if (minSlotsNeeded > totalArmorSlotsAvailable + totalWeaponSlotsAvailable) {
        return false;
      }
    } else if (bestArmorLevel > 0) {
      if (minSlotsNeeded > totalArmorSlotsAvailable) return false;
    } else {
      if (minSlotsNeeded > totalWeaponSlotsAvailable) return false;
    }
  }

  return true;
}
