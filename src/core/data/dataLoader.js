/**
 * Data Loader
 * Fetches all lean JSON files in parallel and returns the complete dataset.
 */

const DATA_FILES = [
  { key: 'armor', url: '/data/armor.json' },
  { key: 'skills', url: '/data/skills.json' },
  { key: 'decorations', url: '/data/decorations.json' },
  { key: 'weapons', url: '/data/weapons.json' },
  { key: 'charms', url: '/data/charms.json' },
  { key: 'armorSets', url: '/data/armor-sets.json' },
];

/**
 * Loads all game data files in parallel.
 * @returns {Promise<{armor, skills, decorations, weapons, charms, armorSets}>}
 */
export async function loadAllData() {
  const results = await Promise.all(
    DATA_FILES.map(async ({ key, url }) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.status}`);
      }
      const data = await response.json();
      return { key, data };
    })
  );

  const dataset = {};
  for (const { key, data } of results) {
    dataset[key] = data;
  }

  return dataset;
}
