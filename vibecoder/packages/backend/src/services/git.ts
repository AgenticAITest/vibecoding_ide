import { simpleGit, type SimpleGit, type StatusResult } from 'simple-git';
import { getProjectDir } from './fileSystem.js';
import type { GitStatus, GitFileChange, GitLogEntry, GitBranch } from '@vibecoder/shared';

function git(): SimpleGit {
  return simpleGit(getProjectDir());
}

export async function isGitRepo(): Promise<boolean> {
  try {
    return await git().checkIsRepo();
  } catch {
    return false;
  }
}

export async function initRepo(): Promise<void> {
  const g = git();
  await g.init();
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

export async function getStatus(): Promise<GitStatus> {
  if (!(await isGitRepo())) {
    return { isRepo: false, branch: '', ahead: 0, behind: 0, staged: [], unstaged: [], untracked: [] };
  }

  const g = git();
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

export async function stageFiles(paths: string[]): Promise<void> {
  await git().add(paths);
}

export async function stageAll(): Promise<void> {
  await git().add('-A');
}

export async function unstageFiles(paths: string[]): Promise<void> {
  await git().reset(['HEAD', '--', ...paths]);
}

export async function commit(message: string): Promise<void> {
  await git().commit(message);
}

export async function push(): Promise<void> {
  const g = git();
  const status = await g.status();
  if (!status.tracking) {
    const branch = status.current || 'main';
    await g.push(['-u', 'origin', branch]);
  } else {
    await g.push();
  }
}

export async function pull(): Promise<void> {
  await git().pull();
}

export async function getLog(count = 20): Promise<GitLogEntry[]> {
  const g = git();
  const log = await g.log({ maxCount: count });
  return log.all.map((entry) => ({
    hash: entry.hash,
    shortHash: entry.hash.substring(0, 7),
    message: entry.message,
    author: entry.author_name,
    date: entry.date,
  }));
}

export async function getBranches(): Promise<GitBranch[]> {
  const g = git();
  const summary = await g.branchLocal();
  return summary.all.map((name) => ({
    name,
    current: name === summary.current,
  }));
}

export async function createBranch(name: string): Promise<void> {
  await git().checkoutLocalBranch(name);
}

export async function checkoutBranch(name: string): Promise<void> {
  await git().checkout(name);
}

export async function getDiff(path?: string): Promise<string> {
  const g = git();
  if (path) {
    return g.diff(['--', path]);
  }
  return g.diff();
}
