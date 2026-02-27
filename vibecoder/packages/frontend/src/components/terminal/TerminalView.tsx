import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTabStore } from '../../store/tabStore';
import type { WSMessage } from '@vibecoder/shared';
import './TerminalView.css';

/**
 * Track which PTY sessions have been created on the backend.
 * Prevents React StrictMode double-mount from sending duplicate
 * terminal:create messages (which would restart the process).
 */
const createdSessions = new Set<string>();

interface TerminalViewProps {
  sessionId: string;
  initialCommand?: string;
}

export function TerminalView({ sessionId, initialCommand }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const handleMessage = useCallback(
    (msg: WSMessage) => {
      const payload = msg.payload as { type: string; sessionId: string; data?: string; exitCode?: number; message?: string };
      if (payload.sessionId !== sessionId) return;

      switch (payload.type) {
        case 'terminal:output':
          termRef.current?.write(payload.data ?? '');
          break;
        case 'terminal:exit':
          termRef.current?.write(`\r\n\x1b[90m[Process exited with code ${payload.exitCode}]\x1b[0m\r\n`);
          createdSessions.delete(sessionId);
          break;
        case 'terminal:error':
          termRef.current?.write(`\r\n\x1b[31m[Error: ${payload.message}]\x1b[0m\r\n`);
          break;
      }
    },
    [sessionId],
  );

  const { send } = useWebSocket('terminal', handleMessage);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear any leftover DOM from previous StrictMode cleanup
    container.innerHTML = '';

    const term = new Terminal({
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'bar',
      theme: {
        background: '#0e1525',
        foreground: '#e1e4e8',
        cursor: '#528bff',
        selectionBackground: '#3e4451',
        black: '#1e2127',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#d19a66',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#abb2bf',
        brightBlack: '#5c6370',
        brightRed: '#e06c75',
        brightGreen: '#98c379',
        brightYellow: '#e5c07b',
        brightBlue: '#61afef',
        brightMagenta: '#c678dd',
        brightCyan: '#56b6c2',
        brightWhite: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(container);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initial fit (deferred to let layout settle).
    // Use refs (not closure vars) so StrictMode's second rAF uses
    // the live Terminal/FitAddon instead of the disposed first mount's.
    requestAnimationFrame(() => {
      const currentTerm = termRef.current;
      const currentFit = fitAddonRef.current;
      if (!currentTerm || !currentFit) return;

      // Only fit if the container is visible (has non-zero dimensions).
      // Hidden tabs (display:none) would produce tiny cols/rows (e.g. 8x4).
      // In that case, keep xterm defaults (80x24) for a usable PTY.
      if (container.offsetWidth > 0 && container.offsetHeight > 0) {
        currentFit.fit();
      }

      // Only create the PTY session if we haven't already.
      // StrictMode re-mounts the component, but the PTY from the first
      // mount is still alive — don't restart the process.
      if (!createdSessions.has(sessionId)) {
        createdSessions.add(sessionId);
        send('terminal:create', {
          type: 'terminal:create',
          sessionId,
          cols: currentTerm.cols,
          rows: currentTerm.rows,
          ...(initialCommand ? { initialCommand } : {}),
        });
      }
    });

    // Forward user input to backend
    const dataDisposable = term.onData((data) => {
      send('terminal:input', {
        type: 'terminal:input',
        sessionId,
        data,
      });
    });

    // Resize observer for panel resizing.
    // Guard: skip fit when container is hidden (display:none → 0×0).
    // Without this, switching away from the terminal tab would resize it
    // to ~0 columns, garbling all subsequent output.
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (fitAddonRef.current && termRef.current && container.offsetWidth > 0 && container.offsetHeight > 0) {
          fitAddonRef.current.fit();
          send('terminal:resize', {
            type: 'terminal:resize',
            sessionId,
            cols: termRef.current.cols,
            rows: termRef.current.rows,
          });
        }
      });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      dataDisposable.dispose();

      // Only destroy the backend PTY if the tab was actually closed
      // (removed from the tab store). During StrictMode double-mount
      // or HMR, the tab still exists — keep the PTY alive so long-running
      // processes like Flutter compilation aren't killed.
      const tabStillExists = useTabStore.getState().tabs.some((t) => t.id === sessionId);
      if (!tabStillExists) {
        send('terminal:close', {
          type: 'terminal:close',
          sessionId,
        });
        createdSessions.delete(sessionId);
      }

      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId, send]);

  return <div ref={containerRef} className="terminal-view" />;
}
