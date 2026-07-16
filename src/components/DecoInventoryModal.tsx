import React, { useState, useMemo } from 'react';
import { X, Search, RotateCcw, ShieldCheck } from 'lucide-react';
import { useStore } from '../state/store';

interface DecoInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DecoInventoryModal: React.FC<DecoInventoryModalProps> = ({ isOpen, onClose }) => {
  const decorationsList = useStore((state) => state.decorationsList);
  const customDecoLimits = useStore((state) => state.customDecoLimits);
  const updateDecoLimit = useStore((state) => state.updateDecoLimit);
  const setCustomDecoLimits = useStore((state) => state.setCustomDecoLimits);
  const skillsList = useStore((state) => state.skillsList);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<'all' | 1 | 2 | 3>('all');
  const [selectedKind, setSelectedKind] = useState<'all' | 'armor' | 'weapon'>('all');

  // Resolve skill names for search matching
  const skillNameMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const skill of skillsList) {
      map.set(skill.id, skill.name.toLowerCase());
    }
    return map;
  }, [skillsList]);

  // Filter decorations
  const filteredDecos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return decorationsList.filter((deco) => {
      // Slot filter
      if (selectedSlot !== 'all' && deco.slot !== selectedSlot) return false;

      // Kind filter
      if (selectedKind !== 'all' && deco.kind !== selectedKind) return false;

      // Search term filter
      if (term) {
        const nameMatches = deco.name.toLowerCase().includes(term);
        const skillMatches = deco.skills.some((ds: any) => {
          const sName = skillNameMap.get(ds.skillId) || '';
          return sName.includes(term);
        });
        return nameMatches || skillMatches;
      }

      return true;
    });
  }, [decorationsList, searchTerm, selectedSlot, selectedKind, skillNameMap]);

  if (!isOpen) return null;

  const handleQuantityChange = (decoId: number, value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      updateDecoLimit(decoId, Math.max(0, Math.min(99, num)));
    } else if (value === '') {
      updateDecoLimit(decoId, 0);
    }
  };

  const adjustQuantity = (decoId: number, change: number) => {
    const current = customDecoLimits[decoId] || 0;
    updateDecoLimit(decoId, Math.max(0, Math.min(99, current + change)));
  };

  const handleResetAll = () => {
    const newLimits: Record<number, number> = {};
    for (const deco of decorationsList) {
      newLimits[deco.id] = 0;
    }
    setCustomDecoLimits(newLimits);
  };

  const handleMaxAll = () => {
    const newLimits: Record<number, number> = {};
    for (const deco of decorationsList) {
      newLimits[deco.id] = 99;
    }
    setCustomDecoLimits(newLimits);
  };

  // Find skill name helper
  const getSkillName = (skillId: number) => {
    const skill = skillsList.find((s) => s.id === skillId);
    return skill ? skill.name : `Skill #${skillId}`;
  };

  return (
    <div className="modal-overlay">
      <div className="deco-modal glass-panel">
        <div className="deco-modal-header">
          <div className="deco-modal-title-group">
            <span className="deco-modal-title">Decoration Inventory</span>
            <span className="deco-modal-subtitle">Configure quantities of decorations you own</span>
          </div>
          <button className="deco-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="deco-modal-toolbar">
          {/* Search bar */}
          <div className="deco-modal-search-container">
            <input
              type="text"
              placeholder="Search by jewel or skill name..."
              className="deco-modal-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={16} className="search-icon" />
          </div>

          {/* Filters */}
          <div className="deco-modal-filters">
            <div className="segmented-group">
              <button
                className={`filter-btn ${selectedSlot === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedSlot('all')}
              >
                All Slots
              </button>
              <button
                className={`filter-btn ${selectedSlot === 1 ? 'active' : ''}`}
                onClick={() => setSelectedSlot(1)}
              >
                Slot 1
              </button>
              <button
                className={`filter-btn ${selectedSlot === 2 ? 'active' : ''}`}
                onClick={() => setSelectedSlot(2)}
              >
                Slot 2
              </button>
              <button
                className={`filter-btn ${selectedSlot === 3 ? 'active' : ''}`}
                onClick={() => setSelectedSlot(3)}
              >
                Slot 3
              </button>
            </div>

            <div className="segmented-group">
              <button
                className={`filter-btn ${selectedKind === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedKind('all')}
              >
                All Types
              </button>
              <button
                className={`filter-btn ${selectedKind === 'armor' ? 'active' : ''}`}
                onClick={() => setSelectedKind('armor')}
              >
                Armor
              </button>
              <button
                className={`filter-btn ${selectedKind === 'weapon' ? 'active' : ''}`}
                onClick={() => setSelectedKind('weapon')}
              >
                Weapon
              </button>
            </div>
          </div>
        </div>

        {/* Modal List Content */}
        <div className="deco-modal-list scroll-container">
          {filteredDecos.length > 0 ? (
            <div className="deco-grid-layout">
              {filteredDecos.map((deco) => {
                const count = customDecoLimits[deco.id] || 0;
                let kindBadgeClass = 'deco-badge-standard';
                if (deco.kind === 'weapon') kindBadgeClass = 'deco-badge-weapon';
                else if (deco.kind === 'armor') kindBadgeClass = 'deco-badge-armor';

                return (
                  <div key={deco.id} className="deco-inventory-item">
                    <div className="deco-item-main">
                      <div className="deco-item-identity">
                        <span className="deco-item-name">{deco.name}</span>
                        <div className="deco-badge-row">
                          <span className={`deco-kind-badge ${kindBadgeClass}`}>{deco.kind}</span>
                          <span className="deco-slot-badge">Slot {deco.slot}</span>
                        </div>
                      </div>
                      
                      <div className="deco-item-skills">
                        {deco.skills.map((ds: any) => (
                          <div key={ds.skillId} className="deco-skill-pill">
                            <span className="deco-skill-name">{getSkillName(ds.skillId)}</span>
                            <span className="deco-skill-level">+{ds.level}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="deco-counter-control">
                      <button
                        className="btn-counter"
                        onClick={() => adjustQuantity(deco.id, -1)}
                        disabled={count <= 0}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className="deco-counter-input"
                        min={0}
                        max={99}
                        value={count === 0 ? '0' : count}
                        onChange={(e) => handleQuantityChange(deco.id, e.target.value)}
                      />
                      <button
                        className="btn-counter"
                        onClick={() => adjustQuantity(deco.id, 1)}
                        disabled={count >= 99}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="deco-modal-empty">
              <span>No decorations match your filters</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="deco-modal-footer">
          <div className="footer-preset-actions">
            <button className="btn-preset-reset" onClick={handleResetAll}>
              <RotateCcw size={13} />
              Reset All (0)
            </button>
            <button className="btn-preset-max" onClick={handleMaxAll}>
              <ShieldCheck size={13} />
              Max All (99)
            </button>
          </div>
          <button className="btn-footer-close" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
