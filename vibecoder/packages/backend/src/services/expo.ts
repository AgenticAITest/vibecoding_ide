import QRCode from 'qrcode';

/** Strip ANSI escape sequences from terminal output — comprehensive */
export function stripAnsi(str: string): string {
  return str
    // CSI sequences: \x1b[ ... letter (includes ?/>/! modifiers)
    // eslint-disable-next-line no-control-regex
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')
    // OSC sequences terminated by BEL (\x07)
    // eslint-disable-next-line no-control-regex
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    // Two-character escape sequences: \x1b followed by single char
    // eslint-disable-next-line no-control-regex
    .replace(/\x1b[()][A-Z0-9]/g, '')
    // Single-char escapes like \x1b= \x1b>
    // eslint-disable-next-line no-control-regex
    .replace(/\x1b[=>]/g, '')
    // Any remaining lone \x1b
    // eslint-disable-next-line no-control-regex
    .replace(/\x1b/g, '');
}

// Per-session line buffers for multi-chunk accumulation
const sessionBuffers = new Map<string, string>();

// Expo Go: exp://192.168.1.8:8081 or exp://localhost:8081
const EXPO_URL_RE = /exp:\/\/[\w.-]+:\d+/;

// Development builds: exp+myapp://expo-development-client/...
const DEV_CLIENT_RE = /exp\+[\w-]+:\/\/expo-development-client\/[^\s]*/;

// Metro web: http://localhost:PORT or http://IP:PORT
const METRO_HTTP_RE = /http:\/\/[\w.-]+:\d+/;

// Metro line: "Metro waiting on <url>" — capture everything after "Metro waiting on "
const METRO_WAITING_RE = /Metro waiting on\s+((?:exp|http)[^\s]+)/;

// "Metro: <url>" format
const METRO_LABEL_RE = /Metro:\s+((?:exp|http)[^\s]+)/;

export interface ScanResult {
  expoUrl: string | null;
  webUrl: string | null;
}

/**
 * Accumulate PTY output chunks and scan for Expo URLs.
 * Returns a ScanResult if a new URL is found, or null if nothing detected.
 */
export function scanForExpoUrl(sessionId: string, data: string): ScanResult | null {
  const existing = sessionBuffers.get(sessionId) || '';
  const combined = existing + data;

  // Keep only last 8KB to avoid unbounded memory
  const trimmed = combined.length > 8192 ? combined.slice(-8192) : combined;
  sessionBuffers.set(sessionId, trimmed);

  const clean = stripAnsi(trimmed);

  let expoUrl: string | null = null;
  let webUrl: string | null = null;

  // Try "Metro waiting on" pattern first (most specific)
  const waitingMatch = clean.match(METRO_WAITING_RE);
  if (waitingMatch) {
    const url = waitingMatch[1];
    if (url.startsWith('exp://') || url.startsWith('exp+')) {
      expoUrl = url;
    } else if (url.startsWith('http://')) {
      webUrl = url;
    }
  }

  // Try "Metro: <url>" pattern
  if (!expoUrl) {
    const labelMatch = clean.match(METRO_LABEL_RE);
    if (labelMatch) {
      const url = labelMatch[1];
      if (url.startsWith('exp://') || url.startsWith('exp+')) {
        expoUrl = url;
      } else if (url.startsWith('http://') && !webUrl) {
        webUrl = url;
      }
    }
  }

  // Fallback: bare exp:// URL anywhere
  if (!expoUrl) {
    const expoMatch = clean.match(EXPO_URL_RE);
    if (expoMatch) expoUrl = expoMatch[0];
  }

  // Fallback: dev client URL
  if (!expoUrl) {
    const devMatch = clean.match(DEV_CLIENT_RE);
    if (devMatch) expoUrl = devMatch[0];
  }

  // Fallback: bare http URL (only localhost or LAN IPs, not random http refs)
  if (!webUrl) {
    const httpMatch = clean.match(METRO_HTTP_RE);
    if (httpMatch) webUrl = httpMatch[0];
  }

  if (expoUrl || webUrl) {
    console.log(`[Expo] URL detected in session ${sessionId}: expo=${expoUrl}, web=${webUrl}`);
    return { expoUrl, webUrl };
  }
  return null;
}

/** Clear the buffer for a session (call on terminal exit) */
export function clearSessionBuffer(sessionId: string): void {
  sessionBuffers.delete(sessionId);
}

/** Generate a QR code as a base64 data URL */
export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 256,
    margin: 2,
    color: { dark: '#cdd6f4', light: '#1e1e2e' },
  });
}
