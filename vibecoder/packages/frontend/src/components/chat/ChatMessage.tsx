import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { AIMessage } from '@vibecoder/shared';
import { ToolCallBubble } from './ToolCallBubble';
import './ChatMessage.css';

interface ChatMessageProps {
  message: AIMessage;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`chat-message chat-message--${message.role}`}>
      <div className="chat-message__avatar">
        {isUser ? 'U' : 'AI'}
      </div>
      <div className="chat-message__body">
        {message.imageAttachment && (
          <div className="chat-message__image">
            <img
              src={`/api/uploads/${message.imageAttachment.path.replace(/^uploads\//, '')}`}
              alt={message.imageAttachment.originalName}
            />
            <span className="chat-message__image-name">{message.imageAttachment.originalName}</span>
          </div>
        )}
        {message.toolCalls?.map((tc) => (
          <ToolCallBubble key={tc.id} toolCall={tc} />
        ))}
        {message.content && (
          <div className="chat-message__content">
            {isUser ? (
              <p>{message.content}</p>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {message.content}
              </ReactMarkdown>
            )}
            {isStreaming && <span className="chat-message__cursor" />}
          </div>
        )}
      </div>
    </div>
  );
}
