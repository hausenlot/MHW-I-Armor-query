import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus, Search, Trash2 } from 'lucide-react';
import { useStore } from '../state/store';

interface SidebarProps {
  onSearch: () => void;
  isSearching: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSearch, isSearching }) => {
  const weaponSlots = useStore((state) => state.weaponSlots);
  const setWeaponSlots = useStore((state) => state.setWeaponSlots);
  const targetSkills = useStore((state) => state.targetSkills);
  const setTargetSkills = useStore((state) => state.setTargetSkills);
  const selectedSetBonuses = useStore((state) => state.selectedSetBonuses);
  const setSelectedSetBonuses = useStore((state) => state.setSelectedSetBonuses);
  const selectedGroupSkills = useStore((state) => state.selectedGroupSkills);
  const setSelectedGroupSkills = useStore((state) => state.setSelectedGroupSkills);
  const skillsList = useStore((state) => state.skillsList);

  // Search input states
  const [skillSearch, setSkillSearch] = useState('');
  const [setBonusSearch, setSetBonusSearch] = useState('');
  const [groupSkillSearch, setGroupSkillSearch] = useState('');

  // Autocomplete suggestions state
  const [focusedInput, setFocusedInput] = useState<'setBonus' | 'groupSkill' | 'targetSkill' | null>(null);

  const sidebarContentRef = useRef<HTMLDivElement>(null);

  // Click outside listener to dismiss autocomplete
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarContentRef.current &&
        !sidebarContentRef.current.contains(event.target as Node)
      ) {
        setFocusedInput(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter lists based on inputs
  const typedSetBonusSearch = setBonusSearch.trim().toLowerCase();
  const filteredSetBonuses = typedSetBonusSearch
    ? skillsList
      .filter((s) => s.kind === 'set' && s.name.toLowerCase().includes(typedSetBonusSearch))
      .slice(0, 10)
    : [];

  const typedGroupSkillSearch = groupSkillSearch.trim().toLowerCase();
  const filteredGroupSkills = typedGroupSkillSearch
    ? skillsList
      .filter((s) => s.kind === 'group' && s.name.toLowerCase().includes(typedGroupSkillSearch))
      .slice(0, 10)
    : [];

  const typedSkillSearch = skillSearch.trim().toLowerCase();
  const filteredSkills = typedSkillSearch
    ? skillsList
      .filter((s) => s.name.toLowerCase().includes(typedSkillSearch))
      .slice(0, 10)
    : [];

  const handleWeaponSlotChange = (slotIdx: number, change: number) => {
    setWeaponSlots(
      weaponSlots.map((val, idx) => {
        if (idx === slotIdx) {
          return Math.max(0, Math.min(3, val + change));
        }
        return val;
      })
    );
  };

  const handleSkillLevelChange = (index: number, change: number) => {
    setTargetSkills(
      targetSkills.map((skill, i) => {
        if (i === index) {
          const newLevel = Math.max(0, Math.min(skill.maxLevel, skill.level + change));
          return { ...skill, level: newLevel };
        }
        return skill;
      })
    );
  };

  const removeSkill = (index: number) => {
    setTargetSkills(targetSkills.filter((_, i) => i !== index));
  };

  const addSkill = (name: string) => {
    if (!name.trim()) return;
    if (targetSkills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setSkillSearch('');
      setFocusedInput(null);
      return;
    }
    const matchedSkill = skillsList.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
    const maxLevel = matchedSkill ? matchedSkill.ranks.length : 5;
    const kind = matchedSkill ? matchedSkill.kind : 'armor';

    setTargetSkills([...targetSkills, { name, level: 1, maxLevel, kind }]);
    setSkillSearch('');
    setFocusedInput(null);
  };

  const addSetBonus = (name: string) => {
    if (!name.trim()) return;
    setSelectedSetBonuses([name]);
    setSetBonusSearch('');
    setFocusedInput(null);
  };

  const removeSetBonus = (name: string) => {
    setSelectedSetBonuses(selectedSetBonuses.filter((item) => item !== name));
  };

  const addGroupSkill = (name: string) => {
    if (!name.trim()) return;
    setSelectedGroupSkills([name]);
    setGroupSkillSearch('');
    setFocusedInput(null);
  };

  const removeGroupSkill = (name: string) => {
    setSelectedGroupSkills(selectedGroupSkills.filter((item) => item !== name));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    suggestions: any[],
    searchValue: string,
    addFn: (name: string) => void
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        addFn(suggestions[0].name);
      } else if (searchValue.trim()) {
        addFn(searchValue);
      }
    } else if (e.key === 'Escape') {
      setFocusedInput(null);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span>ARMORY QUERY</span>
        </div>
      </div>

      <div className="sidebar-content" ref={sidebarContentRef}>
        {/* 3 Weapon Slots Section */}
        <div>
          <div className="sidebar-section-title">
            <span>Weapon Slots</span>
          </div>
          <div className="weapon-slots-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {weaponSlots.map((val, idx) => (
              <div key={idx} className="weapon-slot-selector" style={{ padding: '8px' }}>
                <span className="weapon-slot-label">Slot {idx + 1}</span>
                <div className="skill-level-control" style={{ marginTop: '4px', gap: '6px' }}>
                  <button
                    className="btn-level"
                    style={{ width: '20px', height: '20px', fontSize: '0.7rem' }}
                    onClick={() => handleWeaponSlotChange(idx, -1)}
                    disabled={val === 0}
                  >
                    <Minus size={10} />
                  </button>
                  <span className="skill-level-display" style={{ fontSize: '0.8rem', minWidth: '10px' }}>{val}</span>
                  <button
                    className="btn-level"
                    style={{ width: '20px', height: '20px', fontSize: '0.7rem' }}
                    onClick={() => handleWeaponSlotChange(idx, 1)}
                    disabled={val === 3}
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weapon Skill Set Bonus Search Bar */}
        <div>
          <div className="sidebar-section-title">
            <span>Weapon Skill Set Bonus</span>
          </div>
          <div className="skill-search-container">
            <input
              type="text"
              placeholder="Search set bonus (e.g. Fulgur Anjanath)..."
              className="skill-search-input"
              value={setBonusSearch}
              onChange={(e) => setSetBonusSearch(e.target.value)}
              onFocus={() => setFocusedInput('setBonus')}
              onKeyDown={(e) => handleKeyDown(e, filteredSetBonuses, setBonusSearch, addSetBonus)}
            />
            <Search
              size={16}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dark)',
              }}
            />

            {focusedInput === 'setBonus' && setBonusSearch.trim().length > 0 && (
              <div className="autocomplete-dropdown glass-panel">
                {filteredSetBonuses.map((skill) => (
                  <div
                    key={skill.id}
                    className="autocomplete-item skill-kind-set"
                    onClick={() => addSetBonus(skill.name)}
                  >
                    <div className="autocomplete-name-desc">
                      <span className="autocomplete-name">{skill.name}</span>
                    </div>
                    <span className="autocomplete-badge">Set Bonus</span>
                  </div>
                ))}
                {filteredSetBonuses.length === 0 && (
                  <div className="autocomplete-no-results">No set bonuses found</div>
                )}
              </div>
            )}
          </div>
          {selectedSetBonuses.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '-10px', marginBottom: '10px' }}>
              {selectedSetBonuses.map((bonus) => (
                <div key={bonus} className="skill-row skill-kind-set">
                  <div className="skill-info">
                    <div className="skill-name">{bonus}</div>
                    <div className="skill-max-level" style={{ color: 'var(--color-set-accent, #f5a623)' }}>Weapon Set Bonus</div>
                  </div>
                  <button
                    onClick={() => removeSetBonus(bonus)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Remove Set Bonus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Group Skill Search Bar */}
        <div>
          <div className="sidebar-section-title">
            <span>Group Skill</span>
          </div>
          <div className="skill-search-container">
            <input
              type="text"
              placeholder="Search group skill (e.g. Lord's Favor)..."
              className="skill-search-input"
              value={groupSkillSearch}
              onChange={(e) => setGroupSkillSearch(e.target.value)}
              onFocus={() => setFocusedInput('groupSkill')}
              onKeyDown={(e) => handleKeyDown(e, filteredGroupSkills, groupSkillSearch, addGroupSkill)}
            />
            <Search
              size={16}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dark)',
              }}
            />

            {focusedInput === 'groupSkill' && groupSkillSearch.trim().length > 0 && (
              <div className="autocomplete-dropdown glass-panel">
                {filteredGroupSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="autocomplete-item skill-kind-group"
                    onClick={() => addGroupSkill(skill.name)}
                  >
                    <div className="autocomplete-name-desc">
                      <span className="autocomplete-name">{skill.name}</span>
                    </div>
                    <span className="autocomplete-badge">Group Skill</span>
                  </div>
                ))}
                {filteredGroupSkills.length === 0 && (
                  <div className="autocomplete-no-results">No group skills found</div>
                )}
              </div>
            )}
          </div>
          {selectedGroupSkills.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '-10px', marginBottom: '10px' }}>
              {selectedGroupSkills.map((skill) => (
                <div key={skill} className="skill-row skill-kind-group">
                  <div className="skill-info">
                    <div className="skill-name">{skill}</div>
                    <div className="skill-max-level" style={{ color: 'var(--color-group-accent, #00f2fe)' }}>Group Skill</div>
                  </div>
                  <button
                    onClick={() => removeGroupSkill(skill)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Remove Group Skill"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Target Skills Section */}
        <div>
          <div className="sidebar-section-title">
            <span>Target Skills</span>
          </div>

          <div className="skill-search-container">
            <input
              type="text"
              placeholder="Search & add target skill..."
              className="skill-search-input"
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              onFocus={() => setFocusedInput('targetSkill')}
              onKeyDown={(e) => handleKeyDown(e, filteredSkills, skillSearch, addSkill)}
            />
            <Search
              size={16}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dark)',
              }}
            />

            {focusedInput === 'targetSkill' && skillSearch.trim().length > 0 && (
              <div className="autocomplete-dropdown glass-panel">
                {filteredSkills.map((skill) => {
                  let kindClass = 'skill-kind-standard';
                  let kindLabel = 'Skill';
                  if (skill.kind === 'set') {
                    kindClass = 'skill-kind-set';
                    kindLabel = 'Set Bonus';
                  } else if (skill.kind === 'group') {
                    kindClass = 'skill-kind-group';
                    kindLabel = 'Group Skill';
                  } else if (skill.kind === 'weapon') {
                    kindClass = 'skill-kind-weapon';
                    kindLabel = 'Weapon';
                  } else if (skill.kind === 'armor') {
                    kindClass = 'skill-kind-armor';
                    kindLabel = 'Armor';
                  }
                  return (
                    <div
                      key={skill.id}
                      className={`autocomplete-item ${kindClass}`}
                      onClick={() => addSkill(skill.name)}
                    >
                      <div className="autocomplete-name-desc">
                        <span className="autocomplete-name">{skill.name}</span>
                        {skill.description && (
                          <span className="autocomplete-desc">{skill.description}</span>
                        )}
                      </div>
                      <span className="autocomplete-badge">{kindLabel}</span>
                    </div>
                  );
                })}
                {filteredSkills.length === 0 && (
                  <div className="autocomplete-no-results">No skills found</div>
                )}
              </div>
            )}
          </div>

          <div className="skills-list">
            {targetSkills.map((skill, index) => {
              let kindClass = 'skill-kind-standard';
              if (skill.kind === 'set') kindClass = 'skill-kind-set';
              else if (skill.kind === 'group') kindClass = 'skill-kind-group';
              else if (skill.kind === 'weapon') kindClass = 'skill-kind-weapon';
              else if (skill.kind === 'armor') kindClass = 'skill-kind-armor';

              return (
                <div key={skill.name} className={`skill-row ${kindClass}`}>
                  <div className="skill-info">
                    <div className="skill-name">{skill.name}</div>
                    <div className="skill-max-level">Max Lvl: {skill.maxLevel}</div>
                  </div>
                  <div className="skill-level-control">
                    <button
                      className="btn-level"
                      onClick={() => handleSkillLevelChange(index, -1)}
                      disabled={skill.level === 0}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="skill-level-display">{skill.level}</span>
                    <button
                      className="btn-level"
                      onClick={() => handleSkillLevelChange(index, 1)}
                      disabled={skill.level === skill.maxLevel}
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={() => removeSkill(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-dark)',
                        cursor: 'pointer',
                        marginLeft: '6px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Remove Skill"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <button
          className="btn-primary"
          style={{ width: '100%' }}
          onClick={onSearch}
          disabled={isSearching}
        >
          {isSearching ? 'Solving Combinations...' : 'Solve Armor Sets'}
        </button>
      </div>
    </aside>
  );
};
