import { useCallback } from 'react';
import { useWebSocket } from './useWebSocket.js';
import { useChatStore } from '../store/chatStore.js';
import type { WSMessage, AIStreamEvent, AIImageAttachment } from '@vibecoder/shared';

export function useAiChat() {
  const {
    addUserMessage,
    setStreaming,
    appendDelta,
    addToolCall,
    updateToolCall,
    finishMessage,
    setSessionId,
    sessionId,
    isStreaming,
  } = useChatStore();

  const handleMessage = useCallback((msg: WSMessage) => {
    const event = msg.payload as AIStreamEvent;

    switch (event.type) {
      case 'init':
        setSessionId(event.sessionId);
        break;
      case 'text':
        appendDelta(event.delta);
        break;
      case 'toolUse':
        addToolCall({
          id: event.id,
          tool: event.tool,
          args: event.args,
          status: 'running',
        });
        break;
      case 'toolResult':
        updateToolCall(event.id, {
          output: event.output,
          status: 'done',
        });
        break;
      case 'done':
        finishMessage();
        break;
      case 'error':
        appendDelta(`\n\n**Error:** ${event.message}`);
        finishMessage();
        break;
    }
  }, [appendDelta, addToolCall, updateToolCall, finishMessage, setSessionId]);

  const { send } = useWebSocket('ai', handleMessage);

  const sendMessage = useCallback((text: string, imageAttachment?: AIImageAttachment) => {
    addUserMessage(text, imageAttachment);
    setStreaming(true);
    send('ai:send', {
      message: text,
      sessionId,
      ...(imageAttachment ? { imagePath: imageAttachment.path } : {}),
    });
  }, [send, addUserMessage, setStreaming, sessionId]);

  const interrupt = useCallback(() => {
    send('ai:interrupt', {});
    finishMessage();
  }, [send, finishMessage]);

  return { sendMessage, interrupt, isStreaming };
}
