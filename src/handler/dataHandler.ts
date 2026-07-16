import { loadAllData } from '../core/data/dataLoader.js';
import { buildIndex } from '../core/data/dataIndex.js';
import { useStore } from '../state/store';
import { initWorker } from './solverHandler';

export async function loadGameData() {
  const store = useStore.getState();
  if (store.dataLoaded || store.isDataLoading) return;

  store.setIsDataLoading(true);
  try {
    const rawData = await loadAllData();
    
    // Initialize Web Worker with raw data in the background
    initWorker(rawData);

    // Build lookup maps on main thread for fast autocomplete
    const index = buildIndex(rawData);
    
    store.setDataIndex(index);
    store.setSkillsList(index.skillsList || []);
    store.setArmorSets(rawData.armorSets || []);
    store.setDecorationsList(rawData.decorations || []);
    store.setDataLoaded(true);
  } catch (error) {
    console.error('Error loading game data:', error);
  } finally {
    store.setIsDataLoading(false);
  }
}
