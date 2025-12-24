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
}

/**
 * Render a Noun by ID (fetches from cache)
 */
export function NounImageById({ id, size = 320, className, style, fallback }: NounImageByIdProps) {
  const { data: noun, isLoading, error } = useNoun(id);

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
          ...style,
        }}
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
          ...style,
        }}
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
          ...style,
        }}
      />
    );
  }

  // Otherwise render from seed
  return (
    <NounImage
      seed={{
        background: noun.background,
        body: noun.body,
        accessory: noun.accessory,
        head: noun.head,
        glasses: noun.glasses,
      }}
      size={size}
      className={className}
      style={style}
    />
  );
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

