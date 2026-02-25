import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { WSMessage } from '@vibecoder/shared';
import { handleAiMessage, cleanupConnection } from './aiChannel.js';
import { handleFileMessage, registerFileClient, unregisterFileClient } from './fileChannel.js';
import { handleTerminalMessage, cleanupTerminalConnection } from './terminalChannel.js';
import { registerPreviewClient, unregisterPreviewClient, getLatestExpoUrl } from './previewChannel.js';

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');
    // Auto-register for file change and preview broadcasts
    registerFileClient(ws);
    registerPreviewClient(ws);

    // Send cached preview URL if one exists (client may connect after URL was detected)
    const cachedUrl = getLatestExpoUrl();
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
          // Preview channel is server→client only; no client messages needed yet
          break;
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      cleanupConnection(ws);
      cleanupTerminalConnection(ws);
      unregisterFileClient(ws);
      unregisterPreviewClient(ws);
    });
  });

  return wss;
}
