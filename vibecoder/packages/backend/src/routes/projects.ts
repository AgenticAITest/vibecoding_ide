import { Router } from 'express';
import {
  listProjects,
  validateProjectName,
  projectExists,
  createProject,
  deleteProject,
  activateProject,
} from '../services/project.js';
import { parse } from '../services/apiParser.js';
import { getProjectDir } from '../services/fileSystem.js';
import type { ScaffoldConfig } from '@vibecoder/shared';

export const projectsRouter = Router();

// GET /api/projects — list all projects + active directory
projectsRouter.get('/', async (_req, res) => {
  try {
    const projects = await listProjects();
    const activeDir = getProjectDir();
    res.json({ projects, activeDir });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/projects/validate-name — check name validity + uniqueness
projectsRouter.post('/validate-name', async (req, res) => {
  try {
    const { name } = req.body as { name: string };
    const validation = validateProjectName(name);
    if (!validation.valid) {
      res.json({ valid: false, error: validation.error });
      return;
    }
    const exists = await projectExists(name);
    if (exists) {
      res.json({ valid: false, error: 'A project with this name already exists' });
      return;
    }
    res.json({ valid: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/projects/parse-api — parse API spec JSON string
projectsRouter.post('/parse-api', async (req, res) => {
  try {
    const { spec } = req.body as { spec: string };
    const parsed = parse(spec);
    res.json({ parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// POST /api/projects/fetch-api-url — fetch URL and parse
projectsRouter.post('/fetch-api-url', async (req, res) => {
  try {
    const { url } = req.body as { url: string };
    const response = await fetch(url);
    if (!response.ok) {
      res.status(400).json({ error: `Failed to fetch: ${response.status} ${response.statusText}` });
      return;
    }
    const text = await response.text();
    const parsed = parse(text);
    res.json({ parsed, raw: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// POST /api/projects — create project (runs scaffolder)
projectsRouter.post('/', async (req, res) => {
  try {
    const config = req.body as ScaffoldConfig;

    // Validate name
    const validation = validateProjectName(config.projectName);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const project = await createProject(config);

    // Auto-activate the new project
    await activateProject(config.projectName);

    res.json({ project });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/projects/:name — delete project
projectsRouter.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    await deleteProject(name);
    res.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/projects/:name/activate — set active project
projectsRouter.post('/:name/activate', async (req, res) => {
  try {
    const { name } = req.params;
    const projectPath = await activateProject(name);
    res.json({ ok: true, path: projectPath });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
