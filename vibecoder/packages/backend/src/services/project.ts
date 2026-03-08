import fs from 'fs/promises';
import path from 'path';
import type { ScaffoldConfig, ProjectInfo } from '@vibecoder/shared';
import { scaffold } from './scaffolder.js';
import { scaffoldFlutter } from './scaffolderFlutter.js';
import { getUserProjectsDir, setProjectDir, stopWatcher, startWatcher, getProjectDir } from './fileSystem.js';

async function ensureUserDir(userId: string): Promise<string> {
  const userDir = getUserProjectsDir(userId);
  await fs.mkdir(userDir, { recursive: true });
  return userDir;
}

export async function listProjects(userId: string): Promise<ProjectInfo[]> {
  const userDir = await ensureUserDir(userId);
  let entries;
  try {
    entries = await fs.readdir(userDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const projects: ProjectInfo[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;
    const projectPath = path.join(userDir, entry.name);
    let createdAt = new Date().toISOString();
    try {
      const stat = await fs.stat(projectPath);
      createdAt = stat.birthtime.toISOString();
    } catch {
      // use default
    }
    projects.push({
      name: entry.name,
      path: projectPath,
      createdAt,
    });
  }

  return projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{1,48}[a-zA-Z0-9]$/;

export function validateProjectName(name: string): { valid: boolean; error?: string } {
  if (!name) return { valid: false, error: 'Project name is required' };
  if (name.length < 3) return { valid: false, error: 'Name must be at least 3 characters' };
  if (name.length > 50) return { valid: false, error: 'Name must be 50 characters or less' };
  if (!NAME_REGEX.test(name)) {
    return { valid: false, error: 'Name must start with a letter, end with alphanumeric, and contain only letters, numbers, hyphens, underscores' };
  }
  return { valid: true };
}

export async function projectExists(userId: string, name: string): Promise<boolean> {
  try {
    await fs.access(path.join(getUserProjectsDir(userId), name));
    return true;
  } catch {
    return false;
  }
}

export async function createProject(userId: string, config: ScaffoldConfig): Promise<ProjectInfo> {
  const userDir = await ensureUserDir(userId);
  const projectPath = path.join(userDir, config.projectName);

  if (await projectExists(userId, config.projectName)) {
    throw new Error(`Project "${config.projectName}" already exists`);
  }

  if (config.framework === 'flutter') {
    await scaffoldFlutter(config, projectPath);
  } else {
    await scaffold(config, projectPath);
  }

  return {
    name: config.projectName,
    path: projectPath,
    createdAt: new Date().toISOString(),
  };
}

export async function deleteProject(userId: string, name: string): Promise<void> {
  const projectPath = path.join(getUserProjectsDir(userId), name);
  await fs.rm(projectPath, { recursive: true, force: true });
}

export async function activateProject(userId: string, name: string): Promise<string> {
  const projectPath = path.join(getUserProjectsDir(userId), name);
  try {
    await fs.access(projectPath);
  } catch {
    throw new Error(`Project "${name}" not found`);
  }

  // Stop old watcher for this user's previous project
  const oldDir = getProjectDir(userId);
  if (oldDir) stopWatcher(oldDir);

  setProjectDir(userId, projectPath);
  startWatcher(projectPath);
  return projectPath;
}
