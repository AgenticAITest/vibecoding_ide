import { useEffect, useState } from 'react';
import { useGitStore } from '../../store/gitStore';
import { gitApi } from '../../lib/api';
import './GitPanel.css';

export function GitPanel() {
  const status = useGitStore((s) => s.status);
  const log = useGitStore((s) => s.log);
  const branches = useGitStore((s) => s.branches);
  const isLoading = useGitStore((s) => s.isLoading);
  const error = useGitStore((s) => s.error);
  const commitMessage = useGitStore((s) => s.commitMessage);
  const fetchStatus = useGitStore((s) => s.fetchStatus);
  const fetchLog = useGitStore((s) => s.fetchLog);
  const fetchBranches = useGitStore((s) => s.fetchBranches);
  const stageFiles = useGitStore((s) => s.stageFiles);
  const stageAll = useGitStore((s) => s.stageAll);
  const unstageFiles = useGitStore((s) => s.unstageFiles);
  const commit = useGitStore((s) => s.commit);
  const push = useGitStore((s) => s.push);
  const pull = useGitStore((s) => s.pull);
  const initRepo = useGitStore((s) => s.initRepo);
  const setCommitMessage = useGitStore((s) => s.setCommitMessage);
  const clearError = useGitStore((s) => s.clearError);

  const [showHistory, setShowHistory] = useState(false);
  const [showBranches, setShowBranches] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchLog();
    fetchBranches();
  }, [fetchStatus, fetchLog, fetchBranches]);

  // Auto-refresh on tab focus
  useEffect(() => {
    const onFocus = () => {
      fetchStatus();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchStatus]);

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

      {/* Error */}
      {error && (
        <div className="git__error">
          <span>{error}</span>
          <button className="git__error-dismiss" onClick={clearError}>x</button>
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
            onClick={commit}
          >
            {isLoading ? 'Committing...' : 'Commit'}
          </button>
        </div>

        {/* Sync */}
        <div className="git__sync">
          <button
            className="git__btn git__btn--secondary"
            onClick={push}
            disabled={isLoading}
          >
            Push
            {status.ahead > 0 && <span className="git__badge">{status.ahead}</span>}
          </button>
          <button
            className="git__btn git__btn--secondary"
            onClick={pull}
            disabled={isLoading}
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
