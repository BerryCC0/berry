"use client";

/**
 * PDFViewer
 * Document viewer for PDF files using browser's native rendering
 */

import { useState, useEffect, useCallback } from "react";
import type { AppComponentProps } from "@/OS/types/app";
import styles from "./PDFViewer.module.css";

interface PDFViewerInitialState {
  filePath?: string;
}

export function PDFViewer({ windowId, initialState }: AppComponentProps) {
  const state = initialState as PDFViewerInitialState | undefined;
  const [filePath, setFilePath] = useState<string | null>(state?.filePath || null);
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileName = filePath?.split("/").pop() || "Document";

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "=":
        case "+":
          setZoom((z) => Math.min(z + 25, 300));
          break;
        case "-":
          setZoom((z) => Math.max(z - 25, 50));
          break;
        case "0":
          setZoom(100);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setError("Failed to load PDF");
  }, []);

  if (!filePath) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>📄</p>
          <p>No PDF open</p>
          <p className={styles.hint}>Open a PDF file from Finder</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.fileName}>{fileName}</span>

        <div className={styles.zoomControls}>
          <button
            onClick={() => setZoom((z) => Math.max(z - 25, 50))}
            title="Zoom Out (-)"
          >
            −
          </button>
          <span className={styles.zoomLevel}>{zoom}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(z + 25, 300))}
            title="Zoom In (+)"
          >
            +
          </button>
          <button onClick={() => setZoom(100)} title="Reset Zoom (0)">
            Reset
          </button>
        </div>

        <a
          href={`/filesystem${filePath}`}
          download={fileName}
          className={styles.downloadButton}
          title="Download"
        >
          ⬇
        </a>
      </div>

      {/* PDF content */}
      <div className={styles.content}>
        {isLoading && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Loading PDF...</span>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <div
          className={styles.pdfWrapper}
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
          }}
        >
          <object
            data={`/filesystem${filePath}`}
            type="application/pdf"
            className={styles.pdf}
            onLoad={handleLoad}
            onError={handleError}
          >
            {/* Fallback for browsers that don't support object */}
            <iframe
              src={`/filesystem${filePath}`}
              className={styles.pdf}
              title={fileName}
              onLoad={handleLoad}
              onError={handleError}
            />
          </object>
        </div>
      </div>
    </div>
  );
}

