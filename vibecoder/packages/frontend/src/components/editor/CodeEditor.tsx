import { useEffect, useRef, useState, useCallback } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as monacoEditor } from 'monaco-editor';
import { useWebSocket } from '../../hooks/useWebSocket';
import { fileApi } from '../../lib/api';
import type { WSMessage } from '@vibecoder/shared';
import './CodeEditor.css';

interface CodeEditorProps {
  filePath: string;
  onDirtyChange?: (dirty: boolean) => void;
}

const EXT_LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  md: 'markdown',
  css: 'css',
  scss: 'scss',
  html: 'html',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  sh: 'shell',
  bash: 'shell',
  sql: 'sql',
  graphql: 'graphql',
  env: 'plaintext',
  txt: 'plaintext',
  gitignore: 'plaintext',
};

function getLanguage(filePath: string): string {
  const name = filePath.split('/').pop() || '';
  // Check full filename first (e.g., .gitignore, Dockerfile)
  if (EXT_LANGUAGE_MAP[name]) return EXT_LANGUAGE_MAP[name];
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return EXT_LANGUAGE_MAP[ext] || 'plaintext';
}

export function CodeEditor({ filePath, onDirtyChange }: CodeEditorProps) {
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const filePathRef = useRef(filePath);
  filePathRef.current = filePath;

  // Load file content
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fileApi.readFile(filePath).then(({ content: fileContent }) => {
      if (cancelled) return;
      setContent(fileContent);
      setSavedContent(fileContent);
      setDirty(false);
      onDirtyChange?.(false);
      setLoading(false);
    }).catch((err) => {
      if (cancelled) return;
      setError(err.message);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [filePath, onDirtyChange]);

  // Listen for file changes via WS
  useWebSocket('files', useCallback((msg: WSMessage) => {
    if (msg.type !== 'files:changed') return;
    const payload = msg.payload as { changes: Array<{ type: string; path: string }> };
    const affected = payload.changes.some(
      (c) => c.path === filePathRef.current && c.type === 'change'
    );
    if (!affected) return;

    // Reload from disk — preserve cursor position
    fileApi.readFile(filePathRef.current).then(({ content: newContent }) => {
      const editor = editorRef.current;
      if (!editor) return;

      const currentValue = editor.getValue();
      if (currentValue === newContent) return;

      const position = editor.getPosition();
      const scrollTop = editor.getScrollTop();

      // Use executeEdits to preserve undo stack
      const fullRange = editor.getModel()?.getFullModelRange();
      if (fullRange) {
        editor.executeEdits('file-watcher', [{
          range: fullRange,
          text: newContent,
        }]);
      }

      setSavedContent(newContent);
      setDirty(false);
      onDirtyChange?.(false);

      // Restore cursor and scroll
      if (position) editor.setPosition(position);
      editor.setScrollTop(scrollTop);
    }).catch(() => {
      // Silently ignore — will retry on next change
    });
  }, [onDirtyChange]));

  // Save handler
  const handleSave = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentContent = editor.getValue();
    try {
      await fileApi.writeFile(filePath, currentContent);
      setSavedContent(currentContent);
      setDirty(false);
      onDirtyChange?.(false);
    } catch (err: any) {
      console.error('Save failed:', err.message);
    }
  }, [filePath, onDirtyChange]);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Ctrl+S to save
    editor.addCommand(
      // Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.KeyS
      2048 | 49, // CtrlCmd = 2048, KeyS = 49
      () => handleSave()
    );
  };

  const handleEditorChange = (value: string | undefined) => {
    const isDirty = value !== savedContent;
    if (isDirty !== dirty) {
      setDirty(isDirty);
      onDirtyChange?.(isDirty);
    }
  };

  if (loading) {
    return (
      <div className="code-editor__loading">
        Loading {filePath}...
      </div>
    );
  }

  if (error) {
    return (
      <div className="code-editor__error">
        Error loading file: {error}
      </div>
    );
  }

  return (
    <div className="code-editor">
      <Editor
        defaultValue={content || ''}
        language={getLanguage(filePath)}
        theme="vs-dark"
        onMount={handleEditorMount}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: false },
          wordWrap: 'on',
          tabSize: 2,
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 8 },
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
        }}
      />
    </div>
  );
}
