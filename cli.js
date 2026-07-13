/**
 * MH Wilds Armor Builder CLI Search Tool
 * 
 * Usage:
 *   1. Edit the "query.json" file in the workspace root to define your desired skills, weapon, and charm.
 *   2. Run: npm run search
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildIndex } from './src/core/data/dataIndex.js';
import { solve } from './src/core/search/solver.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'public', 'data');
const queryPath = path.join(__dirname, 'query.json');

let query;
try {
  query = JSON.parse(fs.readFileSync(queryPath, 'utf-8'));
} catch (err) {
  console.error(`Error reading query.json:`, err.message);
  process.exit(1);
}

console.log('Loading game data...');
const armor = JSON.parse(fs.readFileSync(path.join(dataDir, 'armor.json'), 'utf-8'));
const skills = JSON.parse(fs.readFileSync(path.join(dataDir, 'skills.json'), 'utf-8'));
const decorations = JSON.parse(fs.readFileSync(path.join(dataDir, 'decorations.json'), 'utf-8'));
const weapons = JSON.parse(fs.readFileSync(path.join(dataDir, 'weapons.json'), 'utf-8'));
const charms = JSON.parse(fs.readFileSync(path.join(dataDir, 'charms.json'), 'utf-8'));
const armorSets = JSON.parse(fs.readFileSync(path.join(dataDir, 'armor-sets.json'), 'utf-8'));

console.log('Building search index...');
const index = buildIndex({ armor, skills, decorations, weapons, charms, armorSets });

console.log('Resolving query names to game database IDs...');
const requiredSkills = [];
for (const reqSkill of query.skills || []) {
  const match = index.skillsList.find(s => s.name.toLowerCase() === reqSkill.name.toLowerCase());
  if (match) {
    requiredSkills.push({ skillId: match.id, level: reqSkill.level });
  }
}

// Resolve Weapon
let weaponObj = null;
if (query.weapon) {
  const wSkills = [];
  for (const ws of query.weapon.skills || []) {
    const match = index.skillsList.find(s => s.name.toLowerCase() === ws.name.toLowerCase());
    if (match) {
      wSkills.push({ skillId: match.id, level: ws.level });
    }
  }

  let setId = null;
  if (query.weapon.setName) {
    const matchSet = armorSets.find(s => s.name.toLowerCase() === query.weapon.setName.toLowerCase());
    if (matchSet) {
      setId = matchSet.id;
    }
  }

  weaponObj = {
    id: 9999,
    name: 'Custom Weapon',
    slots: query.weapon.slots || [],
    skills: wSkills,
    setId
  };
}

// Resolve Charm
let charmObj = 'search';
if (query.charm && query.charm.name) {
  if (query.charm.name.toLowerCase() === 'none') {
    charmObj = null;
  } else {
    const matchCharm = index.charmOptions.find(c => c.name.toLowerCase() === query.charm.name.toLowerCase());
    if (matchCharm) {
      charmObj = matchCharm;
      console.log(`Resolved charm: ${charmObj.name}`);
    }
  }
}

const params = {
  requiredSkills,
  weapon: weaponObj,
  charm: charmObj,
  rankFilter: query.rank || 'high',
  maxResults: query.maxResults || 10
};

console.log('\nStarting search solver...');
const results = [];
const summary = solve(
  params,
  index,
  (res) => {
    results.push(res);
  },
  () => { }
);

console.log('\n=== Search Finished ===');
console.log(`Time taken: ${summary.elapsed.toFixed(1)} ms`);
console.log(`Combinations checked: ${summary.totalSearched}`);
console.log(`Matching sets found: ${results.length}`);
console.log('=======================');

if (results.length > 0) {
  results.forEach((res, i) => {
    console.log(`\n[SET CARD #${i + 1}]`);
    console.log(`  Active Skills: ${res.activeSkills.map(s => `${s.name} Lv${s.level}`).join(', ')}`);
    console.log(`  Defense: ${res.totalDefense.base} - ${res.totalDefense.max}`);
    console.log(`  Resistances: Fire(${res.totalResistances.fire}) Water(${res.totalResistances.water}) Ice(${res.totalResistances.ice}) Thunder(${res.totalResistances.thunder}) Dragon(${res.totalResistances.dragon})`);
    console.log(`  Armor Pieces:`);
    res.pieces.forEach(p => {
      console.log(`    - [${p.kind.toUpperCase()}] ${p.name} slots: [${p.slots ? p.slots.join(', ') : ''}]`);
    });
    if (res.charm) {
      console.log(`    - [CHARM] ${res.charm.name}`);
    }
    console.log(`  Decorations Used:`);
    res.decoAssignments.forEach(da => {
      console.log(`    - [${da.slotSource.toUpperCase()}] slot [${da.slotLevel}]: ${da.decoName}`);
    });
    console.log('----------------------------------------------------');
  });
} else {
  console.log('❌ No matching sets found for this query.');
}
