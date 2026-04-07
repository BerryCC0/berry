/**
 * CampToolbar — Shared toolbar primitives for Camp views.
 *
 * Each Camp view renders its own <Toolbar> from ToolbarContext.
 * This file provides the small, reusable building blocks that
 * go *inside* those toolbar slots — back buttons, share buttons,
 * compact select dropdowns, titles, etc.
 *
 * These components use Camp.module.css classes (passed as `styles`)
 * so they blend with the title bar's theme variables.
 */

'use client';

import { useState, useCallback, type ReactNode } from 'react';
import { Toolbar, useToolbar } from '@/OS/Shell/Window/ToolbarContext';

/* ═══════════════════════════════════════════
   Back Button (leading slot)
   ═══════════════════════════════════════════ */

interface ToolbarBackProps {
  onClick: () => void;
  label?: string;
  styles: Record<string, string>;
}

export function ToolbarBack({ onClick, label, styles }: ToolbarBackProps) {
  return (
    <button
      className={styles.toolbarBack}
      onClick={onClick}
      data-toolbar-interactive="true"
    >
      <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
        <path
          d="M6 1L1 6l5 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{label || 'Back'}</span>
    </button>
  );
}

/* ═══════════════════════════════════════════
   Compact Title (leading slot, after back)
   ═══════════════════════════════════════════ */

interface ToolbarTitleProps {
  children: ReactNode;
  styles: Record<string, string>;
}

export function ToolbarTitle({ children, styles }: ToolbarTitleProps) {
  return (
    <span className={styles.toolbarTitle} data-toolbar-interactive="true">
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════════
   Share Button (trailing slot)
   ═══════════════════════════════════════════ */

interface ToolbarShareProps {
  path: string;
  styles: Record<string, string>;
}

export function ToolbarShare({ path, styles }: ToolbarShareProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${baseUrl}/camp/${path}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = fullUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [path]);

  return (
    <button
      className={styles.toolbarShareBtn}
      onClick={handleShare}
      title={copied ? 'Copied!' : 'Copy link'}
      data-toolbar-interactive="true"
    >
      {copied ? '✓' : '⎘'}
      <span className={styles.toolbarShareLabel}>{copied ? 'Copied' : 'Share'}</span>
    </button>
  );
}

/* ═══════════════════════════════════════════
   Compact Select (center slot — filters/sorts)
   ═══════════════════════════════════════════ */

interface ToolbarSelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  styles: Record<string, string>;
}

export function ToolbarSelect<T extends string>({
  value,
  onChange,
  options,
  styles,
}: ToolbarSelectProps<T>) {
  return (
    <select
      className={styles.toolbarSelect}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      data-toolbar-interactive="true"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/* ═══════════════════════════════════════════
   Draft Status (center slot — create view)
   ═══════════════════════════════════════════ */

interface ToolbarDraftStatusProps {
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  lastSaved: Date | null;
  draftTitle?: string;
  styles: Record<string, string>;
}

export function ToolbarDraftStatus({
  saveStatus,
  lastSaved,
  draftTitle,
  styles,
}: ToolbarDraftStatusProps) {
  const formatTime = (date: Date | null) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <span className={styles.toolbarDraftStatus}>
      {draftTitle && <span className={styles.toolbarDraftName}>{draftTitle}</span>}
      {saveStatus === 'saving' && <span className={styles.toolbarDraftSaving}>Saving…</span>}
      {saveStatus === 'saved' && lastSaved && (
        <span className={styles.toolbarDraftSaved}>Saved {formatTime(lastSaved)}</span>
      )}
      {saveStatus === 'unsaved' && <span className={styles.toolbarDraftUnsaved}>Unsaved</span>}
      {saveStatus === 'error' && <span className={styles.toolbarDraftError}>Save failed</span>}
    </span>
  );
}

/* ═══════════════════════════════════════════
   Re-exports for convenience
   ═══════════════════════════════════════════ */

export { Toolbar, useToolbar };
