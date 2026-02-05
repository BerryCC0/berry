/**
 * MarkdownEditor Component
 * Full-featured markdown editor with live preview
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import styles from './MarkdownEditor.module.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minHeight?: number;
}

type ViewMode = 'write' | 'preview' | 'split';

interface HistoryState {
  past: string[];
  future: string[];
}

export function MarkdownEditor({
  value,
  onChange,
  disabled = false,
  placeholder = 'Write your proposal description using Markdown...',
  minHeight = 400,
}: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('write');
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastValueRef = useRef(value);

  // Track history for undo/redo
  useEffect(() => {
    if (value !== lastValueRef.current) {
      setHistory(prev => ({
        past: [...prev.past.slice(-50), lastValueRef.current],
        future: []
      }));
      lastValueRef.current = value;
    }
  }, [value]);

  const undo = useCallback(() => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    setHistory(prev => ({
      past: prev.past.slice(0, -1),
      future: [value, ...prev.future]
    }));
    onChange(previous);
  }, [history.past, value, onChange]);

  const redo = useCallback(() => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    setHistory(prev => ({
      past: [...prev.past, value],
      future: prev.future.slice(1)
    }));
    onChange(next);
  }, [history.future, value, onChange]);

  // Insert text at cursor position
  const insertText = useCallback((before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    const insertion = selectedText || placeholder;
    const newText = text.substring(0, start) + before + insertion + after + text.substring(end);
    
    onChange(newText);

    // Restore cursor position
    requestAnimationFrame(() => {
      textarea.focus();
      const newCursorPos = start + before.length + insertion.length;
      textarea.setSelectionRange(
        selectedText ? newCursorPos + after.length : start + before.length,
        selectedText ? newCursorPos + after.length : start + before.length + placeholder.length
      );
    });
  }, [onChange]);

  // Insert at line start
  const insertAtLineStart = useCallback((prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const text = textarea.value;
    
    // Find the start of the current line
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }

    const newText = text.substring(0, lineStart) + prefix + text.substring(lineStart);
    onChange(newText);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  }, [onChange]);

  // Wrap selection or insert with placeholder
  const wrapSelection = useCallback((wrapper: string, placeholder: string = 'text') => {
    insertText(wrapper, wrapper, placeholder);
  }, [insertText]);

  // Cycle heading levels: # -> ## -> ### -> #### -> ##### -> ###### -> (remove all)
  const formatHeading = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const text = textarea.value;
    
    // Find the start and end of the current line
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }
    let lineEnd = start;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
      lineEnd++;
    }

    const currentLine = text.substring(lineStart, lineEnd);
    
    // Count existing # at the start of the line
    const hashMatch = currentLine.match(/^(#{1,6})\s?/);
    const currentLevel = hashMatch ? hashMatch[1].length : 0;

    let newLine: string;
    let cursorOffset: number;

    if (currentLevel === 0) {
      // No heading, add #
      newLine = '# ' + currentLine;
      cursorOffset = 2;
    } else if (currentLevel < 6) {
      // Increment heading level
      const contentStart = hashMatch ? hashMatch[0].length : 0;
      const content = currentLine.substring(contentStart);
      newLine = '#'.repeat(currentLevel + 1) + ' ' + content;
      cursorOffset = 1;
    } else {
      // At level 6, remove all hashes
      const contentStart = hashMatch ? hashMatch[0].length : 0;
      const content = currentLine.substring(contentStart);
      newLine = content;
      cursorOffset = -(currentLevel + 1);
    }

    const newText = text.substring(0, lineStart) + newLine + text.substring(lineEnd);
    onChange(newText);

    requestAnimationFrame(() => {
      textarea.focus();
      const newCursorPos = Math.max(lineStart, start + cursorOffset);
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  }, [onChange]);

  // Formatting actions
  const formatBold = () => wrapSelection('**', 'bold text');
  const formatItalic = () => wrapSelection('*', 'italic text');
  const formatStrikethrough = () => wrapSelection('~~', 'strikethrough');
  const formatCode = () => wrapSelection('`', 'code');
  const formatCodeBlock = () => insertText('\n```\n', '\n```\n', 'code block');
  const formatQuote = () => insertAtLineStart('> ');
  const formatUnorderedList = () => insertAtLineStart('- ');
  const formatOrderedList = () => insertAtLineStart('1. ');
  const formatTaskList = () => insertAtLineStart('- [ ] ');
  const formatLink = () => insertText('[', '](url)', 'link text');
  const formatImage = () => insertText('![', '](image-url)', 'alt text');
  const formatTable = () => {
    const table = '\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n';
    insertText(table, '', '');
  };
  const formatHorizontalRule = () => insertText('\n---\n', '', '');

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMod = e.metaKey || e.ctrlKey;

    if (isMod && e.key === 'b') {
      e.preventDefault();
      formatBold();
    } else if (isMod && e.key === 'i') {
      e.preventDefault();
      formatItalic();
    } else if (isMod && e.key === 'k') {
      e.preventDefault();
      formatLink();
    } else if (isMod && e.shiftKey && e.key === 'x') {
      e.preventDefault();
      formatStrikethrough();
    } else if (isMod && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    } else if (isMod && e.key === 'y') {
      e.preventDefault();
      redo();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      insertText('  ', '', '');
    }
  }, [undo, redo, insertText]);

  // Toolbar button component
  const ToolbarButton = ({ 
    onClick, 
    title, 
    children,
    disabled: btnDisabled = false 
  }: { 
    onClick: () => void; 
    title: string; 
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      className={styles.toolbarButton}
      onClick={onClick}
      disabled={disabled || btnDisabled}
      title={title}
    >
      {children}
    </button>
  );

  const ToolbarDivider = () => <div className={styles.toolbarDivider} />;

  return (
    <div className={styles.container} style={{ minHeight }}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {/* Undo/Redo */}
          <ToolbarButton onClick={undo} title="Undo (Cmd+Z)" disabled={history.past.length === 0}>
            <UndoIcon />
          </ToolbarButton>
          <ToolbarButton onClick={redo} title="Redo (Cmd+Shift+Z)" disabled={history.future.length === 0}>
            <RedoIcon />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Text formatting */}
          <ToolbarButton onClick={formatBold} title="Bold (Cmd+B)">
            <BoldIcon />
          </ToolbarButton>
          <ToolbarButton onClick={formatItalic} title="Italic (Cmd+I)">
            <ItalicIcon />
          </ToolbarButton>
          <ToolbarButton onClick={formatStrikethrough} title="Strikethrough (Cmd+Shift+X)">
            <StrikethroughIcon />
          </ToolbarButton>
          <ToolbarButton onClick={formatHeading} title="Heading">
            <HeadingIcon />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Code */}
          <ToolbarButton onClick={formatCode} title="Inline Code">
            <CodeIcon />
          </ToolbarButton>
          <ToolbarButton onClick={formatCodeBlock} title="Code Block">
            <CodeBlockIcon />
          </ToolbarButton>
          <ToolbarButton onClick={formatQuote} title="Quote">
            <QuoteIcon />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Lists */}
          <ToolbarButton onClick={formatUnorderedList} title="Bullet List">
            <ListIcon />
          </ToolbarButton>
          <ToolbarButton onClick={formatOrderedList} title="Numbered List">
            <OrderedListIcon />
          </ToolbarButton>
          <ToolbarButton onClick={formatTaskList} title="Task List">
            <TaskListIcon />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Media & Links */}
          <ToolbarButton onClick={formatLink} title="Link (Cmd+K)">
            <LinkIcon />
          </ToolbarButton>
          <ToolbarButton onClick={formatImage} title="Image">
            <ImageIcon />
          </ToolbarButton>
          <ToolbarButton onClick={formatTable} title="Table">
            <TableIcon />
          </ToolbarButton>
          <ToolbarButton onClick={formatHorizontalRule} title="Horizontal Rule">
            <HorizontalRuleIcon />
          </ToolbarButton>
        </div>

        {/* View mode toggle */}
        <div className={styles.viewModeToggle}>
          <button
            type="button"
            className={`${styles.viewModeButton} ${viewMode === 'write' ? styles.active : ''}`}
            onClick={() => setViewMode('write')}
            title="Write mode"
          >
            Write
          </button>
          <button
            type="button"
            className={`${styles.viewModeButton} ${viewMode === 'split' ? styles.active : ''}`}
            onClick={() => setViewMode('split')}
            title="Split view"
          >
            Split
          </button>
          <button
            type="button"
            className={`${styles.viewModeButton} ${viewMode === 'preview' ? styles.active : ''}`}
            onClick={() => setViewMode('preview')}
            title="Preview mode"
          >
            Preview
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div className={`${styles.editorArea} ${styles[viewMode]}`}>
        {/* Write panel */}
        {(viewMode === 'write' || viewMode === 'split') && (
          <div className={styles.writePanel}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={placeholder}
              spellCheck={true}
            />
          </div>
        )}

        {/* Preview panel */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={styles.previewPanel}>
            {value ? (
              <MarkdownRenderer content={value} />
            ) : (
              <div className={styles.previewEmpty}>
                Nothing to preview yet. Start writing!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className={styles.statusBar}>
        <span className={styles.statusItem}>
          {value.length} characters
        </span>
        <span className={styles.statusItem}>
          {value.split(/\s+/).filter(w => w.length > 0).length} words
        </span>
        <span className={styles.statusItem}>
          {value.split('\n').length} lines
        </span>
      </div>
    </div>
  );
}

// SVG Icons - clean, minimal design
const UndoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
);

const RedoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
  </svg>
);

const BoldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
  </svg>
);

const ItalicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="4" x2="10" y2="4" />
    <line x1="14" y1="20" x2="5" y2="20" />
    <line x1="15" y1="4" x2="9" y2="20" />
  </svg>
);

const StrikethroughIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.3 4.9c-1.2-.9-2.8-1.4-4.5-1.4-3.3 0-5.5 1.8-5.5 4.3 0 1.2.5 2.1 1.4 2.8" />
    <path d="M8.7 15c0 2.5 2.2 4.5 5.5 4.5 1.7 0 3.3-.5 4.5-1.4" />
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
);

const HeadingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4v16" />
    <path d="M18 4v16" />
    <path d="M6 12h12" />
  </svg>
);

const CodeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const CodeBlockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 6l-4 6 4 6" />
    <path d="M16 6l4 6-4 6" />
    <path d="M14 4l-4 16" />
  </svg>
);

const QuoteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v4z" />
  </svg>
);

const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const OrderedListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="10" y1="6" x2="21" y2="6" />
    <line x1="10" y1="12" x2="21" y2="12" />
    <line x1="10" y1="18" x2="21" y2="18" />
    <path d="M4 6h1v4" />
    <path d="M4 10h2" />
    <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
  </svg>
);

const TaskListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="6" height="6" rx="1" />
    <path d="M5 8l1 1 2-2" />
    <line x1="13" y1="8" x2="21" y2="8" />
    <rect x="3" y="13" width="6" height="6" rx="1" />
    <line x1="13" y1="16" x2="21" y2="16" />
  </svg>
);

const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const ImageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const TableIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
);

const HorizontalRuleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" />
  </svg>
);
