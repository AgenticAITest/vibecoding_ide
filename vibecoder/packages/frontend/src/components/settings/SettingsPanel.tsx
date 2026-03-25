import { useEffect, useState } from 'react';
import { settingsApi, type ResolvedExpoDeps } from '../../lib/api';
import './SettingsPanel.css';

export function SettingsPanel() {
  const [deps, setDeps] = useState<ResolvedExpoDeps | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModules, setShowModules] = useState(false);

  const loadDeps = async () => {
    try {
      setLoading(true);
      setError(null);
      const { deps } = await settingsApi.getExpoDeps();
      setDeps(deps);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDeps(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    setSuccess(null);
    try {
      const { deps, refreshed } = await settingsApi.refreshExpoDeps();
      setDeps(deps);
      if (refreshed) {
        setSuccess(`Updated to expo@${deps.expoVersion} (react ${deps.react}, react-native ${deps.reactNative})`);
        setTimeout(() => setSuccess(null), 8000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh from npm registry');
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const isStale = deps
    ? Date.now() - new Date(deps.resolvedAt).getTime() > 24 * 60 * 60 * 1000
    : false;

  return (
    <div className="settings">
      <h2 className="settings__title">Settings</h2>

      {/* Expo Dependencies Section */}
      <div className="settings__section">
        <div className="settings__section-header">
          <div>
            <h3 className="settings__section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18" />
                <rect x="4" y="8" width="16" height="12" rx="2" />
                <path d="M2 8h20" />
              </svg>
              Expo SDK Dependencies
            </h3>
            <p className="settings__section-subtitle">
              Versions used when scaffolding new React Native projects
            </p>
          </div>
          <button
            className={`settings__refresh-btn ${refreshing ? 'settings__refresh-btn--spinning' : ''}`}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23,4 23,10 17,10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh from npm'}
          </button>
        </div>

        {error && (
          <div className="settings__alert settings__alert--error">{error}</div>
        )}
        {success && (
          <div className="settings__alert settings__alert--success">{success}</div>
        )}

        {loading ? (
          <div className="settings__loading">
            <div className="settings__spinner" />
            Loading dependency info...
          </div>
        ) : deps ? (
          <>
            <div className="settings__deps-grid">
              <div className="settings__dep-card">
                <p className="settings__dep-label">Expo SDK</p>
                <p className="settings__dep-value settings__dep-value--accent">{deps.expoVersion}</p>
              </div>
              <div className="settings__dep-card">
                <p className="settings__dep-label">React</p>
                <p className="settings__dep-value">{deps.react}</p>
              </div>
              <div className="settings__dep-card">
                <p className="settings__dep-label">React DOM</p>
                <p className="settings__dep-value">{deps.reactDom}</p>
              </div>
              <div className="settings__dep-card">
                <p className="settings__dep-label">React Native</p>
                <p className="settings__dep-value">{deps.reactNative}</p>
              </div>
            </div>

            <div className="settings__meta">
              <span>
                <span className={`settings__meta-dot ${isStale ? 'settings__meta-dot--stale' : 'settings__meta-dot--fresh'}`} />
                {' '}{isStale ? 'Stale' : 'Fresh'}
              </span>
              <span>Last resolved: {formatDate(deps.resolvedAt)}</span>
              <span>{Object.keys(deps.bundledModules).length} bundled modules</span>
            </div>

            <button
              className="settings__modules-toggle"
              onClick={() => setShowModules(!showModules)}
            >
              {showModules ? 'Hide' : 'Show'} bundled module versions
            </button>

            {showModules && (
              <div className="settings__modules-list">
                {Object.entries(deps.bundledModules)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([pkg, ver]) => (
                    <div key={pkg} className="settings__modules-row">
                      <span className="settings__modules-pkg">{pkg}</span>
                      <span className="settings__modules-ver">{ver}</span>
                    </div>
                  ))}
              </div>
            )}
          </>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No dependency data available.</p>
        )}
      </div>
    </div>
  );
}
