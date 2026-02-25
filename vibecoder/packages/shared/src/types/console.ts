export interface ConsoleEntry {
  id: string;
  timestamp: number;
  level: 'log' | 'info' | 'warn' | 'error';
  args: string[];
  source: 'console';
}

export interface NetworkEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  status: number | null;
  duration: number;
  responseSnippet: string;
  error?: string;
  source: 'network';
}

export type LogEntry = ConsoleEntry | NetworkEntry;
