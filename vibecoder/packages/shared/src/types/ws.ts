export interface WSMessage {
  channel: 'ai' | 'terminal' | 'files' | 'preview';
  type: string;
  payload: unknown;
}
