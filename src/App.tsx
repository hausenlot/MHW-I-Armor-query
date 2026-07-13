import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ResultsContainer } from './components/ResultsContainer';
import { useStore } from './state/store';
import { loadGameData } from './handler/dataHandler';
import { solveArmorSets } from './handler/solverHandler';

function App() {
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const isLoading = useStore((state) => state.isLoading);
  const isDataLoading = useStore((state) => state.isDataLoading);

  // Load game data on mount
  useEffect(() => {
    loadGameData();
  }, []);

  // Sync state with HTML tag attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (isDataLoading) {
    return (
      <div className="app-loading-screen" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-main)'
      }}>
        <div className="skeleton-shimmer skeleton-item" style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '16px' }} />
        <div>Loading Database...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar onSearch={solveArmorSets} isSearching={isLoading} />
      <ResultsContainer
        isLoading={isLoading}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    </div>
  );
}

export default App;
