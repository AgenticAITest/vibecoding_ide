import { useFileStore } from '../../store/fileStore';
import { useTabStore } from '../../store/tabStore';
import type { FileNode } from '@vibecoder/shared';
import './FileTreePanel.css';

function FileTreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const expandedDirs = useFileStore((s) => s.expandedDirs);
  const toggleDir = useFileStore((s) => s.toggleDir);
  const openTab = useTabStore((s) => s.openTab);

  const isDir = node.type === 'directory';
  const isExpanded = expandedDirs.has(node.path);

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
        className={`file-tree-node ${isDir ? 'file-tree-node--dir' : 'file-tree-node--file'}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={handleClick}
        title={node.path}
      >
        <span className="file-tree-node__icon">
          {isDir ? (isExpanded ? '▾' : '▸') : getFileIcon(node.name)}
        </span>
        <span className="file-tree-node__name">{node.name}</span>
      </div>
      {isDir && isExpanded && node.children?.map((child) => (
        <FileTreeNode key={child.path} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts':
    case 'tsx': return 'TS';
    case 'js':
    case 'jsx': return 'JS';
    case 'json': return '{}';
    case 'css':
    case 'scss': return '#';
    case 'html': return '<>';
    case 'md': return 'M';
    case 'py': return 'Py';
    default: return '·';
  }
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
