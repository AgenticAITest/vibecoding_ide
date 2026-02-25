import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { setupWebSocket } from './ws/index.js';
import { filesRouter } from './routes/files.js';
import { projectsRouter } from './routes/projects.js';
import { gitRouter } from './routes/git.js';
import { previewRouter } from './routes/preview.js';
import { initFileChannel } from './ws/fileChannel.js';
import { getProjectDir } from './services/fileSystem.js';

const app = express();
const PORT = 3001;

// Preview proxy MUST be mounted before express.json() — the JSON body parser
// consumes the request stream, which breaks req.pipe() in the proxy route.
app.use('/api/preview-proxy', previewRouter);

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve uploaded images statically
app.use('/api/uploads', (_req, res, next) => {
  const uploadsDir = path.join(getProjectDir(), 'uploads');
  express.static(uploadsDir)(_req, res, next);
});

app.use('/api/files', filesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/git', gitRouter);

const server = createServer(app);
setupWebSocket(server);
initFileChannel();

server.listen(PORT, () => {
  console.log(`VibeCoder backend running on http://localhost:${PORT}`);
});
