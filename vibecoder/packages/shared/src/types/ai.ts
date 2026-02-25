export interface AIImageAttachment {
  path: string;          // relative: "uploads/1709123456-screenshot.png"
  originalName: string;  // "screenshot.png"
  mimeType: string;      // "image/png"
  size: number;          // bytes
}

export interface AIToolCall {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  output?: string;
  status: 'running' | 'done' | 'error';
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolCalls?: AIToolCall[];
  imageAttachment?: AIImageAttachment;
}

export type AIStreamEvent =
  | { type: 'init'; sessionId: string }
  | { type: 'text'; delta: string }
  | { type: 'toolUse'; id: string; tool: string; args: Record<string, unknown> }
  | { type: 'toolResult'; id: string; tool: string; output: string }
  | { type: 'done'; cost?: number; usage?: { input: number; output: number } }
  | { type: 'error'; message: string };
