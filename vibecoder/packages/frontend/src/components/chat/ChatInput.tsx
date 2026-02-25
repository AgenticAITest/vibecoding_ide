import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';
import { useAiChat } from '../../hooks/useAiChat';
import { uploadApi } from '../../lib/api';
import type { AIImageAttachment } from '@vibecoder/shared';
import './ChatInput.css';

export function ChatInput() {
  const [text, setText] = useState('');
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage, interrupt, isStreaming } = useAiChat();

  const clearImage = useCallback(() => {
    setPendingImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if ((!trimmed && !pendingImage) || isStreaming || isUploading) return;

    let imageAttachment: AIImageAttachment | undefined;

    if (pendingImage) {
      setIsUploading(true);
      try {
        imageAttachment = await uploadApi.uploadImage(pendingImage);
      } catch (err) {
        console.error('Upload failed:', err);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
      clearImage();
    }

    const messageText = trimmed || 'Please analyze this image.';
    sendMessage(messageText, imageAttachment);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, pendingImage, isStreaming, isUploading, sendMessage, clearImage]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, []);

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const canSend = (text.trim() || pendingImage) && !isStreaming && !isUploading;

  return (
    <div className="chat-input">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {previewUrl && pendingImage && (
        <div className="chat-input__preview">
          <div className="chat-input__preview-thumb">
            <img src={previewUrl} alt={pendingImage.name} />
            <button className="chat-input__preview-remove" onClick={clearImage} title="Remove image">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                <path d="M1 1l6 6M7 1l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </svg>
            </button>
          </div>
          <span className="chat-input__preview-name">{pendingImage.name}</span>
        </div>
      )}

      <div className="chat-input__wrapper">
        <button
          className="chat-input__btn chat-input__btn--attach"
          onClick={handleAttachClick}
          disabled={isStreaming || isUploading}
          title="Attach image"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 8.5l-5.5 5.5a3.5 3.5 0 01-5-5L9 3.5a2.5 2.5 0 013.5 3.5L7 12.5a1.5 1.5 0 01-2-2L10.5 5" />
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          className="chat-input__textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={pendingImage ? 'Describe what to analyze...' : 'Ask anything...'}
          rows={1}
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button className="chat-input__btn chat-input__btn--stop" onClick={interrupt} title="Stop generating">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="2" width="10" height="10" rx="1" />
            </svg>
          </button>
        ) : (
          <button
            className="chat-input__btn chat-input__btn--send"
            onClick={handleSend}
            disabled={!canSend}
            title="Send message (Enter)"
          >
            {isUploading ? (
              <svg width="14" height="14" viewBox="0 0 14 14" className="chat-input__spinner">
                <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="20 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 12V2M2 7l5-5 5 5" />
              </svg>
            )}
          </button>
        )}
      </div>
      <div className="chat-input__hint">
        Enter to send, Shift+Enter for newline
      </div>
    </div>
  );
}
