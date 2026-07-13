/**
 * Data Index Builder
 * Creates O(1) lookup maps from flat arrays for fast search access.
 */

/**
 * @param {{armor, skills, decorations, weapons, charms, armorSets}} data
 * @returns {DataIndex}
 */
export function buildIndex(data) {
  const index = {};

  // ─── Armor indices ───────────────────────────────────────────────
  index.armorById = new Map(data.armor.map(a => [a.id, a]));

  index.armorBySlot = new Map();
  for (const kind of ['head', 'chest', 'arms', 'waist', 'legs']) {
    index.armorBySlot.set(kind, data.armor.filter(a => a.kind === kind));
  }

  index.armorBySkill = new Map();
  for (const armor of data.armor) {
    for (const s of armor.skills) {
      if (!index.armorBySkill.has(s.skillId)) {
        index.armorBySkill.set(s.skillId, []);
      }
      index.armorBySkill.get(s.skillId).push(armor);
    }
  }

  // ─── Skill indices ───────────────────────────────────────────────
  index.skillById = new Map(data.skills.map(s => [s.id, s]));
  index.skillByName = new Map(data.skills.map(s => [s.name.toLowerCase(), s]));
  index.skillsList = data.skills; // keep sorted list for UI

  // ─── Decoration indices ──────────────────────────────────────────
  index.decoById = new Map(data.decorations.map(d => [d.id, d]));

  index.decoBySkill = new Map();
  for (const deco of data.decorations) {
    for (const s of deco.skills) {
      if (!index.decoBySkill.has(s.skillId)) {
        index.decoBySkill.set(s.skillId, []);
      }
      index.decoBySkill.get(s.skillId).push(deco);
    }
  }

  index.decoBySlotAndKind = new Map();
  for (const deco of data.decorations) {
    const key = `${deco.slot}:${deco.kind}`;
    if (!index.decoBySlotAndKind.has(key)) {
      index.decoBySlotAndKind.set(key, []);
    }
    index.decoBySlotAndKind.get(key).push(deco);
  }

  // ─── Weapon indices ──────────────────────────────────────────────
  index.weaponById = new Map(data.weapons.map(w => [w.id, w]));

  index.weaponsByType = new Map();
  for (const w of data.weapons) {
    if (!index.weaponsByType.has(w.kind)) {
      index.weaponsByType.set(w.kind, []);
    }
    index.weaponsByType.get(w.kind).push(w);
  }

  index.weaponTypes = [...index.weaponsByType.keys()].sort();

  // ─── Charm indices ───────────────────────────────────────────────
  index.charmById = new Map(data.charms.map(c => [c.id, c]));

  // Flatten charm ranks for search: each rank is a searchable "charm option"
  index.charmOptions = [];
  for (const charm of data.charms) {
    for (let i = 0; i < charm.ranks.length; i++) {
      const rank = charm.ranks[i];
      index.charmOptions.push({
        charmId: charm.id,
        rankIndex: i,
        name: rank.name || charm.name,
        rarity: rank.rarity,
        skills: rank.skills,
        random: charm.random,
      });
    }
  }

  index.charmBySkill = new Map();
  for (const option of index.charmOptions) {
    for (const s of option.skills) {
      if (!index.charmBySkill.has(s.skillId)) {
        index.charmBySkill.set(s.skillId, []);
      }
      index.charmBySkill.get(s.skillId).push(option);
    }
  }

  // ─── Armor Set indices ───────────────────────────────────────────
  index.setById = new Map(data.armorSets.map(s => [s.id, s]));

  // Map armor piece → which set it belongs to (for quick bonus lookup)
  index.setByPieceId = new Map();
  for (const set of data.armorSets) {
    for (const pieceId of set.pieceIds) {
      index.setByPieceId.set(pieceId, set);
    }
  }

  return index;
}

/**
 * Compute max skill contribution possible from decorations for a given skill.
 * @param {DataIndex} index
 * @param {number} skillId
 * @param {string} decoKind - "weapon" | "armor"
 * @returns {number} Max level achievable from a single deco
 */
export function getMaxDecoLevelForSkill(index, skillId, decoKind) {
  const decos = (index.decoBySkill.get(skillId) || [])
    .filter(d => d.kind === decoKind);
  if (decos.length === 0) return 0;
  return Math.max(...decos.map(d => {
    const match = d.skills.find(s => s.skillId === skillId);
    return match ? match.level : 0;
  }));
}
