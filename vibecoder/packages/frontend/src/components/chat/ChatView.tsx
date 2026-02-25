import { useEffect, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import './ChatView.css';

export function ChatView() {
  const messages = useChatStore((s) => s.messages);
  const currentAssistantMessage = useChatStore((s) => s.currentAssistantMessage);
  const currentToolCalls = useChatStore((s) => s.currentToolCalls);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentAssistantMessage, currentToolCalls]);

  return (
    <div className="chat-view">
      <div className="chat-view__messages" ref={scrollRef}>
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isStreaming && (currentAssistantMessage || currentToolCalls.length > 0) && (
          <ChatMessage
            message={{
              id: '__streaming',
              role: 'assistant',
              content: currentAssistantMessage,
              timestamp: Date.now(),
              toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
            }}
            isStreaming
          />
        )}
        {isStreaming && !currentAssistantMessage && currentToolCalls.length === 0 && (
          <div className="chat-view__thinking">
            <div className="chat-view__thinking-dot" />
            <span>Thinking...</span>
          </div>
        )}
      </div>
      <ChatInput />
    </div>
  );
}
