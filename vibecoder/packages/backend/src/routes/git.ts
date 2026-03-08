import { Router } from 'express';
import { getProjectDir } from '../services/fileSystem.js';
import {
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
  getRemotes,
  addRemote,
  removeRemote,
  setCredentials,
  hasCredentials,
} from '../services/git.js';

export const gitRouter = Router();

function pd(req: Express.Request): string {
  return getProjectDir((req as any).user!.userId);
}

// GET /api/git/status
gitRouter.get('/status', async (req, res) => {
  try {
    const status = await getStatus(pd(req));
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/init
gitRouter.post('/init', async (req, res) => {
  try {
    await initRepo(pd(req));
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
    await stageFiles(pd(req), paths);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/stage-all
gitRouter.post('/stage-all', async (req, res) => {
  try {
    await stageAll(pd(req));
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
    await unstageFiles(pd(req), paths);
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
    await commit(pd(req), message.trim());
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/push
gitRouter.post('/push', async (req, res) => {
  try {
    await push(pd(req));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/pull
gitRouter.post('/pull', async (req, res) => {
  try {
    await pull(pd(req));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/git/log?count=20
gitRouter.get('/log', async (req, res) => {
  try {
    const count = parseInt(req.query.count as string) || 20;
    const log = await getLog(pd(req), count);
    res.json({ log });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/git/branches
gitRouter.get('/branches', async (req, res) => {
  try {
    const branches = await getBranches(pd(req));
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
    await createBranch(pd(req), name.trim());
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
    await checkoutBranch(pd(req), name.trim());
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/git/diff?path=file.ts
gitRouter.get('/diff', async (req, res) => {
  try {
    const filePath = req.query.path as string | undefined;
    const diff = await getDiff(pd(req), filePath);
    res.json({ diff });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/git/remotes
gitRouter.get('/remotes', async (req, res) => {
  try {
    const projectDir = pd(req);
    const remotes = await getRemotes(projectDir);
    const credentialsSet = await hasCredentials(projectDir);
    res.json({ remotes, credentialsSet });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/remote — add or update a remote
gitRouter.post('/remote', async (req, res) => {
  try {
    const { name, url } = req.body as { name: string; url: string };
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });
    if (!url?.trim()) return res.status(400).json({ error: 'url required' });
    await addRemote(pd(req), name.trim(), url.trim());
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/git/remote/:name
gitRouter.delete('/remote/:name', async (req, res) => {
  try {
    const { name } = req.params;
    await removeRemote(pd(req), name);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/credentials — store PAT for HTTPS auth
gitRouter.post('/credentials', async (req, res) => {
  try {
    const { token, host } = req.body as { token: string; host?: string };
    if (!token?.trim()) return res.status(400).json({ error: 'token required' });
    await setCredentials(pd(req), token.trim(), host?.trim() || 'github.com');
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
