# Berry OS - Performance

> Bundle optimization, re-render prevention, and memory management.

## Overview

Berry OS should feel snappy on all devices. Key performance areas:

1. **Initial load** - Time to interactive desktop
2. **App launch** - Time from click to usable app
3. **Interactions** - Smooth dragging, typing, scrolling
4. **Memory** - Don't leak, don't bloat

---

## Bundle Size

### Code Splitting Strategy

```
Initial bundle (critical path):
├── Next.js runtime
├── React
├── Zustand stores
├── Platform detection
├── Desktop shell (MenuBar, Dock, Desktop)
├── Window component
└── ~150-200 KB gzipped target

Lazy loaded:
├── User apps (each loaded on first launch)
├── OS apps (except Finder - always loaded)
├── Wallet/Web3 (loaded when user clicks connect)
├── Theme editor UI
└── Heavy utilities (DOMPurify, Zod, etc.)
```

### Lazy Loading Apps

```typescript
// /src/Apps/AppConfig.ts
import { lazy } from 'react';

// ✓ Correct - code split per app
export const userApps = {
  'text-editor': {
    component: lazy(() => import('./TextEditor')),
    // ...
  },
  'media-viewer': {
    component: lazy(() => import('./MediaViewer')),
    // ...
  },
};

// ✗ Wrong - imports all apps upfront
import { TextEditor } from './TextEditor';
import { MediaViewer } from './MediaViewer';

export const userApps = {
  'text-editor': { component: TextEditor },  // Not lazy!
  'media-viewer': { component: MediaViewer },
};
```

### Lazy Loading Heavy Libraries

```typescript
// ✓ Correct - import when needed
const sanitizeContent = async (content: string) => {
  const DOMPurify = (await import('dompurify')).default;
  return DOMPurify.sanitize(content);
};

// ✗ Wrong - imported in module scope
import DOMPurify from 'dompurify';  // Always in bundle
```

### Analyzing Bundle

```bash
# Add to package.json
{
  "scripts": {
    "analyze": "ANALYZE=true next build"
  }
}

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

### Bundle Budget

| Chunk | Budget | Action if exceeded |
|-------|--------|-------------------|
| Initial JS | 200 KB | Split more aggressively |
| Per-app chunk | 50 KB | Check for heavy imports |
| Web3/Wallet | 100 KB | Lazy load on connect |
| Total (all apps) | 500 KB | Review dependencies |

---

## Image Optimization

### Icons

```typescript
// Use Next.js Image for automatic optimization
import Image from 'next/image';

// ✓ Optimized
<Image 
  src="/icons/folder.png" 
  width={32} 
  height={32}
  alt="Folder"
/>

// For pixel-perfect icons, disable blur
<Image 
  src="/icons/folder.png" 
  width={32} 
  height={32}
  alt="Folder"
  quality={100}
  unoptimized  // Keep pixel art crisp
/>
```

### Icon Sizes

Provide multiple sizes for different contexts:

```
public/icons/
├── folder.png          # 32x32 (default)
├── folder@2x.png       # 64x64 (retina)
└── folder-large.png    # 128x128 (desktop icons)
```

### Wallpapers

```typescript
// Preload wallpaper to prevent flash
<link 
  rel="preload" 
  href="/wallpapers/classic-teal.png" 
  as="image"
/>

// Use appropriate quality
// - Patterns: PNG, lossless
// - Photos: JPEG/WebP, quality 80
// - Size: Max 1920x1080, compress further for mobile
```

### Lazy Load Off-Screen Images

```typescript
// Native lazy loading
<img src="..." loading="lazy" alt="..." />

// Or with Intersection Observer for more control
const LazyImage = ({ src, alt }) => {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setLoaded(true);
        observer.disconnect();
      }
    });
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  
  return (
    <div ref={ref}>
      {loaded && <img src={src} alt={alt} />}
    </div>
  );
};
```

---

## Re-render Optimization

### Zustand Selectors

```typescript
// ✗ Bad - re-renders on any store change
const Component = () => {
  const store = useWindowStore();  // Subscribes to everything
  return <div>{store.focusedWindowId}</div>;
};

// ✓ Good - only re-renders when focusedWindowId changes
const Component = () => {
  const focusedWindowId = useWindowStore(state => state.focusedWindowId);
  return <div>{focusedWindowId}</div>;
};

// ✓ Good - multiple values with shallow compare
import { shallow } from 'zustand/shallow';

const Component = () => {
  const { windows, focusedWindowId } = useWindowStore(
    state => ({ 
      windows: state.windows, 
      focusedWindowId: state.focusedWindowId 
    }),
    shallow
  );
  return <div>...</div>;
};
```

### Memoization

```typescript
// Memoize expensive computations
const sortedFiles = useMemo(() => {
  return [...files].sort((a, b) => a.name.localeCompare(b.name));
}, [files]);

// Memoize callbacks passed to children
const handleClick = useCallback((id: string) => {
  selectFile(id);
}, [selectFile]);

// Memoize components that receive objects/arrays
const FileList = memo(({ files, onSelect }: Props) => {
  return (
    <ul>
      {files.map(file => (
        <FileItem key={file.id} file={file} onSelect={onSelect} />
      ))}
    </ul>
  );
});
```

### Avoid Creating Objects in Render

```typescript
// ✗ Bad - new object every render
<Component style={{ padding: 10 }} />
<Component data={{ id: 1, name: 'test' }} />

// ✓ Good - stable reference
const style = { padding: 10 };  // Outside component or useMemo
<Component style={style} />

// ✓ Good - primitive props when possible
<Component padding={10} />
```

### Window Rendering

```typescript
// Only render visible windows
const Desktop = () => {
  const windows = useWindowStore(state => 
    Array.from(state.windows.values()).filter(w => !w.isMinimized)
  );
  
  return (
    <div className={styles.desktop}>
      {windows.map(window => (
        <Window key={window.id} windowId={window.id} />
      ))}
    </div>
  );
};
```

### Event Handler Optimization

```typescript
// ✗ Bad - new function every item
{files.map(file => (
  <FileItem 
    key={file.id} 
    onClick={() => handleClick(file.id)}  // New function each render
  />
))}

// ✓ Good - single handler with data attribute
const handleClick = useCallback((e: React.MouseEvent) => {
  const id = e.currentTarget.dataset.id;
  if (id) selectFile(id);
}, [selectFile]);

{files.map(file => (
  <FileItem 
    key={file.id} 
    data-id={file.id}
    onClick={handleClick}  // Same function reference
  />
))}
```

---

## Memory Management

### Window Limits

```typescript
const LIMITS = {
  desktop: {
    maxWindows: 50,
    warnAt: 40,
  },
  mobile: {
    maxWindows: 10,
    warnAt: 8,
  },
};

const createWindow = (appId: string, config: WindowConfig) => {
  const { type } = getPlatform();
  const limits = type === 'mobile' ? LIMITS.mobile : LIMITS.desktop;
  const currentCount = windows.size;
  
  if (currentCount >= limits.maxWindows) {
    console.warn('Maximum windows reached');
    // Focus existing window or show dialog
    return null;
  }
  
  if (currentCount >= limits.warnAt) {
    console.warn(`${currentCount} windows open, approaching limit`);
  }
  
  // Create window...
};
```

### Cleanup on Window Close

```typescript
// Window component
useEffect(() => {
  // Setup
  const subscription = eventBus.on('theme:changed', handleTheme);
  
  return () => {
    // Cleanup when window unmounts
    subscription.unsubscribe();
    
    // Clear any timers
    clearInterval(intervalId);
    clearTimeout(timeoutId);
    
    // Abort pending fetches
    abortController.abort();
    
    // Release large objects
    largeDataRef.current = null;
  };
}, []);
```

### Cache Management

```typescript
// Filesystem cache with size limit
class FilesystemCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 100;  // Max entries
  
  set(key: string, value: VirtualFile[]): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }
  
  get(key: string): VirtualFile[] | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    // Optional: expire after time
    const maxAge = 5 * 60 * 1000;  // 5 minutes
    if (Date.now() - entry.timestamp > maxAge) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }
  
  clear(): void {
    this.cache.clear();
  }
}
```

### Detecting Memory Leaks

```typescript
// Development helper
if (process.env.NODE_ENV === 'development') {
  // Log component mount/unmount
  useEffect(() => {
    console.log(`[Mount] ${componentName}`);
    return () => console.log(`[Unmount] ${componentName}`);
  }, []);
  
  // Track event listeners
  const originalAdd = EventTarget.prototype.addEventListener;
  const originalRemove = EventTarget.prototype.removeEventListener;
  let listenerCount = 0;
  
  EventTarget.prototype.addEventListener = function(...args) {
    listenerCount++;
    console.log(`Listeners: ${listenerCount} (+${args[0]})`);
    return originalAdd.apply(this, args);
  };
  
  EventTarget.prototype.removeEventListener = function(...args) {
    listenerCount--;
    console.log(`Listeners: ${listenerCount} (-${args[0]})`);
    return originalRemove.apply(this, args);
  };
}
```

---

## Interaction Performance

### Smooth Dragging

```typescript
// Use CSS transforms (GPU accelerated)
const Window = ({ x, y }) => {
  return (
    <div 
      style={{ 
        transform: `translate(${x}px, ${y}px)`,
        // NOT: left: x, top: y (triggers layout)
      }}
    >
      ...
    </div>
  );
};

// Throttle drag updates
import { throttle } from 'lodash-es';

const handleMouseMove = useMemo(
  () => throttle((e: MouseEvent) => {
    moveWindow(windowId, e.clientX - offset.x, e.clientY - offset.y);
  }, 16),  // ~60fps
  [windowId, offset]
);
```

### Smooth Scrolling

```css
/* Enable smooth scrolling */
.scrollable {
  overflow: auto;
  scroll-behavior: smooth;
}

/* But disable for keyboard users who need precision */
@media (prefers-reduced-motion: reduce) {
  .scrollable {
    scroll-behavior: auto;
  }
}
```

### Debounce Expensive Operations

```typescript
// Debounce search
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    performSearch(query);
  }, 300),
  []
);

// Debounce persistence
const debouncedSave = useMemo(
  () => debounce((state: AppState) => {
    persistence.saveAppState(appId, state);
  }, 2000),
  [appId]
);
```

### Virtual Lists for Long Content

```typescript
// For long file lists, use virtualization
import { useVirtualizer } from '@tanstack/react-virtual';

const FileList = ({ files }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24,  // Row height
  });
  
  return (
    <div ref={parentRef} style={{ height: 400, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size,
            }}
          >
            <FileRow file={files[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Measuring Performance

### Core Web Vitals

```typescript
// Track with web-vitals library
import { onCLS, onFID, onLCP } from 'web-vitals';

onCLS(console.log);  // Cumulative Layout Shift
onFID(console.log);  // First Input Delay
onLCP(console.log);  // Largest Contentful Paint

// Targets:
// LCP: < 2.5s
// FID: < 100ms
// CLS: < 0.1
```

### Custom Metrics

```typescript
// Measure app launch time
const launchApp = async (appId: string) => {
  const start = performance.now();
  
  await appLauncher.launch(appId);
  
  const duration = performance.now() - start;
  console.log(`[Perf] ${appId} launch: ${duration.toFixed(2)}ms`);
  
  // Track if too slow
  if (duration > 500) {
    console.warn(`[Perf] Slow app launch: ${appId}`);
  }
};
```

### React Profiler

```typescript
// Wrap components to measure render time
import { Profiler } from 'react';

const onRenderCallback = (
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number
) => {
  if (actualDuration > 16) {  // Longer than one frame
    console.warn(`[Perf] Slow render: ${id} (${phase}) ${actualDuration.toFixed(2)}ms`);
  }
};

<Profiler id="Window" onRender={onRenderCallback}>
  <Window {...props} />
</Profiler>
```

---

## Performance Checklist

### Before Release

- [ ] Bundle size within budget
- [ ] All user apps lazy loaded
- [ ] Heavy libraries lazy loaded
- [ ] Images optimized
- [ ] No obvious memory leaks
- [ ] Dragging is smooth (60fps)
- [ ] Typing has no lag
- [ ] LCP < 2.5s on 3G
- [ ] No layout shift on load

### Code Review

Watch for:
- Large imports in module scope
- Missing `useMemo`/`useCallback` where needed
- Object/array literals in JSX props
- Missing cleanup in `useEffect`
- Subscribing to entire Zustand store
- Unthrottled mouse/scroll handlers