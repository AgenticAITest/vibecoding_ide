import { useTabStore } from '../../store/tabStore';
import { useUIStore } from '../../store/uiStore';
import { useTerminal } from '../../hooks/useTerminal';
import './TabBar.css';

export function TabBar() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const openTab = useTabStore((s) => s.openTab);
  const toggleFileTree = useUIStore((s) => s.toggleFileTree);
  const fileTreeVisible = useUIStore((s) => s.fileTreeVisible);
  const { openNewTerminal } = useTerminal();

  const openPreview = () => {
    openTab({ id: 'preview', type: 'preview', label: 'Preview', closable: true });
  };

  const openConsole = () => {
    openTab({ id: 'console', type: 'console', label: 'Console', closable: true });
  };

  const openGit = () => {
    openTab({ id: 'git', type: 'git', label: 'Git', closable: true });
  };

  return (
    <div className="tab-bar">
      <div className="tab-bar__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-bar__tab ${tab.id === activeTabId ? 'tab-bar__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-bar__tab-label">{tab.label}</span>
            {tab.closable && (
              <span
                className="tab-bar__tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                ×
              </span>
            )}
          </button>
        ))}
      </div>
      <button
        className="tab-bar__icon-btn"
        onClick={openNewTerminal}
        title="New terminal (Ctrl+`)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2,11 6,7 2,3" />
          <line x1="8" y1="13" x2="14" y2="13" />
        </svg>
      </button>
      <button
        className={`tab-bar__icon-btn ${activeTabId === 'console' ? 'tab-bar__icon-btn--active' : ''}`}
        onClick={openConsole}
        title="Console"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="2" width="14" height="12" rx="2" />
          <polyline points="4,7 6.5,9.5 4,12" />
          <line x1="9" y1="12" x2="12" y2="12" />
        </svg>
      </button>
      <button
        className={`tab-bar__icon-btn ${activeTabId === 'preview' ? 'tab-bar__icon-btn--active' : ''}`}
        onClick={openPreview}
        title="Preview"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
          <circle cx="8" cy="8" r="2" />
        </svg>
      </button>
      <button
        className={`tab-bar__icon-btn ${activeTabId === 'git' ? 'tab-bar__icon-btn--active' : ''}`}
        onClick={openGit}
        title="Git"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="2" x2="5" y2="11" />
          <circle cx="11" cy="5" r="2" />
          <circle cx="5" cy="13" r="2" />
          <path d="M11 7a6 6 0 0 1-6 6" />
        </svg>
      </button>
      <button
        className={`tab-bar__icon-btn ${fileTreeVisible ? 'tab-bar__icon-btn--active' : ''}`}
        onClick={toggleFileTree}
        title="Toggle file tree (Ctrl+E)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="2" width="5" height="12" rx="1" />
          <rect x="8" y="2" width="7" height="5" rx="1" />
          <rect x="8" y="9" width="7" height="5" rx="1" />
        </svg>
      </button>
    </div>
  );
}
