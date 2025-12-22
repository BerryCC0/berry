# Berry OS - Virtual Filesystem

> Virtual filesystem architecture and Finder integration.

## Overview

Berry OS has a **virtual filesystem** that simulates a classic Mac file structure. On web/mobile/Farcaster, it's read-only and served from `/public/filesystem/`. 

**Key Points:**
- Read-only on web (no user uploads)
- Pre-populated with sample files
- Finder is the primary interface
- Files can be "opened" with appropriate apps
- Future: Nouns proposal drafts stored in database (not filesystem)

---

## Filesystem Structure

```
/
├── Documents/
│   ├── Welcome to Berry OS.txt
│   ├── Getting Started.md
│   └── Samples/
│       ├── example.txt
│       └── data.csv
│
├── Pictures/
│   ├── Wallpapers/
│   │   ├── classic-teal.png
│   │   ├── dark-gradient.png
│   │   └── nouns-pattern.png
│   └── Screenshots/
│
├── Applications/
│   └── (aliases to apps, displayed on desktop)
│
└── System/
    ├── Fonts/
    │   ├── Chicago.woff2
    │   └── Geneva.woff2
    └── Sounds/
        └── (future: system sounds)
```

---

## File Types

```typescript
interface VirtualFile {
  name: string;                    // "photo.jpg"
  path: string;                    // "/Pictures/photo.jpg"
  type: 'file' | 'directory';
  size: number;                    // Bytes
  mimeType?: string;               // "image/jpeg"
  extension?: string;              // "jpg"
  icon: string;                    // Icon path for display
  createdAt: number;               // Timestamp
  modifiedAt: number;              // Timestamp
  isHidden: boolean;               // Starts with "."
}

interface Directory extends VirtualFile {
  type: 'directory';
  children?: VirtualFile[];        // Loaded on demand
}
```

---

## Filesystem Service

```typescript
// /src/OS/lib/Filesystem.ts

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
}
```

### Implementation

```typescript
// /src/OS/lib/Filesystem.ts

class VirtualFilesystem implements FilesystemService {
  private cache = new Map<string, VirtualFile[]>();
  
  /**
   * Read directory contents
   */
  async readDirectory(path: string): Promise<VirtualFile[]> {
    const normalizedPath = this.normalizePath(path);
    
    // Check cache
    if (this.cache.has(normalizedPath)) {
      return this.cache.get(normalizedPath)!;
    }
    
    // Fetch directory index
    try {
      const indexPath = `/filesystem${normalizedPath}/.index.json`;
      const response = await fetch(indexPath);
      
      if (!response.ok) {
        throw new Error(`Directory not found: ${path}`);
      }
      
      const files: VirtualFile[] = await response.json();
      
      // Cache results
      this.cache.set(normalizedPath, files);
      
      return files;
    } catch (error) {
      console.error(`Failed to read directory: ${path}`, error);
      return [];
    }
  }
  
  /**
   * Get single file info
   */
  async getFile(path: string): Promise<VirtualFile | null> {
    const parentPath = this.getParentPath(path);
    const fileName = path.split('/').pop();
    
    const files = await this.readDirectory(parentPath);
    return files.find(f => f.name === fileName) || null;
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
    const normalizedPath = this.normalizePath(path);
    const response = await fetch(`/filesystem${normalizedPath}`);
    
    if (!response.ok) {
      throw new Error(`File not found: ${path}`);
    }
    
    const file = await this.getFile(path);
    
    // Return text for text files, blob for binary
    if (file?.mimeType?.startsWith('text/') || 
        file?.mimeType === 'application/json') {
      return response.text();
    }
    
    return response.blob();
  }
  
  /**
   * Get parent directory path
   */
  getParentPath(path: string): string {
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    return '/' + parts.join('/');
  }
  
  /**
   * Join path segments
   */
  joinPath(...parts: string[]): string {
    return '/' + parts
      .join('/')
      .split('/')
      .filter(Boolean)
      .join('/');
  }
  
  /**
   * Search files by name
   */
  async search(query: string, startPath: string = '/'): Promise<VirtualFile[]> {
    const results: VirtualFile[] = [];
    const lowerQuery = query.toLowerCase();
    
    const searchDir = async (path: string) => {
      const files = await this.readDirectory(path);
      
      for (const file of files) {
        if (file.name.toLowerCase().includes(lowerQuery)) {
          results.push(file);
        }
        
        if (file.type === 'directory') {
          await searchDir(file.path);
        }
      }
    };
    
    await searchDir(startPath);
    return results;
  }
  
  /**
   * Normalize path
   */
  private normalizePath(path: string): string {
    // Remove trailing slash, ensure leading slash
    let normalized = path.replace(/\/+$/, '');
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }
    return normalized || '/';
  }
}

export const filesystem = new VirtualFilesystem();
```

---

## Directory Index Files

Each directory needs a `.index.json` file listing its contents:

```json
// /public/filesystem/Documents/.index.json
[
  {
    "name": "Welcome to Berry OS.txt",
    "path": "/Documents/Welcome to Berry OS.txt",
    "type": "file",
    "size": 1234,
    "mimeType": "text/plain",
    "extension": "txt",
    "icon": "/icons/file-text.svg",
    "createdAt": 1700000000000,
    "modifiedAt": 1700000000000,
    "isHidden": false
  },
  {
    "name": "Samples",
    "path": "/Documents/Samples",
    "type": "directory",
    "size": 0,
    "icon": "/icons/folder.svg",
    "createdAt": 1700000000000,
    "modifiedAt": 1700000000000,
    "isHidden": false
  }
]
```

### Generating Index Files

Each directory needs a `.index.json` file. This is a **build-time step**, not runtime.

#### When to Run

| Situation | Action |
|-----------|--------|
| First setup | Run once to generate all indexes |
| Add/remove files in `/public/filesystem/` | Run again |
| Change file metadata | Run again |
| CI/CD deployment | Add to build script |
| Runtime (user browsing) | Never - indexes already exist |

#### Setup

```bash
# Install dependency
npm install mime-types --save-dev
```

Add to package.json:
```json
{
  "scripts": {
    "generate-fs-index": "node scripts/generate-filesystem-index.js",
    "prebuild": "npm run generate-fs-index",
    "build": "next build"
  }
}
```

The `prebuild` script ensures indexes are always fresh before deployment.

#### The Script

```javascript
// scripts/generate-filesystem-index.js
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const FILESYSTEM_ROOT = './public/filesystem';

function getFileInfo(filePath, relativePath) {
  const stats = fs.statSync(filePath);
  const name = path.basename(filePath);
  const ext = path.extname(name).slice(1);
  
  return {
    name,
    path: relativePath,
    type: stats.isDirectory() ? 'directory' : 'file',
    size: stats.size,
    mimeType: stats.isFile() ? mime.lookup(name) || undefined : undefined,
    extension: stats.isFile() ? ext : undefined,
    icon: getIconForFile(name, stats.isDirectory()),
    createdAt: stats.birthtimeMs,
    modifiedAt: stats.mtimeMs,
    isHidden: name.startsWith('.'),
  };
}

function getIconForFile(name, isDirectory) {
  // Use IconRegistry for consistent icon paths
  // See: /src/OS/lib/IconRegistry.ts
  const { getIconForFile: getIcon } = require('@/OS/lib/IconRegistry');
  return getIcon(name, undefined, isDirectory);
  
  // IconRegistry handles:
  // - Directory → folder.svg
  // - .txt, .md → file-text.svg
  // - .jpg, .png, .gif → file-image.svg
  // - .mp3, .wav → file-audio.svg
  // - .mp4, .webm → file-video.svg
  // - .pdf → file-pdf.svg
  // - .js, .ts, .json → file-code.svg
  // - .zip, .tar → file-archive.svg
  // - Unknown → file-generic.svg
}

function generateIndex(dirPath, relativePath = '/') {
  const entries = fs.readdirSync(dirPath);
  const files = [];
  
  for (const entry of entries) {
    // Skip index files and hidden files
    if (entry === '.index.json' || entry.startsWith('.')) continue;
    
    const fullPath = path.join(dirPath, entry);
    const entryRelativePath = path.join(relativePath, entry);
    
    files.push(getFileInfo(fullPath, entryRelativePath));
    
    // Recursively process directories
    if (fs.statSync(fullPath).isDirectory()) {
      generateIndex(fullPath, entryRelativePath);
    }
  }
  
  // Write index file
  const indexPath = path.join(dirPath, '.index.json');
  fs.writeFileSync(indexPath, JSON.stringify(files, null, 2));
  console.log(`Generated: ${indexPath}`);
}

// Run
generateIndex(FILESYSTEM_ROOT);
console.log('Filesystem index generation complete!');
```

#### Local Development

When adding files during development:

```bash
# Add your files to public/filesystem/
# Then regenerate indexes
npm run generate-fs-index

# Or just restart dev server if prebuild is set up
npm run dev
```
```

---

## Filesystem Store

Zustand store for filesystem state:

```typescript
// /src/OS/store/filesystemStore.ts
import { create } from 'zustand';
import { filesystem } from '@/OS/lib/Filesystem';

interface FilesystemStore {
  // Current state
  currentPath: string;
  files: VirtualFile[];
  selectedPaths: Set<string>;
  isLoading: boolean;
  error: string | null;
  
  // Navigation history
  history: string[];
  historyIndex: number;
  
  // Actions
  navigateTo: (path: string) => Promise<void>;
  navigateUp: () => Promise<void>;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // Selection
  select: (path: string, multi?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  
  // File operations
  openFile: (path: string) => void;
  
  // Search
  search: (query: string) => Promise<VirtualFile[]>;
}

export const useFilesystemStore = create<FilesystemStore>((set, get) => ({
  currentPath: '/',
  files: [],
  selectedPaths: new Set(),
  isLoading: false,
  error: null,
  history: ['/'],
  historyIndex: 0,
  
  navigateTo: async (path: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const files = await filesystem.readDirectory(path);
      
      const { history, historyIndex } = get();
      const newHistory = [...history.slice(0, historyIndex + 1), path];
      
      set({
        currentPath: path,
        files,
        selectedPaths: new Set(),
        isLoading: false,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
      
      systemBus.emit('fs:directory-changed', { path });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: `Failed to open: ${path}` 
      });
    }
  },
  
  navigateUp: async () => {
    const { currentPath } = get();
    if (currentPath === '/') return;
    
    const parentPath = filesystem.getParentPath(currentPath);
    await get().navigateTo(parentPath);
  },
  
  goBack: async () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    
    const newIndex = historyIndex - 1;
    const path = history[newIndex];
    
    set({ historyIndex: newIndex });
    
    const files = await filesystem.readDirectory(path);
    set({ currentPath: path, files, selectedPaths: new Set() });
  },
  
  goForward: async () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    
    const newIndex = historyIndex + 1;
    const path = history[newIndex];
    
    set({ historyIndex: newIndex });
    
    const files = await filesystem.readDirectory(path);
    set({ currentPath: path, files, selectedPaths: new Set() });
  },
  
  refresh: async () => {
    const { currentPath } = get();
    filesystem.cache.delete(currentPath); // Clear cache
    await get().navigateTo(currentPath);
  },
  
  select: (path: string, multi: boolean = false) => {
    set((state) => {
      const newSelection = new Set(multi ? state.selectedPaths : []);
      
      if (newSelection.has(path)) {
        newSelection.delete(path);
      } else {
        newSelection.add(path);
      }
      
      return { selectedPaths: newSelection };
    });
  },
  
  selectAll: () => {
    set((state) => ({
      selectedPaths: new Set(state.files.map(f => f.path)),
    }));
  },
  
  clearSelection: () => {
    set({ selectedPaths: new Set() });
  },
  
  openFile: (path: string) => {
    const file = get().files.find(f => f.path === path);
    if (!file) return;
    
    if (file.type === 'directory') {
      get().navigateTo(path);
    } else {
      // Open with appropriate app
      const appId = getAppForMimeType(file.mimeType);
      if (appId) {
        appLauncher.launch(appId, {
          initialState: { filePath: path, mimeType: file.mimeType }
        });
      }
    }
  },
  
  search: async (query: string) => {
    const { currentPath } = get();
    return filesystem.search(query, currentPath);
  },
}));
```

---

## File Associations

Map file types to apps:

```typescript
// /src/OS/lib/FileAssociations.ts

const associations: Record<string, string> = {
  // Text
  'text/plain': 'text-editor',
  'text/markdown': 'text-editor',
  'application/json': 'text-editor',
  
  // Images
  'image/jpeg': 'media-viewer',
  'image/png': 'media-viewer',
  'image/gif': 'media-viewer',
  'image/webp': 'media-viewer',
  
  // Video
  'video/mp4': 'media-viewer',
  'video/webm': 'media-viewer',
  
  // Audio
  'audio/mpeg': 'media-viewer',
  'audio/wav': 'media-viewer',
  
  // Documents
  'application/pdf': 'pdf-viewer', // Future
};

export function getAppForMimeType(mimeType?: string): string | null {
  if (!mimeType) return null;
  return associations[mimeType] || null;
}

export function getAppForExtension(ext: string): string | null {
  const mimeMap: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    pdf: 'application/pdf',
  };
  
  const mimeType = mimeMap[ext.toLowerCase()];
  return mimeType ? getAppForMimeType(mimeType) : null;
}
```

---

## Finder Integration

Finder is the primary filesystem interface:

```typescript
// /src/OS/Apps/Finder/Finder.tsx
import { useFilesystemStore } from '@/OS/store/filesystemStore';
import { usePlatform } from '@/OS/lib/PlatformDetection';
import desktopStyles from './Finder.desktop.module.css';
import mobileStyles from './Finder.mobile.module.css';

const Finder = ({ windowId, initialState, onStateChange }: AppProps) => {
  const { type } = usePlatform();
  const styles = type === 'mobile' || type === 'farcaster' 
    ? mobileStyles 
    : desktopStyles;
  
  const {
    currentPath,
    files,
    selectedPaths,
    isLoading,
    navigateTo,
    navigateUp,
    goBack,
    goForward,
    select,
    openFile,
  } = useFilesystemStore();
  
  const [viewMode, setViewMode] = useState<'icons' | 'list'>('icons');
  
  // Initialize from route params
  useEffect(() => {
    if (initialState?.path) {
      navigateTo(initialState.path);
    } else {
      navigateTo('/');
    }
  }, []);
  
  // Sync state with window for URL updates
  useEffect(() => {
    onStateChange?.({ path: currentPath });
  }, [currentPath, onStateChange]);
  
  const handleDoubleClick = (file: VirtualFile) => {
    openFile(file.path);
  };
  
  const handleClick = (file: VirtualFile, event: React.MouseEvent) => {
    select(file.path, event.metaKey || event.ctrlKey);
  };
  
  return (
    <div className={styles.finder}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button onClick={goBack} disabled={/* check history */}>
          ←
        </button>
        <button onClick={goForward} disabled={/* check history */}>
          →
        </button>
        <button onClick={navigateUp} disabled={currentPath === '/'}>
          ↑
        </button>
        
        <div className={styles.pathBar}>
          {currentPath}
        </div>
        
        <button onClick={() => setViewMode('icons')}>
          ⊞
        </button>
        <button onClick={() => setViewMode('list')}>
          ≡
        </button>
      </div>
      
      {/* Content */}
      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>Loading...</div>
        ) : viewMode === 'icons' ? (
          <IconView 
            files={files}
            selectedPaths={selectedPaths}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
          />
        ) : (
          <ListView
            files={files}
            selectedPaths={selectedPaths}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
          />
        )}
      </div>
      
      {/* Status bar */}
      <div className={styles.statusBar}>
        {files.length} items
        {selectedPaths.size > 0 && ` • ${selectedPaths.size} selected`}
      </div>
    </div>
  );
};

export default Finder;
```

---

## Desktop Icons

Desktop shows special filesystem items:

```typescript
// Desktop icons from filesystem
const desktopItems = [
  { path: '/Applications/Finder', appId: 'finder' },
  { path: '/Applications/Calculator', appId: 'calculator' },
  { path: '/Documents', appId: 'finder', initialState: { path: '/Documents' } },
  { path: '/Trash', special: 'trash' },
];
```

---

## Context Menus

Right-click / long-press on files:

```typescript
const FileContextMenu = ({ file, onClose }) => {
  const { openFile } = useFilesystemStore();
  
  const items = [
    { label: 'Open', action: () => openFile(file.path) },
    { label: 'Get Info', action: () => showInfo(file) },
  ];
  
  return (
    <Menu items={items} onClose={onClose} />
  );
};
```

**Note:** No "Delete" or "Move to Trash" option since the filesystem is read-only.

---

## Sample Files

Pre-populate `/public/filesystem/` with useful content:

```
public/filesystem/
├── .index.json
├── Documents/
│   ├── .index.json
│   ├── Welcome to Berry OS.txt
│   └── Samples/
│       ├── .index.json
│       └── example.txt
├── Pictures/
│   ├── .index.json
│   ├── Wallpapers/
│   │   ├── .index.json
│   │   ├── classic-teal.png
│   │   └── nouns-pattern.png
│   └── sample-image.jpg
└── System/
    ├── .index.json
    └── Fonts/
        ├── .index.json
        ├── Chicago.woff2
        └── Geneva.woff2
```

---

## Limitations

| Feature | Status | Notes |
|---------|--------|-------|
| Read files | ✓ Supported | Via fetch from /public/filesystem/ |
| Browse directories | ✓ Supported | Using .index.json files |
| Open with apps | ✓ Supported | Via file associations |
| Search | ✓ Supported | In-memory search of loaded indexes |
| Create files | ✗ Not supported | Filesystem is read-only |
| Upload files | ✗ Not supported | No server-side storage |
| Delete files | ✗ Not supported | Filesystem is read-only |
| Rename files | ✗ Not supported | Filesystem is read-only |
| Move files | ✗ Not supported | Filesystem is read-only |
| Trash | ✗ Removed | Would be misleading (session-only, no real deletion) |

### Why No Trash?

The filesystem is **read-only** - files are served statically from `/public/filesystem/`. A Trash feature would:
- Give users the impression they can delete files
- Only "hide" files in memory until page refresh
- Create confusion when "deleted" files reappear

Instead, we simply don't offer delete functionality for the virtual filesystem.

**User data that CAN be deleted:**
- Nouns proposal drafts → stored in database, can be permanently deleted
- Custom themes → stored in database, can be permanently deleted
- See [PERSISTENCE.md](./PERSISTENCE.md) for user data storage

---

## Testing Checklist

- [ ] Root directory loads
- [ ] Can navigate into folders
- [ ] Can navigate up
- [ ] Back/forward work
- [ ] Files display with correct icons
- [ ] Double-click opens folders
- [ ] Double-click opens files in correct app
- [ ] Selection works (single and multi)
- [ ] Context menu appears (Open, Get Info)
- [ ] Search finds files
- [ ] URL updates with path
- [ ] Mobile view works