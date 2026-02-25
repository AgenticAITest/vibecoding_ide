import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { useUIStore } from './store/uiStore';
import { useFileWatcher } from './hooks/useFileWatcher';
import { usePreviewWatcher } from './hooks/usePreviewWatcher';
import './App.css';

function App() {
  const toggleFileTree = useUIStore((s) => s.toggleFileTree);

  // Start file tree loading and WS file change listening
  useFileWatcher();

  // Listen for Expo URL detection from terminal output
  usePreviewWatcher();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        toggleFileTree();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFileTree]);

  return <AppShell />;
}

export default App;
