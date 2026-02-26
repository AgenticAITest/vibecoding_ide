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
            <div className="chat-view__thinking-avatar">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1l1.796 3.64L14 5.5l-3 2.924.708 4.126L8 10.6l-3.708 1.95L5 8.424 2 5.5l4.204-.86L8 1Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                  fill="currentColor"
                  fillOpacity="0.15"
                />
              </svg>
            </div>
            <div className="chat-view__thinking-bubble">
              <div className="chat-view__thinking-dots">
                <span className="chat-view__dot" />
                <span className="chat-view__dot" />
                <span className="chat-view__dot" />
              </div>
            </div>
          </div>
        )}
      </div>
      <ChatInput />
    </div>
  );
}
