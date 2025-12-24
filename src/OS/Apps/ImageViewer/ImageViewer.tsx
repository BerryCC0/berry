"use client";

/**
 * ImageViewer
 * Image viewing with zoom, pan, rotation, and slideshow
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { AppComponentProps } from "@/OS/types/app";
import { filesystem } from "@/OS/lib/Filesystem";
import styles from "./ImageViewer.module.css";

interface ImageViewerInitialState {
  filePath?: string;
}

interface ImageInfo {
  name: string;
  path: string;
  size?: number;
  width?: number;
  height?: number;
}

export function ImageViewer({ windowId, initialState }: AppComponentProps) {
  const state = initialState as ImageViewerInitialState | undefined;
  const [filePath, setFilePath] = useState<string | null>(state?.filePath || null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [fitMode, setFitMode] = useState<"fit" | "actual">("fit");
  const [showInfo, setShowInfo] = useState(false);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [siblingImages, setSiblingImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Load image and siblings
  useEffect(() => {
    if (!filePath) return;

    const loadImage = async () => {
      setIsLoading(true);
      const url = `/filesystem${filePath}`;
      setImageUrl(url);

      // Get file info
      const file = await filesystem.getFile(filePath);
      if (file) {
        setImageInfo({
          name: file.name,
          path: file.path,
          size: file.size,
        });
      }

      // Load sibling images for navigation
      const parentPath = filesystem.getParentPath(filePath);
      const siblings = await filesystem.readDirectory(parentPath);
      const images = siblings
        .filter((f) => f.mimeType?.startsWith("image/"))
        .map((f) => f.path);
      setSiblingImages(images);
      setCurrentIndex(images.indexOf(filePath));
      setIsLoading(false);
    };

    loadImage();
  }, [filePath]);

  // Get natural dimensions when image loads
  const handleImageLoad = useCallback(() => {
    if (imageRef.current && imageInfo) {
      setImageInfo((prev) =>
        prev
          ? {
              ...prev,
              width: imageRef.current!.naturalWidth,
              height: imageRef.current!.naturalHeight,
            }
          : null
      );
    }
    setIsLoading(false);
  }, [imageInfo]);

  // Zoom with mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(Math.max(z * delta, 0.1), 10));
  }, []);

  // Pan with drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Navigation
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setFilePath(siblingImages[currentIndex - 1]);
      resetView();
    }
  }, [currentIndex, siblingImages]);

  const goToNext = useCallback(() => {
    if (currentIndex < siblingImages.length - 1) {
      setFilePath(siblingImages[currentIndex + 1]);
      resetView();
    }
  }, [currentIndex, siblingImages]);

  const resetView = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setFitMode("fit");
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case "=":
        case "+":
          setZoom((z) => Math.min(z * 1.2, 10));
          break;
        case "-":
          setZoom((z) => Math.max(z * 0.8, 0.1));
          break;
        case "0":
          resetView();
          break;
        case "r":
          setRotation((r) => (r + 90) % 360);
          break;
        case "i":
          setShowInfo((s) => !s);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevious, goToNext, resetView]);

  const fileName = filePath?.split("/").pop() || "";

  if (!filePath) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>No image open</p>
          <p className={styles.hint}>Open an image from Finder</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.navigation}>
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            title="Previous (←)"
          >
            ◀
          </button>
          <span className={styles.counter}>
            {currentIndex + 1} / {siblingImages.length || 1}
          </span>
          <button
            onClick={goToNext}
            disabled={currentIndex === siblingImages.length - 1}
            title="Next (→)"
          >
            ▶
          </button>
        </div>

        <div className={styles.zoomControls}>
          <button
            onClick={() => setZoom((z) => Math.max(z * 0.8, 0.1))}
            title="Zoom Out (-)"
          >
            −
          </button>
          <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(z * 1.2, 10))}
            title="Zoom In (+)"
          >
            +
          </button>
          <button
            onClick={() => {
              setFitMode((m) => (m === "fit" ? "actual" : "fit"));
              setZoom(1);
              setPosition({ x: 0, y: 0 });
            }}
            title="Toggle Fit/Actual Size (0)"
          >
            {fitMode === "fit" ? "1:1" : "Fit"}
          </button>
        </div>

        <div className={styles.actions}>
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            title="Rotate (R)"
          >
            ↻
          </button>
          <button
            onClick={() => setShowInfo((s) => !s)}
            title="Info (I)"
            className={showInfo ? styles.active : ""}
          >
            ℹ
          </button>
        </div>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className={styles.imageContainer}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isLoading && <div className={styles.loading}>Loading...</div>}
        {imageUrl && (
          <img
            ref={imageRef}
            src={imageUrl}
            alt={fileName}
            className={styles.image}
            onLoad={handleImageLoad}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              cursor: isDragging ? "grabbing" : "grab",
              maxWidth: fitMode === "fit" ? "100%" : "none",
              maxHeight: fitMode === "fit" ? "100%" : "none",
            }}
            draggable={false}
          />
        )}
      </div>

      {/* Info panel */}
      {showInfo && imageInfo && (
        <div className={styles.infoPanel}>
          <h4>Image Info</h4>
          <dl>
            <dt>Name</dt>
            <dd>{imageInfo.name}</dd>
            {imageInfo.width && imageInfo.height && (
              <>
                <dt>Dimensions</dt>
                <dd>
                  {imageInfo.width} × {imageInfo.height}
                </dd>
              </>
            )}
            {imageInfo.size && (
              <>
                <dt>File Size</dt>
                <dd>{formatBytes(imageInfo.size)}</dd>
              </>
            )}
            <dt>Path</dt>
            <dd>{imageInfo.path}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

