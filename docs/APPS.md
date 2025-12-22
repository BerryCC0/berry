# Berry OS - Applications

> App structure, registration, lifecycle, and permissions.

## App Types

Berry OS has two types of applications:

### Quick Comparison

| Aspect | OS Apps | User Apps |
|--------|---------|-----------|
| **Location** | `/src/OS/Apps/` | `/src/Apps/` |
| **Loading** | Bundled (static import) | Lazy loaded (code split) |
| **Bundle impact** | Adds to initial load | Zero initial cost |
| **Window types** | Windows or modals | Windows only |
| **Can close?** | Some can only minimize | Always closeable |
| **Always running?** | Finder is always running | No |
| **System access** | Full (filesystem, settings) | Sandboxed |
| **Permissions** | Implicit (trusted) | Declared (advisory) |
| **Examples** | Finder, Calculator, Settings | Text Editor, Media Viewer |

### OS Apps

OS Apps are core system applications bundled with Berry OS:

```typescript
// Bundled - adds to initial JS payload
import { Finder } from '@/OS/Apps/Finder';
import { Calculator } from '@/OS/Apps/Calculator';
```

**Characteristics:**
- Always available, no loading delay
- Can be windows OR modals (e.g., About Berry OS is a modal)
- Some cannot be closed (Finder minimizes instead)
- Full system access - can modify settings, access all filesystem
- Cannot be uninstalled or disabled by user
- Count toward initial bundle size

**When to make an OS App:**
- Core system functionality (Finder, Settings)
- Must always be available (Wallet Panel)
- Needs elevated permissions (theme editor)
- Small enough to not bloat initial bundle

### User Apps

User Apps are loaded on-demand when the user launches them:

```typescript
// Lazy loaded - zero cost until launched
const TextEditor = lazy(() => import('@/Apps/TextEditor'));
const MediaViewer = lazy(() => import('@/Apps/MediaViewer'));
```

**Characteristics:**
- First launch shows brief loading state
- Always opened as windows (never modals)
- Sandboxed - can only access declared permissions
- Can be large without affecting initial load
- Could be "uninstalled" in future (remove from launcher)

**When to make a User App:**
- Feature-specific (Nouns Proposal Editor)
- Large dependencies (Markdown editor with preview)
- Not critical to core OS function
- Used occasionally, not constantly

---

## Permissions

### Current Status: Advisory

Permissions are currently **declared but not enforced**. Apps declare what they need, but the system doesn't block unauthorized access. This provides:
- Documentation of app capabilities
- Future-proofing for enforcement
- User transparency (if we add a permissions UI)

### Permission Types

```typescript
type AppPermission =
  | 'filesystem:read'     // Read virtual filesystem
  | 'filesystem:write'    // Write to filesystem (future)
  | 'network:fetch'       // Make HTTP requests
  | 'clipboard:read'      // Read from clipboard
  | 'clipboard:write'     // Write to clipboard
  | 'system:settings'     // Modify system settings
  | 'notifications:send'; // Send desktop notifications
```

### Future Enforcement

When we enforce permissions, the plan is:
1. App declares permissions in config
2. On first use of a permission, system checks declaration
3. Undeclared permission usage → warning (dev) / error (prod)
4. User can see what permissions an app uses

```typescript
// Future: runtime permission check
const readClipboard = async () => {
  if (!hasPermission('clipboard:read')) {
    throw new PermissionError('clipboard:read not declared');
  }
  return navigator.clipboard.readText();
};
```

---

## App Directory Structure

Every app follows the same structure:

```
AppName/
├── index.ts                          # Export: export { default } from './AppName'
├── AppName.tsx                       # Main component
├── AppName.desktop.module.css        # Desktop styles
├── AppName.mobile.module.css         # Mobile/Farcaster styles
│
├── components/                       # Child components
│   ├── index.ts                      # Export all components
│   ├── Header.tsx
│   ├── Header.desktop.module.css
│   └── Header.mobile.module.css
│
└── utils/                            # Business logic (NO React)
    ├── index.ts                      # Export all utilities
    ├── hooks/                        # React hooks
    │   ├── index.ts
    │   └── useAppState.ts
    ├── types/                        # TypeScript types
    │   ├── index.ts
    │   └── AppTypes.ts
    ├── helpers/                      # Pure functions
    │   ├── index.ts
    │   └── calculations.ts
    └── constants/                    # Constants
        ├── index.ts
        └── AppConstants.ts
```

### Separation of Concerns

**Business logic** goes in `/utils/helpers/`:
- Pure TypeScript functions
- No React dependencies
- No JSX
- Testable in isolation

**Presentation logic** stays in `.tsx` components:
- React components
- JSX rendering
- User interactions
- Calls business logic functions

```typescript
// ✗ Bad: Logic mixed with presentation
function Calculator() {
  const handleCalculate = (a: number, b: number, op: string) => {
    // 50 lines of calculation logic here
    if (op === '+') return a + b;
    // ...
  };
  return <div>...</div>;
}

// ✓ Good: Separated
// utils/helpers/calculate.ts
export function calculate(a: number, b: number, op: string): number {
  if (op === '+') return a + b;
  // Pure logic, no React
}

// Calculator.tsx
import { calculate } from './utils/helpers/calculate';

function Calculator() {
  const handleCalculate = (a: number, b: number, op: string) => {
    return calculate(a, b, op);
  };
  return <div>...</div>;
}
```

---

## App Registration

### OS Apps

```typescript
// /src/OS/Apps/OSAppConfig.ts
import { getIcon } from '@/OS/lib/IconRegistry';
import { Finder } from './Finder';
import { Calculator } from './Calculator';
import { SystemSettings } from './SystemSettings';
import { WalletPanel } from './WalletPanel';
import { AboutBerryOS } from './AboutBerryOS';

export interface OSAppConfig {
  id: string;
  name: string;
  icon: string;
  component: React.ComponentType<AppProps>;
  windowType: 'window' | 'modal';
  defaultWindow: WindowConfig;
  permissions: AppPermission[];
  isAlwaysRunning?: boolean;    // Like Finder
  canClose?: boolean;           // Some apps can only minimize
  showInLaunchpad?: boolean;    // Show in app launcher
}

export const osApps: Record<string, OSAppConfig> = {
  finder: {
    id: 'finder',
    name: 'Finder',
    icon: getIcon('finder'),    // Use IconRegistry
    component: Finder,
    windowType: 'window',
    defaultWindow: {
      width: 800,
      height: 600,
      minWidth: 400,
      minHeight: 300,
      resizable: true,
    },
    permissions: ['filesystem:read', 'filesystem:write'],
    isAlwaysRunning: true,
    canClose: false,
    showInLaunchpad: true,
  },
  
  calculator: {
    id: 'calculator',
    name: 'Calculator',
    icon: getIcon('calculator'), // Use IconRegistry
    component: Calculator,
    windowType: 'window',
    defaultWindow: {
      width: 280,
      height: 400,
      resizable: false,
    },
    permissions: [],
    showInLaunchpad: true,
  },
  
  'system-settings': {
    id: 'system-settings',
    name: 'System Settings',
    icon: getIcon('settings'),   // Use IconRegistry
    component: SystemSettings,
    windowType: 'modal',
    defaultWindow: {
      width: 700,
      height: 500,
      resizable: true,
    },
    permissions: ['system:settings'],
    showInLaunchpad: true,
  },
  
  'wallet-panel': {
    id: 'wallet-panel',
    name: 'Wallet',
    icon: getIcon('default'),    // Use IconRegistry (add wallet icon later)
    component: WalletPanel,
    windowType: 'modal',
    defaultWindow: {
      width: 420,
      height: 600,
      resizable: false,
    },
    permissions: ['network:fetch'],
    showInLaunchpad: false, // Accessed from menu bar
  },
  
  'about-berry-os': {
    id: 'about-berry-os',
    name: 'About Berry OS',
    icon: getIcon('about'),      // Use IconRegistry
    component: AboutBerryOS,
    windowType: 'modal',
    defaultWindow: {
      width: 450,
      height: 350,
      resizable: false,
    },
    permissions: [],
    showInLaunchpad: false, // Accessed from Berry menu
  },
};
```

### User Apps

```typescript
// /src/Apps/AppConfig.ts
import { lazy } from 'react';
import { getIcon } from '@/OS/lib/IconRegistry';

export interface UserAppConfig {
  id: string;
  name: string;
  icon: string;
  description?: string;
  component: React.LazyExoticComponent<React.ComponentType<AppProps>>;
  defaultWindow: WindowConfig;
  permissions?: AppPermission[];
  fileAssociations?: string[];      // MIME types this app opens
  category?: AppCategory;
}

export type AppCategory = 
  | 'productivity'
  | 'media'
  | 'nouns'
  | 'utilities'
  | 'other';

export const userApps: Record<string, UserAppConfig> = {
  'text-editor': {
    id: 'text-editor',
    name: 'Text Editor',
    icon: getIcon('file-text'),    // Use IconRegistry
    description: 'Simple text editor',
    component: lazy(() => import('./TextEditor')),
    defaultWindow: {
      width: 700,
      height: 500,
      minWidth: 400,
      minHeight: 300,
      resizable: true,
    },
    permissions: ['filesystem:read', 'filesystem:write'],
    fileAssociations: ['text/plain', 'text/markdown'],
    category: 'productivity',
  },
  
  'media-viewer': {
    id: 'media-viewer',
    name: 'Media Viewer',
    icon: getIcon('file-image'),   // Use IconRegistry
    description: 'View images and videos',
    component: lazy(() => import('./MediaViewer')),
    defaultWindow: {
      width: 900,
      height: 700,
      resizable: true,
    },
    permissions: ['filesystem:read'],
    fileAssociations: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    category: 'media',
  },
  
  'proposal-editor': {
    id: 'proposal-editor',
    name: 'Nouns Proposal Editor',
    icon: getIcon('document'),     // Use IconRegistry
    description: 'Create and edit Nouns proposals',
    component: lazy(() => import('./Nouns/ProposalEditor')),
    defaultWindow: {
      width: 900,
      height: 700,
      minWidth: 600,
      minHeight: 500,
      resizable: true,
    },
    permissions: ['network:fetch', 'clipboard:write'],
    category: 'nouns',
  },
};

// Helper functions
export const getUserApp = (id: string) => userApps[id];
export const getAllUserApps = () => Object.values(userApps);
export const getAppsByCategory = (category: AppCategory) => 
  Object.values(userApps).filter(app => app.category === category);
export const getAppForMimeType = (mimeType: string) =>
  Object.values(userApps).find(app => app.fileAssociations?.includes(mimeType));
```

---

## App Component Interface

All apps receive the same props:

```typescript
// /src/OS/types/app.ts
interface AppProps {
  windowId: string;                   // Unique window instance ID
  initialState?: unknown;             // State passed when launching
  onStateChange?: (state: unknown) => void;  // Notify window of state changes
}

interface WindowConfig {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;
  x?: number;                         // Initial position (optional)
  y?: number;
}

type AppPermission =
  | 'filesystem:read'
  | 'filesystem:write'
  | 'network:fetch'
  | 'clipboard:read'
  | 'clipboard:write'
  | 'system:settings'
  | 'notifications:send';
```

### Example App Component

```typescript
// /src/Apps/TextEditor/TextEditor.tsx
import { useState, useEffect } from 'react';
import { usePlatform } from '@/OS/lib/PlatformDetection';
import desktopStyles from './TextEditor.desktop.module.css';
import mobileStyles from './TextEditor.mobile.module.css';
import { Toolbar } from './components/Toolbar';
import { Editor } from './components/Editor';
import type { AppProps } from '@/OS/types/app';

interface TextEditorState {
  content: string;
  filePath?: string;
  isDirty: boolean;
}

const TextEditor = ({ windowId, initialState, onStateChange }: AppProps) => {
  const { type } = usePlatform();
  const styles = type === 'mobile' || type === 'farcaster' 
    ? mobileStyles 
    : desktopStyles;
  
  const [state, setState] = useState<TextEditorState>(() => ({
    content: '',
    filePath: undefined,
    isDirty: false,
    ...(initialState as Partial<TextEditorState>),
  }));
  
  // Notify window system of state changes (for persistence)
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);
  
  // Load file if initialState contains filePath
  useEffect(() => {
    if (initialState?.filePath) {
      loadFile(initialState.filePath);
    }
  }, []);
  
  const loadFile = async (path: string) => {
    // Load file content
  };
  
  const handleChange = (content: string) => {
    setState(prev => ({ ...prev, content, isDirty: true }));
  };
  
  return (
    <div className={styles.container}>
      <Toolbar 
        isDirty={state.isDirty}
        onSave={() => {/* save */}}
      />
      <Editor 
        content={state.content}
        onChange={handleChange}
      />
    </div>
  );
};

export default TextEditor;
```

---

## App Launcher

The App Launcher manages app lifecycle:

```typescript
// /src/OS/lib/AppLauncher.ts
import { osApps } from '@/OS/Apps/OSAppConfig';
import { userApps } from '@/Apps/AppConfig';
import { useWindowStore } from '@/OS/store/windowStore';
import { systemBus } from './EventBus';

class AppLauncher {
  private runningApps = new Map<string, string[]>(); // appId → windowIds
  
  /**
   * Launch an app
   */
  async launch(
    appId: string, 
    options?: { initialState?: unknown; position?: { x: number; y: number } }
  ): Promise<string | null> {
    // Try OS apps first
    const osApp = osApps[appId];
    if (osApp) {
      return this.launchOSApp(osApp, options);
    }
    
    // Try user apps
    const userApp = userApps[appId];
    if (userApp) {
      return this.launchUserApp(userApp, options);
    }
    
    console.error(`App not found: ${appId}`);
    return null;
  }
  
  private launchOSApp(app: OSAppConfig, options?: LaunchOptions): string {
    const windowStore = useWindowStore.getState();
    
    // If always running, focus existing window
    if (app.isAlwaysRunning) {
      const existingWindows = this.runningApps.get(app.id);
      if (existingWindows?.length) {
        windowStore.focusWindow(existingWindows[0]);
        return existingWindows[0];
      }
    }
    
    // Create window
    const windowId = windowStore.createWindow(app.id, {
      title: app.name,
      icon: app.icon,
      component: app.component,
      windowType: app.windowType,
      ...app.defaultWindow,
      ...options?.position,
      initialState: options?.initialState,
    });
    
    // Track running app
    this.trackWindow(app.id, windowId);
    
    // Emit event
    systemBus.emit('app:launched', { appId: app.id, windowId });
    
    return windowId;
  }
  
  private async launchUserApp(app: UserAppConfig, options?: LaunchOptions): Promise<string> {
    const windowStore = useWindowStore.getState();
    
    // Create window (component is lazy, will load on render)
    const windowId = windowStore.createWindow(app.id, {
      title: app.name,
      icon: app.icon,
      component: app.component, // React.lazy component
      windowType: 'window',
      ...app.defaultWindow,
      ...options?.position,
      initialState: options?.initialState,
    });
    
    this.trackWindow(app.id, windowId);
    systemBus.emit('app:launched', { appId: app.id, windowId });
    
    return windowId;
  }
  
  /**
   * Close a specific window
   */
  closeWindow(windowId: string): void {
    const windowStore = useWindowStore.getState();
    const window = windowStore.getWindow(windowId);
    
    if (!window) return;
    
    // Check if app allows closing
    const osApp = osApps[window.appId];
    if (osApp && osApp.canClose === false) {
      // Minimize instead
      windowStore.minimizeWindow(windowId);
      return;
    }
    
    // Close window
    windowStore.closeWindow(windowId);
    this.untrackWindow(window.appId, windowId);
    
    // If no more windows, app is closed
    const remaining = this.runningApps.get(window.appId);
    if (!remaining?.length) {
      systemBus.emit('app:closed', { appId: window.appId });
    }
  }
  
  /**
   * Close all windows for an app
   */
  closeApp(appId: string): void {
    const windowIds = this.runningApps.get(appId) || [];
    windowIds.forEach(id => this.closeWindow(id));
  }
  
  /**
   * Check if app is running
   */
  isRunning(appId: string): boolean {
    const windows = this.runningApps.get(appId);
    return !!windows?.length;
  }
  
  /**
   * Get window IDs for an app
   */
  getWindows(appId: string): string[] {
    return this.runningApps.get(appId) || [];
  }
  
  /**
   * Open file with appropriate app
   */
  async openFile(filePath: string, mimeType: string): Promise<string | null> {
    const app = getAppForMimeType(mimeType);
    
    if (!app) {
      console.warn(`No app registered for: ${mimeType}`);
      return null;
    }
    
    return this.launch(app.id, { 
      initialState: { filePath, mimeType } 
    });
  }
  
  private trackWindow(appId: string, windowId: string): void {
    const existing = this.runningApps.get(appId) || [];
    this.runningApps.set(appId, [...existing, windowId]);
  }
  
  private untrackWindow(appId: string, windowId: string): void {
    const existing = this.runningApps.get(appId) || [];
    this.runningApps.set(appId, existing.filter(id => id !== windowId));
  }
}

export const appLauncher = new AppLauncher();
```

### Usage

```typescript
import { appLauncher } from '@/OS/lib/AppLauncher';

// Launch app
appLauncher.launch('calculator');

// Launch with initial state
appLauncher.launch('text-editor', { 
  initialState: { filePath: '/Documents/readme.txt' } 
});

// Launch at specific position
appLauncher.launch('finder', { 
  position: { x: 100, y: 100 } 
});

// Open file with appropriate app
appLauncher.openFile('/Pictures/photo.jpg', 'image/jpeg');

// Close window
appLauncher.closeWindow('win-abc123');

// Check if running
if (appLauncher.isRunning('finder')) {
  // ...
}
```

---

## Error Boundaries

Each app runs inside an error boundary. Crashes are isolated.

```typescript
// /src/OS/components/AppErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { CrashDialog } from './CrashDialog';
import { systemBus } from '@/OS/lib/EventBus';

interface Props {
  appId: string;
  appName: string;
  children: ReactNode;
  onRestart: () => void;
  onClose: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.appId}] Crashed:`, error, errorInfo);
    
    systemBus.emit('app:crashed', {
      appId: this.props.appId,
      error: error.message,
      stack: error.stack,
    });
  }
  
  handleRestart = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRestart();
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <CrashDialog
          appName={this.props.appName}
          error={this.state.error}
          onRestart={this.handleRestart}
          onClose={this.props.onClose}
        />
      );
    }
    
    return this.props.children;
  }
}
```

### Crash Dialog

Classic Mac OS bomb dialog aesthetic:

```typescript
// /src/OS/components/CrashDialog.tsx
const CrashDialog = ({ appName, error, onRestart, onClose }) => {
  return (
    <div className={styles.crashDialog}>
      <div className={styles.icon}>💣</div>
      <h2>{appName} has unexpectedly quit</h2>
      <p className={styles.errorMessage}>
        {error?.message || 'An unknown error occurred'}
      </p>
      <div className={styles.buttons}>
        <button onClick={onRestart}>Restart</button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};
```

---

## App Communication

Apps don't import each other directly. Communication happens through:

### 1. Event Bus (App to App)

```typescript
// App A: Share data
import { appBus } from '@/OS/lib/EventBus';

const handleShare = () => {
  appBus.emit('app:data-shared', {
    from: 'text-editor',
    dataType: 'text/plain',
    data: selectedText,
  });
};

// App B: Receive data
useEffect(() => {
  const handler = (event) => {
    if (event.dataType === 'text/plain') {
      insertText(event.data);
    }
  };
  
  appBus.on('app:data-shared', handler);
  return () => appBus.off('app:data-shared', handler);
}, []);
```

### 2. App Launcher (Opening Apps)

```typescript
// Finder opening Media Viewer with a file
import { appLauncher } from '@/OS/lib/AppLauncher';

const handleDoubleClick = (file) => {
  appLauncher.openFile(file.path, file.mimeType);
};
```

### 3. Bridge Bus (System Events)

```typescript
// App listening to system events
import { bridgeBus } from '@/OS/lib/EventBus';

useEffect(() => {
  const handler = (data) => {
    updateTheme(data.theme);
  };
  
  bridgeBus.on('bridge:theme-changed', handler);
  return () => bridgeBus.off('bridge:theme-changed', handler);
}, []);
```

---

## Permissions

Apps declare required permissions. Currently advisory (not enforced), but provides documentation and future enforcement path.

```typescript
type AppPermission =
  | 'filesystem:read'     // Read files from virtual filesystem
  | 'filesystem:write'    // Write files (future, for Nouns proposals)
  | 'network:fetch'       // Make network requests
  | 'clipboard:read'      // Read from clipboard
  | 'clipboard:write'     // Write to clipboard
  | 'system:settings'     // Modify system settings
  | 'notifications:send'; // Send desktop notifications

// App declares permissions
{
  id: 'text-editor',
  permissions: ['filesystem:read', 'filesystem:write', 'clipboard:read', 'clipboard:write'],
}
```

---

## Creating a New App

### Checklist

- [ ] Create directory in `/src/Apps/[AppName]/`
- [ ] Create `index.ts` with default export
- [ ] Create `AppName.tsx` main component
- [ ] Create platform CSS files (`.desktop.module.css`, `.mobile.module.css`)
- [ ] Put business logic in `/utils/helpers/`
- [ ] Add to `AppConfig.ts` (user apps) or `OSAppConfig.ts` (OS apps)
- [ ] Handle `initialState` prop if app can be opened with data
- [ ] Call `onStateChange` when state changes (for persistence)
- [ ] Test on desktop and mobile
- [ ] Test error boundary (force an error)

### Template

```typescript
// /src/Apps/MyApp/index.ts
export { default } from './MyApp';

// /src/Apps/MyApp/MyApp.tsx
import { useState, useEffect } from 'react';
import { usePlatform } from '@/OS/lib/PlatformDetection';
import desktopStyles from './MyApp.desktop.module.css';
import mobileStyles from './MyApp.mobile.module.css';
import type { AppProps } from '@/OS/types/app';

const MyApp = ({ windowId, initialState, onStateChange }: AppProps) => {
  const { type } = usePlatform();
  const styles = type === 'mobile' || type === 'farcaster' 
    ? mobileStyles 
    : desktopStyles;
  
  const [state, setState] = useState(() => ({
    // Default state
    ...(initialState as object),
  }));
  
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);
  
  return (
    <div className={styles.container}>
      {/* App content */}
    </div>
  );
};

export default MyApp;
```

```typescript
// /src/Apps/AppConfig.ts - Add entry
import { getIcon } from '@/OS/lib/IconRegistry';

'my-app': {
  id: 'my-app',
  name: 'My App',
  icon: getIcon('default'),  // Use IconRegistry - add to registry if custom icon
  component: lazy(() => import('./MyApp')),
  defaultWindow: {
    width: 600,
    height: 400,
    resizable: true,
  },
  permissions: [],
  category: 'utilities',
},
```