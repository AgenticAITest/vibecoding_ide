import * as pty from 'node-pty';
import { getProjectDir } from './fileSystem.js';

interface PtySession {
  process: pty.IPty;
  onDataDispose: pty.IDisposable;
  onExitDispose: pty.IDisposable;
}

const sessions = new Map<string, PtySession>();

function getShell(): string {
  if (process.platform === 'win32') {
    return 'powershell.exe';
  }
  return process.env.SHELL || '/bin/bash';
}

function getShellArgs(): string[] {
  if (process.platform === 'win32') {
    return ['-NoLogo'];
  }
  return [];
}

export function createPtySession(
  id: string,
  cols: number,
  rows: number,
  onData: (data: string) => void,
  onExit: (exitCode: number) => void,
): void {
  if (sessions.has(id)) {
    console.warn(`[PTY] Session ${id} already exists, destroying old one`);
    destroyPtySession(id);
  }

  const shell = getShell();
  const args = getShellArgs();
  const cwd = getProjectDir();

  console.log(`[PTY] Spawning ${shell} for session ${id} in ${cwd} (${cols}x${rows})`);

  const proc = pty.spawn(shell, args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env: process.env as Record<string, string>,
  });

  const onDataDispose = proc.onData((data) => {
    onData(data);
  });

  const onExitDispose = proc.onExit(({ exitCode }) => {
    console.log(`[PTY] Session ${id} exited with code ${exitCode}`);
    sessions.delete(id);
    onExit(exitCode);
  });

  sessions.set(id, { process: proc, onDataDispose, onExitDispose });
}

export function writeToPty(id: string, data: string): void {
  const session = sessions.get(id);
  if (!session) {
    console.warn(`[PTY] Write to non-existent session ${id}`);
    return;
  }
  session.process.write(data);
}

export function resizePty(id: string, cols: number, rows: number): void {
  const session = sessions.get(id);
  if (!session) return;
  try {
    session.process.resize(cols, rows);
  } catch (err) {
    console.warn(`[PTY] Resize error for ${id}:`, err);
  }
}

export function destroyPtySession(id: string): void {
  const session = sessions.get(id);
  if (!session) return;

  session.onDataDispose.dispose();
  session.onExitDispose.dispose();

  try {
    session.process.kill();
  } catch {
    // Already dead
  }

  sessions.delete(id);
  console.log(`[PTY] Session ${id} destroyed`);
}

export function destroyManySessions(ids: Set<string>): void {
  for (const id of ids) {
    destroyPtySession(id);
  }
}
