import React from 'react';
import type { RealSolverResult } from '../state/store';

interface ResultCardProps {
  result: RealSolverResult;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  // Assemble unified gear list to render on the card
  const gearItems: Array<{
    type: 'weapon' | 'head' | 'chest' | 'arms' | 'waist' | 'legs' | 'charm';
    name: string;
    slots: number[];
    skills: string;
    source: 'weapon' | 'head' | 'chest' | 'arms' | 'waist' | 'legs' | 'charm';
  }> = [];

  // 1. Weapon
  if (result.weapon) {
    const weaponSkillsStr = result.weapon.skills.map((s: any) => `${s.name} +${s.level}`).join(', ') || '—';
    gearItems.push({
      type: 'weapon',
      name: result.weapon.name || 'Custom Weapon',
      slots: result.weapon.slots || [],
      skills: weaponSkillsStr,
      source: 'weapon'
    });
  }

  // 2. Armor Pieces
  if (result.pieces) {
    for (const piece of result.pieces) {
      const pieceSkillsStr = piece.skills.map((s: any) => `${s.name} +${s.level}`).join(', ') || '—';
      gearItems.push({
        type: piece.kind,
        name: piece.name,
        slots: piece.slots || [],
        skills: pieceSkillsStr,
        source: piece.kind
      });
    }
  }

  // 3. Charm
  if (result.charm) {
    const charmSkillsStr = result.charm.skills.map((s: any) => `${s.name} +${s.level}`).join(', ') || '—';
    gearItems.push({
      type: 'charm',
      name: result.charm.name,
      slots: [],
      skills: charmSkillsStr,
      source: 'charm'
    });
  }

  return (
    <div className="result-card glass-panel">
      {/* Top Summary Header */}
      <div className="card-top-header">
        <div className="card-title-group">
          <span className="card-title">Solution Set</span>
          <span className="card-subtitle">Combo #{result.id}</span>
        </div>
        <div className="card-stats-badges">
          <div className="stat-badge defense">
            <span>{result.totalDefense.max} Def</span>
          </div>
        </div>
      </div>

      {/* Resistances */}
      <div className="element-resists">
        <span className="resist-pill fire">F: {result.totalResistances.fire >= 0 ? `+${result.totalResistances.fire}` : result.totalResistances.fire}</span>
        <span className="resist-pill water">W: {result.totalResistances.water >= 0 ? `+${result.totalResistances.water}` : result.totalResistances.water}</span>
        <span className="resist-pill thunder">T: {result.totalResistances.thunder >= 0 ? `+${result.totalResistances.thunder}` : result.totalResistances.thunder}</span>
        <span className="resist-pill ice">I: {result.totalResistances.ice >= 0 ? `+${result.totalResistances.ice}` : result.totalResistances.ice}</span>
        <span className="resist-pill dragon">D: {result.totalResistances.dragon >= 0 ? `+${result.totalResistances.dragon}` : result.totalResistances.dragon}</span>
      </div>

      {/* Equipment List */}
      <div className="card-gear-list">
        {gearItems.map((item, idx) => {
          // Sort slots descending (e.g. [3, 2, 1])
          const sortedSlots = [...item.slots].sort((a, b) => b - a);
          // Find decos assigned to this piece, sorted descending by slotLevel
          const decosForSource = result.decoAssignments
            .filter((da) => da.slotSource === item.source)
            .sort((a, b) => b.slotLevel - a.slotLevel);

          return (
            <div className="gear-item" key={idx}>
              <div className="gear-meta">
                <div
                  className={`gear-icon-box ${item.type}`}
                  style={{
                    width: '56px',
                    height: '24px',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    borderRadius: '4px'
                  }}
                >
                  {item.type}
                </div>
                <div className="gear-details">
                  <span className="gear-name">{item.name}</span>
                  <span className="gear-skills">{item.skills}</span>
                  {decosForSource.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {decosForSource.map((da, decoIdx) => (
                        <span
                          key={decoIdx}
                          style={{
                            fontSize: '0.65rem',
                            padding: '1px 5px',
                            background: 'rgba(0, 194, 255, 0.08)',
                            border: '1px solid rgba(0, 194, 255, 0.2)',
                            borderRadius: '3px',
                            color: 'var(--color-primary)'
                          }}
                          title={`Socketed in level ${da.slotLevel} slot`}
                        >
                          ✦ {da.decoName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Dec Slots */}
              <div className="gear-slots-container">
                {sortedSlots.map((slotSize, slotIdx) => {
                  // Check if a deco was socketed at this index
                  const hasDeco = decosForSource[slotIdx] !== undefined;
                  return (
                    <div
                      key={slotIdx}
                      className={`deco-slot ${hasDeco ? `filled-${slotSize}` : ''}`}
                      title={hasDeco ? `${decosForSource[slotIdx].decoName} socketed` : `Empty Level ${slotSize} Decoration Slot`}
                    >
                      <span className="deco-slot-inner">{slotSize}</span>
                    </div>
                  );
                })}
                {item.slots.length === 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-border)' }}>—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cumulative Skill Badges */}
      <div className="card-skills-summary">
        {result.activeSkills.map((skill, idx) => {
          const isMaxed = skill.level >= skill.maxLevel;
          const isBonus = skill.isBonusSkill;
          return (
            <span
              key={idx}
              className={`skill-badge ${isMaxed ? 'maxed' : ''} ${isBonus ? 'bonus' : ''}`}
              style={isBonus ? {
                borderColor: 'var(--color-set-accent, #f5a623)',
                color: '#f5a623',
                background: 'rgba(245, 166, 35, 0.08)'
              } : undefined}
            >
              {skill.name} {skill.level}/{skill.maxLevel}
            </span>
          );
        })}
      </div>
    </div>
  );
};
