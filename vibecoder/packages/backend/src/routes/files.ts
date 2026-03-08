import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import {
  getProjectDir,
  setProjectDir,
  getFileTree,
  readFile,
  writeFile,
  createFile,
  deleteFile,
  renameFile,
  resolveSafe,
  stopWatcher,
  startWatcher,
} from '../services/fileSystem.js';

export const filesRouter = Router();

// --- Image upload via multer ---
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    const userId = req.user!.userId;
    const uploadDir = path.join(getProjectDir(userId), 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${sanitized}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, GIF, and WebP images are allowed'));
    }
  },
});

// POST /api/files/upload
filesRouter.post('/upload', upload.single('image'), (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No image file provided' });
    return;
  }
  res.json({
    ok: true,
    relativePath: `uploads/${file.filename}`,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  });
});

// GET /api/files/raw?path=... — serve file with correct content-type (for images, etc.)
filesRouter.get('/raw', async (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ error: 'Missing path query parameter' });
    return;
  }
  const projectDir = getProjectDir(req.user!.userId);
  const absolute = path.resolve(projectDir, filePath);
  if (!path.normalize(absolute).startsWith(path.normalize(projectDir))) {
    res.status(403).json({ error: 'Path traversal detected' });
    return;
  }
  try {
    await fs.access(absolute);
    res.sendFile(absolute);
  } catch {
    res.status(404).json({ error: `File not found: ${filePath}` });
  }
});

// GET /api/files/tree
filesRouter.get('/tree', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const tree = await getFileTree(undefined, userId);
    res.json({ tree, projectDir: getProjectDir(userId) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/read?path=...
filesRouter.get('/read', async (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ error: 'Missing path query parameter' });
    return;
  }
  try {
    const projectDir = getProjectDir(req.user!.userId);
    const content = await readFile(projectDir, filePath);
    res.json({ content, path: filePath });
  } catch (err: any) {
    if (err.message === 'Path traversal detected') {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(404).json({ error: `File not found: ${filePath}` });
  }
});

// POST /api/files/write { path, content }
filesRouter.post('/write', async (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath || content === undefined) {
    res.status(400).json({ error: 'Missing path or content' });
    return;
  }
  try {
    const projectDir = getProjectDir(req.user!.userId);
    await writeFile(projectDir, filePath, content);
    res.json({ ok: true });
  } catch (err: any) {
    if (err.message === 'Path traversal detected') {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/create { path, type, content? }
filesRouter.post('/create', async (req, res) => {
  const { path: filePath, type, content } = req.body;
  if (!filePath || !type) {
    res.status(400).json({ error: 'Missing path or type' });
    return;
  }
  try {
    const projectDir = getProjectDir(req.user!.userId);
    await createFile(projectDir, filePath, type, content);
    res.json({ ok: true });
  } catch (err: any) {
    if (err.message === 'Path traversal detected') {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/files/delete?path=...
filesRouter.delete('/delete', async (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ error: 'Missing path query parameter' });
    return;
  }
  try {
    const projectDir = getProjectDir(req.user!.userId);
    await deleteFile(projectDir, filePath);
    res.json({ ok: true });
  } catch (err: any) {
    if (err.message === 'Path traversal detected') {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/rename { oldPath, newPath }
filesRouter.post('/rename', async (req, res) => {
  const { oldPath, newPath } = req.body;
  if (!oldPath || !newPath) {
    res.status(400).json({ error: 'Missing oldPath or newPath' });
    return;
  }
  try {
    const projectDir = getProjectDir(req.user!.userId);
    await renameFile(projectDir, oldPath, newPath);
    res.json({ ok: true });
  } catch (err: any) {
    if (err.message === 'Path traversal detected') {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/feature-packs — list available feature packs in .vibecoder/feature-packs/
filesRouter.get('/feature-packs', async (req, res) => {
  try {
    const projectDir = getProjectDir(req.user!.userId);
    const fpDir = path.join(projectDir, '.vibecoder', 'feature-packs');
    let entries: string[] = [];
    try {
      const files = await fs.readdir(fpDir);
      entries = files.filter((f) => f.endsWith('.md'));
    } catch {
      // directory doesn't exist — no feature packs
    }
    const packs = entries.map((f) => ({
      name: f.replace(/\.md$/, ''),
      filename: f,
    }));
    res.json({ packs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/feature-packs/:name — read a specific feature pack
filesRouter.get('/feature-packs/:name', async (req, res) => {
  try {
    const projectDir = getProjectDir(req.user!.userId);
    const name = (req.params.name as string).replace(/[^a-zA-Z0-9_-]/g, '');
    const fpPath = path.join(projectDir, '.vibecoder', 'feature-packs', `${name}.md`);
    const normalized = path.normalize(fpPath);
    if (!normalized.startsWith(path.normalize(projectDir))) {
      res.status(403).json({ error: 'Path traversal detected' });
      return;
    }
    const content = await fs.readFile(fpPath, 'utf-8');
    res.json({ name, content });
  } catch {
    res.status(404).json({ error: 'Feature pack not found' });
  }
});

// GET /api/files/project-dir
filesRouter.get('/project-dir', (req, res) => {
  res.json({ dir: getProjectDir(req.user!.userId) });
});

// POST /api/files/project-dir { dir }
filesRouter.post('/project-dir', (req, res) => {
  const { dir } = req.body;
  if (!dir) {
    res.status(400).json({ error: 'Missing dir' });
    return;
  }
  try {
    const userId = req.user!.userId;
    const oldDir = getProjectDir(userId);
    stopWatcher(oldDir);
    setProjectDir(userId, dir);
    startWatcher(getProjectDir(userId));
    res.json({ ok: true, dir: getProjectDir(userId) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
