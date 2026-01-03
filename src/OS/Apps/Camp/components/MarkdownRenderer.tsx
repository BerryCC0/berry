/**
 * MarkdownRenderer
 * Theme-compliant markdown renderer for proposals, candidates, and feedback
 * Supports images, video embeds, and all standard markdown features
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import styles from './MarkdownRenderer.module.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Image Lightbox Component
 */
function ImageLightbox({ 
  src, 
  alt, 
  onClose 
}: { 
  src: string; 
  alt: string; 
  onClose: () => void;
}) {
  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.lightboxOverlay} onClick={onClose}>
      <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={styles.lightboxImage} />
        {alt && <div className={styles.lightboxCaption}>{alt}</div>}
        <button className={styles.lightboxClose} onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
    </div>
  );
}

/**
 * Check if URL is a direct video file
 */
function isDirectVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
  const lowerUrl = url.toLowerCase().split('?')[0]; // Remove query params
  return videoExtensions.some(ext => lowerUrl.endsWith(ext));
}

/**
 * Check if URL is a GIF (for special handling)
 */
function isGifUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return lowerUrl.endsWith('.gif') || 
         lowerUrl.includes('giphy.com') ||
         (lowerUrl.includes('imgur.com') && lowerUrl.includes('.gif'));
}

/**
 * Check if URL is an image (including GIFs from common hosts)
 */
function isImageUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  const baseUrl = lowerUrl.split('?')[0];
  
  // Common image extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  if (imageExtensions.some(ext => baseUrl.endsWith(ext))) {
    return true;
  }
  
  // Known image hosts (even without extension)
  if (lowerUrl.includes('giphy.com/media') || 
      lowerUrl.includes('media.giphy.com') ||
      lowerUrl.includes('media0.giphy.com') ||
      lowerUrl.includes('media1.giphy.com') ||
      lowerUrl.includes('media2.giphy.com') ||
      lowerUrl.includes('media3.giphy.com') ||
      lowerUrl.includes('media4.giphy.com') ||
      lowerUrl.includes('i.imgur.com') ||
      lowerUrl.includes('imgur.com') && (baseUrl.endsWith('.gifv') || baseUrl.endsWith('.gif'))) {
    return true;
  }
  
  return false;
}

/**
 * Extract video embed info from URL
 */
function getVideoEmbed(url: string): { type: 'youtube' | 'vimeo' | 'loom' | 'direct' | null; id: string | null; url?: string } {
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

  // Direct video file
  if (isDirectVideoUrl(url)) {
    return { type: 'direct', id: 'direct', url };
  }

  return { type: null, id: null };
}

/**
 * Video embed component
 */
function VideoEmbed({ type, id, url }: { type: 'youtube' | 'vimeo' | 'loom' | 'direct'; id: string; url?: string }) {
  // Direct video file - use native video element
  if (type === 'direct' && url) {
    return (
      <div className={styles.videoContainer}>
        <video
          src={url}
          className={styles.videoEmbed}
          controls
          playsInline
          preload="metadata"
        >
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  // iframe embeds
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
function getSingleVideoLink(children: React.ReactNode): { type: 'youtube' | 'vimeo' | 'loom' | 'direct'; id: string; url?: string } | null {
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
    return { type: video.type, id: video.id, url: video.url };
  }
  
  return null;
}

/**
 * Check if children is a single link element with an image URL
 */
function getSingleImageLink(children: React.ReactNode): string | null {
  // Check if children is a single React element
  if (!React.isValidElement(children)) return null;
  
  // Check if it's an anchor with href
  const child = children as React.ReactElement<{ href?: string; children?: React.ReactNode }>;
  if (child.type !== 'a' || !child.props.href) return null;
  
  // Check if the link text matches the href (standalone link, not [text](url))
  const linkText = typeof child.props.children === 'string' ? child.props.children : '';
  if (linkText !== child.props.href) return null;
  
  // Check if it's an image URL
  if (isImageUrl(child.props.href)) {
    return child.props.href;
  }
  
  return null;
}

/**
 * Create markdown components with image click handler
 */
function createMarkdownComponents(onImageClick: (src: string, alt: string) => void): Components {
  return {
  // Headings
  h1: ({ children }) => <h1 className={styles.h1}>{children}</h1>,
  h2: ({ children }) => <h2 className={styles.h2}>{children}</h2>,
  h3: ({ children }) => <h3 className={styles.h3}>{children}</h3>,
  h4: ({ children }) => <h4 className={styles.h4}>{children}</h4>,
  h5: ({ children }) => <h5 className={styles.h5}>{children}</h5>,
  h6: ({ children }) => <h6 className={styles.h6}>{children}</h6>,

  // Paragraphs - check for standalone video/image links
  p: ({ children }) => {
    // Check if this paragraph contains only a video link
    const video = getSingleVideoLink(children);
    if (video) {
      return <VideoEmbed type={video.type} id={video.id} url={video.url} />;
    }
    
    // Check if this paragraph contains only an image link
    const imageUrl = getSingleImageLink(children);
    if (imageUrl) {
      const isGif = isGifUrl(imageUrl);
      return (
        <span className={styles.imageContainer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={imageUrl} 
            alt="" 
            className={isGif ? styles.gifImage : styles.image} 
            loading="lazy"
            onClick={() => onImageClick(imageUrl, '')}
          />
        </span>
      );
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

    // Images - click to zoom (GIFs get larger allowance)
    img: ({ src, alt }) => {
      const imgSrc = typeof src === 'string' ? src : '';
      const isGif = isGifUrl(imgSrc);
      
      return (
        <span className={styles.imageContainer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={imgSrc} 
            alt={alt || ''} 
            className={isGif ? styles.gifImage : styles.image} 
            loading="lazy"
            onClick={() => imgSrc && onImageClick(imgSrc, alt || '')}
          />
          {alt && <span className={styles.imageCaption}>{alt}</span>}
        </span>
      );
    },

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
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  const handleImageClick = useCallback((src: string, alt: string) => {
    setLightboxImage({ src, alt });
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  const markdownComponents = useMemo(
    () => createMarkdownComponents(handleImageClick),
    [handleImageClick]
  );

  if (!content) {
    return null;
  }

  return (
    <>
    <div className={`${styles.markdown} ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
      
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          onClose={handleCloseLightbox}
        />
      )}
    </>
  );
}

export default MarkdownRenderer;

