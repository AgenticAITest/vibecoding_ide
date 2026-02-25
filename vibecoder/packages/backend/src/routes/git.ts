import { Router } from 'express';
import {
  isGitRepo,
  initRepo,
  getStatus,
  stageFiles,
  stageAll,
  unstageFiles,
  commit,
  push,
  pull,
  getLog,
  getBranches,
  createBranch,
  checkoutBranch,
  getDiff,
} from '../services/git.js';

export const gitRouter = Router();

// GET /api/git/status
gitRouter.get('/status', async (_req, res) => {
  try {
    const status = await getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/init
gitRouter.post('/init', async (_req, res) => {
  try {
    if (await isGitRepo()) {
      return res.status(400).json({ error: 'Already a git repository' });
    }
    await initRepo();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/stage
gitRouter.post('/stage', async (req, res) => {
  try {
    const { paths } = req.body as { paths: string[] };
    if (!paths?.length) return res.status(400).json({ error: 'paths required' });
    await stageFiles(paths);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/stage-all
gitRouter.post('/stage-all', async (_req, res) => {
  try {
    await stageAll();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/unstage
gitRouter.post('/unstage', async (req, res) => {
  try {
    const { paths } = req.body as { paths: string[] };
    if (!paths?.length) return res.status(400).json({ error: 'paths required' });
    await unstageFiles(paths);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/commit
gitRouter.post('/commit', async (req, res) => {
  try {
    const { message } = req.body as { message: string };
    if (!message?.trim()) return res.status(400).json({ error: 'message required' });
    await commit(message.trim());
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/push
gitRouter.post('/push', async (_req, res) => {
  try {
    await push();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/pull
gitRouter.post('/pull', async (_req, res) => {
  try {
    await pull();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/git/log?count=20
gitRouter.get('/log', async (req, res) => {
  try {
    const count = parseInt(req.query.count as string) || 20;
    const log = await getLog(count);
    res.json({ log });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/git/branches
gitRouter.get('/branches', async (_req, res) => {
  try {
    const branches = await getBranches();
    res.json({ branches });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/branch
gitRouter.post('/branch', async (req, res) => {
  try {
    const { name } = req.body as { name: string };
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });
    await createBranch(name.trim());
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/checkout
gitRouter.post('/checkout', async (req, res) => {
  try {
    const { name } = req.body as { name: string };
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });
    await checkoutBranch(name.trim());
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/git/diff?path=file.ts
gitRouter.get('/diff', async (req, res) => {
  try {
    const filePath = req.query.path as string | undefined;
    const diff = await getDiff(filePath);
    res.json({ diff });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
