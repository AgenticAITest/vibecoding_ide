// --- Terminal client → server messages ---

export interface TerminalCreateMsg {
  type: 'terminal:create';
  sessionId: string;
  cols: number;
  rows: number;
}

export interface TerminalInputMsg {
  type: 'terminal:input';
  sessionId: string;
  data: string;
}

export interface TerminalResizeMsg {
  type: 'terminal:resize';
  sessionId: string;
  cols: number;
  rows: number;
}

export interface TerminalCloseMsg {
  type: 'terminal:close';
  sessionId: string;
}

export type TerminalClientMessage =
  | TerminalCreateMsg
  | TerminalInputMsg
  | TerminalResizeMsg
  | TerminalCloseMsg;

// --- Terminal server → client events ---

export interface TerminalCreatedEvent {
  type: 'terminal:created';
  sessionId: string;
}

export interface TerminalOutputEvent {
  type: 'terminal:output';
  sessionId: string;
  data: string;
}

export interface TerminalExitEvent {
  type: 'terminal:exit';
  sessionId: string;
  exitCode: number;
}

export interface TerminalErrorEvent {
  type: 'terminal:error';
  sessionId: string;
  message: string;
}

export type TerminalServerEvent =
  | TerminalCreatedEvent
  | TerminalOutputEvent
  | TerminalExitEvent
  | TerminalErrorEvent;
