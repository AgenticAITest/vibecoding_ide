import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { AIMessage } from '@vibecoder/shared';
import type { Components } from 'react-markdown';
import { ToolCallBubble } from './ToolCallBubble';
import './ChatMessage.css';

/* ── SVG Avatars ── */

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 14c0-2.21 2.69-4 6-4s6 1.79 6 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AIIcon() {
  return (
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
  );
}

/* ── Code Block with header + copy button ── */

function CodeBlockHeader({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="code-block__header">
      {language && <span className="code-block__lang">{language}</span>}
      <button className="code-block__copy" onClick={handleCopy} title="Copy code">
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        )}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
  );
}

function PreBlock({ children, ...props }: React.ComponentPropsWithoutRef<'pre'>) {
  // Extract language and code text from children
  let language = '';
  let code = '';

  const child = Array.isArray(children) ? children[0] : children;
  if (child && typeof child === 'object' && 'props' in child) {
    const className = child.props.className || '';
    const match = className.match(/language-(\w+)/);
    if (match) language = match[1];

    // Extract raw text from code element children
    const extractText = (node: unknown): string => {
      if (typeof node === 'string') return node;
      if (Array.isArray(node)) return node.map(extractText).join('');
      if (node && typeof node === 'object' && 'props' in (node as { props?: unknown })) {
        return extractText((node as { props: { children?: unknown } }).props.children);
      }
      return '';
    };
    code = extractText(child.props.children);
  }

  return (
    <div className="code-block">
      <CodeBlockHeader language={language} code={code} />
      <pre {...props}>{children}</pre>
    </div>
  );
}

function InlineCode({ children, className, ...props }: React.ComponentPropsWithoutRef<'code'>) {
  // If this code element is inside a pre (has language class), render normally
  if (className?.includes('language-') || className?.includes('hljs')) {
    return <code className={className} {...props}>{children}</code>;
  }
  return <code className={className} {...props}>{children}</code>;
}

const markdownComponents: Components = {
  pre: PreBlock,
  code: InlineCode,
};

/* ── ChatMessage ── */

interface ChatMessageProps {
  message: AIMessage;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`chat-message chat-message--${message.role}`}>
      <div className="chat-message__avatar">
        {isUser ? <UserIcon /> : <AIIcon />}
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
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={markdownComponents}
              >
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
