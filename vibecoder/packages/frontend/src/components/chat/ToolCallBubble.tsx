import { useState } from 'react';
import type { AIToolCall } from '@vibecoder/shared';
import './ToolCallBubble.css';

interface ToolCallBubbleProps {
  toolCall: AIToolCall;
}

export function ToolCallBubble({ toolCall }: ToolCallBubbleProps) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = {
    running: '\u25B6',
    done: '\u2713',
    error: '\u2717',
  }[toolCall.status];

  return (
    <div className={`tool-bubble tool-bubble--${toolCall.status}`}>
      <button className="tool-bubble__header" onClick={() => setExpanded(!expanded)}>
        <span className={`tool-bubble__status tool-bubble__status--${toolCall.status}`}>
          {statusIcon}
        </span>
        <span className="tool-bubble__name">{toolCall.tool}</span>
        <span className="tool-bubble__chevron">{expanded ? '\u25B4' : '\u25BE'}</span>
      </button>
      {expanded && (
        <div className="tool-bubble__details">
          <div className="tool-bubble__section">
            <div className="tool-bubble__label">Input</div>
            <pre className="tool-bubble__code">{JSON.stringify(toolCall.args, null, 2)}</pre>
          </div>
          {toolCall.output && (
            <div className="tool-bubble__section">
              <div className="tool-bubble__label">Output</div>
              <pre className="tool-bubble__code">{toolCall.output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
