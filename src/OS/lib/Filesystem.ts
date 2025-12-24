/**
 * Virtual Filesystem Service
 * 
 * Provides a read-only filesystem interface for Berry OS.
 * Files are served from /public/filesystem/ with .index.json files
 * listing directory contents.
 */

export interface VirtualFile {
  name: string;                    // "photo.jpg"
  path: string;                    // "/Pictures/photo.jpg"
  type: "file" | "directory";
  size: number;                    // Bytes
  mimeType?: string;               // "image/jpeg"
  extension?: string;              // "jpg"
  icon: string;                    // Icon path for display
  createdAt: number;               // Timestamp
  modifiedAt: number;              // Timestamp
  isHidden: boolean;               // Starts with "."
}

export interface Directory extends VirtualFile {
  type: "directory";
  children?: VirtualFile[];        // Loaded on demand
}

interface FilesystemService {
  // Reading
  readDirectory(path: string): Promise<VirtualFile[]>;
  getFile(path: string): Promise<VirtualFile | null>;
  exists(path: string): Promise<boolean>;
  readFileContent(path: string): Promise<string | Blob>;
  
  // Navigation
  getParentPath(path: string): string;
  joinPath(...parts: string[]): string;
  
  // Search
  search(query: string, startPath?: string): Promise<VirtualFile[]>;
  
  // Cache
  clearCache(): void;
}

class VirtualFilesystem implements FilesystemService {
  private cache = new Map<string, VirtualFile[]>();

  /**
   * Sanitize and validate filesystem paths
   * Prevents directory traversal attacks and invalid characters
   */
  private sanitizePath(path: string): string {
    // Decode URI components
    let sanitized = decodeURIComponent(path);
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Normalize path separators (Windows backslashes to forward slashes)
    sanitized = sanitized.replace(/\\/g, '/');
    
    // Remove directory traversal attempts (.. and .)
    sanitized = sanitized
      .split('/')
      .filter(part => part !== '..' && part !== '.')
      .join('/');
    
    // Remove multiple consecutive slashes
    sanitized = sanitized.replace(/\/+/g, '/');
    
    // Ensure starts with /
    if (!sanitized.startsWith('/')) {
      sanitized = '/' + sanitized;
    }
    
    // Remove trailing slash (except for root)
    if (sanitized !== '/' && sanitized.endsWith('/')) {
      sanitized = sanitized.slice(0, -1);
    }
    
    // Validate characters (alphanumeric, dash, underscore, dot, slash, space)
    // This is more permissive than SECURITY.md suggests to allow normal file names
    if (!/^[a-zA-Z0-9\-_./\s()[\]]+$/.test(sanitized) && sanitized !== '/') {
      console.warn('[Filesystem] Path contains invalid characters:', path);
      return '/';
    }
    
    return sanitized || '/';
  }

  /**
   * Read directory contents
   */
  async readDirectory(path: string): Promise<VirtualFile[]> {
    const normalizedPath = this.sanitizePath(path);

    // Check cache
    if (this.cache.has(normalizedPath)) {
      return this.cache.get(normalizedPath)!;
    }

    // Fetch directory index
    try {
      const indexPath = `/filesystem${normalizedPath}/_index.json`;
      const response = await fetch(indexPath);

      if (!response.ok) {
        throw new Error(`Directory not found: ${path}`);
      }

      const files: VirtualFile[] = await response.json();

      // Cache results
      this.cache.set(normalizedPath, files);

      return files;
    } catch (error) {
      console.error(`[Filesystem] Failed to read directory: ${path}`, error);
      return [];
    }
  }

  /**
   * Get single file info
   */
  async getFile(path: string): Promise<VirtualFile | null> {
    const parentPath = this.getParentPath(path);
    const fileName = path.split("/").pop();

    const files = await this.readDirectory(parentPath);
    return files.find((f) => f.name === fileName) || null;
  }

  /**
   * Check if path exists
   */
  async exists(path: string): Promise<boolean> {
    const file = await this.getFile(path);
    return file !== null;
  }

  /**
   * Read file content
   */
  async readFileContent(path: string): Promise<string | Blob> {
    const normalizedPath = this.sanitizePath(path);
    const response = await fetch(`/filesystem${normalizedPath}`);

    if (!response.ok) {
      throw new Error(`File not found: ${path}`);
    }

    const file = await this.getFile(path);

    // Return text for text files, blob for binary
    if (
      file?.mimeType?.startsWith("text/") ||
      file?.mimeType === "application/json"
    ) {
      return response.text();
    }

    return response.blob();
  }

  /**
   * Get parent directory path
   */
  getParentPath(path: string): string {
    const parts = path.split("/").filter(Boolean);
    parts.pop();
    return "/" + parts.join("/");
  }

  /**
   * Join path segments
   */
  joinPath(...parts: string[]): string {
    return (
      "/" +
      parts
        .join("/")
        .split("/")
        .filter(Boolean)
        .join("/")
    );
  }

  /**
   * Sanitize search query
   */
  private sanitizeSearchQuery(query: string): string {
    // Trim and limit length
    let sanitized = query.trim().slice(0, 100);
    
    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    
    return sanitized;
  }

  /**
   * Search files by name
   */
  async search(
    query: string,
    startPath: string = "/"
  ): Promise<VirtualFile[]> {
    const results: VirtualFile[] = [];
    const sanitizedQuery = this.sanitizeSearchQuery(query);
    
    // Return empty if query is too short after sanitization
    if (sanitizedQuery.length < 1) {
      return [];
    }
    
    const lowerQuery = sanitizedQuery.toLowerCase();

    const searchDir = async (path: string, depth: number = 0) => {
      // Limit search depth to prevent excessive recursion
      if (depth > 5) return;

      const files = await this.readDirectory(path);

      for (const file of files) {
        if (file.name.toLowerCase().includes(lowerQuery)) {
          results.push(file);
        }

        if (file.type === "directory") {
          await searchDir(file.path, depth + 1);
        }
      }
    };

    await searchDir(startPath);
    return results;
  }

  /**
   * Clear the directory cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Delete a specific path from cache
   */
  invalidatePath(path: string): void {
    this.cache.delete(this.sanitizePath(path));
  }
}

// Export singleton instance
export const filesystem = new VirtualFilesystem();

