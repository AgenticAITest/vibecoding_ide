import { Router } from 'express';
import multer from 'multer';
import {
  listProjects,
  validateProjectName,
  projectExists,
  createProject,
  deleteProject,
  activateProject,
} from '../services/project.js';
import { parse } from '../services/apiParser.js';
import { getProjectDir, getUserProjectsDir } from '../services/fileSystem.js';
import { importZip, importGit } from '../services/importer.js';
import type { ScaffoldConfig } from '@vibecoder/shared';
import path from 'path';

export const projectsRouter = Router();

// GET /api/projects — list all projects + active directory
projectsRouter.get('/', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const projects = await listProjects(userId);
    const activeDir = getProjectDir(userId);
    res.json({ projects, activeDir });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/projects/validate-name — check name validity + uniqueness
projectsRouter.post('/validate-name', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { name } = req.body as { name: string };
    const validation = validateProjectName(name);
    if (!validation.valid) {
      res.json({ valid: false, error: validation.error });
      return;
    }
    const exists = await projectExists(userId, name);
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
    const userId = req.user!.userId;
    const config = req.body as ScaffoldConfig;

    // Validate name
    const validation = validateProjectName(config.projectName);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const project = await createProject(userId, config);

    // Auto-activate the new project
    await activateProject(userId, config.projectName);

    res.json({ project });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// --- Import endpoints ---

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max for ZIP
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-zip',
      'application/octet-stream',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are allowed'));
    }
  },
});

// POST /api/projects/import-zip — upload and extract a ZIP as a new project
projectsRouter.post('/import-zip', importUpload.single('file'), async (req, res) => {
  try {
    const userId = req.user!.userId;
    const name = req.body.name as string;

    const validation = validateProjectName(name);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    if (await projectExists(userId, name)) {
      res.status(409).json({ error: `Project "${name}" already exists` });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No ZIP file provided' });
      return;
    }

    const targetDir = path.join(getUserProjectsDir(userId), name);
    const { framework } = await importZip(req.file.buffer, targetDir);

    await activateProject(userId, name);

    res.json({
      project: {
        name,
        path: targetDir,
        createdAt: new Date().toISOString(),
      },
      framework,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/projects/import-git — clone a git repo as a new project
projectsRouter.post('/import-git', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { url, name, token } = req.body as {
      url: string;
      name?: string;
      token?: string;
    };

    if (!url) {
      res.status(400).json({ error: 'Repository URL is required' });
      return;
    }

    // Derive project name from URL if not provided
    const projectName = name || url.split('/').pop()?.replace(/\.git$/, '') || 'imported-project';

    const validation = validateProjectName(projectName);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    if (await projectExists(userId, projectName)) {
      res.status(409).json({ error: `Project "${projectName}" already exists` });
      return;
    }

    const targetDir = path.join(getUserProjectsDir(userId), projectName);
    const { framework } = await importGit(url, targetDir, token);

    await activateProject(userId, projectName);

    res.json({
      project: {
        name: projectName,
        path: targetDir,
        createdAt: new Date().toISOString(),
      },
      framework,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/projects/:name — delete project
projectsRouter.delete('/:name', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { name } = req.params;
    await deleteProject(userId, name);
    res.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/projects/:name/activate — set active project
projectsRouter.post('/:name/activate', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { name } = req.params;
    const projectPath = await activateProject(userId, name);
    res.json({ ok: true, path: projectPath });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
