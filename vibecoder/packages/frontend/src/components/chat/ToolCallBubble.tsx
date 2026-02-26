import { useState } from 'react';
import type { AIToolCall } from '@vibecoder/shared';
import './ToolCallBubble.css';

/* ── SVG Status Icons ── */

function SpinnerIcon() {
  return (
    <svg className="tool-bubble__icon tool-bubble__icon--spin" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/>
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="tool-bubble__icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg className="tool-bubble__icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M6 6l4 4M10 6l-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`tool-bubble__chevron-icon ${expanded ? 'tool-bubble__chevron-icon--expanded' : ''}`}
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path d="M5 6l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const statusIcons = {
  running: SpinnerIcon,
  done: CheckCircleIcon,
  error: XCircleIcon,
};

/* ── ToolCallBubble ── */

interface ToolCallBubbleProps {
  toolCall: AIToolCall;
}

export function ToolCallBubble({ toolCall }: ToolCallBubbleProps) {
  const [expanded, setExpanded] = useState(false);

  const StatusIcon = statusIcons[toolCall.status];

  return (
    <div className={`tool-bubble tool-bubble--${toolCall.status}`}>
      <button className="tool-bubble__header" onClick={() => setExpanded(!expanded)}>
        <span className={`tool-bubble__status tool-bubble__status--${toolCall.status}`}>
          <StatusIcon />
        </span>
        <span className="tool-bubble__name">{toolCall.tool}</span>
        <ChevronIcon expanded={expanded} />
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
