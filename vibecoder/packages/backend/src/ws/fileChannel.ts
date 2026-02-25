import type { WebSocket } from 'ws';
import type { WSMessage } from '@vibecoder/shared';
import { startWatcher, onFileChange, getFileTree } from '../services/fileSystem.js';

const fileClients = new Set<WebSocket>();

export function registerFileClient(ws: WebSocket): void {
  fileClients.add(ws);
}

export function unregisterFileClient(ws: WebSocket): void {
  fileClients.delete(ws);
}

function broadcast(msg: WSMessage): void {
  const data = JSON.stringify(msg);
  for (const client of fileClients) {
    if (client.readyState === 1 /* OPEN */) {
      client.send(data);
    }
  }
}

export async function handleFileMessage(ws: WebSocket, msg: WSMessage): Promise<void> {
  switch (msg.type) {
    case 'files:subscribe':
      registerFileClient(ws);
      break;

    case 'files:requestTree': {
      const tree = await getFileTree();
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
  startWatcher();

  onFileChange((changes) => {
    broadcast({
      channel: 'files',
      type: 'files:changed',
      payload: { type: 'files:changed', changes },
    });
  });

  console.log('File channel initialized');
}
