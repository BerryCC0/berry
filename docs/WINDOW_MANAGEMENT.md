# Berry OS - Window Management

> Window system, z-index, dragging, and mobile behavior.

## Window Anatomy

```
┌─────────────────────────────────────────────┐
│ ● ○ ○  │  Window Title                      │  ← Title Bar
├─────────────────────────────────────────────┤
│                                             │
│                                             │
│              App Content                    │  ← Content Area
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│                                         ┌─┐ │
│                                         │▼│ │  ← Resize Handle
└─────────────────────────────────────────┴─┘─┘     (desktop only)
```

### Title Bar Components
- **Traffic lights**: Close (●), Minimize (○), Maximize (○)
- **Title**: Window/app name
- **Drag handle**: Entire title bar (desktop)

---

## Window State

```typescript
interface WindowState {
  // Identity
  id: string;              // Unique window ID: "win-abc123"
  appId: string;           // App that owns this window
  instanceId: string;      // Allows multiple instances
  
  // Display
  title: string;
  icon: string;
  
  // Position & Size
  x: number;
  y: number;
  width: number;
  height: number;
  
  // Constraints
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
  isResizable: boolean;
  
  // State Flags
  isFocused: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  
  // App State (opaque to window system)
  appState?: unknown;
}
```

---

## Window Store

```typescript
interface WindowStore {
  // State
  windows: Map<string, WindowState>;
  focusedWindowId: string | null;
  nextZIndex: number;
  
  // Lifecycle
  createWindow: (appId: string, config: WindowConfig) => string;
  closeWindow: (windowId: string) => void;
  
  // Focus
  focusWindow: (windowId: string) => void;
  
  // State Changes
  minimizeWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string) => void;
  restoreWindow: (windowId: string) => void;
  
  // Position & Size
  moveWindow: (windowId: string, x: number, y: number) => void;
  resizeWindow: (windowId: string, width: number, height: number) => void;
  
  // App State
  updateAppState: (windowId: string, state: unknown) => void;
  
  // Queries
  getWindow: (windowId: string) => WindowState | undefined;
  getWindowsByApp: (appId: string) => WindowState[];
  getTopWindow: () => WindowState | undefined;
}
```

---

## Z-Index Management

Windows stack by z-index. Focusing a window brings it to front.

### Strategy
- Start at z-index 100
- Each focus increments nextZIndex and assigns to window
- Simple and effective

```typescript
// windowStore implementation
const focusWindow = (windowId: string) => {
  set((state) => {
    const window = state.windows.get(windowId);
    if (!window) return state;
    
    // Unfocus all others
    state.windows.forEach(w => {
      w.isFocused = false;
    });
    
    // Focus this window with new z-index
    window.isFocused = true;
    window.zIndex = state.nextZIndex;
    
    return {
      focusedWindowId: windowId,
      nextZIndex: state.nextZIndex + 1,
    };
  });
  
  systemBus.emit('window:focused', { windowId });
};
```

### Z-Index Ranges

| Range | Purpose |
|-------|---------|
| 0 | Desktop background |
| 1-99 | Desktop icons |
| 100-9999 | Regular windows |
| 10000+ | Modals, dialogs |
| 20000+ | Menu bar, dock |
| 30000+ | Dropdowns, tooltips |

---

## Window Lifecycle

### Creating a Window

```typescript
const createWindow = (appId: string, config: WindowConfig): string => {
  const windowId = `win-${nanoid(8)}`;
  const instanceId = `${appId}-${nanoid(8)}`;
  
  const window: WindowState = {
    id: windowId,
    appId,
    instanceId,
    title: config.title || appId,
    icon: config.icon || '/icons/default.png',
    
    // Position: Cascade from last window or center
    x: config.x ?? getNextCascadePosition().x,
    y: config.y ?? getNextCascadePosition().y,
    
    // Size
    width: config.width,
    height: config.height,
    minWidth: config.minWidth ?? 200,
    minHeight: config.minHeight ?? 150,
    maxWidth: config.maxWidth,
    maxHeight: config.maxHeight,
    isResizable: config.resizable ?? true,
    
    // Initial state
    isFocused: true,
    isMinimized: false,
    isMaximized: false,
    zIndex: nextZIndex,
    
    appState: config.initialState,
  };
  
  set((state) => ({
    windows: new Map(state.windows).set(windowId, window),
    focusedWindowId: windowId,
    nextZIndex: state.nextZIndex + 1,
  }));
  
  systemBus.emit('window:created', { windowId, appId });
  
  return windowId;
};
```

### Closing a Window

```typescript
const closeWindow = (windowId: string) => {
  const window = windows.get(windowId);
  if (!window) return;
  
  // Emit closing event (app can save state)
  systemBus.emit('window:closing', { windowId, appId: window.appId });
  
  set((state) => {
    const newWindows = new Map(state.windows);
    newWindows.delete(windowId);
    
    // Focus next window if this was focused
    let newFocusedId = state.focusedWindowId;
    if (state.focusedWindowId === windowId) {
      const remaining = Array.from(newWindows.values());
      const topWindow = remaining.sort((a, b) => b.zIndex - a.zIndex)[0];
      newFocusedId = topWindow?.id || null;
      if (topWindow) topWindow.isFocused = true;
    }
    
    return {
      windows: newWindows,
      focusedWindowId: newFocusedId,
    };
  });
  
  systemBus.emit('window:closed', { windowId, appId: window.appId });
};
```

---

## Dragging (Desktop Only)

```typescript
// Hook for window dragging
const useWindowDrag = (windowId: string) => {
  const { moveWindow, focusWindow } = useWindowStore();
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag from title bar
    if (!(e.target as HTMLElement).closest('.titleBar')) return;
    
    focusWindow(windowId);
    setIsDragging(true);
    
    const window = useWindowStore.getState().getWindow(windowId);
    if (window) {
      dragOffset.current = {
        x: e.clientX - window.x,
        y: e.clientY - window.y,
      };
    }
  };
  
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      moveWindow(
        windowId,
        e.clientX - dragOffset.current.x,
        e.clientY - dragOffset.current.y
      );
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, windowId, moveWindow]);
  
  return { handleMouseDown, isDragging };
};
```

---

## Resizing (Desktop Only)

```typescript
// Hook for window resizing
const useWindowResize = (windowId: string) => {
  const { resizeWindow, getWindow } = useWindowStore();
  const [isResizing, setIsResizing] = useState(false);
  const [resizeEdge, setResizeEdge] = useState<string | null>(null);
  const initialState = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  const handleResizeStart = (edge: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeEdge(edge);
    
    const window = getWindow(windowId);
    if (window) {
      initialState.current = {
        x: e.clientX,
        y: e.clientY,
        width: window.width,
        height: window.height,
      };
    }
  };
  
  useEffect(() => {
    if (!isResizing || !resizeEdge) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const window = getWindow(windowId);
      if (!window) return;
      
      const dx = e.clientX - initialState.current.x;
      const dy = e.clientY - initialState.current.y;
      
      let newWidth = initialState.current.width;
      let newHeight = initialState.current.height;
      
      if (resizeEdge.includes('e')) newWidth += dx;
      if (resizeEdge.includes('w')) newWidth -= dx;
      if (resizeEdge.includes('s')) newHeight += dy;
      if (resizeEdge.includes('n')) newHeight -= dy;
      
      // Enforce constraints
      newWidth = Math.max(window.minWidth, newWidth);
      newHeight = Math.max(window.minHeight, newHeight);
      if (window.maxWidth) newWidth = Math.min(window.maxWidth, newWidth);
      if (window.maxHeight) newHeight = Math.min(window.maxHeight, newHeight);
      
      resizeWindow(windowId, newWidth, newHeight);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeEdge(null);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeEdge, windowId]);
  
  return { handleResizeStart, isResizing };
};
```

---

## Minimize / Maximize

### Minimize
- Window hides from desktop
- Shows in dock with indicator
- Click dock icon to restore

```typescript
const minimizeWindow = (windowId: string) => {
  set((state) => {
    const window = state.windows.get(windowId);
    if (!window) return state;
    
    window.isMinimized = true;
    window.isFocused = false;
    
    // Focus next window
    const visible = Array.from(state.windows.values())
      .filter(w => !w.isMinimized && w.id !== windowId)
      .sort((a, b) => b.zIndex - a.zIndex);
    
    const nextFocused = visible[0];
    if (nextFocused) nextFocused.isFocused = true;
    
    return {
      focusedWindowId: nextFocused?.id || null,
    };
  });
  
  systemBus.emit('window:minimized', { windowId });
};

const restoreWindow = (windowId: string) => {
  set((state) => {
    const window = state.windows.get(windowId);
    if (!window) return state;
    
    window.isMinimized = false;
    focusWindow(windowId);
    
    return {};
  });
};
```

### Maximize
- Window fills available space (between menu bar and dock)
- Toggle back to previous size

```typescript
const maximizeWindow = (windowId: string) => {
  const window = getWindow(windowId);
  if (!window) return;
  
  if (window.isMaximized) {
    // Restore to previous size
    resizeWindow(windowId, window.preMaximize.width, window.preMaximize.height);
    moveWindow(windowId, window.preMaximize.x, window.preMaximize.y);
    window.isMaximized = false;
  } else {
    // Save current size and maximize
    window.preMaximize = {
      x: window.x,
      y: window.y,
      width: window.width,
      height: window.height,
    };
    
    const bounds = getAvailableBounds(); // Account for menu bar, dock
    moveWindow(windowId, bounds.x, bounds.y);
    resizeWindow(windowId, bounds.width, bounds.height);
    window.isMaximized = true;
  }
};
```

---

## Mobile Behavior

On mobile, windows are fullscreen:

- No dragging
- No resizing
- No floating windows
- One window visible at a time
- Switch via dock

```typescript
// Window component checks platform
const Window = ({ windowId }) => {
  const { type } = usePlatform();
  const isMobile = type === 'mobile' || type === 'farcaster';
  
  if (isMobile) {
    return <MobileWindow windowId={windowId} />;
  }
  
  return <DesktopWindow windowId={windowId} />;
};

// Mobile window is simple
const MobileWindow = ({ windowId }) => {
  const window = useWindowStore(state => state.windows.get(windowId));
  const app = getApp(window.appId);
  
  if (window.isMinimized) return null;
  
  return (
    <div className={styles.mobileWindow}>
      <div className={styles.titleBar}>
        <span>{window.title}</span>
      </div>
      <div className={styles.content}>
        <app.component windowId={windowId} />
      </div>
    </div>
  );
};
```

---

## Window Cascade

New windows offset from previous:

```typescript
const getNextCascadePosition = (): { x: number; y: number } => {
  const windows = Array.from(useWindowStore.getState().windows.values());
  
  if (windows.length === 0) {
    return { x: 50, y: 50 };
  }
  
  const last = windows[windows.length - 1];
  return {
    x: (last.x + 30) % (window.innerWidth - 300),
    y: (last.y + 30) % (window.innerHeight - 300),
  };
};
```

---

## Bounds Checking

Keep windows on screen:

```typescript
const ensureInBounds = (window: WindowState): void => {
  const menuBarHeight = 28;
  const dockHeight = 64;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  // Keep at least 100px visible horizontally
  window.x = Math.max(-window.width + 100, Math.min(window.x, screenWidth - 100));
  
  // Keep title bar accessible
  window.y = Math.max(menuBarHeight, Math.min(window.y, screenHeight - dockHeight - 50));
};
```

---

## Events

Window system emits these events:

| Event | Data | When |
|-------|------|------|
| `window:created` | `{ windowId, appId }` | Window created |
| `window:closing` | `{ windowId, appId }` | Before close (save state) |
| `window:closed` | `{ windowId, appId }` | After close |
| `window:focused` | `{ windowId }` | Window focused |
| `window:minimized` | `{ windowId }` | Window minimized |
| `window:moved` | `{ windowId, x, y }` | Window dragged |
| `window:resized` | `{ windowId, width, height }` | Window resized |