import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import './StatusBar.css';

export function StatusBar() {
  const toggleFileTree = useUIStore((s) => s.toggleFileTree);
  const fileTreeVisible = useUIStore((s) => s.fileTreeVisible);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="status-bar">
      <div className="status-bar__left">
        <span className="status-bar__label">Mobile Vibing</span>
      </div>
      <div className="status-bar__right">
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
