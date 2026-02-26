import { WebSocket } from 'ws';
import type { WSMessage, TerminalClientMessage, TerminalServerEvent } from '@vibecoder/shared';
import {
  createPtySession,
  writeToPty,
  resizePty,
  destroyPtySession,
  destroyManySessions,
} from '../services/ptyService.js';
import { scanForDevServerUrl, generateQrDataUrl, clearSessionBuffer } from '../services/devServerScanner.js';
import { broadcastPreviewUrl, broadcastServerStopped } from './previewChannel.js';

/** Track which terminal sessions belong to each WS connection */
const connectionSessions = new Map<WebSocket, Set<string>>();

function sendTerminalEvent(ws: WebSocket, event: TerminalServerEvent): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  const msg: WSMessage = {
    channel: 'terminal',
    type: event.type,
    payload: event,
  };
  ws.send(JSON.stringify(msg));
}

function getOrCreateSessionSet(ws: WebSocket): Set<string> {
  let set = connectionSessions.get(ws);
  if (!set) {
    set = new Set();
    connectionSessions.set(ws, set);
  }
  return set;
}

export function handleTerminalMessage(ws: WebSocket, msg: WSMessage): void {
  const payload = msg.payload as TerminalClientMessage;

  switch (payload.type) {
    case 'terminal:create': {
      const { sessionId, cols, rows } = payload;
      const sessions = getOrCreateSessionSet(ws);
      sessions.add(sessionId);

      // Track already-detected URLs to avoid re-broadcasting
      const detectedUrls = new Set<string>();

      createPtySession(
        sessionId,
        cols,
        rows,
        // onData — PTY output → client + scan for dev server URLs
        (data) => {
          sendTerminalEvent(ws, {
            type: 'terminal:output',
            sessionId,
            data,
          });

          // Scan for Expo/Flutter dev server URLs in terminal output
          const result = scanForDevServerUrl(sessionId, data);
          if (result) {
            const key = `${result.nativeUrl}|${result.webUrl}`;
            if (!detectedUrls.has(key)) {
              detectedUrls.add(key);
              console.log(`[Preview] New URL key detected: ${key} (framework: ${result.framework})`);

              // Only generate QR for Expo (Flutter web-only, no QR needed)
              const nativeUrl = result.nativeUrl;
              if (nativeUrl && result.framework === 'expo') {
                generateQrDataUrl(nativeUrl).then((qrDataUrl) => {
                  console.log(`[Preview] QR generated, broadcasting...`);
                  broadcastPreviewUrl({
                    nativeUrl: result.nativeUrl,
                    webUrl: result.webUrl,
                    qrDataUrl,
                    terminalSessionId: sessionId,
                    framework: result.framework,
                  });
                }).catch((err) => {
                  console.error(`[Preview] QR generation failed:`, err);
                  broadcastPreviewUrl({
                    nativeUrl: result.nativeUrl,
                    webUrl: result.webUrl,
                    qrDataUrl: null,
                    terminalSessionId: sessionId,
                    framework: result.framework,
                  });
                });
              } else {
                // Flutter or Expo without native URL — broadcast without QR
                broadcastPreviewUrl({
                  nativeUrl: result.nativeUrl,
                  webUrl: result.webUrl,
                  qrDataUrl: null,
                  terminalSessionId: sessionId,
                  framework: result.framework,
                });
              }
            }
          }
        },
        // onExit — PTY process exited
        (exitCode) => {
          sessions.delete(sessionId);
          clearSessionBuffer(sessionId);
          broadcastServerStopped(sessionId);
          sendTerminalEvent(ws, {
            type: 'terminal:exit',
            sessionId,
            exitCode,
          });
        },
      );

      sendTerminalEvent(ws, {
        type: 'terminal:created',
        sessionId,
      });
      break;
    }

    case 'terminal:input': {
      writeToPty(payload.sessionId, payload.data);
      break;
    }

    case 'terminal:resize': {
      resizePty(payload.sessionId, payload.cols, payload.rows);
      break;
    }

    case 'terminal:close': {
      const sessions = connectionSessions.get(ws);
      if (sessions) {
        sessions.delete(payload.sessionId);
      }
      destroyPtySession(payload.sessionId);
      break;
    }
  }
}

export function cleanupTerminalConnection(ws: WebSocket): void {
  const sessions = connectionSessions.get(ws);
  if (sessions && sessions.size > 0) {
    console.log(`[Terminal] Cleaning up ${sessions.size} session(s) for disconnected client`);
    destroyManySessions(sessions);
  }
  connectionSessions.delete(ws);
}
