import { useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { usePreviewStore } from '../store/previewStore';
import type { WSMessage, FileChange } from '@vibecoder/shared';

const DEBOUNCE_MS = 500;

/** Sends 'r' (hot reload) to the Flutter dev server PTY when .dart files change. */
export function useHotReload() {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { send: sendTerminal } = useWebSocket('terminal', useCallback(() => {}, []));

  useWebSocket(
    'files',
    useCallback(
      (msg: WSMessage) => {
        if (msg.type !== 'files:changed') return;

        const { changes } = msg.payload as { changes: FileChange[] };

        // Only trigger on file content changes (not unlink/addDir/unlinkDir)
        const hasRelevantChange = changes.some(
          (c) =>
            (c.type === 'change' || c.type === 'add') &&
            (c.path.endsWith('.dart') || c.path.endsWith('pubspec.yaml')),
        );
        if (!hasRelevantChange) return;

        // Guard: only for Flutter projects with a running preview server
        const { framework, serverState, previewTerminalId } =
          usePreviewStore.getState();
        if (
          framework !== 'flutter' ||
          serverState !== 'running' ||
          !previewTerminalId
        )
          return;

        // Debounce: coalesce rapid saves into a single reload
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          debounceTimer.current = null;
          // Re-check state after debounce — conditions may have changed
          const snap = usePreviewStore.getState();
          if (
            snap.framework !== 'flutter' ||
            snap.serverState !== 'running' ||
            !snap.previewTerminalId
          )
            return;

          sendTerminal('terminal:input', {
            type: 'terminal:input',
            sessionId: snap.previewTerminalId,
            data: 'r',
          });
        }, DEBOUNCE_MS);
      },
      [sendTerminal],
    ),
  );
}
