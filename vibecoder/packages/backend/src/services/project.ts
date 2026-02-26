import fs from 'fs/promises';
import path from 'path';
import type { ScaffoldConfig, ProjectInfo } from '@vibecoder/shared';
import { scaffold } from './scaffolder.js';
import { scaffoldFlutter } from './scaffolderFlutter.js';
import { setProjectDir, stopWatcher, startWatcher } from './fileSystem.js';

// Projects root: vibecoding_ide/projects/
const PROJECTS_ROOT = path.resolve(
  import.meta.dirname, '..', '..', '..', '..', '..', 'projects'
);

async function ensureProjectsRoot(): Promise<void> {
  await fs.mkdir(PROJECTS_ROOT, { recursive: true });
}

export async function listProjects(): Promise<ProjectInfo[]> {
  await ensureProjectsRoot();
  let entries;
  try {
    entries = await fs.readdir(PROJECTS_ROOT, { withFileTypes: true });
  } catch {
    return [];
  }

  const projects: ProjectInfo[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;
    const projectPath = path.join(PROJECTS_ROOT, entry.name);
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

export async function projectExists(name: string): Promise<boolean> {
  try {
    await fs.access(path.join(PROJECTS_ROOT, name));
    return true;
  } catch {
    return false;
  }
}

export async function createProject(config: ScaffoldConfig): Promise<ProjectInfo> {
  await ensureProjectsRoot();
  const projectPath = path.join(PROJECTS_ROOT, config.projectName);

  // Ensure doesn't already exist
  if (await projectExists(config.projectName)) {
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

export async function deleteProject(name: string): Promise<void> {
  const projectPath = path.join(PROJECTS_ROOT, name);
  await fs.rm(projectPath, { recursive: true, force: true });
}

export async function activateProject(name: string): Promise<string> {
  const projectPath = path.join(PROJECTS_ROOT, name);
  // Verify exists
  try {
    await fs.access(projectPath);
  } catch {
    throw new Error(`Project "${name}" not found`);
  }

  stopWatcher();
  setProjectDir(projectPath);
  startWatcher();
  return projectPath;
}

export function getProjectsRoot(): string {
  return PROJECTS_ROOT;
}
