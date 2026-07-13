import { create } from 'zustand';

export interface SkillFilter {
  name: string;
  level: number;
  maxLevel: number;
  kind?: 'armor' | 'weapon' | 'set' | 'group';
}

export interface ActiveSkill {
  skillId: number;
  name: string;
  level: number;
  maxLevel: number;
  isRequired: boolean;
  isSetBonus?: boolean;
  isGroupBonus?: boolean;
  isBonusSkill?: boolean;
}

export interface DecoAssignment {
  slotLevel: number;
  slotSource: 'head' | 'chest' | 'arms' | 'waist' | 'legs' | 'weapon';
  decoName: string;
  skillId: number;
}

export interface RealArmorPiece {
  id: number;
  kind: 'head' | 'chest' | 'arms' | 'waist' | 'legs';
  name: string;
  rank: string;
  rarity: number;
  slots: number[];
  skills: Array<{
    skillId: number;
    skillName: string;
    level: number;
  }>;
}

export interface RealCharm {
  charmId: number;
  rankIndex: number;
  name: string;
  rarity: number;
  skills: Array<{
    skillId: number;
    skillName: string;
    level: number;
  }>;
}

export interface RealSolverResult {
  id: number;
  pieces: RealArmorPiece[];
  weapon: any | null;
  charm: RealCharm | null;
  decoAssignments: DecoAssignment[];
  activeSkills: ActiveSkill[];
  totalDefense: {
    base: number;
    max: number;
  };
  totalResistances: {
    fire: number;
    water: number;
    thunder: number;
    ice: number;
    dragon: number;
  };
  spareSlots: {
    armor: number;
    weapon: number;
  };
}

interface AppState {
  theme: 'dark' | 'light';
  weaponSlots: number[];
  targetSkills: SkillFilter[];
  selectedSetBonuses: string[];
  selectedGroupSkills: string[];
  results: RealSolverResult[];
  searchSummary: { elapsed: number; totalSearched: number } | null;
  sortBy: string;
  isLoading: boolean;
  isDataLoading: boolean;
  dataLoaded: boolean;
  dataIndex: any;
  skillsList: any[];
  armorSets: any[];

  // Actions
  setTheme: (theme: 'dark' | 'light') => void;
  setWeaponSlots: (slots: number[]) => void;
  setTargetSkills: (skills: SkillFilter[]) => void;
  setSelectedSetBonuses: (setBonuses: string[]) => void;
  setSelectedGroupSkills: (groupSkills: string[]) => void;
  setResults: (results: RealSolverResult[]) => void;
  setSearchSummary: (summary: { elapsed: number; totalSearched: number } | null) => void;
  setSortBy: (sortBy: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsDataLoading: (isDataLoading: boolean) => void;
  setDataLoaded: (dataLoaded: boolean) => void;
  setDataIndex: (dataIndex: any) => void;
  setSkillsList: (skillsList: any[]) => void;
  setArmorSets: (armorSets: any[]) => void;
}

export const useStore = create<AppState>((set) => ({
  theme: 'dark',
  weaponSlots: [],
  targetSkills: [],
  selectedSetBonuses: [],
  selectedGroupSkills: [],
  // weaponSlots: [3, 3, 3],
  // targetSkills: [
  //   {
  //     "name": "Critical Boost",
  //     "level": 3,
  //     "maxLevel": 5,
  //     "kind": "weapon"
  //   },
  //   {
  //     "name": "Tetrad Shot",
  //     "level": 3,
  //     "maxLevel": 3,
  //     "kind": "weapon"
  //   },
  //   {
  //     "name": "Water Attack",
  //     "level": 1,
  //     "maxLevel": 3,
  //     "kind": "weapon"
  //   },
  //   {
  //     "name": "Spread/Power Shots",
  //     "level": 1,
  //     "maxLevel": 1,
  //     "kind": "weapon"
  //   },
  //   {
  //     "name": "Adrenaline Rush",
  //     "level": 5,
  //     "maxLevel": 5,
  //     "kind": "armor"
  //   },
  //   {
  //     "name": "Weakness Exploit",
  //     "level": 5,
  //     "maxLevel": 5,
  //     "kind": "armor"
  //   },
  //   {
  //     "name": "Constitution",
  //     "level": 5,
  //     "maxLevel": 5,
  //     "kind": "armor"
  //   },
  //   {
  //     "name": "Peak Performance",
  //     "level": 4,
  //     "maxLevel": 5,
  //     "kind": "armor"
  //   },
  //   {
  //     "name": "Burst",
  //     "level": 4,
  //     "maxLevel": 5,
  //     "kind": "armor"
  //   },
  //   {
  //     "name": "Stamina Surge",
  //     "level": 3,
  //     "maxLevel": 3,
  //     "kind": "armor"
  //   },
  //   {
  //     "name": "Speed Eating",
  //     "level": 2,
  //     "maxLevel": 3,
  //     "kind": "armor"
  //   },
  //   {
  //     "name": "Agitator",
  //     "level": 1,
  //     "maxLevel": 5,
  //     "kind": "armor"
  //   },
  //   {
  //     "name": "Aquatic/Oilsilt Mobility",
  //     "level": 1,
  //     "maxLevel": 2,
  //     "kind": "armor"
  //   },
  //   {
  //     "name": "Gogmapocalypse",
  //     "level": 2,
  //     "maxLevel": 2,
  //     "kind": "set"
  //   },
  //   {
  //     "name": "Ebony Odogaron's Power",
  //     "level": 1,
  //     "maxLevel": 2,
  //     "kind": "set"
  //   },
  //   {
  //     "name": "Rathalos's Flare",
  //     "level": 1,
  //     "maxLevel": 2,
  //     "kind": "set"
  //   }
  // ],
  // selectedSetBonuses: ["Gogmapocalypse"],
  // selectedGroupSkills: ["Lord's Soul"],
  results: [],
  searchSummary: null,
  sortBy: 'defense',
  isLoading: false,
  isDataLoading: false,
  dataLoaded: false,
  dataIndex: null,
  skillsList: [],
  armorSets: [],

  setTheme: (theme) => set({ theme }),
  setWeaponSlots: (weaponSlots) => set({ weaponSlots }),
  setTargetSkills: (targetSkills) => set({ targetSkills }),
  setSelectedSetBonuses: (selectedSetBonuses) => set({ selectedSetBonuses }),
  setSelectedGroupSkills: (selectedGroupSkills) => set({ selectedGroupSkills }),
  setResults: (results) => set({ results }),
  setSearchSummary: (searchSummary) => set({ searchSummary }),
  setSortBy: (sortBy) => set({ sortBy }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsDataLoading: (isDataLoading) => set({ isDataLoading }),
  setDataLoaded: (dataLoaded) => set({ dataLoaded }),
  setDataIndex: (dataIndex) => set({ dataIndex }),
  setSkillsList: (skillsList) => set({ skillsList }),
  setArmorSets: (armorSets) => set({ armorSets }),
}));
