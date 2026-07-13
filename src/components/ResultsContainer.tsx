import React from 'react';
import { ResultCard } from './ResultCard';
import { ResultCardSkeleton } from './ResultCardSkeleton';
import { Sun, Moon } from 'lucide-react';
import { useStore } from '../state/store';

interface ResultsContainerProps {
  isLoading: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const ResultsContainer: React.FC<ResultsContainerProps> = ({
  isLoading,
  theme,
  onToggleTheme
}) => {
  const results = useStore((state) => state.results);
  const searchSummary = useStore((state) => state.searchSummary);
  const sortBy = useStore((state) => state.sortBy);
  const setSortBy = useStore((state) => state.setSortBy);

  const getSortedResults = () => {
    return [...results].sort((a, b) => {
      if (sortBy === 'defense') {
        return b.totalDefense.max - a.totalDefense.max;
      }
      if (sortBy === 'skills') {
        return b.activeSkills.length - a.activeSkills.length;
      }
      return 0;
    });
  };

  const sortedResults = getSortedResults();

  return (
    <main className="results-container">
      <div className="results-header">
        <div className="results-summary-info">
          <span className="results-count">
            {isLoading ? '—' : sortedResults.length}
          </span>
          <span className="results-count-label">solutions found</span>
          {!isLoading && searchSummary && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '12px' }}>
              ({searchSummary.totalSearched.toLocaleString()} checked in {searchSummary.elapsed.toFixed(1)}ms)
            </span>
          )}
        </div>

        <div className="results-controls">
          <button
            className="btn-theme-toggle"
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <div className="control-group">
            <span className="control-label">Sort By</span>
            <select
              className="select-styled"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              disabled={isLoading}
            >
              <option value="defense">Max Defense</option>
              <option value="skills">Most Skills</option>
            </select>
          </div>
        </div>
      </div>

      <div className="results-scrollable">
        <div className="results-grid">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <ResultCardSkeleton key={idx} />
            ))
          ) : sortedResults.length > 0 ? (
            sortedResults.map((result) => (
              <ResultCard key={result.id} result={result} />
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
              No configurations match your current target parameters.
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
