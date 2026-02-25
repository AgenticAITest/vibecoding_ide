import { useEffect, useRef, useState } from 'react';
import { useConsoleStore } from '../../store/consoleStore';
import type { ConsoleEntry, NetworkEntry, LogEntry } from '@vibecoder/shared';
import './ConsolePanel.css';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function getStatusClass(status: number | null): string {
  if (status === null) return 'console__status--fail';
  if (status >= 200 && status < 300) return 'console__status--ok';
  if (status >= 300 && status < 400) return 'console__status--redirect';
  if (status >= 400 && status < 500) return 'console__status--client-error';
  return 'console__status--server-error';
}

function getMethodClass(method: string): string {
  return `console__method--${method.toLowerCase()}`;
}

function ConsoleRow({ entry }: { entry: ConsoleEntry }) {
  return (
    <div className={`console__entry console__entry--${entry.level}`}>
      <span className="console__timestamp">{formatTime(entry.timestamp)}</span>
      <span className={`console__level console__level--${entry.level}`}>
        {entry.level}
      </span>
      <span className="console__message">{entry.args.join(' ')}</span>
    </div>
  );
}

function NetworkRow({ entry }: { entry: NetworkEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="console__entry">
        <span className="console__timestamp">{formatTime(entry.timestamp)}</span>
        <span className={`console__method ${getMethodClass(entry.method)}`}>
          {entry.method}
        </span>
        {entry.status !== null ? (
          <span className={`console__status ${getStatusClass(entry.status)}`}>
            {entry.status}
          </span>
        ) : (
          <span className="console__status console__status--fail">ERR</span>
        )}
        <span className="console__url" title={entry.url}>{entry.url}</span>
        <span className="console__duration">{entry.duration}ms</span>
        {entry.error && (
          <span className="console__error-text">{entry.error}</span>
        )}
        {entry.responseSnippet && (
          <button
            className="console__snippet-toggle"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '[-]' : '[+]'}
          </button>
        )}
      </div>
      {expanded && entry.responseSnippet && (
        <div className="console__snippet">{entry.responseSnippet}</div>
      )}
    </>
  );
}

function EntryRow({ entry }: { entry: LogEntry }) {
  if (entry.source === 'console') return <ConsoleRow entry={entry} />;
  return <NetworkRow entry={entry} />;
}

export function ConsolePanel() {
  const entries = useConsoleStore((s) => s.entries);
  const filter = useConsoleStore((s) => s.filter);
  const setFilter = useConsoleStore((s) => s.setFilter);
  const clear = useConsoleStore((s) => s.clear);
  const entriesRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const filtered = filter === 'all'
    ? entries
    : entries.filter((e) => e.source === filter);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = entriesRef.current;
    if (el && stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [filtered.length]);

  const handleScroll = () => {
    const el = entriesRef.current;
    if (!el) return;
    // Stick to bottom if user is within 30px of the bottom
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
  };

  if (entries.length === 0) {
    return (
      <div className="console">
        <div className="console__toolbar">
          <button
            className={`console__filter-btn ${filter === 'all' ? 'console__filter-btn--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`console__filter-btn ${filter === 'console' ? 'console__filter-btn--active' : ''}`}
            onClick={() => setFilter('console')}
          >
            Console
          </button>
          <button
            className={`console__filter-btn ${filter === 'network' ? 'console__filter-btn--active' : ''}`}
            onClick={() => setFilter('network')}
          >
            Network
          </button>
        </div>
        <div className="console__empty">
          <svg className="console__empty-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4,17 10,11 4,5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <p className="console__empty-title">No console output yet</p>
          <p className="console__empty-hint">
            Logs will appear here when the web preview is running.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="console">
      <div className="console__toolbar">
        <button
          className={`console__filter-btn ${filter === 'all' ? 'console__filter-btn--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`console__filter-btn ${filter === 'console' ? 'console__filter-btn--active' : ''}`}
          onClick={() => setFilter('console')}
        >
          Console
        </button>
        <button
          className={`console__filter-btn ${filter === 'network' ? 'console__filter-btn--active' : ''}`}
          onClick={() => setFilter('network')}
        >
          Network
        </button>
        <span className="console__spacer" />
        <span className="console__count">{filtered.length} entries</span>
        <button
          className="console__clear-btn"
          onClick={clear}
          title="Clear console"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="6" />
            <line x1="5" y1="5" x2="11" y2="11" />
          </svg>
        </button>
      </div>
      <div
        className="console__entries"
        ref={entriesRef}
        onScroll={handleScroll}
      >
        {filtered.map((entry) => (
          <EntryRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
