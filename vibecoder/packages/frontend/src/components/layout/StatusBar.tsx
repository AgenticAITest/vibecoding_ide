import { useUIStore } from '../../store/uiStore';
import './StatusBar.css';

export function StatusBar() {
  const toggleFileTree = useUIStore((s) => s.toggleFileTree);
  const fileTreeVisible = useUIStore((s) => s.fileTreeVisible);

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
      </div>
    </div>
  );
}
