/**
 * TranslatedContent Component
 * Automatically translates content based on user's locale
 */

'use client';

import { useContentTranslation } from './useContentTranslation';

interface TranslatedContentProps {
  /** The original content to translate */
  content: string | undefined;
  /** Render function to display the content */
  children: (displayContent: string, isTranslating: boolean) => React.ReactNode;
}

/**
 * Component that automatically translates content based on user's locale.
 * Uses a render prop pattern to give control over how content is displayed.
 * 
 * @example
 * <TranslatedContent content={proposal.description}>
 *   {(text, isLoading) => (
 *     <MarkdownRenderer content={text} />
 *   )}
 * </TranslatedContent>
 */
export function TranslatedContent({ content, children }: TranslatedContentProps) {
  const { displayContent, isTranslating } = useContentTranslation(content);
  
  return <>{children(displayContent, isTranslating)}</>;
}

/**
 * Simple component for translating plain text
 */
interface TranslatedTextProps {
  /** The text to translate */
  text: string | undefined;
  /** Optional className for the wrapper span */
  className?: string;
  /** Show loading indicator while translating */
  showLoading?: boolean;
}

export function TranslatedText({ text, className, showLoading = false }: TranslatedTextProps) {
  const { displayContent, isTranslating } = useContentTranslation(text);
  
  if (showLoading && isTranslating) {
    return <span className={className} style={{ opacity: 0.7 }}>{displayContent}...</span>;
  }
  
  return <span className={className}>{displayContent}</span>;
}
