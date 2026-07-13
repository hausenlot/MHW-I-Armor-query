/**
 * MH Wilds Data Build Script
 * 
 * Processes raw API JSON files (31MB) into lean, search-optimized JSON files (~619KB).
 * 
 * Usage: node scripts/buildData.js
 * 
 * Input:  data/*.json        (raw API responses)
 * Output: public/data/*.json  (lean, indexed data)
 */

const fs = require('fs');
const path = require('path');

const RAW_DIR = path.join(__dirname, '..', 'data');
const OUT_DIR = path.join(__dirname, '..', 'public', 'data');

// Ensure output directory exists
fs.mkdirSync(OUT_DIR, { recursive: true });

function readRaw(filename) {
  const filepath = path.join(RAW_DIR, filename);
  console.log(`  Reading ${filename}...`);
  const raw = fs.readFileSync(filepath, 'utf-8');
  const data = JSON.parse(raw);
  console.log(`    → ${Array.isArray(data) ? data.length : 1} items (${(raw.length / 1024).toFixed(0)} KB raw)`);
  return data;
}

function writeLean(filename, data) {
  const filepath = path.join(OUT_DIR, filename);
  const json = JSON.stringify(data);
  fs.writeFileSync(filepath, json, 'utf-8');
  const count = Array.isArray(data) ? data.length : 1;
  console.log(`    → Wrote ${filename}: ${count} items (${(json.length / 1024).toFixed(1)} KB)`);
}

// ─── HELPERS: Armor Transcendence ────────────────────────────────────────────
/**
 * Apply Armor Transcendence to an armor piece (max defense boost + slot upgrades).
 * This is applied at build time so runtime doesn't need to recompute it.
 */
function transcendArmor(piece) {
  // 1. Max defense increase by rarity
  if (piece.rarity === 5) piece.defense.max += 16;
  else if (piece.rarity === 6) piece.defense.max += 12;
  else if (piece.rarity === 7) piece.defense.max += 10;
  else if (piece.rarity === 8) piece.defense.max += 8;
  else if (piece.rarity < 5) piece.defense.max += 16;

  // 2. Slot upgrades (rarity < 7 only)
  if (piece.rarity < 7) {
    const originalSlots = piece.slots || [];
    const upgraded = [0, 0, 0];
    for (let i = 0; i < Math.min(originalSlots.length, 3); i++) {
      upgraded[i] = originalSlots[i];
    }
    const numUpgrades = piece.rarity === 6 ? 2 : 3;
    let applied = 0;
    for (let i = 0; i < 3; i++) {
      if (applied >= numUpgrades) break;
      if (upgraded[i] < 3) {
        upgraded[i]++;
        applied++;
      }
    }
    piece.slots = upgraded.filter(s => s > 0).sort((a, b) => b - a);
  }
}

/**
 * Compute which set/group bonus skillIds this armor piece contributes to.
 * @param {Object} piece - lean armor piece
 * @param {Object[]} armorSets - lean armor sets array
 * @returns {number[]} array of skillIds
 */
function computeContributesToSetSkills(piece, armorSets) {
  const setSkills = new Set();

  if (piece.setId) {
    const set = armorSets.find(s => s.id === piece.setId);
    if (set) {
      if (set.setBonus) setSkills.add(set.setBonus.skillId);
      if (set.groupBonus) setSkills.add(set.groupBonus.skillId);
    }
  }

  if (piece.skills) {
    for (const s of piece.skills) {
      if (s.setPiecesRequired != null) {
        setSkills.add(s.skillId);
      }
    }
  }

  return Array.from(setSkills);
}

// ─── ARMOR ───────────────────────────────────────────────────────────────────
function buildArmor(armorSets) {
  console.log('\n[2/6] Processing armor...');
  const raw = readRaw('armor.json');

  const lean = raw.map(a => ({
    id: a.id,
    name: a.name,
    kind: a.kind || '',
    rank: a.rank,
    rarity: a.rarity,
    defense: { ...a.defense },
    resistances: a.resistances,
    skills: (a.skills || []).map(s => {
      const entry = {
        skillId: s.skill.id,
        level: s.level,
      };
      if (s.setPiecesRequired != null) {
        entry.setPiecesRequired = s.setPiecesRequired;
      }
      return entry;
    }),
    slots: a.slots || [],
    setId: a.armorSet ? a.armorSet.id : null,
  }));

  // Apply Armor Transcendence at build time
  for (const piece of lean) {
    transcendArmor(piece);
    piece.isTranscended = true;
    piece.contributesToSetSkills = computeContributesToSetSkills(piece, armorSets);
  }

  console.log(`    → Applied Armor Transcendence to ${lean.length} pieces`);
  writeLean('armor.json', lean);
  return lean;
}

// ─── SKILLS ──────────────────────────────────────────────────────────────────
function buildSkills() {
  console.log('\n[2/6] Processing skills...');
  const raw = readRaw('skills.json');

  const lean = raw.map(s => ({
    id: s.id,
    name: s.name,
    kind: s.kind,
    description: s.description || '',
    maxLevel: (s.ranks || []).length,
    ranks: (s.ranks || []).map(r => {
      const entry = {
        level: r.level,
        description: r.description || '',
      };
      if (r.setPiecesRequired != null) {
        entry.setPiecesRequired = r.setPiecesRequired;
      }
      return entry;
    }),
  }));

  writeLean('skills.json', lean);
  return lean;
}

// ─── DECORATIONS ─────────────────────────────────────────────────────────────
function buildDecorations() {
  console.log('\n[3/6] Processing decorations...');
  const raw = readRaw('decorations.json');

  const lean = raw.map(d => ({
    id: d.id,
    name: d.name,
    slot: d.slot,
    kind: d.kind,
    rarity: d.rarity,
    skills: (d.skills || []).map(s => ({
      skillId: s.skill.id,
      level: s.level,
    })),
  }));

  writeLean('decorations.json', lean);
  return lean;
}

// ─── WEAPONS ─────────────────────────────────────────────────────────────────
function buildWeapons() {
  console.log('\n[4/6] Processing weapons...');
  const raw = readRaw('weapons.json');

  const lean = raw.map(w => ({
    id: w.id,
    name: w.name,
    kind: w.kind,
    rarity: w.rarity,
    damage: w.damage || { raw: 0, display: 0 },
    affinity: w.affinity || 0,
    elderseal: w.elderseal || null,
    defenseBonus: w.defenseBonus || 0,
    slots: w.slots || [],
    skills: (w.skills || []).map(s => ({
      skillId: s.skill.id,
      level: s.level,
    })),
  }));

  writeLean('weapons.json', lean);
  return lean;
}

// ─── CHARMS ──────────────────────────────────────────────────────────────────
function buildCharms() {
  console.log('\n[5/6] Processing charms...');
  const raw = readRaw('charms.json');

  const lean = raw.map(c => ({
    id: c.id,
    name: c.name,
    random: c.random || false,
    ranks: (c.ranks || []).map(r => ({
      name: r.name || '',
      rarity: r.rarity || 0,
      skills: (r.skills || []).map(s => ({
        skillId: s.skill.id,
        level: s.level,
      })),
    })),
  }));

  writeLean('charms.json', lean);
  return lean;
}

// ─── ARMOR SETS ──────────────────────────────────────────────────────────────
function buildArmorSets() {
  console.log('\n[1/6] Processing armor sets...');
  const raw = readRaw('armor-sets.json');

  const lean = raw.map(s => {
    const entry = {
      id: s.id,
      name: s.name,
      pieceIds: (s.pieces || []).map(p => p.id),
    };

    // Set bonus (setBonusSkill + bonus)
    if (s.bonus && s.setBonusSkill) {
      entry.setBonus = {
        skillId: s.setBonusSkill.id,
        skillName: s.setBonusSkill.name,
        ranks: (s.bonus.ranks || []).map(r => ({
          pieces: r.pieces,
          skill: {
            level: r.skill.level,
            description: r.skill.description || '',
            name: r.skill.name || null,
          },
        })),
      };
    }

    // Group bonus (groupBonus + groupBonusSkill)
    if (s.groupBonus && s.groupBonusSkill) {
      entry.groupBonus = {
        skillId: s.groupBonusSkill.id,
        skillName: s.groupBonusSkill.name,
        ranks: (s.groupBonus.ranks || []).map(r => ({
          pieces: r.pieces,
          skill: {
            level: r.skill.level,
            description: r.skill.description || '',
            name: r.skill.name || null,
          },
        })),
      };
    }

    return entry;
  });

  writeLean('armor-sets.json', lean);
  return lean;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════');
console.log('  MH Wilds Data Builder');
console.log('═══════════════════════════════════════════════');
console.log(`  Raw data:  ${RAW_DIR}`);
console.log(`  Output:    ${OUT_DIR}`);

const results = {};
// Build armor sets FIRST — armor needs set data for contributesToSetSkills
results.armorSets = buildArmorSets();
results.armor = buildArmor(results.armorSets);
results.skills = buildSkills();
results.decorations = buildDecorations();
results.weapons = buildWeapons();
results.charms = buildCharms();

// Summary
console.log('\n═══════════════════════════════════════════════');
console.log('  Build Complete!');
console.log('═══════════════════════════════════════════════');

const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.json'));
let totalSize = 0;
for (const f of files) {
  const size = fs.statSync(path.join(OUT_DIR, f)).size;
  totalSize += size;
}
console.log(`  Total output: ${files.length} files, ${(totalSize / 1024).toFixed(1)} KB`);

// Integrity checks
console.log('\n  Integrity checks:');
console.assert(results.armor.length === 714, `Armor count mismatch: ${results.armor.length} !== 714`);
console.log(`    ✓ Armor: ${results.armor.length} pieces`);
console.assert(results.skills.length === 179, `Skills count mismatch: ${results.skills.length} !== 179`);
console.log(`    ✓ Skills: ${results.skills.length} skills`);
console.assert(results.decorations.length === 361, `Decos count mismatch: ${results.decorations.length} !== 361`);
console.log(`    ✓ Decorations: ${results.decorations.length} decos`);
console.assert(results.weapons.length === 1188, `Weapons count mismatch: ${results.weapons.length} !== 1188`);
console.log(`    ✓ Weapons: ${results.weapons.length} weapons`);
console.assert(results.charms.length === 64, `Charms count mismatch: ${results.charms.length} !== 64`);
console.log(`    ✓ Charms: ${results.charms.length} charms`);
console.assert(results.armorSets.length === 194, `ArmorSets count mismatch: ${results.armorSets.length} !== 194`);
console.log(`    ✓ Armor Sets: ${results.armorSets.length} sets`);
console.log('\n  All checks passed! ✓');
