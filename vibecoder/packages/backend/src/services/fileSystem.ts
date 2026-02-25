import fs from 'fs/promises';
import path from 'path';
import { watch, type FSWatcher } from 'chokidar';
import type { FileNode, FileChange, FileChangeType } from '@vibecoder/shared';

// --- Project directory ---

// Default: projects/demo-app relative to the vibecoding_ide root
// Override with VIBECODER_PROJECT_DIR env var
const DEFAULT_PROJECTS_DIR = path.resolve(
  import.meta.dirname, '..', '..', '..', '..', '..', 'projects', 'demo-app'
);

let projectDir = process.env.VIBECODER_PROJECT_DIR || DEFAULT_PROJECTS_DIR;

export function getProjectDir(): string {
  return projectDir;
}

export function setProjectDir(dir: string): void {
  projectDir = path.resolve(dir);
}

// --- Path security ---

const IGNORED_NAMES = new Set([
  'node_modules', '.git', '.expo', 'dist', '.cache',
  '.DS_Store', 'Thumbs.db',
]);

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function resolveSafe(relPath: string): string {
  const resolved = path.resolve(projectDir, relPath);
  const normalizedResolved = path.normalize(resolved);
  const normalizedProject = path.normalize(projectDir);
  if (!normalizedResolved.startsWith(normalizedProject)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

// --- File tree ---

export async function getFileTree(dir?: string): Promise<FileNode[]> {
  const root = dir || projectDir;
  return scanDir(root, root);
}

async function scanDir(dirPath: string, rootPath: string): Promise<FileNode[]> {
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: FileNode[] = [];

  // Sort: directories first, then alphabetically
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    if (IGNORED_NAMES.has(entry.name)) continue;
    // Skip hidden files/dirs (starting with .) except specific ones
    if (entry.name.startsWith('.') && entry.name !== '.env') continue;

    const fullPath = path.join(dirPath, entry.name);
    const relPath = normalizePath(path.relative(rootPath, fullPath));

    if (entry.isDirectory()) {
      const children = await scanDir(fullPath, rootPath);
      nodes.push({ name: entry.name, path: relPath, type: 'directory', children });
    } else {
      nodes.push({ name: entry.name, path: relPath, type: 'file' });
    }
  }

  return nodes;
}

// --- File CRUD ---

export async function readFile(relPath: string): Promise<string> {
  const absPath = resolveSafe(relPath);
  return fs.readFile(absPath, 'utf-8');
}

export async function writeFile(relPath: string, content: string): Promise<void> {
  const absPath = resolveSafe(relPath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, content, 'utf-8');
}

export async function createFile(relPath: string, type: 'file' | 'directory', content?: string): Promise<void> {
  const absPath = resolveSafe(relPath);
  if (type === 'directory') {
    await fs.mkdir(absPath, { recursive: true });
  } else {
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, content || '', 'utf-8');
  }
}

export async function deleteFile(relPath: string): Promise<void> {
  const absPath = resolveSafe(relPath);
  await fs.rm(absPath, { recursive: true, force: true });
}

export async function renameFile(oldRelPath: string, newRelPath: string): Promise<void> {
  const oldAbs = resolveSafe(oldRelPath);
  const newAbs = resolveSafe(newRelPath);
  await fs.mkdir(path.dirname(newAbs), { recursive: true });
  await fs.rename(oldAbs, newAbs);
}

// --- File watching ---

type ChangeListener = (changes: FileChange[]) => void;

let watcher: FSWatcher | null = null;
const listeners: Set<ChangeListener> = new Set();
let pendingChanges: FileChange[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;

const BATCH_DELAY = 150;

function flushChanges() {
  if (pendingChanges.length === 0) return;
  const batch = pendingChanges;
  pendingChanges = [];
  batchTimer = null;
  for (const listener of listeners) {
    listener(batch);
  }
}

function queueChange(type: FileChangeType, filePath: string) {
  const relPath = normalizePath(path.relative(projectDir, filePath));
  pendingChanges.push({ type, path: relPath });
  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = setTimeout(flushChanges, BATCH_DELAY);
}

export function startWatcher(): void {
  if (watcher) return;

  watcher = watch(projectDir, {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/.expo/**',
      '**/dist/**',
      '**/.cache/**',
    ],
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  watcher.on('add', (p) => queueChange('add', p));
  watcher.on('change', (p) => queueChange('change', p));
  watcher.on('unlink', (p) => queueChange('unlink', p));
  watcher.on('addDir', (p) => queueChange('addDir', p));
  watcher.on('unlinkDir', (p) => queueChange('unlinkDir', p));

  console.log(`File watcher started for: ${projectDir}`);
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
  pendingChanges = [];
}

export function onFileChange(listener: ChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
