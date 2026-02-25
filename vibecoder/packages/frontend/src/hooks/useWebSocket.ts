import { useEffect, useRef, useCallback } from 'react';
import type { WSMessage } from '@vibecoder/shared';

type MessageHandler = (msg: WSMessage) => void;

const handlers = new Map<string, Set<MessageHandler>>();

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;

function getWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//localhost:3001`;
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

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
    console.log('WS disconnected, reconnecting...');
    scheduleReconnect();
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

// Initialize connection on first import
connect();

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
