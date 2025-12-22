# Berry OS - Architecture

> System overview, state management, event bus, and platform detection.

## System Layers

Berry OS is organized into distinct layers with clear boundaries:

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│            React components, CSS Modules, UI                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│         OS Apps, User Apps, App Launcher, Permissions       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      System Layer                            │
│      Window Manager, Event Bus, Persistence, Filesystem     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       State Layer                            │
│               Zustand Stores (Single Source of Truth)       │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── OS/                           # System layer
│   ├── components/               # System UI components
│   │   ├── Desktop/              # Desktop container + icons
│   │   ├── Window/               # Window chrome + behavior
│   │   ├── MenuBar/              # Menu bar + menus
│   │   ├── Dock/                 # Application dock
│   │   └── Primitives/           # Button, ScrollBar, Dialog, etc.
│   │
│   ├── store/                    # Zustand stores
│   │   ├── windowStore.ts        # Window state + actions
│   │   ├── desktopStore.ts       # Desktop icons, layout
│   │   ├── themeStore.ts         # Current theme, customizations
│   │   ├── sessionStore.ts       # User session, wallet connection
│   │   └── index.ts              # Store exports
│   │
│   ├── lib/                      # System utilities
│   │   ├── EventBus.ts           # System/App/Bridge event buses
│   │   ├── PlatformDetection.ts  # Platform detection + context
│   │   ├── WindowManager.ts      # Window operations
│   │   ├── AppLauncher.ts        # App lifecycle management
│   │   ├── IconRegistry.ts       # Central icon management
│   │   ├── Persistence.ts        # Storage abstraction
│   │   └── Filesystem.ts         # Virtual filesystem
│   │
│   ├── Apps/                     # OS-level apps (always available)
│   │   ├── OSAppConfig.ts        # OS app registry
│   │   ├── Finder/
│   │   ├── Calculator/
│   │   ├── SystemSettings/
│   │   ├── WalletPanel/
│   │   └── AboutBerryOS/
│   │
│   └── types/                    # System type definitions
│       ├── window.ts
│       ├── events.ts
│       ├── theme.ts
│       └── platform.ts
│
└── Apps/                         # User applications (lazy loaded)
    ├── AppConfig.ts              # User app registry
    ├── TextEditor/
    ├── MediaViewer/
    └── Nouns/                    # Nouns ecosystem apps
        ├── ProposalEditor/
        └── AuctionViewer/
```

---

## State Management

### Zustand Store Architecture

Berry OS uses **Zustand** for state management. Each domain has its own store, and stores communicate via the event bus (not direct imports, except for performance-critical paths).

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ windowStore │     │ themeStore  │     │sessionStore │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Event Bus  │
                    └─────────────┘
```

### Store Definitions

#### windowStore
Manages all window state and operations.

```typescript
interface WindowState {
  id: string;
  appId: string;
  instanceId: string;
  title: string;
  icon: string;
  
  // Position & size
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
  
  // State flags
  isFocused: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  
  // App state (opaque to window system)
  appState?: unknown;
}

interface WindowStore {
  // State
  windows: Map<string, WindowState>;
  focusedWindowId: string | null;
  nextZIndex: number;
  
  // Actions
  createWindow: (appId: string, config: Partial<WindowConfig>) => string;
  closeWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string) => void;
  restoreWindow: (windowId: string) => void;
  moveWindow: (windowId: string, x: number, y: number) => void;
  resizeWindow: (windowId: string, width: number, height: number) => void;
  updateAppState: (windowId: string, state: unknown) => void;
  
  // Queries
  getWindow: (windowId: string) => WindowState | undefined;
  getWindowsByApp: (appId: string) => WindowState[];
  getTopWindow: () => WindowState | undefined;
}
```

#### themeStore
Manages theming and visual customization.

```typescript
interface ThemeStore {
  // State
  currentTheme: Theme;
  customThemes: Theme[];
  
  // Actions
  setTheme: (theme: Theme) => void;
  updateThemeProperty: (path: string, value: unknown) => void;
  saveCustomTheme: (theme: Theme) => Promise<void>;
  deleteCustomTheme: (themeId: string) => Promise<void>;
  resetToDefault: () => void;
}
```

#### sessionStore
Manages user session and wallet connection.

```typescript
interface SessionStore {
  // State
  isInitialized: boolean;
  platform: Platform;
  
  // Wallet state
  primaryWallet: WalletInfo | null;
  linkedWallets: WalletInfo[];
  
  // Actions
  initialize: (platform: Platform) => Promise<void>;
  connectWallet: (wallet: WalletInfo) => Promise<void>;
  disconnectWallet: (address: string) => void;
  setPrimaryWallet: (address: string) => void;
  linkWallet: (wallet: WalletInfo) => Promise<void>;
}

interface WalletInfo {
  address: string;
  chain: string;
  chainId: number;
  isPrimary: boolean;
  linkedAt: number;
}
```

#### desktopStore
Manages desktop icons and layout.

```typescript
interface DesktopStore {
  // State
  icons: DesktopIcon[];
  gridSize: number;
  snapToGrid: boolean;
  
  // Actions
  moveIcon: (iconId: string, x: number, y: number) => void;
  addIcon: (icon: DesktopIcon) => void;
  removeIcon: (iconId: string) => void;
  resetLayout: () => void;
}

interface DesktopIcon {
  id: string;
  appId: string;
  label: string;
  icon: string;
  x: number;
  y: number;
}
```

### Store Communication

Stores can communicate two ways: **event bus** (loose coupling) or **direct access** (tight coupling). Here's when to use each:

#### Use Event Bus (Default)

For **notifications** where the sender doesn't need a response and multiple listeners may care:

```typescript
// Window closes → multiple systems may need to react
// windowStore.ts
const closeWindow = (windowId: string) => {
  // ... close logic ...
  
  // Notify anyone who cares (dock, persistence, analytics)
  systemBus.emit('window:closed', { windowId, appId });
};

// dockStore.ts - listens and updates
systemBus.on('window:closed', ({ appId }) => {
  updateRunningIndicator(appId);
});

// persistence.ts - listens and saves
systemBus.on('window:closed', () => {
  debouncedSaveWindowState();
});
```

**Good for:**
- State changes that multiple systems observe (theme changed, window focused)
- Actions where sender doesn't need confirmation
- Decoupling features (adding analytics shouldn't change window code)

#### Use Direct Store Access

For **queries** or **atomic operations** where you need immediate response:

```typescript
// Need to read current state to make a decision
const handleDrop = (file: VirtualFile, x: number, y: number) => {
  // Direct read - need current windows to check overlap
  const windows = useWindowStore.getState().windows;
  const overlapping = findWindowAt(windows, x, y);
  
  if (overlapping) {
    // Drop on window - send to that app
    appBus.emit('app:file-dropped', { windowId: overlapping.id, file });
  } else {
    // Drop on desktop - create desktop icon
    useDesktopStore.getState().addIcon({ ... });
  }
};

// Atomic operation - must happen together
const launchAppWithFocus = (appId: string) => {
  const store = useWindowStore.getState();
  const windowId = store.createWindow(appId, config);
  store.focusWindow(windowId);  // Must focus the window we just created
  return windowId;
};
```

**Good for:**
- Reading state to make decisions
- Operations that must be atomic (create + focus)
- Performance-critical paths (dragging at 60fps)

#### Decision Flowchart

```
Need to communicate between stores?
│
├─ "Something happened, react if you care"
│   └─► Event Bus (emit, listeners react independently)
│
├─ "I need current state to decide what to do"
│   └─► Direct Store Access (getState())
│
├─ "These operations must happen together"
│   └─► Direct Store Access (sequential calls)
│
└─ "Performance critical (60fps updates)"
    └─► Direct Store Access (skip event bus overhead)
```
```

---

## Event Bus System

Berry OS uses a three-tier event bus architecture for loose coupling between components.

```
┌─────────────────────────────────────────────────────────────┐
│                       Bridge Bus                             │
│              OS → App communication (read-only for apps)    │
└─────────────────────────────────────────────────────────────┘
         ▲                                        ▲
         │                                        │
┌────────┴────────┐                    ┌─────────┴────────┐
│   System Bus    │                    │     App Bus      │
│  OS ↔ OS only   │                    │   App ↔ App      │
└─────────────────┘                    └──────────────────┘
```

### System Bus
**Purpose:** Communication between OS components only.  
**Access:** OS components only. Apps cannot access.

```typescript
// Event types
type SystemEvent =
  | { type: 'window:created'; data: { windowId: string; appId: string } }
  | { type: 'window:closed'; data: { windowId: string; appId: string } }
  | { type: 'window:focused'; data: { windowId: string; previousId: string | null } }
  | { type: 'window:moved'; data: { windowId: string; x: number; y: number } }
  | { type: 'window:resized'; data: { windowId: string; width: number; height: number } }
  | { type: 'theme:changed'; data: { theme: Theme } }
  | { type: 'session:wallet-connected'; data: { wallet: WalletInfo } }
  | { type: 'session:wallet-disconnected'; data: { address: string } }
  | { type: 'fs:directory-changed'; data: { path: string } };

// Usage
import { systemBus } from '@/OS/lib/EventBus';

systemBus.emit('window:focused', { windowId: 'win-123', previousId: 'win-456' });
systemBus.on('window:focused', (data) => console.log(data.windowId));
```

### App Bus
**Purpose:** Communication between apps.  
**Access:** Any registered app.

```typescript
// Event types
type AppEvent =
  | { type: 'app:message'; data: { from: string; to: string; payload: unknown } }
  | { type: 'app:data-shared'; data: { from: string; dataType: string; data: unknown } };

// Usage
import { appBus } from '@/OS/lib/EventBus';

// App A shares data
appBus.emit('app:data-shared', {
  from: 'text-editor',
  dataType: 'text/plain',
  data: selectedText
});

// App B receives
appBus.on('app:data-shared', (event) => {
  if (event.dataType === 'text/plain') {
    handleText(event.data);
  }
});
```

### Bridge Bus
**Purpose:** Allow apps to listen to system events (read-only).  
**Access:** Apps can subscribe, only OS can emit.

```typescript
// Event types (subset of system events, safe for apps)
type BridgeEvent =
  | { type: 'bridge:theme-changed'; data: { theme: Theme } }
  | { type: 'bridge:window-focused'; data: { windowId: string; appId: string } }
  | { type: 'bridge:wallet-changed'; data: { wallet: WalletInfo | null } };

// Usage in apps
import { bridgeBus } from '@/OS/lib/EventBus';

bridgeBus.on('bridge:theme-changed', (data) => {
  updateAppColors(data.theme);
});
```

### Event Bus Implementation

```typescript
// /src/OS/lib/EventBus.ts
import { EventEmitter } from 'events';

class TypedEventBus<Events extends Record<string, unknown>> {
  private emitter = new EventEmitter();
  
  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[EventBus] ${String(event)}`, data);
    }
    this.emitter.emit(event as string, data);
  }
  
  on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void {
    this.emitter.on(event as string, handler);
  }
  
  off<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void {
    this.emitter.off(event as string, handler);
  }
  
  once<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void {
    this.emitter.once(event as string, handler);
  }
}

// Create typed instances
export const systemBus = new TypedEventBus<SystemEvents>();
export const appBus = new TypedEventBus<AppEvents>();
export const bridgeBus = new TypedEventBus<BridgeEvents>();

// Bridge forwarding (system → bridge)
systemBus.on('theme:changed', (data) => {
  bridgeBus.emit('bridge:theme-changed', data);
});
```

---

## Platform Detection

Berry OS runs on multiple platforms with different capabilities and UI requirements.

### Detection Flowchart

```
Page Load
    │
    ▼
┌─────────────────────────────────┐
│ window.sdk?.context exists?     │
└─────────────────────────────────┘
    │ yes              │ no
    ▼                  ▼
 FARCASTER    ┌─────────────────────────────────┐
              │ Screen width < 768px?           │
              └─────────────────────────────────┘
                   │ yes              │ no
                   ▼                  ▼
                MOBILE    ┌─────────────────────────────────┐
                          │ Touch device AND width ≤ 1024?  │
                          └─────────────────────────────────┘
                               │ yes              │ no
                               ▼                  ▼
                            TABLET             DESKTOP
```

### Platform Types

```typescript
type Platform = 'desktop' | 'tablet' | 'mobile' | 'farcaster';

interface PlatformInfo {
  type: Platform;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  isFarcaster: boolean;
}
```

### Detection Logic

```typescript
// /src/OS/lib/PlatformDetection.ts
export const detectPlatform = (): PlatformInfo => {
  // Check for Farcaster miniapp context
  if (typeof window !== 'undefined' && (window as any).sdk?.context) {
    return {
      type: 'farcaster',
      isTouchDevice: true,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      orientation: getOrientation(),
      isFarcaster: true,
    };
  }
  
  const isTouchDevice = 
    'ontouchstart' in window || 
    navigator.maxTouchPoints > 0;
  
  const screenWidth = window.innerWidth;
  
  // Tablet: 768px - 1024px with touch
  if (isTouchDevice && screenWidth >= 768 && screenWidth <= 1024) {
    return {
      type: 'tablet',
      isTouchDevice: true,
      screenWidth,
      screenHeight: window.innerHeight,
      orientation: getOrientation(),
      isFarcaster: false,
    };
  }
  
  // Mobile: < 768px
  if (screenWidth < 768) {
    return {
      type: 'mobile',
      isTouchDevice,
      screenWidth,
      screenHeight: window.innerHeight,
      orientation: getOrientation(),
      isFarcaster: false,
    };
  }
  
  // Desktop: everything else
  return {
    type: 'desktop',
    isTouchDevice,
    screenWidth,
    screenHeight: window.innerHeight,
    orientation: getOrientation(),
    isFarcaster: false,
  };
};
```

### Platform Context

```typescript
// /src/OS/lib/PlatformDetection.ts
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const PlatformContext = createContext<PlatformInfo | null>(null);

export const PlatformProvider = ({ children }: { children: ReactNode }) => {
  const [platform, setPlatform] = useState<PlatformInfo>(() => detectPlatform());
  
  useEffect(() => {
    const handleResize = () => setPlatform(detectPlatform());
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);
  
  return (
    <PlatformContext.Provider value={platform}>
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = (): PlatformInfo => {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within PlatformProvider');
  }
  return context;
};
```

### Platform-Specific Behavior

| Feature | Desktop | Tablet | Mobile | Farcaster |
|---------|---------|--------|--------|-----------|
| Windows | Multi-window, floating | Multi-window, floating | Fullscreen | Fullscreen |
| Resize | Drag edges | Drag edges | No | No |
| Menu bar | Always visible | Always visible | Hamburger | Hamburger |
| Dock | Bottom, icons | Bottom, icons | Bottom, compact | Bottom, compact |
| Context menu | Right-click | Long press | Long press | Long press |
| Hover states | Yes | No | No | No |

---

## Error Handling

### Error Boundaries

Each app runs inside its own error boundary. One app crashing doesn't affect others.

```typescript
// /src/OS/components/AppErrorBoundary.tsx
class AppErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.appId}] App crashed:`, error, errorInfo);
    
    // Emit crash event
    systemBus.emit('app:crashed', {
      appId: this.props.appId,
      error: error.message,
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <CrashDialog
          appName={this.props.appName}
          error={this.state.error}
          onRestart={() => this.setState({ hasError: false })}
          onClose={() => this.props.onClose()}
        />
      );
    }
    return this.props.children;
  }
}
```

### Graceful Degradation

Berry OS works without wallet connection. Features degrade gracefully:

| Feature | With Wallet | Without Wallet |
|---------|-------------|----------------|
| Theme customization | Persisted to database | In-memory only, lost on refresh |
| Window positions | Persisted | In-memory only |
| Desktop layout | Persisted | In-memory only |
| App state | Persisted | In-memory only |

```typescript
// Example: Saving theme
const saveTheme = async (theme: Theme) => {
  themeStore.getState().setTheme(theme); // Always update local state
  
  if (sessionStore.getState().primaryWallet) {
    await persistence.saveTheme(theme); // Persist if wallet connected
  }
  // No error if wallet not connected - just don't persist
};
```

### Logging Strategy

```typescript
// Development: Console logging
if (process.env.NODE_ENV === 'development') {
  console.log('[EventBus]', event, data);
  console.log('[WindowStore]', action, payload);
}

// Production: Errors only
if (process.env.NODE_ENV === 'production') {
  console.error('[Error]', error);
  // Optional: Send to error tracking service
}
```

---

## Initialization Flow

```
1. Next.js loads app/layout.tsx
   │
   ├─► Initialize PlatformProvider (detect platform)
   ├─► Initialize Web3Provider (Reown AppKit)
   ├─► Initialize ThemeProvider (load default theme)
   │
2. Next.js loads app/page.tsx (Desktop)
   │
   ├─► sessionStore.initialize(platform)
   │   ├─► Check for existing session
   │   ├─► Initialize persistence layer
   │   └─► Load saved state if wallet connected
   │
   ├─► Load theme from persistence (or default)
   ├─► Load desktop layout from persistence (or default)
   │
   ├─► Render Desktop component
   │   ├─► MenuBar
   │   ├─► Desktop (icons)
   │   ├─► Windows (from windowStore)
   │   └─► Dock
   │
   └─► Launch Finder (always running)

3. User interacts with OS
   │
   ├─► Click app icon → appLauncher.launch(appId)
   ├─► Drag window → windowStore.moveWindow(id, x, y)
   ├─► Connect wallet → sessionStore.connectWallet(wallet)
   │   └─► Migrate in-memory state to database
   └─► Changes auto-persist (debounced)
```

---

## Icon Registry

Berry OS uses a central icon registry for all system, app, and file type icons.

### Usage

```typescript
import { getIcon, getIconForFile } from '@/OS/lib/IconRegistry';

// Get app icon by ID
const finderIcon = getIcon('finder');      // "/icons/finder.svg"
const calcIcon = getIcon('calculator');    // "/icons/calculator.svg"

// Get file icon by extension
const txtIcon = getIconForExtension('txt');  // "/icons/file-text.svg"
const pngIcon = getIconForExtension('png');  // "/icons/file-image.svg"

// Smart file icon (checks MIME, extension, directory)
const icon = getIconForFile('readme.md', 'text/markdown', false);
```

### Adding a New Icon

1. Place SVG in `/public/icons/`:
   ```
   public/icons/my-icon.svg
   ```

2. Add to registry (`/src/OS/lib/IconRegistry.ts`):
   ```typescript
   // Add to type
   export type AppIconId = "finder" | "calculator" | "my-icon";
   
   // Add to registry
   const iconRegistry: Record<IconId, string> = {
     // ...
     "my-icon": `${ICONS_BASE_PATH}/my-icon.svg`,
   };
   ```

3. Use anywhere:
   ```typescript
   import { getIcon } from '@/OS/lib/IconRegistry';
   const icon = getIcon('my-icon');
   ```

### Icon Categories

| Category | Examples | Usage |
|----------|----------|-------|
| **System** | `hard-drive`, `folder`, `document` | Desktop icons, Finder |
| **App** | `finder`, `calculator`, `settings` | App configs, dock, windows |
| **File Type** | `file-text`, `file-image`, `file-code` | File associations, Finder |

### Directory Structure

```
public/icons/
├── finder.svg          # App icons
├── calculator.svg
├── settings.svg
├── hard-drive.svg      # System icons
├── folder.svg
├── folder-open.svg
├── file-text.svg       # File type icons
├── file-image.svg
├── file-code.svg
├── file-audio.svg
├── file-video.svg
├── file-pdf.svg
├── file-archive.svg
├── file-generic.svg
└── default.svg         # Fallback
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `Window.tsx`, `MenuBar.tsx` |
| Stores | camelCase with Store suffix | `windowStore.ts` |
| Utilities | PascalCase | `EventBus.ts`, `Persistence.ts` |
| Types | PascalCase with Types suffix | `WindowTypes.ts` |
| CSS Modules | PascalCase.platform.module.css | `Window.desktop.module.css` |
| Hooks | camelCase with use prefix | `useWindowDrag.ts` |
| Constants | PascalCase with Constants suffix | `ThemeConstants.ts` |

### Index Files

Use `index.ts` for clean imports:

```
Window/
├── index.ts              # export { Window } from './Window'
├── Window.tsx
├── Window.desktop.module.css
├── Window.mobile.module.css
└── components/
    ├── index.ts          # export * from './TitleBar'
    └── TitleBar.tsx
```

```typescript
// Clean imports
import { Window } from '@/OS/components/Window';
import { TitleBar } from '@/OS/components/Window/components';
```

---

## Next Steps

After understanding the architecture:

1. **Building components?** → Read [STYLING.md](./STYLING.md)
2. **Creating apps?** → Read [APPS.md](./APPS.md)
3. **Working on windows?** → Read [WINDOW_MANAGEMENT.md](./WINDOW_MANAGEMENT.md)
4. **Adding persistence?** → Read [PERSISTENCE.md](./PERSISTENCE.md)
5. **Starting implementation?** → Read [PHASES.md](./PHASES.md)