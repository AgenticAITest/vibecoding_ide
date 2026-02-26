import { WebSocket } from 'ws';
import type { WSMessage, PreviewInfo } from '@vibecoder/shared';

const clients = new Set<WebSocket>();
let latestPreviewInfo: PreviewInfo | null = null;

export function registerPreviewClient(ws: WebSocket): void {
  clients.add(ws);
}

export function unregisterPreviewClient(ws: WebSocket): void {
  clients.delete(ws);
}

function broadcast(type: string, payload: unknown): void {
  const msg: WSMessage = { channel: 'preview', type, payload };
  const data = JSON.stringify(msg);
  console.log(`[Preview] Broadcasting ${type} to ${clients.size} client(s)`);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

export function broadcastPreviewUrl(info: PreviewInfo): void {
  latestPreviewInfo = info;
  broadcast('preview:url-detected', info);
}

export function broadcastServerStopped(terminalSessionId: string): void {
  if (latestPreviewInfo?.terminalSessionId === terminalSessionId) {
    latestPreviewInfo = null;
  }
  broadcast('preview:server-stopped', { terminalSessionId });
}

export function getLatestPreviewInfo(): PreviewInfo | null {
  return latestPreviewInfo;
}
