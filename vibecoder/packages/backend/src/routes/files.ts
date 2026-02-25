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
  stopWatcher,
  startWatcher,
} from '../services/fileSystem.js';

export const filesRouter = Router();

// --- Image upload via multer ---
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadDir = path.join(getProjectDir(), 'uploads');
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

// GET /api/files/tree
filesRouter.get('/tree', async (_req, res) => {
  try {
    const tree = await getFileTree();
    res.json({ tree, projectDir: getProjectDir() });
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
    const content = await readFile(filePath);
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
    await writeFile(filePath, content);
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
    await createFile(filePath, type, content);
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
    await deleteFile(filePath);
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
    await renameFile(oldPath, newPath);
    res.json({ ok: true });
  } catch (err: any) {
    if (err.message === 'Path traversal detected') {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/project-dir
filesRouter.get('/project-dir', (_req, res) => {
  res.json({ dir: getProjectDir() });
});

// POST /api/files/project-dir { dir }
filesRouter.post('/project-dir', (req, res) => {
  const { dir } = req.body;
  if (!dir) {
    res.status(400).json({ error: 'Missing dir' });
    return;
  }
  try {
    stopWatcher();
    setProjectDir(dir);
    startWatcher();
    res.json({ ok: true, dir: getProjectDir() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
