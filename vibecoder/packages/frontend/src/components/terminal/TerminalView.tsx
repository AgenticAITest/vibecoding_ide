import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { useWebSocket } from '../../hooks/useWebSocket';
import type { WSMessage } from '@vibecoder/shared';
import './TerminalView.css';

interface TerminalViewProps {
  sessionId: string;
}

export function TerminalView({ sessionId }: TerminalViewProps) {
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

    // Initial fit (deferred to let layout settle)
    requestAnimationFrame(() => {
      // Guard: terminal may have been disposed by StrictMode cleanup
      if (!termRef.current) return;

      fitAddon.fit();

      send('terminal:create', {
        type: 'terminal:create',
        sessionId,
        cols: term.cols,
        rows: term.rows,
      });
    });

    // Forward user input to backend
    const dataDisposable = term.onData((data) => {
      send('terminal:input', {
        type: 'terminal:input',
        sessionId,
        data,
      });
    });

    // Resize observer for panel resizing
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (fitAddonRef.current && termRef.current) {
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

      send('terminal:close', {
        type: 'terminal:close',
        sessionId,
      });

      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId, send]);

  return <div ref={containerRef} className="terminal-view" />;
}
