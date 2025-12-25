/**
 * MarkdownEditor Component
 * Simple markdown editor with preview for proposal descriptions
 */

'use client';

import React, { useState } from 'react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import styles from './MarkdownEditor.module.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  rows?: number;
  placeholder?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  disabled = false,
  rows = 10,
  placeholder = 'Write your proposal description using Markdown...\n\n## Formatting Tips\n- **Bold** with **text**\n- *Italic* with *text*\n- [Links](url)\n- Images: ![alt](url)\n- Code blocks with ```',
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${!showPreview ? styles.active : ''}`}
            onClick={() => setShowPreview(false)}
          >
            Write
          </button>
          <button
            type="button"
            className={`${styles.tab} ${showPreview ? styles.active : ''}`}
            onClick={() => setShowPreview(true)}
          >
            Preview
          </button>
        </div>
        
        {!showPreview && (
          <div className={styles.formatButtons}>
            <button
              type="button"
              className={styles.formatButton}
              onClick={() => {
                const textarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const text = textarea.value;
                  const before = text.substring(0, start);
                  const selection = text.substring(start, end);
                  const after = text.substring(end);
                  onChange(`${before}**${selection || 'bold'}**${after}`);
                }
              }}
              disabled={disabled}
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              className={styles.formatButton}
              onClick={() => {
                const textarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const text = textarea.value;
                  const before = text.substring(0, start);
                  const selection = text.substring(start, end);
                  const after = text.substring(end);
                  onChange(`${before}*${selection || 'italic'}*${after}`);
                }
              }}
              disabled={disabled}
              title="Italic"
            >
              <em>I</em>
            </button>
            <button
              type="button"
              className={styles.formatButton}
              onClick={() => {
                const textarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const text = textarea.value;
                  const before = text.substring(0, start);
                  const after = text.substring(start);
                  onChange(`${before}[link text](url)${after}`);
                }
              }}
              disabled={disabled}
              title="Link"
            >
              Link
            </button>
            <button
              type="button"
              className={styles.formatButton}
              onClick={() => {
                const textarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const text = textarea.value;
                  const before = text.substring(0, start);
                  const after = text.substring(start);
                  onChange(`${before}![image alt](image-url)${after}`);
                }
              }}
              disabled={disabled}
              title="Image"
            >
              Img
            </button>
            <button
              type="button"
              className={styles.formatButton}
              onClick={() => {
                const textarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const text = textarea.value;
                  const before = text.substring(0, start);
                  const after = text.substring(start);
                  onChange(`${before}\n## Heading\n${after}`);
                }
              }}
              disabled={disabled}
              title="Heading"
            >
              H
            </button>
          </div>
        )}
      </div>

      {showPreview ? (
        <div className={styles.preview}>
          {value ? (
            <MarkdownRenderer content={value} />
          ) : (
            <div className={styles.previewEmpty}>
              Nothing to preview yet. Start writing!
            </div>
          )}
        </div>
      ) : (
        <textarea
          id="markdown-editor"
          className={styles.editor}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={rows}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

