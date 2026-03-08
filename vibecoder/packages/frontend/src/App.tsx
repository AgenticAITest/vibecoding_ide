import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './components/auth/LoginPage';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import { useFileWatcher } from './hooks/useFileWatcher';
import { usePreviewWatcher } from './hooks/usePreviewWatcher';
import { useHotReload } from './hooks/useHotReload';
import { reconnectWs } from './hooks/useWebSocket';
import './App.css';

function AuthenticatedApp() {
  const toggleFileTree = useUIStore((s) => s.toggleFileTree);

  // Start file tree loading and WS file change listening
  useFileWatcher();

  // Listen for Expo/Flutter URL detection from terminal output
  usePreviewWatcher();

  // Auto hot-reload Flutter dev server on .dart file changes
  useHotReload();

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

function App() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  // Connect/reconnect WebSocket when auth state changes
  useEffect(() => {
    if (token) {
      reconnectWs();
    }
  }, [token]);

  if (!user) return <LoginPage />;
  return <AuthenticatedApp />;
}

export default App;
