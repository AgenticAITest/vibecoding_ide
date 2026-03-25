import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useTabStore } from '../../store/tabStore';
import './StatusBar.css';

export function StatusBar() {
  const toggleFileTree = useUIStore((s) => s.toggleFileTree);
  const fileTreeVisible = useUIStore((s) => s.fileTreeVisible);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const openTab = useTabStore((s) => s.openTab);

  const handleOpenSettings = () => {
    openTab({ id: 'settings', type: 'settings', label: 'Settings', closable: true });
  };

  return (
    <div className="status-bar">
      <div className="status-bar__left">
        <span className="status-bar__label">Mobile Vibing</span>
      </div>
      <div className="status-bar__right">
        <button
          className="status-bar__btn"
          onClick={handleOpenSettings}
          title="Settings"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button
          className={`status-bar__btn ${fileTreeVisible ? 'status-bar__btn--active' : ''}`}
          onClick={toggleFileTree}
          title="Toggle file tree (Ctrl+E)"
        >
          Files
        </button>
        {user && (
          <>
            <span className="status-bar__user">
              {user.username}
              {user.role === 'admin' && <span className="status-bar__role">admin</span>}
            </span>
            <button
              className="status-bar__btn status-bar__btn--logout"
              onClick={logout}
              title="Log out"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
