/**
 * NounImage Component
 * Renders a Noun as an SVG image
 */

"use client";

import { useMemo } from 'react';
import { renderNounSVG, getNounDataUrl, type NounSeed } from '../render';
import { useNoun } from '../hooks/useNoun';

interface NounImageProps {
  seed: NounSeed;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Render a Noun from seed data
 */
export function NounImage({ seed, size = 320, className, style }: NounImageProps) {
  const dataUrl = useMemo(() => getNounDataUrl(seed), [
    seed.background,
    seed.body,
    seed.accessory,
    seed.head,
    seed.glasses,
  ]);

  return (
    <img
      src={dataUrl}
      alt="Noun"
      width={size}
      height={size}
      className={className}
      style={{
        imageRendering: 'pixelated',
        ...style,
      }}
    />
  );
}

interface NounImageByIdProps {
  id: number;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
  onClick?: () => void;
}

/**
 * Render a Noun by ID (fetches from cache)
 */
export function NounImageById({ id, size = 320, className, style, fallback, onClick }: NounImageByIdProps) {
  const { data: noun, isLoading, error } = useNoun(id);

  const cursorStyle = onClick ? { cursor: 'pointer' } : {};

  if (isLoading) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          background: '#e5e5e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...cursorStyle,
          ...style,
        }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {fallback || '...'}
      </div>
    );
  }

  if (error || !noun) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          background: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...cursorStyle,
          ...style,
        }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {fallback || '?'}
      </div>
    );
  }

  // If we have cached SVG, use it directly as data URL
  if (noun.svg) {
    const dataUrl = `data:image/svg+xml,${encodeURIComponent(noun.svg)}`;
    return (
      <img
        src={dataUrl}
        alt={`Noun ${id}`}
        width={size}
        height={size}
        className={className}
        style={{
          imageRendering: 'pixelated',
          ...cursorStyle,
          ...style,
        }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      />
    );
  }

  // Otherwise render from seed - wrap in clickable container if onClick provided
  const nounImage = (
    <NounImage
      seed={{
        background: noun.background,
        body: noun.body,
        accessory: noun.accessory,
        head: noun.head,
        glasses: noun.glasses,
      }}
      size={size}
      className={onClick ? undefined : className}
      style={onClick ? undefined : style}
    />
  );

  if (onClick) {
    return (
      <div
        className={className}
        style={{ ...cursorStyle, ...style }}
        onClick={onClick}
        role="button"
        tabIndex={0}
      >
        {nounImage}
      </div>
    );
  }

  return nounImage;
}

/**
 * Hook to get a Noun image as a data URL
 */
export function useNounDataUrl(seed: NounSeed | undefined): string | null {
  return useMemo(() => {
    if (!seed) return null;
    return getNounDataUrl(seed);
  }, [seed?.background, seed?.body, seed?.accessory, seed?.head, seed?.glasses]);
}

