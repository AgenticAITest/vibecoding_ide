import type { WebSocket } from 'ws';

// Map WebSocket → userId for channel handlers
const wsUserMap = new WeakMap<WebSocket, string>();

export function setWsUserId(ws: WebSocket, userId: string): void {
  wsUserMap.set(ws, userId);
}

export function getWsUserId(ws: WebSocket): string {
  return wsUserMap.get(ws) || '';
}
