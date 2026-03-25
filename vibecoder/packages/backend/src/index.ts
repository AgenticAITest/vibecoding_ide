import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { setupWebSocket } from './ws/index.js';
import { filesRouter } from './routes/files.js';
import { projectsRouter } from './routes/projects.js';
import { gitRouter } from './routes/git.js';
import { previewRouter } from './routes/preview.js';
import { authRouter } from './routes/auth.js';
import { settingsRouter } from './routes/settings.js';
import { initFileChannel } from './ws/fileChannel.js';
import { getProjectDir } from './services/fileSystem.js';
import { requireAuth } from './middleware/auth.js';
import { initDatabase } from './services/db.js';
import { seedAdmin } from './services/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || process.env.VIBECODER_PORT || '3001', 10);
const CORS_ORIGIN = process.env.VIBECODER_CORS_ORIGIN || 'http://localhost:5173';

// Preview proxy MUST be mounted before express.json() — the JSON body parser
// consumes the request stream, which breaks req.pipe() in the proxy route.
app.use('/api/preview-proxy', requireAuth, previewRouter);

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Public routes (no auth)
app.use('/api/auth', authRouter);

// Protected routes (require auth)
app.use('/api/files', requireAuth, filesRouter);
app.use('/api/projects', requireAuth, projectsRouter);
app.use('/api/git', requireAuth, gitRouter);
app.use('/api/settings', requireAuth, settingsRouter);

// Serve uploaded images statically (auth required)
app.use('/api/uploads', requireAuth, (req, res, next) => {
  const uploadsDir = path.join(getProjectDir(req.user!.userId), 'uploads');
  express.static(uploadsDir)(req, res, next);
});

// In production, serve the built frontend as static files (single port, no CORS needed)
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '..', '..', '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

const server = createServer(app);

// Initialize database, seed admin, then start server
(async () => {
  try {
    await initDatabase();
    await seedAdmin();
  } catch (err) {
    console.error('Database initialization failed:', err);
    console.warn('Starting server without database — auth will not work');
  }

  setupWebSocket(server);
  initFileChannel();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`VibeCoder backend running on http://0.0.0.0:${PORT}`);
  });
})();
