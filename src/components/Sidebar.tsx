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
  const selectedWeaponSkills = useStore((state) => state.selectedWeaponSkills);
  const setSelectedWeaponSkills = useStore((state) => state.setSelectedWeaponSkills);
  const selectedSetBonuses = useStore((state) => state.selectedSetBonuses);
  const setSelectedSetBonuses = useStore((state) => state.setSelectedSetBonuses);
  const selectedGroupSkills = useStore((state) => state.selectedGroupSkills);
  const setSelectedGroupSkills = useStore((state) => state.setSelectedGroupSkills);
  const skillsList = useStore((state) => state.skillsList);
  const maxResults = useStore((state) => state.maxResults);
  const setMaxResults = useStore((state) => state.setMaxResults);
  const setResults = useStore((state) => state.setResults);
  const setSearchSummary = useStore((state) => state.setSearchSummary);

  const hasActiveSkills = targetSkills.some((s) => s.level > 0);

  // Automatically reset results and search summary if there are no active target skills
  useEffect(() => {
    if (!hasActiveSkills) {
      setResults([]);
      setSearchSummary(null);
    }
  }, [hasActiveSkills, setResults, setSearchSummary]);

  // Search input states
  const [skillSearch, setSkillSearch] = useState('');
  const [weaponSkillSearch, setWeaponSkillSearch] = useState('');
  const [setBonusSearch, setSetBonusSearch] = useState('');
  const [groupSkillSearch, setGroupSkillSearch] = useState('');

  // Autocomplete suggestions state
  const [focusedInput, setFocusedInput] = useState<'setBonus' | 'groupSkill' | 'targetSkill' | 'weaponSkill' | null>(null);

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

  const typedWeaponSkillSearch = weaponSkillSearch.trim().toLowerCase();
  const filteredWeaponSkills = typedWeaponSkillSearch
    ? skillsList
      .filter((s) => s.kind === 'weapon' && s.name.toLowerCase().includes(typedWeaponSkillSearch))
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

  const handleWeaponSkillLevelChange = (index: number, change: number) => {
    setSelectedWeaponSkills(
      selectedWeaponSkills.map((skill, i) => {
        if (i === index) {
          const newLevel = Math.max(0, Math.min(skill.maxLevel, skill.level + change));
          return { ...skill, level: newLevel };
        }
        return skill;
      })
    );
  };

  const removeWeaponSkill = (index: number) => {
    setSelectedWeaponSkills(selectedWeaponSkills.filter((_, i) => i !== index));
  };

  const addWeaponSkill = (name: string) => {
    if (!name.trim()) return;
    if (selectedWeaponSkills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setWeaponSkillSearch('');
      setFocusedInput(null);
      return;
    }
    const matchedSkill = skillsList.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
    const maxLevel = matchedSkill ? matchedSkill.ranks.length : 5;
    const kind = matchedSkill ? matchedSkill.kind : 'weapon';

    setSelectedWeaponSkills([...selectedWeaponSkills, { name, level: 1, maxLevel, kind }]);
    setWeaponSkillSearch('');
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
        {/* Weapon Configuration Group */}
        <div className="glass-panel" style={{
          padding: '16px',
          borderRadius: 'var(--border-radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          background: 'rgba(255, 255, 255, 0.015)'
        }}>
          <div style={{
            fontWeight: 600,
            fontSize: '0.8rem',
            color: 'var(--color-primary)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '8px',
            marginBottom: '-4px'
          }}>
            Weapon Configuration
          </div>

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

          {/* Weapon Innate Skills Section */}
          <div>
            <div className="sidebar-section-title">
              <span>Weapon Innate Skills</span>
            </div>
            <div className="skill-search-container">
              <input
                type="text"
                placeholder="Search & add weapon skill..."
                className="skill-search-input"
                value={weaponSkillSearch}
                onChange={(e) => setWeaponSkillSearch(e.target.value)}
                onFocus={() => setFocusedInput('weaponSkill')}
                onKeyDown={(e) => handleKeyDown(e, filteredWeaponSkills, weaponSkillSearch, addWeaponSkill)}
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

              {focusedInput === 'weaponSkill' && weaponSkillSearch.trim().length > 0 && (
                <div className="autocomplete-dropdown glass-panel">
                  {filteredWeaponSkills.map((skill) => {
                    let kindClass = 'skill-kind-standard';
                    let kindLabel = 'Skill';
                    if (skill.kind === 'weapon') {
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
                        onClick={() => addWeaponSkill(skill.name)}
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
                  {filteredWeaponSkills.length === 0 && (
                    <div className="autocomplete-no-results">No skills found</div>
                  )}
                </div>
              )}
            </div>

            <div className="skills-list">
              {selectedWeaponSkills.map((skill, index) => {
                let kindClass = 'skill-kind-standard';
                if (skill.kind === 'weapon') kindClass = 'skill-kind-weapon';
                else if (skill.kind === 'armor') kindClass = 'skill-kind-armor';

                return (
                  <div key={skill.name} className={`skill-row ${kindClass}`} style={{ padding: '6px 10px' }}>
                    <div className="skill-info">
                      <div className="skill-name" style={{ fontSize: '0.8rem' }}>{skill.name}</div>
                      <div className="skill-max-level" style={{ fontSize: '0.65rem' }}>Max Lvl: {skill.maxLevel}</div>
                    </div>
                    <div className="skill-level-control" style={{ gap: '6px' }}>
                      <button
                        className="btn-level"
                        style={{ width: '20px', height: '20px', fontSize: '0.7rem' }}
                        onClick={() => handleWeaponSkillLevelChange(index, -1)}
                        disabled={skill.level === 0}
                      >
                        <Minus size={10} />
                      </button>
                      <span className="skill-level-display" style={{ fontSize: '0.8rem', minWidth: '10px' }}>{skill.level}</span>
                      <button
                        className="btn-level"
                        style={{ width: '20px', height: '20px', fontSize: '0.7rem' }}
                        onClick={() => handleWeaponSkillLevelChange(index, 1)}
                        disabled={skill.level === skill.maxLevel}
                      >
                        <Plus size={10} />
                      </button>
                      <button
                        onClick={() => removeWeaponSkill(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-muted)',
                          cursor: 'pointer',
                          marginLeft: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Remove Skill"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
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
              <span>Weapon Group Skill</span>
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
        </div>

        {/* Search Results Limit Section */}
        <div>
          <div className="sidebar-section-title">
            <span>Max Results Limit</span>
          </div>
          <div className="skill-level-control" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn-level"
              style={{ width: '28px', height: '28px' }}
              onClick={() => setMaxResults(Math.max(1, maxResults - 1))}
              disabled={maxResults <= 1}
            >
              <Minus size={14} />
            </button>
            <input
              type="number"
              min={1}
              max={200}
              className="skill-search-input"
              style={{
                textAlign: 'center',
                padding: '6px 10px',
                fontSize: '0.9rem',
                flex: 1,
              }}
              value={maxResults === 0 ? '' : maxResults}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  setMaxResults(Math.max(0, Math.min(200, val)));
                } else if (e.target.value === '') {
                  setMaxResults(0);
                }
              }}
              onBlur={() => {
                if (maxResults < 1) {
                  setMaxResults(10);
                }
              }}
            />
            <button
              className="btn-level"
              style={{ width: '28px', height: '28px' }}
              onClick={() => setMaxResults(Math.min(200, maxResults + 1))}
              disabled={maxResults >= 200}
            >
              <Plus size={14} />
            </button>
          </div>
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
        {!hasActiveSkills && (
          <div style={{
            fontSize: '0.8rem',
            color: '#ff4d4f',
            marginBottom: '10px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
            <span>⚠️ Add at least one target skill to solve</span>
          </div>
        )}
        <button
          className="btn-primary"
          style={{ width: '100%' }}
          onClick={onSearch}
          disabled={isSearching || !hasActiveSkills}
        >
          {isSearching ? 'Solving Combinations...' : 'Solve Armor Sets'}
        </button>
      </div>
    </aside>
  );
};
