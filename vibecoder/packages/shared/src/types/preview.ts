export interface ExpoUrlInfo {
  expoUrl: string | null;
  webUrl: string | null;
  qrDataUrl: string | null;
  terminalSessionId: string;
}

export type PreviewServerEvent =
  | { type: 'preview:url-detected'; payload: ExpoUrlInfo }
  | { type: 'preview:server-stopped'; payload: { terminalSessionId: string } };
