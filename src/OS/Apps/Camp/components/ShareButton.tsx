/**
 * ShareButton - Copy deep link to clipboard
 * Shows a share icon that copies the current page URL
 */

'use client';

import { useState, useCallback } from 'react';
import styles from './ShareButton.module.css';

interface ShareButtonProps {
  path: string; // e.g., "proposal/123" or "voter/0x..."
}

export function ShareButton({ path }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    // Build full URL
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : '';
    const fullUrl = `${baseUrl}/app/camp/${path}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = fullUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [path]);

  return (
    <button
      className={styles.shareButton}
      onClick={handleShare}
      title={copied ? 'Copied!' : 'Copy link'}
    >
      {copied ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 8l3 3 7-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M11 2H5a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 5h4M6 8h4M6 11h2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )}
      <span className={styles.label}>{copied ? 'Copied!' : 'Share'}</span>
    </button>
  );
}

export default ShareButton;

