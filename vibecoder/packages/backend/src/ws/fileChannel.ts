import type { WebSocket } from 'ws';
import type { WSMessage } from '@vibecoder/shared';
import { onFileChange, getFileTree, getProjectDir } from '../services/fileSystem.js';
import { getWsUserId } from './wsAuth.js';

// Track each client's file watcher cleanup function
const clientCleanups = new Map<WebSocket, () => void>();
const fileClients = new Set<WebSocket>();

export function registerFileClient(ws: WebSocket): void {
  fileClients.add(ws);

  // Set up per-user file watching
  const userId = getWsUserId(ws);
  if (!userId) return;

  const projectDir = getProjectDir(userId);
  const cleanup = onFileChange(projectDir, (changes) => {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(JSON.stringify({
        channel: 'files',
        type: 'files:changed',
        payload: { type: 'files:changed', changes },
      } satisfies WSMessage));
    }
  });

  clientCleanups.set(ws, cleanup);
}

export function unregisterFileClient(ws: WebSocket): void {
  fileClients.delete(ws);
  const cleanup = clientCleanups.get(ws);
  if (cleanup) {
    cleanup();
    clientCleanups.delete(ws);
  }
}

export async function handleFileMessage(ws: WebSocket, msg: WSMessage): Promise<void> {
  switch (msg.type) {
    case 'files:subscribe':
      // Re-register to pick up any project dir changes
      unregisterFileClient(ws);
      registerFileClient(ws);
      break;

    case 'files:requestTree': {
      const userId = getWsUserId(ws);
      const tree = await getFileTree(undefined, userId);
      ws.send(JSON.stringify({
        channel: 'files',
        type: 'files:treeRefresh',
        payload: { type: 'files:treeRefresh', tree },
      } satisfies WSMessage));
      break;
    }
  }
}

export function initFileChannel(): void {
  // No global watcher — watchers are started per-user when they connect
  console.log('File channel initialized (per-user watchers)');
}
