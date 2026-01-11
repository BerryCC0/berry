/**
 * Content Translation Hook
 * Automatically translates user-generated content (proposals, votes, etc.)
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from './TranslationProvider';
import { defaultLocale } from './config';

// Cache for translated content - persists across component remounts
const translationCache = new Map<string, string>();

// Track in-flight requests to prevent duplicates
const pendingRequests = new Set<string>();

// Global rate limiter - only allow N concurrent requests
const MAX_CONCURRENT_REQUESTS = 3;
let activeRequests = 0;
let requestQueue: Array<{ fn: () => Promise<void>; priority: number }> = [];
let lastLocaleChange = 0;

// Clear queue and reset on locale change
export function onLocaleChange() {
  lastLocaleChange = Date.now();
  requestQueue = [];
  pendingRequests.clear();
}

// Listen for locale changes globally
if (typeof window !== 'undefined') {
  window.addEventListener('locale-change', onLocaleChange);
}

async function processQueue() {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) return;
  
  // Sort by priority (lower = higher priority)
  requestQueue.sort((a, b) => a.priority - b.priority);
  
  const next = requestQueue.shift();
  if (next) {
    activeRequests++;
    try {
      await next.fn();
    } finally {
      activeRequests--;
      // Small delay between requests
      setTimeout(processQueue, 200);
    }
  }
}

function queueTranslation(fn: () => Promise<void>, priority: number = 10) {
  requestQueue.push({ fn, priority });
  processQueue();
}

// Get cached translation key
function getCacheKey(text: string, targetLang: string): string {
  // Use first 200 chars + length + target language for a unique key
  const hash = text.slice(0, 200) + '::' + text.length + '::' + targetLang;
  return hash;
}

interface UseContentTranslationResult {
  /** The content to display (translated if available, otherwise original) */
  displayContent: string;
  /** Whether translation is in progress */
  isTranslating: boolean;
  /** Error message if translation failed */
  error: string | null;
  /** Whether showing translated content */
  isTranslated: boolean;
}

/**
 * Hook for automatically translating user-generated content
 * 
 * Features:
 * - Automatically translates when user is not in English
 * - Caches translations to minimize API calls
 * - Returns displayContent that is either translated or original
 */
export function useContentTranslation(
  content: string | undefined
): UseContentTranslationResult {
  const locale = useLocale();
  
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track current locale to detect changes
  const currentLocaleRef = useRef(locale);
  const mountTimeRef = useRef(Date.now());
  
  // Reset translation when locale changes
  useEffect(() => {
    if (currentLocaleRef.current !== locale) {
      currentLocaleRef.current = locale;
      setTranslatedContent(null);
      setIsTranslating(false);
      setError(null);
    }
  }, [locale]);
  
  // Automatically translate when not in default locale
  useEffect(() => {
    // Don't translate if:
    // - No content
    // - Already in English
    // - Content is too short (likely a label, not user content)
    if (!content || locale === defaultLocale || content.length < 20) {
      setTranslatedContent(null);
      return;
    }
    
    const cacheKey = getCacheKey(content, locale);
    
    // Check cache first
    const cached = translationCache.get(cacheKey);
    if (cached) {
      setTranslatedContent(cached);
      return;
    }
    
    // Skip if we already have a pending request for this key
    if (pendingRequests.has(cacheKey)) {
      return;
    }
    
    // Mark as pending
    pendingRequests.add(cacheKey);
    setIsTranslating(true);
    
    // Calculate priority - older components get higher priority
    const priority = Date.now() - mountTimeRef.current;
    
    // Queue the translation request
    queueTranslation(async () => {
      // Check if locale changed while waiting in queue
      if (currentLocaleRef.current !== locale) {
        pendingRequests.delete(cacheKey);
        return;
      }
      
      setError(null);
      
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: content,
            targetLang: locale,
          }),
        });
        
        if (!response.ok) {
          if (response.status === 429) {
            // Rate limited - don't retry automatically, just fail gracefully
            throw new Error('Rate limited');
          }
          throw new Error('Translation failed');
        }
        
        const data = await response.json();
        
        // Check again if locale changed during fetch
        if (currentLocaleRef.current !== locale) {
          pendingRequests.delete(cacheKey);
          return;
        }
        
        if (data.translatedText) {
          translationCache.set(cacheKey, data.translatedText);
          setTranslatedContent(data.translatedText);
        }
      } catch (err) {
        // Don't set error for rate limits - just show original content
        if (err instanceof Error && !err.message.includes('Rate limited')) {
          setError(err.message);
        }
      } finally {
        setIsTranslating(false);
        pendingRequests.delete(cacheKey);
      }
    }, priority);
  }, [content, locale]);
  
  // Return the content to display
  const displayContent = translatedContent || content || '';
  
  return {
    displayContent,
    isTranslating,
    error,
    isTranslated: !!translatedContent,
  };
}

/**
 * Get the display content (translated or original)
 */
export function getDisplayContent(
  original: string | undefined,
  translated: string | null
): string {
  return translated || original || '';
}
