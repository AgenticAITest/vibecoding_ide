import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { WSMessage } from '@vibecoder/shared';
import { verifyToken } from '../services/auth.js';
import { setWsUserId } from './wsAuth.js';
import { handleAiMessage, cleanupConnection } from './aiChannel.js';
import { handleFileMessage, registerFileClient, unregisterFileClient } from './fileChannel.js';
import { handleTerminalMessage, cleanupTerminalConnection } from './terminalChannel.js';
import { registerPreviewClient, unregisterPreviewClient, getLatestPreviewInfo } from './previewChannel.js';

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    // Authenticate via query param
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Missing auth token');
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      ws.close(4001, 'Invalid or expired token');
      return;
    }

    setWsUserId(ws, decoded.userId);
    console.log(`Client connected: ${decoded.username}`);

    // Auto-register for file change and preview broadcasts
    registerFileClient(ws);
    registerPreviewClient(ws);

    // Send cached preview URL if one exists
    const cachedUrl = getLatestPreviewInfo();
    if (cachedUrl) {
      const msg: WSMessage = {
        channel: 'preview',
        type: 'preview:url-detected',
        payload: cachedUrl,
      };
      ws.send(JSON.stringify(msg));
    }

    ws.on('message', (raw: Buffer) => {
      let msg: WSMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        ws.send(JSON.stringify({
          channel: 'ai',
          type: 'ai:error',
          payload: { type: 'error', message: 'Invalid JSON' },
        }));
        return;
      }

      switch (msg.channel) {
        case 'ai':
          handleAiMessage(ws, msg).catch((err) => {
            console.error('AI channel error:', err);
          });
          break;
        case 'terminal':
          handleTerminalMessage(ws, msg);
          break;
        case 'files':
          handleFileMessage(ws, msg).catch((err) => {
            console.error('File channel error:', err);
          });
          break;
        case 'preview':
          // Preview channel is server→client only
          break;
      }
    });

    ws.on('close', () => {
      console.log(`Client disconnected: ${decoded.username}`);
      cleanupConnection(ws);
      cleanupTerminalConnection(ws);
      unregisterFileClient(ws);
      unregisterPreviewClient(ws);
    });
  });

  return wss;
}
