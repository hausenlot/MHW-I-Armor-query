import React from 'react';

export const ResultCardSkeleton: React.FC = () => {
  return (
    <div className="result-card glass-panel" style={{ minHeight: '380px' }}>
      {/* Header Skeleton */}
      <div className="card-top-header">
        <div className="card-title-group">
          <div className="skeleton-item skeleton-shimmer skeleton-title"></div>
          <div className="skeleton-item skeleton-shimmer skeleton-subtitle"></div>
        </div>
        <div className="skeleton-item skeleton-shimmer skeleton-badge"></div>
      </div>

      {/* Resistances Skeleton */}
      <div className="element-resists">
        <div className="skeleton-item skeleton-shimmer" style={{ width: '45px', height: '18px', borderRadius: '4px' }}></div>
        <div className="skeleton-item skeleton-shimmer" style={{ width: '45px', height: '18px', borderRadius: '4px' }}></div>
        <div className="skeleton-item skeleton-shimmer" style={{ width: '45px', height: '18px', borderRadius: '4px' }}></div>
        <div className="skeleton-item skeleton-shimmer" style={{ width: '45px', height: '18px', borderRadius: '4px' }}></div>
        <div className="skeleton-item skeleton-shimmer" style={{ width: '45px', height: '18px', borderRadius: '4px' }}></div>
      </div>

      {/* Equipment List Skeleton */}
      <div className="card-gear-list">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div className="gear-item" key={idx}>
            <div className="gear-meta">
              <div 
                className="skeleton-item skeleton-shimmer" 
                style={{ width: '56px', height: '24px', borderRadius: '4px' }}
              ></div>
              <div className="gear-details" style={{ gap: '4px' }}>
                <div className="skeleton-item skeleton-shimmer skeleton-gear-text-1"></div>
                <div className="skeleton-item skeleton-shimmer skeleton-gear-text-2"></div>
              </div>
            </div>
            {/* Slots skeleton */}
            <div className="gear-slots-container" style={{ gap: '6px' }}>
              <div className="skeleton-item skeleton-shimmer" style={{ width: '18px', height: '18px', borderRadius: '50%' }}></div>
              <div className="skeleton-item skeleton-shimmer" style={{ width: '18px', height: '18px', borderRadius: '50%' }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Skills Badges Skeleton */}
      <div className="card-skills-summary">
        <div className="skeleton-item skeleton-shimmer skeleton-skill-badge"></div>
        <div className="skeleton-item skeleton-shimmer skeleton-skill-badge" style={{ width: '100px' }}></div>
        <div className="skeleton-item skeleton-shimmer skeleton-skill-badge" style={{ width: '70px' }}></div>
        <div className="skeleton-item skeleton-shimmer skeleton-skill-badge" style={{ width: '90px' }}></div>
      </div>
    </div>
  );
};
