import * as pty from 'node-pty';
import { execSync } from 'child_process';
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

/**
 * Build a clean Windows-format PATH for PTY sessions.
 * When running under Git Bash, process.env.PATH uses Unix-style paths
 * (/c/flutter/bin) that PowerShell can't resolve. Read the actual
 * User + System PATH from the registry so newly installed tools
 * (like Flutter) are available without restarting the IDE.
 */
let cachedPtyEnv: Record<string, string> | null = null;

function getPtyEnv(): Record<string, string> {
  if (cachedPtyEnv) return cachedPtyEnv;

  const env = { ...process.env } as Record<string, string>;

  if (process.platform === 'win32') {
    try {
      const winPath = execSync(
        'powershell.exe -NoProfile -NoLogo -Command "[Environment]::GetEnvironmentVariable(\'Path\',\'Machine\') + \';\' + [Environment]::GetEnvironmentVariable(\'Path\',\'User\')"',
        { encoding: 'utf-8', timeout: 5000 },
      ).trim();
      if (winPath) {
        env.Path = winPath;
        // Also set PATH for consistency
        env.PATH = winPath;
      }
    } catch (err) {
      console.warn('[PTY] Failed to read Windows PATH from registry, using process.env:', err);
    }
  }

  cachedPtyEnv = env;
  return env;
}

/** Force re-read of PATH on next PTY spawn (e.g. after installing a new SDK) */
export function invalidatePtyEnvCache(): void {
  cachedPtyEnv = null;
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
    env: getPtyEnv(),
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
