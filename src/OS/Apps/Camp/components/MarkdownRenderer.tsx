/**
 * MarkdownRenderer
 * Theme-compliant markdown renderer for proposals, candidates, and feedback
 * Supports images, video embeds, and all standard markdown features
 */

'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import styles from './MarkdownRenderer.module.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Extract video embed info from URL
 */
function getVideoEmbed(url: string): { type: 'youtube' | 'vimeo' | 'loom' | null; id: string | null } {
  // YouTube
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch) {
    return { type: 'youtube', id: youtubeMatch[1] };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return { type: 'vimeo', id: vimeoMatch[1] };
  }

  // Loom
  const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (loomMatch) {
    return { type: 'loom', id: loomMatch[1] };
  }

  return { type: null, id: null };
}

/**
 * Video embed component
 */
function VideoEmbed({ type, id }: { type: 'youtube' | 'vimeo' | 'loom'; id: string }) {
  let src = '';
  
  switch (type) {
    case 'youtube':
      src = `https://www.youtube.com/embed/${id}`;
      break;
    case 'vimeo':
      src = `https://player.vimeo.com/video/${id}`;
      break;
    case 'loom':
      src = `https://www.loom.com/embed/${id}`;
      break;
  }

  return (
    <div className={styles.videoContainer}>
      <iframe
        src={src}
        className={styles.videoEmbed}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Embedded video"
      />
    </div>
  );
}

/**
 * Check if children is a single link element with a video URL
 */
function getSingleVideoLink(children: React.ReactNode): { type: 'youtube' | 'vimeo' | 'loom'; id: string } | null {
  // Check if children is a single React element
  if (!React.isValidElement(children)) return null;
  
  // Check if it's an anchor with href
  const child = children as React.ReactElement<{ href?: string; children?: React.ReactNode }>;
  if (child.type !== 'a' || !child.props.href) return null;
  
  // Check if the link text matches the href (standalone link, not [text](url))
  const linkText = typeof child.props.children === 'string' ? child.props.children : '';
  if (linkText !== child.props.href) return null;
  
  // Check for video
  const video = getVideoEmbed(child.props.href);
  if (video.type && video.id) {
    return { type: video.type, id: video.id };
  }
  
  return null;
}

/**
 * Custom components for react-markdown
 */
const markdownComponents: Components = {
  // Headings
  h1: ({ children }) => <h1 className={styles.h1}>{children}</h1>,
  h2: ({ children }) => <h2 className={styles.h2}>{children}</h2>,
  h3: ({ children }) => <h3 className={styles.h3}>{children}</h3>,
  h4: ({ children }) => <h4 className={styles.h4}>{children}</h4>,
  h5: ({ children }) => <h5 className={styles.h5}>{children}</h5>,
  h6: ({ children }) => <h6 className={styles.h6}>{children}</h6>,

  // Paragraphs - check for standalone video links
  p: ({ children }) => {
    // Check if this paragraph contains only a video link
    const video = getSingleVideoLink(children);
    if (video) {
      return <VideoEmbed type={video.type} id={video.id} />;
    }
    return <p className={styles.p}>{children}</p>;
  },

  // Links - always render as links (video detection happens at paragraph level)
  a: ({ href, children }) => {
    return (
      <a 
        href={href} 
        className={styles.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  },

  // Images
  img: ({ src, alt }) => (
    <span className={styles.imageContainer}>
      <img src={src} alt={alt || ''} className={styles.image} loading="lazy" />
      {alt && <span className={styles.imageCaption}>{alt}</span>}
    </span>
  ),

  // Lists
  ul: ({ children }) => <ul className={styles.ul}>{children}</ul>,
  ol: ({ children }) => <ol className={styles.ol}>{children}</ol>,
  li: ({ children }) => <li className={styles.li}>{children}</li>,

  // Blockquotes
  blockquote: ({ children }) => (
    <blockquote className={styles.blockquote}>{children}</blockquote>
  ),

  // Code
  code: ({ className, children }) => {
    const isInline = !className;
    if (isInline) {
      return <code className={styles.inlineCode}>{children}</code>;
    }
    return (
      <code className={`${styles.codeBlock} ${className || ''}`}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className={styles.pre}>{children}</pre>,

  // Tables (GFM)
  table: ({ children }) => (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className={styles.thead}>{children}</thead>,
  tbody: ({ children }) => <tbody className={styles.tbody}>{children}</tbody>,
  tr: ({ children }) => <tr className={styles.tr}>{children}</tr>,
  th: ({ children }) => <th className={styles.th}>{children}</th>,
  td: ({ children }) => <td className={styles.td}>{children}</td>,

  // Horizontal rule
  hr: () => <hr className={styles.hr} />,

  // Strong and emphasis
  strong: ({ children }) => <strong className={styles.strong}>{children}</strong>,
  em: ({ children }) => <em className={styles.em}>{children}</em>,

  // Strikethrough (GFM)
  del: ({ children }) => <del className={styles.del}>{children}</del>,
};

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content) {
    return null;
  }

  return (
    <div className={`${styles.markdown} ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;

