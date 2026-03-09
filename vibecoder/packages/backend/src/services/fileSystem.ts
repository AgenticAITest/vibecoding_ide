import fs from 'fs/promises';
import path from 'path';
import { watch, type FSWatcher } from 'chokidar';
import type { FileNode, FileChange, FileChangeType } from '@vibecoder/shared';

// --- Projects base directory ---

// In Docker, set VIBECODER_PROJECTS_BASE=/projects
// In dev, resolve relative to source: vibecoding_ide/projects/
const PROJECTS_BASE = process.env.VIBECODER_PROJECTS_BASE
  ? path.resolve(process.env.VIBECODER_PROJECTS_BASE)
  : path.resolve(import.meta.dirname, '..', '..', '..', '..', '..', 'projects');

// Per-user active project directories: userId → absolute path
const userProjectDirs = new Map<string, string>();

export function getProjectsBase(): string {
  return PROJECTS_BASE;
}

export function getUserProjectsDir(userId: string): string {
  return path.join(PROJECTS_BASE, userId);
}

export function getProjectDir(userId?: string): string {
  if (!userId) {
    // Fallback for backward compatibility during migration
    return process.env.VIBECODER_PROJECT_DIR || path.join(PROJECTS_BASE, 'demo-app');
  }
  return userProjectDirs.get(userId) || path.join(PROJECTS_BASE, userId, 'demo-app');
}

export function setProjectDir(userId: string, dir: string): void {
  userProjectDirs.set(userId, path.resolve(dir));
}

// --- Path security ---

const IGNORED_NAMES = new Set([
  'node_modules', '.git', '.expo', 'dist', '.cache',
  '.DS_Store', 'Thumbs.db',
]);

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

export function resolveSafe(projectDir: string, relPath: string): string {
  const resolved = path.resolve(projectDir, relPath);
  const normalizedResolved = path.normalize(resolved);
  const normalizedProject = path.normalize(projectDir);
  if (!normalizedResolved.startsWith(normalizedProject)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

// --- File tree ---

export async function getFileTree(dir?: string, userId?: string): Promise<FileNode[]> {
  const root = dir || getProjectDir(userId);
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

export async function readFile(projectDir: string, relPath: string): Promise<string> {
  const absPath = resolveSafe(projectDir, relPath);
  return fs.readFile(absPath, 'utf-8');
}

export async function writeFile(projectDir: string, relPath: string, content: string): Promise<void> {
  const absPath = resolveSafe(projectDir, relPath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, content, 'utf-8');
}

export async function createFile(projectDir: string, relPath: string, type: 'file' | 'directory', content?: string): Promise<void> {
  const absPath = resolveSafe(projectDir, relPath);
  if (type === 'directory') {
    await fs.mkdir(absPath, { recursive: true });
  } else {
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, content || '', 'utf-8');
  }
}

export async function deleteFile(projectDir: string, relPath: string): Promise<void> {
  const absPath = resolveSafe(projectDir, relPath);
  await fs.rm(absPath, { recursive: true, force: true });
}

export async function renameFile(projectDir: string, oldRelPath: string, newRelPath: string): Promise<void> {
  const oldAbs = resolveSafe(projectDir, oldRelPath);
  const newAbs = resolveSafe(projectDir, newRelPath);
  await fs.mkdir(path.dirname(newAbs), { recursive: true });
  await fs.rename(oldAbs, newAbs);
}

// --- File watching (per project directory) ---

type ChangeListener = (changes: FileChange[]) => void;

interface WatcherState {
  watcher: FSWatcher;
  listeners: Set<ChangeListener>;
  pendingChanges: FileChange[];
  batchTimer: ReturnType<typeof setTimeout> | null;
}

const watchers = new Map<string, WatcherState>();

const BATCH_DELAY = 150;

function flushChanges(state: WatcherState) {
  if (state.pendingChanges.length === 0) return;
  const batch = state.pendingChanges;
  state.pendingChanges = [];
  state.batchTimer = null;
  for (const listener of state.listeners) {
    listener(batch);
  }
}

function queueChange(dirPath: string, type: FileChangeType, filePath: string) {
  const state = watchers.get(dirPath);
  if (!state) return;
  const relPath = normalizePath(path.relative(dirPath, filePath));
  state.pendingChanges.push({ type, path: relPath });
  if (state.batchTimer) clearTimeout(state.batchTimer);
  state.batchTimer = setTimeout(() => flushChanges(state), BATCH_DELAY);
}

export function startWatcher(dirPath: string): void {
  if (watchers.has(dirPath)) return;

  const watcher = watch(dirPath, {
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

  const state: WatcherState = {
    watcher,
    listeners: new Set(),
    pendingChanges: [],
    batchTimer: null,
  };

  watcher.on('add', (p) => queueChange(dirPath, 'add', p));
  watcher.on('change', (p) => queueChange(dirPath, 'change', p));
  watcher.on('unlink', (p) => queueChange(dirPath, 'unlink', p));
  watcher.on('addDir', (p) => queueChange(dirPath, 'addDir', p));
  watcher.on('unlinkDir', (p) => queueChange(dirPath, 'unlinkDir', p));

  watchers.set(dirPath, state);
  console.log(`File watcher started for: ${dirPath}`);
}

export function stopWatcher(dirPath: string): void {
  const state = watchers.get(dirPath);
  if (!state) return;
  state.watcher.close();
  if (state.batchTimer) clearTimeout(state.batchTimer);
  watchers.delete(dirPath);
}

export function onFileChange(dirPath: string, listener: ChangeListener): () => void {
  let state = watchers.get(dirPath);
  if (!state) {
    startWatcher(dirPath);
    state = watchers.get(dirPath)!;
  }
  state.listeners.add(listener);
  return () => {
    state!.listeners.delete(listener);
    // If no listeners remain, stop the watcher
    if (state!.listeners.size === 0) {
      stopWatcher(dirPath);
    }
  };
}
