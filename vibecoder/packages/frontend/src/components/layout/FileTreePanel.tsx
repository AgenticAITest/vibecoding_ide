import { useFileStore } from '../../store/fileStore';
import { useTabStore } from '../../store/tabStore';
import type { FileNode } from '@vibecoder/shared';
import './FileTreePanel.css';

/* ── Inline SVG file-type icons (14×14) ───────────────────────── */

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() || '';

  switch (ext) {
    case 'ts':
    case 'tsx':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="0.5" y="0.5" width="13" height="13" rx="2" fill="#3178c6" />
          <text x="7" y="10.5" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700" fontFamily="var(--font-sans)">TS</text>
        </svg>
      );
    case 'js':
    case 'jsx':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="0.5" y="0.5" width="13" height="13" rx="2" fill="#f0db4f" />
          <text x="7" y="10.5" textAnchor="middle" fill="#323330" fontSize="8" fontWeight="700" fontFamily="var(--font-sans)">JS</text>
        </svg>
      );
    case 'json':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <text x="7" y="11" textAnchor="middle" fill="#f9e2af" fontSize="11" fontWeight="700" fontFamily="var(--font-mono)">&#123;&#125;</text>
        </svg>
      );
    case 'css':
    case 'scss':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <text x="7" y="11" textAnchor="middle" fill="#a277ff" fontSize="12" fontWeight="700" fontFamily="var(--font-mono)">#</text>
        </svg>
      );
    case 'html':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <text x="7" y="11" textAnchor="middle" fill="#e06c75" fontSize="10" fontWeight="700" fontFamily="var(--font-mono)">&lt;/&gt;</text>
        </svg>
      );
    case 'md':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="0.5" y="0.5" width="13" height="13" rx="2" fill="#8b949e" />
          <text x="7" y="10.5" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="var(--font-sans)">M</text>
        </svg>
      );
    case 'py':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="0.5" y="0.5" width="13" height="13" rx="2" fill="#3572A5" />
          <text x="7" y="10.5" textAnchor="middle" fill="#fff" fontSize="7.5" fontWeight="700" fontFamily="var(--font-sans)">Py</text>
        </svg>
      );
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': case 'webp': case 'ico':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#a6e3a1" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" />
          <circle cx="5" cy="5.5" r="1.2" />
          <polyline points="12.5,9 9,6 4,11" />
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 1H3.5A1.5 1.5 0 0 0 2 2.5v9A1.5 1.5 0 0 0 3.5 13h7a1.5 1.5 0 0 0 1.5-1.5V5L8 1z" />
          <polyline points="8,1 8,5 12,5" />
        </svg>
      );
  }
}

/* ── Folder chevron icon (rotates via CSS) ────────────────────── */

function FolderChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`file-tree-chevron ${expanded ? 'file-tree-chevron--expanded' : ''}`}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="5,3 9,7 5,11" />
    </svg>
  );
}

/* ── Tree node ────────────────────────────────────────────────── */

function FileTreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const expandedDirs = useFileStore((s) => s.expandedDirs);
  const toggleDir = useFileStore((s) => s.toggleDir);
  const openTab = useTabStore((s) => s.openTab);
  const activeTabId = useTabStore((s) => s.activeTabId);

  const isDir = node.type === 'directory';
  const isExpanded = expandedDirs.has(node.path);
  const isActive = !isDir && node.path === activeTabId;

  const handleClick = () => {
    if (isDir) {
      toggleDir(node.path);
    } else {
      openTab({
        id: node.path,
        type: 'editor',
        label: node.name,
        path: node.path,
        closable: true,
      });
    }
  };

  return (
    <>
      <div
        className={`file-tree-node ${isDir ? 'file-tree-node--dir' : 'file-tree-node--file'} ${isActive ? 'file-tree-node--active' : ''}`}
        style={{ paddingLeft: `calc(var(--space-4) * ${depth} + var(--space-2))` }}
        onClick={handleClick}
        title={node.path}
      >
        <span className="file-tree-node__icon">
          {isDir ? <FolderChevron expanded={isExpanded} /> : <FileIcon name={node.name} />}
        </span>
        <span className="file-tree-node__name">{node.name}</span>
      </div>
      {isDir && isExpanded && node.children?.map((child) => (
        <FileTreeNode key={child.path} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

export function FileTreePanel() {
  const tree = useFileStore((s) => s.tree);
  const loading = useFileStore((s) => s.loading);
  const error = useFileStore((s) => s.error);

  return (
    <div className="file-tree-panel">
      <div className="file-tree-panel__header">
        <span className="file-tree-panel__title">Files</span>
      </div>
      <div className="file-tree-panel__content">
        {loading && (
          <div className="file-tree-panel__status">Loading...</div>
        )}
        {error && (
          <div className="file-tree-panel__status file-tree-panel__status--error">{error}</div>
        )}
        {!loading && !error && tree.length === 0 && (
          <div className="file-tree-panel__status">No files found</div>
        )}
        {!loading && tree.map((node) => (
          <FileTreeNode key={node.path} node={node} depth={0} />
        ))}
      </div>
    </div>
  );
}
