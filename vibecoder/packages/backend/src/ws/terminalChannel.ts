import { WebSocket } from 'ws';
import type { WSMessage, TerminalClientMessage, TerminalServerEvent } from '@vibecoder/shared';
import {
  createPtySession,
  writeToPty,
  resizePty,
  destroyPtySession,
  destroyManySessions,
} from '../services/ptyService.js';
import { scanForExpoUrl, generateQrDataUrl, clearSessionBuffer } from '../services/expo.js';
import { broadcastExpoUrl, broadcastServerStopped } from './previewChannel.js';

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
        // onData — PTY output → client + scan for Expo URLs
        (data) => {
          sendTerminalEvent(ws, {
            type: 'terminal:output',
            sessionId,
            data,
          });

          // Scan for Expo/Metro URLs in terminal output
          const result = scanForExpoUrl(sessionId, data);
          if (result) {
            const key = `${result.expoUrl}|${result.webUrl}`;
            if (!detectedUrls.has(key)) {
              detectedUrls.add(key);
              console.log(`[Expo] New URL key detected: ${key}`);
              const url = result.expoUrl || result.webUrl;
              if (url) {
                generateQrDataUrl(url).then((qrDataUrl) => {
                  console.log(`[Expo] QR generated, broadcasting...`);
                  broadcastExpoUrl({
                    expoUrl: result.expoUrl,
                    webUrl: result.webUrl,
                    qrDataUrl,
                    terminalSessionId: sessionId,
                  });
                }).catch((err) => {
                  console.error(`[Expo] QR generation failed:`, err);
                  broadcastExpoUrl({
                    expoUrl: result.expoUrl,
                    webUrl: result.webUrl,
                    qrDataUrl: null,
                    terminalSessionId: sessionId,
                  });
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
