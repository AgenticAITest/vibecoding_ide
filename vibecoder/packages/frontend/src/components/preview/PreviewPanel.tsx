import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { usePreviewStore } from '../../store/previewStore';
import { useTabStore } from '../../store/tabStore';
import { useTerminalStore } from '../../store/terminalStore';
import { useFileStore } from '../../store/fileStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import type { WSMessage, ProjectFramework } from '@vibecoder/shared';
import './PreviewPanel.css';

const PREVIEW_SESSION_ID = 'preview-server';
const DEVICE_OUTER_W = 381; // 375 + 6 (3px border each side)
const DEVICE_OUTER_H = 818; // 812 + 6 (3px border each side)

/** Detect framework from the file tree: if pubspec.yaml exists at root, it's Flutter */
function detectFramework(tree: { name: string }[]): ProjectFramework {
  return tree.some((n) => n.name === 'pubspec.yaml') ? 'flutter' : 'expo';
}

export function PreviewPanel() {
  const nativeUrl = usePreviewStore((s) => s.nativeUrl);
  const webUrl = usePreviewStore((s) => s.webUrl);
  const qrDataUrl = usePreviewStore((s) => s.qrDataUrl);
  const viewMode = usePreviewStore((s) => s.viewMode);
  const setViewMode = usePreviewStore((s) => s.setViewMode);
  const serverState = usePreviewStore((s) => s.serverState);
  const setServerState = usePreviewStore((s) => s.setServerState);
  const previewTerminalId = usePreviewStore((s) => s.previewTerminalId);
  const setPreviewTerminalId = usePreviewStore((s) => s.setPreviewTerminalId);
  const storeFramework = usePreviewStore((s) => s.framework);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const tree = useFileStore((s) => s.tree);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [iframeScale, setIframeScale] = useState(1);
  const deviceContainerRef = useRef<HTMLDivElement>(null);

  // Detect framework from file tree; fall back to store value when server is running
  const detectedFramework = useMemo(() => detectFramework(tree), [tree]);
  const framework: ProjectFramework = storeFramework !== 'expo' ? storeFramework : detectedFramework;
  const isFlutter = framework === 'flutter';

  const isVisible = activeTabId === 'preview';
  const hasUrl = nativeUrl || webUrl;

  // Measure the device container and compute scale so the full 375x812 device fits
  useEffect(() => {
    const el = deviceContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        const scale = Math.min(width / DEVICE_OUTER_W, height / DEVICE_OUTER_H, 1);
        setIframeScale(scale);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Derive port from native/web URL
  const devServerPort = useMemo(() => {
    if (webUrl) {
      const m = webUrl.match(/:(\d+)/);
      return m ? m[1] : isFlutter ? '8080' : '8081';
    }
    if (nativeUrl) {
      const m = nativeUrl.match(/:(\d+)/);
      return m ? m[1] : '8081';
    }
    return null;
  }, [nativeUrl, webUrl, isFlutter]);

  // Direct dev server URL — used for display only.
  const devServerUrl = devServerPort ? `http://localhost:${devServerPort}` : null;
  // Proxied URL — routes through backend so we can inject the console interceptor.
  const proxyUrl = devServerPort ? `/api/preview-proxy/${devServerPort}/` : null;
  const displayUrl = nativeUrl || webUrl || '';

  // --- Terminal channel: listen for terminal:exit ---
  const terminalHandler = useCallback(
    (msg: WSMessage) => {
      const payload = msg.payload as { type: string; sessionId: string; exitCode?: number };
      if (payload.sessionId !== PREVIEW_SESSION_ID) return;

      if (payload.type === 'terminal:exit') {
        setServerState('stopped');
        setPreviewTerminalId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { send: sendTerminal } = useWebSocket('terminal', terminalHandler);

  // Build the start command for the preview server
  const startCommand = useMemo(() => {
    const isWindows = navigator.platform.startsWith('Win');
    const nl = isWindows ? '\r' : '\n';
    if (isFlutter) {
      return `flutter run -d web-server --web-hostname=localhost --web-port=8080${nl}`;
    }
    return isWindows
      ? `$env:BROWSER='none'; npx expo start --web${nl}`
      : `BROWSER=none npx expo start --web${nl}`;
  }, [isFlutter]);

  // Health-check dev server via the proxy before loading the iframe.
  useEffect(() => {
    if (!devServerUrl || !isVisible || viewMode !== 'web') return;
    if (serverReady) return;

    let cancelled = false;
    const checkServer = async () => {
      try {
        // Use GET, not HEAD — Flutter's web server returns 404 for HEAD.
        // Check for any non-502 status: 502 means proxy can't connect,
        // anything else means the dev server is responding.
        const res = await fetch(`/api/preview-proxy/${devServerPort}/`);
        if (!cancelled && res.status !== 502) {
          setServerReady(true);
        }
      } catch {
        // Dev server not ready yet
      }
      if (!cancelled && !serverReady) {
        setTimeout(checkServer, 2000);
      }
    };
    checkServer();
    return () => { cancelled = true; };
  }, [devServerUrl, devServerPort, isVisible, viewMode, serverReady]);

  // Fallback: when stuck in 'starting' with no URL detected, probe default
  // port to see if dev server is already running from a previous session.
  const setPreviewInfo = usePreviewStore((s) => s.setPreviewInfo);
  useEffect(() => {
    if (serverState !== 'starting' || hasUrl) return;

    const defaultPort = isFlutter ? '8080' : '8081';
    let cancelled = false;
    const probeDefault = async () => {
      try {
        const res = await fetch(`/api/preview-proxy/${defaultPort}/`);
        if (!cancelled && res.status !== 502) {
          // Dev server is already running — populate the store
          setPreviewInfo({
            nativeUrl: null,
            webUrl: `http://localhost:${defaultPort}`,
            qrDataUrl: null,
            terminalSessionId: PREVIEW_SESSION_ID,
            framework,
          });
          setServerState('running');
        }
      } catch {
        // Not running yet
      }
      if (!cancelled) {
        setTimeout(probeDefault, 2000);
      }
    };
    // Start probing after a short delay to give the normal URL detection a chance
    const timer = setTimeout(probeDefault, 3000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [serverState, hasUrl, setPreviewInfo, setServerState, isFlutter, framework]);

  // Reset readiness when URL changes
  useEffect(() => {
    setServerReady(false);
  }, [devServerUrl]);

  // Reset iframe state when switching to web view
  useEffect(() => {
    if (viewMode === 'web') {
      setIframeLoaded(false);
      setIframeError(null);
    }
  }, [viewMode]);

  // --- Start Preview handler ---
  const handleStartPreview = useCallback(() => {
    // Guard: don't create another if one already exists
    const tabs = useTabStore.getState().tabs;
    if (previewTerminalId && tabs.find((t) => t.id === previewTerminalId)) return;

    setServerState('starting');
    setViewMode('web');

    // Register terminal session in terminal store
    useTerminalStore.getState().addSession(PREVIEW_SESSION_ID, 0);

    // Create terminal tab with initialCommand (not focused — stays on preview tab)
    const currentActive = useTabStore.getState().activeTabId;
    useTabStore.getState().openTab({
      id: PREVIEW_SESSION_ID,
      type: 'terminal',
      label: isFlutter ? 'Flutter Server' : 'Expo Server',
      closable: true,
      initialCommand: startCommand,
    });
    // openTab focuses the new tab — restore focus to preview
    useTabStore.getState().setActiveTab(currentActive);

    setPreviewTerminalId(PREVIEW_SESSION_ID);
  }, [previewTerminalId, setServerState, setViewMode, setPreviewTerminalId, isFlutter, startCommand]);

  const handleCopyUrl = () => {
    const urlToCopy = viewMode === 'web' ? (devServerUrl || displayUrl) : displayUrl;
    if (urlToCopy) {
      navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleRefresh = useCallback(() => {
    setIframeError(null);
    setIframeLoaded(false);
    if (serverReady && iframeRef.current && proxyUrl) {
      iframeRef.current.src = proxyUrl;
    } else {
      setServerReady(false);
    }
  }, [serverReady, proxyUrl]);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
  };

  // Framework-specific labels
  const serverLabel = isFlutter ? 'Flutter dev server' : 'Metro';
  const hintLabel = isFlutter ? 'Flutter web dev server' : 'Expo dev server';

  // --- Determine display state ---
  // If URL exists (from any source), show running state regardless of serverState
  const showToolbar = hasUrl;
  const showIdle = !hasUrl && (serverState === 'idle' || serverState === 'stopped');
  const showStarting = !hasUrl && serverState === 'starting';

  // --- Idle / Stopped: Start Preview button ---
  if (showIdle) {
    return (
      <div className="preview">
        <div className="preview__empty">
          <div className="preview__empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
          {serverState === 'stopped' ? (
            <>
              <p className="preview__empty-title">Server stopped</p>
              <button className="preview__start-btn" onClick={handleStartPreview}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23,4 23,10 17,10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Restart Preview
              </button>
            </>
          ) : (
            <>
              <p className="preview__empty-title">No preview running</p>
              <button className="preview__start-btn" onClick={handleStartPreview}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <polygon points="6,3 20,12 6,21" />
                </svg>
                Start Preview
              </button>
              <p className="preview__empty-hint">
                Starts {hintLabel} and loads the web preview
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- Starting: spinner ---
  if (showStarting) {
    return (
      <div className="preview">
        <div className="preview__empty">
          <div className="preview__spinner" />
          <p className="preview__empty-title">Starting {serverLabel}...</p>
          <p className="preview__empty-hint">
            Setting up the {hintLabel}
          </p>
        </div>
      </div>
    );
  }

  // --- Running / has URL: toolbar + content ---
  return (
    <div className="preview">
      {showToolbar && (
        <div className="preview__toolbar">
          {/* Only show QR/Web toggle for Expo — Flutter is web-only */}
          {!isFlutter && (
            <div className="preview__toggle">
              <button
                className={`preview__toggle-btn ${viewMode === 'qr' ? 'preview__toggle-btn--active' : ''}`}
                onClick={() => setViewMode('qr')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="8" height="8" />
                  <rect x="14" y="2" width="8" height="8" />
                  <rect x="2" y="14" width="8" height="8" />
                  <rect x="14" y="14" width="4" height="4" />
                  <line x1="22" y1="14" x2="22" y2="22" />
                  <line x1="14" y1="22" x2="22" y2="22" />
                </svg>
                QR
              </button>
              <button
                className={`preview__toggle-btn ${viewMode === 'web' ? 'preview__toggle-btn--active' : ''}`}
                onClick={() => setViewMode('web')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                Web
              </button>
            </div>
          )}

          <div className="preview__url" title={viewMode === 'web' ? (devServerUrl || '') : displayUrl}>
            {viewMode === 'web' ? devServerUrl : displayUrl}
          </div>

          <div className="preview__actions">
            {isFlutter && serverState === 'running' && previewTerminalId && (
              <>
                <button
                  className="preview__action-btn"
                  onClick={() =>
                    sendTerminal('terminal:input', {
                      type: 'terminal:input',
                      sessionId: previewTerminalId,
                      data: 'r',
                    })
                  }
                  title="Hot Reload (r)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f9e2af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
                  </svg>
                </button>
                <button
                  className="preview__action-btn"
                  onClick={() =>
                    sendTerminal('terminal:input', {
                      type: 'terminal:input',
                      sessionId: previewTerminalId,
                      data: 'R',
                    })
                  }
                  title="Hot Restart (R)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fab387" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1,4 1,10 7,10" />
                    <polyline points="23,20 23,14 17,14" />
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                  </svg>
                </button>
              </>
            )}
            <button className="preview__action-btn" onClick={handleCopyUrl} title={copied ? 'Copied!' : 'Copy URL'}>
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a6e3a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
            {viewMode === 'web' && (
              <button className="preview__action-btn" onClick={handleRefresh} title="Refresh">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23,4 23,10 17,10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="preview__content">
        {viewMode === 'qr' && !isFlutter ? (
          <div className="preview__qr">
            {qrDataUrl && (
              <img className="preview__qr-img" src={qrDataUrl} alt="QR Code" />
            )}
            <p className="preview__qr-instruction">
              Scan with Expo Go to open on your device
            </p>
            <code className="preview__qr-url">{displayUrl}</code>
            <div className="preview__qr-help">
              <p className="preview__qr-help-title">Not connecting?</p>
              <ul className="preview__qr-help-list">
                <li>Make sure your phone and computer are on the same WiFi network</li>
                <li>Allow Node.js through Windows Firewall (port 8081)</li>
                <li>Try tunnel mode: run <code>npx expo start --tunnel</code></li>
              </ul>
            </div>
          </div>
        ) : iframeError ? (
          <div className="preview__web-error">
            <p className="preview__web-error-title">Could not load web preview</p>
            <p className="preview__web-error-hint">{iframeError}</p>
            <button className="preview__btn preview__btn--primary" onClick={handleRefresh}>
              Retry
            </button>
          </div>
        ) : devServerUrl && serverReady ? (
          <div className="preview__device-container" ref={deviceContainerRef}>
            <div
              className="preview__device-sizer"
              style={{
                width: DEVICE_OUTER_W * iframeScale,
                height: DEVICE_OUTER_H * iframeScale,
              }}
            >
              <div
                className="preview__device"
                style={{
                  transform: `scale(${iframeScale})`,
                  transformOrigin: 'top left',
                }}
              >
                <div className="preview__device-notch">
                  <div className="preview__device-camera" />
                </div>
                <div className="preview__iframe-wrap">
                  {!iframeLoaded && (
                    <div className="preview__iframe-loading">Loading web preview...</div>
                  )}
                  <iframe
                    ref={iframeRef}
                    className="preview__iframe"
                    src={proxyUrl!}
                    title="Web Preview"
                    onLoad={handleIframeLoad}
                    onError={() => setIframeError(`Failed to connect to ${serverLabel}.`)}
                  />
                </div>
                <div className="preview__device-home" />
              </div>
            </div>
          </div>
        ) : devServerUrl && !serverReady ? (
          <div className="preview__web-error">
            <div className="preview__spinner" />
            <p className="preview__web-error-title">Waiting for {serverLabel} to start...</p>
            <p className="preview__web-error-hint">
              Checking localhost:{devServerPort} every 2 seconds
            </p>
          </div>
        ) : (
          <div className="preview__web-error">
            <p className="preview__web-error-title">No web URL available</p>
            <p className="preview__web-error-hint">
              {isFlutter ? (
                <>Run <code>flutter run -d web-server</code> in the terminal.</>
              ) : (
                <>Run <code>npx expo start --web</code> in the terminal.</>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
