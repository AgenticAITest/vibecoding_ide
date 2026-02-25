import { useEffect } from 'react';
import { useConsoleStore } from '../store/consoleStore';
import type { ConsoleEntry, NetworkEntry } from '@vibecoder/shared';

let idCounter = 0;
function nextId(): string {
  return `log-${Date.now()}-${++idCounter}`;
}

function safeStringify(val: unknown): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

export function useConsoleListener() {
  const addEntry = useConsoleStore((s) => s.addEntry);

  useEffect(() => {
    function handler(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'vibecoder-console') {
        const entry: ConsoleEntry = {
          id: nextId(),
          timestamp: Date.now(),
          level: data.level || 'log',
          args: Array.isArray(data.args)
            ? data.args.map(safeStringify)
            : [safeStringify(data.args)],
          source: 'console',
        };
        addEntry(entry);
      } else if (data.type === 'vibecoder-network') {
        const entry: NetworkEntry = {
          id: nextId(),
          timestamp: Date.now(),
          method: data.method || 'GET',
          url: data.url || '',
          status: data.status ?? null,
          duration: data.duration || 0,
          responseSnippet: data.responseSnippet || '',
          error: data.error,
          source: 'network',
        };
        addEntry(entry);
      }
    }

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [addEntry]);
}
