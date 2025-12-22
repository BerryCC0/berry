# Berry OS - AI Assistant Guide

> **Read this first.** This is your index to the Berry OS codebase.

## What is Berry OS?

Berry OS is a **Mac OS 8 recreation** built for the web. It's not an emulator running actual Mac software—it's a from-scratch recreation of the classic Macintosh experience using modern web technologies, built specifically for the **Nouns ecosystem** with Web3 integration.

**Runs on:** Web, Mobile, Farcaster Miniapp  
**Built with:** Next.js 15+, TypeScript, Zustand, CSS Modules  
**Deployed to:** Vercel

## Quick Facts

| What | Answer |
|------|--------|
| Styling | CSS Modules only. No Tailwind. No inline styles. No CSS-in-JS. |
| State | Zustand stores. No Redux. No Context for global state. |
| Routing | Next.js App Router. Client-side navigation. No page reloads. |
| Platform styles | Separate CSS files per platform (`.desktop.module.css`, `.mobile.module.css`) |
| File naming | PascalCase for all files (`Window.tsx`, `EventBus.ts`) |
| TypeScript | Strict. No `any` types. Use `unknown` with type guards. |
| Testing | Lightweight. Manual checklists + optional unit tests for business logic. |

## Project Structure

```
berry-os/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout + providers
│   ├── page.tsx              # Desktop entry point
│   └── api/                  # API routes
├── src/
│   ├── OS/                   # System layer (Toolbox)
│   │   ├── components/       # Window, MenuBar, Desktop, Dock
│   │   ├── store/            # Zustand stores
│   │   ├── lib/              # EventBus, WindowManager, IconRegistry, Persistence
│   │   ├── Apps/             # OS-level apps (Finder, Calculator, Settings)
│   │   └── types/            # System types
│   └── Apps/                 # User applications
│       ├── AppConfig.ts      # App registry
│       └── [AppName]/        # Individual apps
├── public/
│   ├── filesystem/           # Virtual filesystem (read-only)
│   ├── icons/                # App and system icons
│   └── fonts/                # Chicago, Geneva
├── styles/
│   └── globals.css           # CSS variables, base styles
└── docs/                     # You are here
```

## Documentation Index

| Document | What it covers |
|----------|----------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System overview, stores, event bus, platform detection |
| [STYLING.md](./STYLING.md) | CSS Modules, theming system, platform-specific styles |
| [APPS.md](./APPS.md) | App structure, registration, lifecycle, permissions |
| [WINDOW_MANAGEMENT.md](./WINDOW_MANAGEMENT.md) | Window system, z-index, dragging, mobile behavior |
| [PERSISTENCE.md](./PERSISTENCE.md) | Storage strategy, wallet identity, data flow |
| [STATE_SERIALIZATION.md](./STATE_SERIALIZATION.md) | Structuring serializable state, versioning, migrations |
| [FILESYSTEM.md](./FILESYSTEM.md) | Virtual filesystem, Finder integration |
| [WEB3.md](./WEB3.md) | Wallet connection, multi-wallet identity |
| [ROUTING.md](./ROUTING.md) | Deep linking, URL structure, share links |
| [MOBILE.md](./MOBILE.md) | Touch interactions, gestures, responsive design |
| [FARCASTER.md](./FARCASTER.md) | Miniapp integration, launching other miniapps |
| [NOUNS.md](./NOUNS.md) | Nouns contracts, Goldsky subgraph, governance |
| [SECURITY.md](./SECURITY.md) | Input sanitization, XSS prevention, wallet security |
| [PERFORMANCE.md](./PERFORMANCE.md) | Bundle size, re-renders, memory management |
| [PHASES.md](./PHASES.md) | Implementation roadmap, current status |

## Core Principles

1. **Authenticity** - Look and feel like Mac OS 8, but don't pretend to be it
2. **Separation of concerns** - Business logic in `/utils`, presentation in `.tsx`
3. **Platform-aware** - Same codebase, different experiences per platform
4. **Privacy-first** - No tracking. Wallet only used as persistence key.
5. **Graceful degradation** - Works without wallet (ephemeral session)
6. **Crash isolation** - One app crash doesn't kill the OS

## Before You Code

### Starting a new feature?

1. Check which phase it belongs to → [PHASES.md](./PHASES.md)
2. Read the relevant architecture doc
3. Understand the data flow before writing code
4. Ask questions if unclear

### Creating a new component?

1. Use PascalCase: `ComponentName.tsx`
2. Create platform-specific CSS: `ComponentName.desktop.module.css`, etc.
3. Use CSS variables from theme system
4. Add to appropriate location (`/OS/components/` or `/Apps/[AppName]/`)

### Creating a new app?

1. Read [APPS.md](./APPS.md) for structure requirements
2. Decide: OS App (always available) or User App (lazy loaded)
3. Register in appropriate config file
4. Follow the app directory structure exactly

### Debugging issues?

1. Check browser console for errors
2. Check event bus logs (development mode)
3. Verify store state in React DevTools
4. Step back and trace the data flow

## Common Patterns

### Platform-specific styling
```typescript
// Component loads correct CSS based on platform
import { usePlatform } from '@/OS/lib/PlatformDetection';
import desktopStyles from './Component.desktop.module.css';
import mobileStyles from './Component.mobile.module.css';

const Component = () => {
  const { type } = usePlatform();
  const styles = type === 'mobile' || type === 'farcaster' 
    ? mobileStyles 
    : desktopStyles;
  
  return <div className={styles.container}>...</div>;
};
```

### Event bus communication
```typescript
// System components use SystemBus
import { systemBus } from '@/OS/lib/EventBus';
systemBus.emit('window:focused', { windowId: 'win-123' });

// Apps use BridgeBus (read-only system events)
import { bridgeBus } from '@/OS/lib/EventBus';
bridgeBus.on('theme:changed', (theme) => updateAppTheme(theme));
```

### Launching apps
```typescript
import { appLauncher } from '@/OS/lib/AppLauncher';

// Launch app
appLauncher.launch('calculator');

// Launch with initial state
appLauncher.launch('media-viewer', { 
  initialState: { filePath: '/Pictures/photo.jpg' } 
});
```

### Persistence (wallet-aware)
```typescript
import { persistence } from '@/OS/lib/Persistence';

// Automatically uses correct adapter (memory vs database)
await persistence.saveTheme(theme);
const savedTheme = await persistence.loadTheme();
```

### Icons (centralized registry)
```typescript
import { getIcon, getIconForFile } from '@/OS/lib/IconRegistry';

// Get icon by ID (apps, system)
const icon = getIcon('finder');           // "/icons/finder.svg"

// Get icon for file type
const fileIcon = getIconForFile('photo.jpg', 'image/jpeg');

// Use in app config
const appConfig = {
  icon: getIcon('my-app'),  // Not hardcoded path
};
```

## What NOT to Do

| Don't | Do instead |
|-------|------------|
| Use inline styles | Use CSS Modules |
| Use Tailwind classes | Use CSS Modules with variables |
| Use `any` type | Use `unknown` with type guards |
| Put business logic in components | Extract to `/utils/helpers/` |
| Import across apps directly | Use event bus or app launcher |
| Use localStorage | Use persistence layer |
| Assume wallet is connected | Check and handle gracefully |
| Skip reading docs | Read relevant doc before implementing |

## Getting Help

- **Unclear about architecture?** → Read the relevant doc, then ask
- **Bug you can't figure out?** → Trace the data flow from source to symptom
- **Feature seems too complex?** → It probably is. Simplify.
- **Not sure where code goes?** → Ask before creating new directories

## Current Status

**Phase:** Foundation (nothing built yet)  
**Next milestone:** Basic desktop with window system  
**See:** [PHASES.md](./PHASES.md) for full roadmap

---

**Remember:** Berry OS is a recreation, not an emulator. We're building something that *feels* like Mac OS 8 using modern web tech. When in doubt, prioritize user experience over technical purity.