export interface FileNode {
  name: string;
  /** Relative path from project root, always forward slashes */
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export type FileChangeType = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';

export interface FileChange {
  type: FileChangeType;
  path: string;
}

export type FileEvent =
  | { type: 'files:changed'; changes: FileChange[] }
  | { type: 'files:treeRefresh'; tree: FileNode[] };
