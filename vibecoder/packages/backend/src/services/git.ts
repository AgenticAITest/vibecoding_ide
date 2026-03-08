import { simpleGit, type SimpleGit, type StatusResult } from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import type { GitStatus, GitFileChange, GitLogEntry, GitBranch, GitRemote } from '@vibecoder/shared';

function git(projectDir: string): SimpleGit {
  return simpleGit(projectDir, {
    // Suppress CRLF warnings on Windows — these cause simple-git to throw
    config: [
      'core.autocrlf=true',
      'core.safecrlf=false',
    ],
  });
}

/**
 * Check if the project directory has its OWN .git (not a parent's).
 * simple-git's checkIsRepo() walks up, which would match the IDE repo — dangerous.
 */
export async function isGitRepo(projectDir: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectDir, '.git'));
    return true;
  } catch {
    return false;
  }
}

export async function initRepo(projectDir: string): Promise<void> {
  const g = git(projectDir);
  await g.init();
  // Persist CRLF settings in the repo config (Windows compatibility)
  await g.addConfig('core.autocrlf', 'true', false, 'local');
  await g.addConfig('core.safecrlf', 'false', false, 'local');
  // Windows long path support
  await g.addConfig('core.longpaths', 'true', false, 'local');

  // Ensure .gitignore exists before first add — prevents staging node_modules etc.
  const gitignorePath = path.join(projectDir, '.gitignore');
  let gitignore = '';
  try {
    gitignore = await fs.readFile(gitignorePath, 'utf-8');
  } catch {
    // No .gitignore yet
  }
  const requiredEntries = [
    'node_modules/', '.expo/', 'dist/', '.cache/', '.git-credentials',
    // Large binary files that exceed GitHub's 100MB limit
    '*.task', '*.bin', '*.onnx', '*.pt', '*.pth', '*.safetensors', '*.gguf',
    '*.tflite', '*.mlmodel', '*.h5', '*.pb',
  ];
  const missing = requiredEntries.filter((e) => !gitignore.includes(e));
  if (missing.length > 0) {
    const newline = gitignore.endsWith('\n') || gitignore === '' ? '' : '\n';
    await fs.writeFile(gitignorePath, gitignore + newline + missing.join('\n') + '\n', 'utf-8');
  }

  // Set default git user in local config if not configured globally
  await g.addConfig('user.name', 'VibeCoder User', false, 'local');
  await g.addConfig('user.email', 'user@vibecoder.local', false, 'local');

  await g.add('-A');
  await g.commit('Initial commit');
}

function mapStatus(code: string): GitFileChange['status'] {
  switch (code) {
    case 'A': case '?': return 'added';
    case 'D': return 'deleted';
    case 'R': return 'renamed';
    default: return 'modified';
  }
}

function extractChanges(files: StatusResult['files'], staged: boolean): GitFileChange[] {
  const changes: GitFileChange[] = [];
  for (const f of files) {
    const code = staged ? f.index : f.working_dir;
    if (code && code !== ' ' && code !== '?') {
      changes.push({ path: f.path, status: mapStatus(code) });
    }
  }
  return changes;
}

export async function getStatus(projectDir: string): Promise<GitStatus> {
  if (!(await isGitRepo(projectDir))) {
    return { isRepo: false, branch: '', ahead: 0, behind: 0, staged: [], unstaged: [], untracked: [] };
  }

  const g = git(projectDir);
  const status = await g.status();

  return {
    isRepo: true,
    branch: status.current || 'HEAD',
    ahead: status.ahead,
    behind: status.behind,
    staged: extractChanges(status.files, true),
    unstaged: extractChanges(status.files, false),
    untracked: status.not_added,
  };
}

export async function stageFiles(projectDir: string, paths: string[]): Promise<void> {
  await git(projectDir).add(paths);
}

export async function stageAll(projectDir: string): Promise<void> {
  await git(projectDir).add('-A');
}

export async function unstageFiles(projectDir: string, paths: string[]): Promise<void> {
  await git(projectDir).reset(['HEAD', '--', ...paths]);
}

export async function commit(projectDir: string, message: string): Promise<void> {
  await git(projectDir).commit(message);
}

export async function push(projectDir: string): Promise<void> {
  if (!(await isGitRepo(projectDir))) throw new Error('Not a git repository. Initialize first.');
  const g = git(projectDir);

  let hasCommits = true;
  try {
    await g.log({ maxCount: 1 });
  } catch {
    hasCommits = false;
  }
  if (!hasCommits) {
    await initRepo(projectDir);
  }

  const status = await g.status();
  const branch = status.current || 'main';
  if (!status.tracking) {
    await g.push(['-u', 'origin', branch]);
  } else {
    await g.push();
  }
}

export async function pull(projectDir: string): Promise<void> {
  if (!(await isGitRepo(projectDir))) throw new Error('Not a git repository. Initialize first.');
  await git(projectDir).pull();
}

export async function getLog(projectDir: string, count = 20): Promise<GitLogEntry[]> {
  const g = git(projectDir);
  const log = await g.log({ maxCount: count });
  return log.all.map((entry) => ({
    hash: entry.hash,
    shortHash: entry.hash.substring(0, 7),
    message: entry.message,
    author: entry.author_name,
    date: entry.date,
  }));
}

export async function getBranches(projectDir: string): Promise<GitBranch[]> {
  const g = git(projectDir);
  const summary = await g.branchLocal();
  return summary.all.map((name) => ({
    name,
    current: name === summary.current,
  }));
}

export async function createBranch(projectDir: string, name: string): Promise<void> {
  await git(projectDir).checkoutLocalBranch(name);
}

export async function checkoutBranch(projectDir: string, name: string): Promise<void> {
  await git(projectDir).checkout(name);
}

export async function getDiff(projectDir: string, filePath?: string): Promise<string> {
  const g = git(projectDir);
  if (filePath) {
    return g.diff(['--', filePath]);
  }
  return g.diff();
}

export async function getRemotes(projectDir: string): Promise<GitRemote[]> {
  if (!(await isGitRepo(projectDir))) return [];
  const g = git(projectDir);
  const remotes = await g.getRemotes(true);
  return remotes.map((r) => ({
    name: r.name,
    fetchUrl: r.refs.fetch || '',
    pushUrl: r.refs.push || '',
  }));
}

export async function addRemote(projectDir: string, name: string, url: string): Promise<void> {
  if (!(await isGitRepo(projectDir))) throw new Error('Not a git repository. Initialize first.');
  const g = git(projectDir);
  const remotes = await g.getRemotes(false);
  if (remotes.some((r) => r.name === name)) {
    await g.remote(['set-url', name, url]);
  } else {
    await g.addRemote(name, url);
  }
}

export async function removeRemote(projectDir: string, name: string): Promise<void> {
  if (!(await isGitRepo(projectDir))) throw new Error('Not a git repository.');
  await git(projectDir).removeRemote(name);
}

export async function setCredentials(projectDir: string, token: string, host = 'github.com'): Promise<void> {
  const credPath = path.join(projectDir, '.git-credentials');
  const credLine = `https://${token}:x-oauth-basic@${host}\n`;
  await fs.writeFile(credPath, credLine, { mode: 0o600 });

  const g = git(projectDir);
  await g.addConfig('credential.helper', `store --file=${credPath}`, false, 'local');

  // Ensure .git-credentials is in .gitignore so it's never committed
  const gitignorePath = path.join(projectDir, '.gitignore');
  let gitignore = '';
  try {
    gitignore = await fs.readFile(gitignorePath, 'utf-8');
  } catch {
    // No .gitignore yet
  }
  if (!gitignore.includes('.git-credentials')) {
    const newline = gitignore.endsWith('\n') || gitignore === '' ? '' : '\n';
    await fs.writeFile(gitignorePath, gitignore + newline + '.git-credentials\n', 'utf-8');
  }
}

export async function hasCredentials(projectDir: string): Promise<boolean> {
  const credPath = path.join(projectDir, '.git-credentials');
  try {
    await fs.access(credPath);
    return true;
  } catch {
    return false;
  }
}
