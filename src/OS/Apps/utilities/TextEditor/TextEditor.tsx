"use client";

/**
 * TextEditor
 * A text viewer with markdown preview, JSON syntax highlighting, and CSV table view
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import type { AppComponentProps } from "@/OS/types/app";
import { filesystem } from "@/OS/lib/Filesystem";
import DOMPurify from "dompurify";
import styles from "./TextEditor.module.css";

interface TextEditorInitialState {
  filePath?: string;
}

type ViewMode = "text" | "preview" | "table";

export function TextEditor({ windowId, initialState }: AppComponentProps) {
  const state = initialState as TextEditorInitialState | undefined;
  const [filePath, setFilePath] = useState<string | null>(state?.filePath || null);
  const [content, setContent] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("text");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Load file content
  useEffect(() => {
    if (!filePath) return;

    const loadFile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const text = await filesystem.readFileContent(filePath);
        if (typeof text === "string") {
          setContent(text);

          // Auto-detect view mode based on extension
          const ext = filePath.split(".").pop()?.toLowerCase();
          if (ext === "md" || ext === "markdown") {
            setViewMode("preview");
          } else if (ext === "csv") {
            setViewMode("table");
          } else {
            setViewMode("text");
          }
        }
      } catch (err) {
        console.error("Failed to load file:", err);
        setError("Failed to load file");
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [filePath]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fileName = filePath?.split("/").pop() || "Untitled";
  const extension = fileName.split(".").pop()?.toLowerCase();

  // Word/character count
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  if (!filePath) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>No file open</p>
          <p className={styles.hint}>Open a text file from Finder</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.fileName}>{fileName}</span>

        <div className={styles.viewModes}>
          <button
            className={viewMode === "text" ? styles.active : ""}
            onClick={() => setViewMode("text")}
            title="Plain Text"
          >
            Text
          </button>
          {(extension === "md" || extension === "markdown") && (
            <button
              className={viewMode === "preview" ? styles.active : ""}
              onClick={() => setViewMode("preview")}
              title="Markdown Preview"
            >
              Preview
            </button>
          )}
          {extension === "csv" && (
            <button
              className={viewMode === "table" ? styles.active : ""}
              onClick={() => setViewMode("table")}
              title="Table View"
            >
              Table
            </button>
          )}
        </div>

        <button
          className={styles.searchButton}
          onClick={() => setShowSearch(!showSearch)}
          title="Find (⌘F)"
        >
          🔍
        </button>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className={styles.searchBar}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find in document..."
            autoFocus
          />
          <button onClick={() => setShowSearch(false)}>✕</button>
        </div>
      )}

      {/* Content */}
      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>Loading...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : viewMode === "text" ? (
          <TextContent content={content} searchQuery={searchQuery} extension={extension} />
        ) : viewMode === "preview" ? (
          <MarkdownPreview content={content} />
        ) : (
          <CSVTable content={content} />
        )}
      </div>

      {/* Status bar */}
      <div className={styles.statusBar}>
        <span>{wordCount} words</span>
        <span>{charCount} characters</span>
        <span>{content.split("\n").length} lines</span>
      </div>
    </div>
  );
}

// Text content with search highlighting
function TextContent({
  content,
  searchQuery,
  extension,
}: {
  content: string;
  searchQuery: string;
  extension?: string;
}) {
  const isJson = extension === "json";

  const formattedContent = useMemo(() => {
    if (isJson) {
      try {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return content;
      }
    }
    return content;
  }, [content, isJson]);

  const highlighted = useMemo(() => {
    if (!searchQuery) return formattedContent;

    const regex = new RegExp(`(${escapeRegex(searchQuery)})`, "gi");
    const parts = formattedContent.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className={styles.highlight}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  }, [formattedContent, searchQuery]);

  return (
    <pre className={`${styles.textContent} ${isJson ? styles.json : ""}`}>
      {highlighted}
    </pre>
  );
}

// Simple markdown preview
function MarkdownPreview({ content }: { content: string }) {
  const html = useMemo(() => {
    // Simple markdown parsing
    let parsed = content
      // Headers
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^# (.*$)/gm, "<h1>$1</h1>")
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Code blocks
      .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
      // Inline code
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
      // Blockquotes
      .replace(/^> (.*$)/gm, "<blockquote>$1</blockquote>")
      // Unordered lists
      .replace(/^- (.*$)/gm, "<li>$1</li>")
      // Horizontal rule
      .replace(/^---$/gm, "<hr />")
      // Paragraphs
      .replace(/\n\n/g, "</p><p>")
      // Line breaks
      .replace(/\n/g, "<br />");

    // Wrap in paragraph
    parsed = `<p>${parsed}</p>`;

    // Clean up empty paragraphs
    parsed = parsed.replace(/<p><\/p>/g, "");

    return DOMPurify.sanitize(parsed);
  }, [content]);

  return (
    <div
      className={styles.markdownPreview}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// CSV table view
function CSVTable({ content }: { content: string }) {
  const { headers, rows } = useMemo(() => {
    const lines = content.split("\n").filter((line) => line.trim());
    const allRows = lines.map((row) => {
      // Simple CSV parsing (doesn't handle quoted commas)
      return row.split(",").map((cell) => cell.trim());
    });

    return {
      headers: allRows[0] || [],
      rows: allRows.slice(1),
    };
  }, [content]);

  if (headers.length === 0) {
    return <div className={styles.empty}>No data</div>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.csvTable}>
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th key={i}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

