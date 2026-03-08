import { useEffect, useState } from 'react';
import { useGitStore } from '../../store/gitStore';
import { gitApi } from '../../lib/api';
import './GitPanel.css';

type OperationStatus = {
  type: 'info' | 'success' | 'error';
  message: string;
} | null;

export function GitPanel() {
  const status = useGitStore((s) => s.status);
  const log = useGitStore((s) => s.log);
  const branches = useGitStore((s) => s.branches);
  const remotes = useGitStore((s) => s.remotes);
  const credentialsSet = useGitStore((s) => s.credentialsSet);
  const isLoading = useGitStore((s) => s.isLoading);
  const error = useGitStore((s) => s.error);
  const commitMessage = useGitStore((s) => s.commitMessage);
  const fetchStatus = useGitStore((s) => s.fetchStatus);
  const fetchLog = useGitStore((s) => s.fetchLog);
  const fetchBranches = useGitStore((s) => s.fetchBranches);
  const fetchRemotes = useGitStore((s) => s.fetchRemotes);
  const stageFiles = useGitStore((s) => s.stageFiles);
  const stageAll = useGitStore((s) => s.stageAll);
  const unstageFiles = useGitStore((s) => s.unstageFiles);
  const commit = useGitStore((s) => s.commit);
  const pushAction = useGitStore((s) => s.push);
  const pull = useGitStore((s) => s.pull);
  const initRepo = useGitStore((s) => s.initRepo);
  const removeRemote = useGitStore((s) => s.removeRemote);
  const saveCredentials = useGitStore((s) => s.saveCredentials);
  const connectAndPush = useGitStore((s) => s.connectAndPush);
  const setCommitMessage = useGitStore((s) => s.setCommitMessage);
  const clearError = useGitStore((s) => s.clearError);

  const [showHistory, setShowHistory] = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [showRemoteForm, setShowRemoteForm] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [token, setToken] = useState('');
  const [opStatus, setOpStatus] = useState<OperationStatus>(null);

  const hasOrigin = remotes.some((r) => r.name === 'origin');
  const originUrl = remotes.find((r) => r.name === 'origin')?.pushUrl || '';
  const displayUrl = originUrl.replace(/https?:\/\//, '').replace(/\.git$/, '');

  useEffect(() => {
    fetchStatus();
    fetchLog();
    fetchBranches();
    fetchRemotes();
  }, [fetchStatus, fetchLog, fetchBranches, fetchRemotes]);

  // Auto-refresh on tab focus
  useEffect(() => {
    const onFocus = () => { fetchStatus(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchStatus]);

  // Show store-level errors as operation status
  useEffect(() => {
    if (error) {
      setOpStatus({ type: 'error', message: error });
    }
  }, [error]);

  // Auto-clear success messages after 5s
  useEffect(() => {
    if (opStatus?.type === 'success') {
      const t = setTimeout(() => setOpStatus(null), 5000);
      return () => clearTimeout(t);
    }
  }, [opStatus]);

  const handleDismissStatus = () => {
    setOpStatus(null);
    clearError();
  };

  const handleConnectAndPush = async () => {
    const url = remoteUrl.trim();
    const pat = token.trim() || undefined;
    if (!url) return;

    setOpStatus({ type: 'info', message: 'Connecting to GitHub and pushing...' });
    setShowRemoteForm(false);
    setRemoteUrl('');
    setToken('');

    await connectAndPush(url, pat);

    // Check if store has error after operation
    const storeError = useGitStore.getState().error;
    if (storeError) {
      setOpStatus({ type: 'error', message: storeError });
    } else {
      setOpStatus({ type: 'success', message: 'Connected and pushed to GitHub!' });
    }
  };

  const handlePush = async () => {
    if (!hasOrigin) {
      setShowRemoteForm(true);
      return;
    }
    setOpStatus({ type: 'info', message: 'Pushing to GitHub...' });
    await pushAction();
    const storeError = useGitStore.getState().error;
    if (storeError) {
      setOpStatus({ type: 'error', message: storeError });
    } else {
      setOpStatus({ type: 'success', message: 'Push successful!' });
    }
  };

  const handlePull = async () => {
    setOpStatus({ type: 'info', message: 'Pulling from GitHub...' });
    await pull();
    const storeError = useGitStore.getState().error;
    if (storeError) {
      setOpStatus({ type: 'error', message: storeError });
    } else {
      setOpStatus({ type: 'success', message: 'Pull successful!' });
    }
  };

  const handleCommit = async () => {
    setOpStatus({ type: 'info', message: 'Committing...' });
    await commit();
    const storeError = useGitStore.getState().error;
    if (storeError) {
      setOpStatus({ type: 'error', message: storeError });
    } else {
      setOpStatus({ type: 'success', message: 'Committed!' });
    }
  };

  const handleDisconnect = async () => {
    await removeRemote('origin');
    setOpStatus({ type: 'success', message: 'Disconnected from remote.' });
  };

  const handleSaveToken = async () => {
    if (!token.trim()) return;
    setOpStatus({ type: 'info', message: 'Saving token...' });
    await saveCredentials(token.trim());
    setToken('');
    const storeError = useGitStore.getState().error;
    if (storeError) {
      setOpStatus({ type: 'error', message: storeError });
    } else {
      setOpStatus({ type: 'success', message: 'Token saved!' });
    }
  };

  // Not a repo
  if (status && !status.isRepo) {
    return (
      <div className="git">
        <div className="git__empty">
          <div className="git__empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
          </div>
          <p className="git__empty-title">No repository found</p>
          <p className="git__empty-hint">Initialize a git repository to start tracking changes</p>
          <button
            className="git__btn git__btn--primary"
            onClick={initRepo}
            disabled={isLoading}
          >
            {isLoading ? 'Initializing...' : 'Initialize Repository'}
          </button>
        </div>
      </div>
    );
  }

  // Loading initial state
  if (!status) {
    return (
      <div className="git">
        <div className="git__empty">
          <p className="git__empty-hint">Loading git status...</p>
        </div>
      </div>
    );
  }

  const hasStaged = status.staged.length > 0;
  const hasUnstaged = status.unstaged.length > 0;
  const hasUntracked = status.untracked.length > 0;
  const hasChanges = hasStaged || hasUnstaged || hasUntracked;
  const canCommit = hasStaged && commitMessage.trim().length > 0;

  return (
    <div className="git">
      {/* Header */}
      <div className="git__header">
        <div className="git__branch">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="3" x2="6" y2="15" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M18 9a9 9 0 0 1-9 9" />
          </svg>
          <button
            className="git__branch-name"
            onClick={() => setShowBranches(!showBranches)}
          >
            {status.branch}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6,9 12,15 18,9" />
            </svg>
          </button>
        </div>
        <button className="git__refresh-btn" onClick={fetchStatus} title="Refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23,4 23,10 17,10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>

      {/* Branch selector dropdown */}
      {showBranches && branches.length > 0 && (
        <div className="git__branches-dropdown">
          {branches.map((b) => (
            <button
              key={b.name}
              className={`git__branch-item ${b.current ? 'git__branch-item--current' : ''}`}
              onClick={() => {
                if (!b.current) {
                  gitApi.checkout(b.name).then(() => {
                    fetchStatus();
                    fetchLog();
                    setShowBranches(false);
                  });
                } else {
                  setShowBranches(false);
                }
              }}
            >
              {b.current && <span className="git__branch-check">*</span>}
              {b.name}
            </button>
          ))}
        </div>
      )}

      {/* GitHub Remote — PROMINENT at top */}
      <div className="git__remote-bar">
        {hasOrigin ? (
          <div className="git__remote-connected">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            <span className="git__remote-display-url" title={originUrl}>
              {displayUrl}
            </span>
            <button
              className="git__remote-disconnect"
              onClick={handleDisconnect}
              title="Disconnect"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {!credentialsSet && (
              <button
                className="git__remote-token-btn"
                onClick={() => setShowRemoteForm(true)}
                title="Add token for push access"
              >
                Add Token
              </button>
            )}
          </div>
        ) : (
          <button
            className="git__remote-connect-btn"
            onClick={() => setShowRemoteForm(!showRemoteForm)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            Connect to GitHub
          </button>
        )}
      </div>

      {/* Connect form (expandable) */}
      {showRemoteForm && (
        <div className="git__remote-form">
          {!hasOrigin && (
            <input
              className="git__remote-input"
              placeholder="https://github.com/user/repo.git"
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              autoFocus
            />
          )}
          {!credentialsSet && (
            <input
              className="git__remote-input"
              type="password"
              placeholder="GitHub Personal Access Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          )}
          {credentialsSet && (
            <div className="git__remote-cred-ok">Token saved</div>
          )}
          <div className="git__remote-form-actions">
            {!hasOrigin ? (
              <button
                className="git__btn git__btn--primary git__btn--full"
                disabled={isLoading || !remoteUrl.trim()}
                onClick={handleConnectAndPush}
              >
                {isLoading ? 'Connecting...' : 'Connect & Push'}
              </button>
            ) : (
              <button
                className="git__btn git__btn--primary git__btn--full"
                disabled={isLoading || !token.trim()}
                onClick={handleSaveToken}
              >
                {isLoading ? 'Saving...' : 'Save Token'}
              </button>
            )}
            <button
              className="git__btn git__btn--secondary git__btn--full"
              onClick={() => setShowRemoteForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Operation status banner */}
      {opStatus && (
        <div className={`git__status-banner git__status-banner--${opStatus.type}`}>
          {opStatus.type === 'info' && (
            <span className="git__status-spinner" />
          )}
          {opStatus.type === 'success' && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20,6 9,17 4,12" />
            </svg>
          )}
          {opStatus.type === 'error' && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          )}
          <span className="git__status-message">{opStatus.message}</span>
          <button className="git__status-dismiss" onClick={handleDismissStatus}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <div className="git__body">
        {/* Changes */}
        {!hasChanges && (
          <div className="git__no-changes">
            <p>Nothing to commit, working tree clean</p>
          </div>
        )}

        {/* Staged changes */}
        {hasStaged && (
          <div className="git__section">
            <div className="git__section-header">
              <span className="git__section-title">Staged Changes ({status.staged.length})</span>
              <button
                className="git__section-action"
                onClick={() => unstageFiles(status.staged.map((f) => f.path))}
                title="Unstage All"
              >
                Unstage All
              </button>
            </div>
            <div className="git__file-list">
              {status.staged.map((f) => (
                <div key={f.path} className="git__file">
                  <span className={`git__file-status git__file-status--${f.status}`}>
                    {f.status[0].toUpperCase()}
                  </span>
                  <span className="git__file-path">{f.path}</span>
                  <button
                    className="git__file-action"
                    onClick={() => unstageFiles([f.path])}
                    title="Unstage"
                  >
                    -
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unstaged changes */}
        {hasUnstaged && (
          <div className="git__section">
            <div className="git__section-header">
              <span className="git__section-title">Changes ({status.unstaged.length})</span>
              <button className="git__section-action" onClick={stageAll} title="Stage All">
                Stage All
              </button>
            </div>
            <div className="git__file-list">
              {status.unstaged.map((f) => (
                <div key={f.path} className="git__file">
                  <span className={`git__file-status git__file-status--${f.status}`}>
                    {f.status[0].toUpperCase()}
                  </span>
                  <span className="git__file-path">{f.path}</span>
                  <button
                    className="git__file-action"
                    onClick={() => stageFiles([f.path])}
                    title="Stage"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Untracked files */}
        {hasUntracked && (
          <div className="git__section">
            <div className="git__section-header">
              <span className="git__section-title">Untracked ({status.untracked.length})</span>
              <button className="git__section-action" onClick={stageAll} title="Stage All">
                Stage All
              </button>
            </div>
            <div className="git__file-list">
              {status.untracked.map((filePath) => (
                <div key={filePath} className="git__file">
                  <span className="git__file-status git__file-status--added">U</span>
                  <span className="git__file-path">{filePath}</span>
                  <button
                    className="git__file-action"
                    onClick={() => stageFiles([filePath])}
                    title="Stage"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Commit */}
        <div className="git__commit">
          <textarea
            className="git__commit-input"
            placeholder="Commit message..."
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            rows={3}
          />
          <button
            className="git__btn git__btn--primary git__btn--full"
            disabled={!canCommit || isLoading}
            onClick={handleCommit}
          >
            {isLoading ? 'Committing...' : 'Commit'}
          </button>
        </div>

        {/* Sync */}
        <div className="git__sync">
          <button
            className="git__btn git__btn--secondary"
            onClick={handlePush}
            disabled={isLoading}
          >
            Push
            {status.ahead > 0 && <span className="git__badge">{status.ahead}</span>}
          </button>
          <button
            className="git__btn git__btn--secondary"
            onClick={handlePull}
            disabled={isLoading || !hasOrigin}
            title={!hasOrigin ? 'Connect to GitHub first' : undefined}
          >
            Pull
            {status.behind > 0 && <span className="git__badge">{status.behind}</span>}
          </button>
        </div>

        {/* History */}
        <div className="git__section">
          <div className="git__section-header">
            <button
              className="git__section-title git__section-title--toggle"
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory && log.length === 0) fetchLog();
              }}
            >
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: showHistory ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
              >
                <polyline points="9,6 15,12 9,18" />
              </svg>
              Recent Commits
            </button>
          </div>
          {showHistory && (
            <div className="git__history">
              {log.length === 0 ? (
                <p className="git__history-empty">No commits yet</p>
              ) : (
                log.map((entry) => (
                  <div key={entry.hash} className="git__commit-entry">
                    <span className="git__commit-hash">{entry.shortHash}</span>
                    <span className="git__commit-msg">{entry.message}</span>
                    <span className="git__commit-meta">
                      {entry.author} - {formatRelativeDate(entry.date)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
