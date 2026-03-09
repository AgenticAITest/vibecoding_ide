import { useEffect, useRef, useCallback } from 'react';
import type { WSMessage } from '@vibecoder/shared';
import { useAuthStore } from '../store/authStore';

type MessageHandler = (msg: WSMessage) => void;

const handlers = new Map<string, Set<MessageHandler>>();

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;

function getWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const token = useAuthStore.getState().token;
  const base = `${protocol}//${window.location.host}/ws`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

export function reconnectWs() {
  if (ws) {
    ws.onclose = null; // prevent auto-reconnect of old connection
    ws.close();
    ws = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectDelay = 1000;
  // Only connect if we have a token
  if (useAuthStore.getState().token) {
    connect();
  }
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  // Don't connect without auth token
  if (!useAuthStore.getState().token) return;

  ws = new WebSocket(getWsUrl());

  ws.onopen = () => {
    console.log('WS connected');
    reconnectDelay = 1000;
  };

  ws.onmessage = (event) => {
    let msg: WSMessage;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    const channelHandlers = handlers.get(msg.channel);
    if (channelHandlers) {
      channelHandlers.forEach((h) => h(msg));
    }
  };

  ws.onclose = () => {
    // Only reconnect if we're still authenticated
    if (useAuthStore.getState().token) {
      console.log('WS disconnected, reconnecting...');
      scheduleReconnect();
    } else {
      console.log('WS disconnected (logged out)');
    }
  };

  ws.onerror = () => {
    ws?.close();
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(reconnectDelay * 2, 10000);
    connect();
  }, reconnectDelay);
}

function sendMessage(channel: WSMessage['channel'], type: string, payload: unknown) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('WS not connected');
    return;
  }
  const msg: WSMessage = { channel, type, payload };
  ws.send(JSON.stringify(msg));
}

// Connection is initialized after login via reconnectWs()

export function useWebSocket(channel: string, handler: MessageHandler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrappedHandler: MessageHandler = (msg) => handlerRef.current(msg);
    if (!handlers.has(channel)) {
      handlers.set(channel, new Set());
    }
    handlers.get(channel)!.add(wrappedHandler);

    return () => {
      handlers.get(channel)?.delete(wrappedHandler);
    };
  }, [channel]);

  const send = useCallback(
    (type: string, payload: unknown) => sendMessage(channel as WSMessage['channel'], type, payload),
    [channel]
  );

  return { send };
}
