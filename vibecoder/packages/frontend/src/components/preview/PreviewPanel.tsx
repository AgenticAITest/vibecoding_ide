import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { usePreviewStore } from '../../store/previewStore';
import { useTabStore } from '../../store/tabStore';
import { useTerminalStore } from '../../store/terminalStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import type { WSMessage } from '@vibecoder/shared';
import './PreviewPanel.css';

const EXPO_SESSION_ID = 'expo-server';
const DEVICE_OUTER_W = 381; // 375 + 6 (3px border each side)
const DEVICE_OUTER_H = 818; // 812 + 6 (3px border each side)

export function PreviewPanel() {
  const expoUrl = usePreviewStore((s) => s.expoUrl);
  const webUrl = usePreviewStore((s) => s.webUrl);
  const qrDataUrl = usePreviewStore((s) => s.qrDataUrl);
  const viewMode = usePreviewStore((s) => s.viewMode);
  const setViewMode = usePreviewStore((s) => s.setViewMode);
  const serverState = usePreviewStore((s) => s.serverState);
  const setServerState = usePreviewStore((s) => s.setServerState);
  const expoTerminalId = usePreviewStore((s) => s.expoTerminalId);
  const setExpoTerminalId = usePreviewStore((s) => s.setExpoTerminalId);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [metroReady, setMetroReady] = useState(false);
  const [iframeScale, setIframeScale] = useState(1);
  const deviceContainerRef = useRef<HTMLDivElement>(null);

  const isVisible = activeTabId === 'preview';
  const hasUrl = expoUrl || webUrl;

  // Measure the device container and compute scale so the full 375×812 device fits
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

  // Derive port from expo/web URL
  const metroPort = useMemo(() => {
    if (webUrl) {
      const m = webUrl.match(/:(\d+)/);
      return m ? m[1] : '8081';
    }
    if (expoUrl) {
      const m = expoUrl.match(/:(\d+)/);
      return m ? m[1] : '8081';
    }
    return null;
  }, [expoUrl, webUrl]);

  // Direct Metro URL — used for display only.
  const metroWebUrl = metroPort ? `http://localhost:${metroPort}` : null;
  // Proxied URL — routes through backend so we can inject the console interceptor.
  const proxyUrl = metroPort ? `/api/preview-proxy/?_port=${metroPort}` : null;
  const displayUrl = expoUrl || webUrl || '';

  // --- Terminal channel: listen for terminal:created and terminal:exit ---
  const terminalHandler = useCallback(
    (msg: WSMessage) => {
      const payload = msg.payload as { type: string; sessionId: string; exitCode?: number };
      if (payload.sessionId !== EXPO_SESSION_ID) return;

      if (payload.type === 'terminal:created') {
        // PTY is ready — send the Expo start command
        const isWindows = navigator.platform.startsWith('Win');
        const command = isWindows
          ? "$env:BROWSER='none'; npx expo start --web\r"
          : 'BROWSER=none npx expo start --web\n';
        sendTerminal('terminal:input', {
          type: 'terminal:input',
          sessionId: EXPO_SESSION_ID,
          data: command,
        });
      }

      if (payload.type === 'terminal:exit') {
        setServerState('stopped');
        setExpoTerminalId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { send: sendTerminal } = useWebSocket('terminal', terminalHandler);

  // Health-check Metro via the proxy before loading the iframe.
  useEffect(() => {
    if (!metroWebUrl || !isVisible || viewMode !== 'web') return;
    if (metroReady) return;

    let cancelled = false;
    const checkMetro = async () => {
      try {
        const res = await fetch(`/api/preview-proxy/?_port=${metroPort}`, {
          method: 'HEAD',
        });
        if (!cancelled && res.ok) {
          setMetroReady(true);
        }
      } catch {
        // Metro not ready yet
      }
      if (!cancelled && !metroReady) {
        setTimeout(checkMetro, 2000);
      }
    };
    checkMetro();
    return () => { cancelled = true; };
  }, [metroWebUrl, metroPort, isVisible, viewMode, metroReady]);

  // Fallback: when stuck in 'starting' with no URL detected, probe default
  // port 8081 to see if Metro is already running from a previous session.
  const setExpoInfo = usePreviewStore((s) => s.setExpoInfo);
  useEffect(() => {
    if (serverState !== 'starting' || hasUrl) return;

    let cancelled = false;
    const probeDefault = async () => {
      try {
        const res = await fetch('/api/preview-proxy/?_port=8081', {
          method: 'HEAD',
        });
        if (!cancelled && res.ok) {
          // Metro is already running — populate the store
          setExpoInfo({
            expoUrl: '',
            webUrl: 'http://localhost:8081',
            qrDataUrl: null,
            terminalSessionId: EXPO_SESSION_ID,
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
  }, [serverState, hasUrl, setExpoInfo, setServerState]);

  // Reset readiness when URL changes
  useEffect(() => {
    setMetroReady(false);
  }, [metroWebUrl]);

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
    if (expoTerminalId && tabs.find((t) => t.id === expoTerminalId)) return;

    setServerState('starting');
    setViewMode('web');

    // Register terminal session in terminal store
    useTerminalStore.getState().addSession(EXPO_SESSION_ID, 0);

    // Create terminal tab (not focused — stays on preview tab)
    const currentActive = useTabStore.getState().activeTabId;
    useTabStore.getState().openTab({
      id: EXPO_SESSION_ID,
      type: 'terminal',
      label: 'Expo Server',
      closable: true,
    });
    // openTab focuses the new tab — restore focus to preview
    useTabStore.getState().setActiveTab(currentActive);

    setExpoTerminalId(EXPO_SESSION_ID);
  }, [expoTerminalId, setServerState, setViewMode, setExpoTerminalId]);

  const handleCopyUrl = () => {
    const urlToCopy = viewMode === 'web' ? (metroWebUrl || displayUrl) : displayUrl;
    if (urlToCopy) {
      navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleRefresh = useCallback(() => {
    setIframeError(null);
    setIframeLoaded(false);
    if (metroReady && iframeRef.current && proxyUrl) {
      iframeRef.current.src = proxyUrl;
    } else {
      setMetroReady(false);
    }
  }, [metroReady, proxyUrl]);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
  };

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
                Starts Expo dev server and loads the web preview
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
          <p className="preview__empty-title">Starting Metro...</p>
          <p className="preview__empty-hint">
            Setting up the Expo dev server
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

          <div className="preview__url" title={viewMode === 'web' ? (metroWebUrl || '') : displayUrl}>
            {viewMode === 'web' ? metroWebUrl : displayUrl}
          </div>

          <div className="preview__actions">
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
        {viewMode === 'qr' ? (
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
        ) : metroWebUrl && metroReady ? (
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
                    onError={() => setIframeError('Failed to connect to Metro dev server.')}
                  />
                </div>
                <div className="preview__device-home" />
              </div>
            </div>
          </div>
        ) : metroWebUrl && !metroReady ? (
          <div className="preview__web-error">
            <div className="preview__spinner" />
            <p className="preview__web-error-title">Waiting for Metro to start...</p>
            <p className="preview__web-error-hint">
              Checking localhost:{metroPort} every 2 seconds
            </p>
          </div>
        ) : (
          <div className="preview__web-error">
            <p className="preview__web-error-title">No web URL available</p>
            <p className="preview__web-error-hint">
              Run <code>npx expo start --web</code> in the terminal.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
