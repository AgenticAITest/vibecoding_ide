import type { ProjectFramework } from './project.js';

export interface PreviewInfo {
  nativeUrl: string | null;
  webUrl: string | null;
  qrDataUrl: string | null;
  terminalSessionId: string;
  framework: ProjectFramework;
}

export type PreviewServerEvent =
  | { type: 'preview:url-detected'; payload: PreviewInfo }
  | { type: 'preview:server-stopped'; payload: { terminalSessionId: string } };

/** @deprecated Use PreviewInfo instead */
export type ExpoUrlInfo = PreviewInfo;
