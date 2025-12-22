# Berry OS - Implementation Phases

> Development roadmap and current status.

## Current Status

**Phase:** 0 - Foundation  
**Status:** Not started  
**Last Updated:** December 2024

---

## Phase Overview

| Phase | Name | Status | Description |
|-------|------|--------|-------------|
| 0 | Foundation | 🔴 Not Started | Project setup, stores, event bus |
| 1 | Desktop Shell | 🔴 Not Started | Desktop, windows, menu bar, dock |
| 2 | OS Apps | 🔴 Not Started | Finder, Calculator, Settings |
| 3 | Persistence | 🔴 Not Started | Wallet connection, database |
| 4 | Theming | 🔴 Not Started | Theme system, customization UI |
| 5 | User Apps | 🔴 Not Started | Text Editor, Media Viewer |
| 6 | Farcaster | 🔴 Not Started | Miniapp integration |
| 7 | Nouns | 🔴 Not Started | Nouns ecosystem apps |
| 8 | Polish | 🔴 Not Started | Animations, accessibility, bugs |

---

## Phase 0: Foundation

**Goal:** Project scaffolding and core infrastructure.

### Tasks

- [ ] Initialize Next.js 16+ with TypeScript
- [ ] Configure Vercel deployment
- [ ] Set up directory structure per ARCHITECTURE.md
- [ ] Remove Tailwind, configure CSS Modules
- [ ] Add Chicago/Geneva fonts
- [ ] Create `/styles/globals.css` with theme variables
- [ ] Set up path aliases in `tsconfig.json`

**Stores:**
- [ ] Create `windowStore.ts` skeleton
- [ ] Create `themeStore.ts` skeleton
- [ ] Create `sessionStore.ts` skeleton
- [ ] Create `desktopStore.ts` skeleton

**Libraries:**
- [ ] Implement `EventBus.ts` (System, App, Bridge buses)
- [ ] Implement `PlatformDetection.ts` with context provider
- [ ] Implement `AppLauncher.ts` skeleton

**Types:**
- [ ] Define `window.ts` types
- [ ] Define `events.ts` types
- [ ] Define `theme.ts` types
- [ ] Define `platform.ts` types
- [ ] Define `app.ts` types

### Validation

- [ ] `npm run dev` works
- [ ] Vercel preview deployment works
- [ ] Platform detected correctly (desktop/mobile)
- [ ] Event bus emits and receives events
- [ ] CSS variables applied to root

### Deliverables

```
app/
├── layout.tsx         # PlatformProvider, basic setup
├── page.tsx           # "Berry OS Loading..." placeholder
└── globals.css        # Theme variables

src/OS/
├── store/
│   ├── windowStore.ts
│   ├── themeStore.ts
│   ├── sessionStore.ts
│   └── desktopStore.ts
├── lib/
│   ├── EventBus.ts
│   └── PlatformDetection.ts
└── types/
    ├── window.ts
    ├── events.ts
    ├── theme.ts
    └── platform.ts
```

---

## Phase 1: Desktop Shell

**Goal:** Render the basic OS UI.

### Tasks

**Desktop:**
- [ ] Create `Desktop` component (container)
- [ ] Implement desktop background with theme variable
- [ ] Create `DesktopIcon` component
- [ ] Implement icon grid layout
- [ ] Implement icon drag and drop
- [ ] Implement icon click to launch app

**Window:**
- [ ] Create `Window` component with Mac OS 8 chrome
- [ ] Implement title bar (drag handle)
- [ ] Implement close/minimize/maximize buttons
- [ ] Implement window dragging
- [ ] Implement window resizing (desktop only)
- [ ] Implement window focus (z-index management)
- [ ] Implement minimized state
- [ ] Create `AppErrorBoundary` wrapper

**Menu Bar:**
- [ ] Create `MenuBar` component
- [ ] Implement Apple menu (About, Settings)
- [ ] Implement app-specific menus (placeholder)
- [ ] Implement clock display
- [ ] Implement wallet button (placeholder)

**Dock:**
- [ ] Create `Dock` component
- [ ] Show running apps with indicators
- [ ] Show pinned apps
- [ ] Click to focus/launch
- [ ] Minimized windows appear in dock

**Mobile:**
- [ ] Create mobile variants (fullscreen windows)
- [ ] Implement hamburger menu for MenuBar
- [ ] Implement mobile dock (compact)

### Validation

- [ ] Desktop renders with background
- [ ] Icons display and can be dragged
- [ ] Windows open, drag, resize, close
- [ ] Window focus brings to front
- [ ] Menu bar displays and menus open
- [ ] Dock shows running apps
- [ ] Mobile layout works correctly

### Deliverables

```
src/OS/components/
├── Desktop/
│   ├── Desktop.tsx
│   ├── Desktop.desktop.module.css
│   ├── Desktop.mobile.module.css
│   └── components/
│       └── DesktopIcon.tsx
├── Window/
│   ├── Window.tsx
│   ├── Window.desktop.module.css
│   ├── Window.mobile.module.css
│   └── components/
│       ├── TitleBar.tsx
│       └── WindowControls.tsx
├── MenuBar/
│   ├── MenuBar.tsx
│   └── components/
│       ├── AppleMenu.tsx
│       └── Clock.tsx
└── Dock/
    ├── Dock.tsx
    └── components/
        └── DockIcon.tsx
```

---

## Phase 2: OS Apps

**Goal:** Core OS applications.

### Tasks

**Finder:**
- [ ] Create `Finder` app
- [ ] Implement virtual filesystem (`Filesystem.ts`)
- [ ] Display files/folders from `/public/filesystem/`
- [ ] Implement folder navigation
- [ ] Implement icon view
- [ ] Implement list view
- [ ] Double-click opens files/folders
- [ ] Context menu (right-click/long-press)

**Calculator:**
- [ ] Create `Calculator` app
- [ ] Basic arithmetic operations
- [ ] Classic Mac calculator styling
- [ ] Keyboard input support

**About Berry OS:**
- [ ] Create `AboutBerryOS` modal
- [ ] Display version, credits
- [ ] Berry OS branding (no Apple references)

**System Settings (placeholder):**
- [ ] Create `SystemSettings` modal
- [ ] Placeholder panels for future settings

**App Config:**
- [ ] Create `OSAppConfig.ts` with all OS apps
- [ ] Implement `AppLauncher` fully

### Validation

- [ ] Finder opens from desktop icon
- [ ] Finder displays filesystem contents
- [ ] Can navigate folders in Finder
- [ ] Calculator performs calculations
- [ ] About Berry OS shows info
- [ ] Apps launch from dock and desktop

### Deliverables

```
src/OS/
├── Apps/
│   ├── OSAppConfig.ts
│   ├── Finder/
│   ├── Calculator/
│   ├── AboutBerryOS/
│   └── SystemSettings/
└── lib/
    ├── Filesystem.ts
    └── AppLauncher.ts
```

---

## Phase 3: Persistence

**Goal:** Wallet connection and data persistence.

### Tasks

**Web3 Setup:**
- [ ] Install Reown AppKit
- [ ] Configure wallet connection (EVM, Solana)
- [ ] Create `WalletPanel` OS app
- [ ] Add wallet button to MenuBar
- [ ] Implement wallet connection flow

**Database:**
- [ ] Set up Neon Postgres
- [ ] Create database schema (profiles, wallets, user data)
- [ ] Implement `NeonAdapter`
- [ ] Implement `InMemoryAdapter`
- [ ] Implement `PersistenceManager`

**Session:**
- [ ] Implement `sessionStore` fully
- [ ] Multi-wallet profile support
- [ ] Ephemeral → persistent upgrade flow
- [ ] Session restoration on page load

**Auto-save:**
- [ ] Implement debounced saves
- [ ] Save on visibility change
- [ ] Save window states
- [ ] Save desktop layout

### Validation

- [ ] Wallet connects successfully
- [ ] Profile created on first connect
- [ ] Data persists across refresh (with wallet)
- [ ] Data lost on refresh (without wallet)
- [ ] Multiple wallets can link to profile
- [ ] Session restores on reconnect

### Deliverables

```
src/OS/
├── Apps/
│   └── WalletPanel/
├── lib/
│   └── Persistence.ts
└── store/
    └── sessionStore.ts (complete)

app/
├── layout.tsx (+ Web3Provider)
└── api/
    └── ... (if needed)
```

---

## Phase 4: Theming

**Goal:** Theme customization system.

### Tasks

**Theme System:**
- [ ] Define `Theme` interface with all properties
- [ ] Create built-in themes (Classic, Dark, Light)
- [ ] Implement `ThemeProvider`
- [ ] Theme → CSS variables mapping
- [ ] Theme persistence

**Settings UI:**
- [ ] Build theme panel in System Settings
- [ ] Preset theme selection
- [ ] Color pickers for customization
- [ ] Preview changes live
- [ ] Save/reset buttons

**Wallpapers:**
- [ ] Built-in wallpaper selection
- [ ] Apply wallpaper to desktop

### Validation

- [ ] Themes switch correctly
- [ ] All components use theme variables
- [ ] Custom themes save and load
- [ ] Wallpapers apply to desktop

### Deliverables

```
src/OS/
├── lib/
│   └── ThemeProvider.tsx
├── store/
│   └── themeStore.ts (complete)
└── Apps/
    └── SystemSettings/
        └── components/
            └── ThemePanel.tsx

styles/
└── globals.css (complete theme variables)
```

---

## Phase 5: User Apps

**Goal:** First user-space applications.

### Tasks

**Text Editor:**
- [ ] Create `TextEditor` app
- [ ] Basic text editing
- [ ] Open files from Finder
- [ ] File associations setup

**Media Viewer:**
- [ ] Create `MediaViewer` app
- [ ] Display images
- [ ] Open from Finder

**App Config:**
- [ ] Create `AppConfig.ts` for user apps
- [ ] Lazy loading setup
- [ ] File associations working

### Validation

- [ ] Text Editor opens and edits text
- [ ] Double-click .txt opens Text Editor
- [ ] Media Viewer displays images
- [ ] Double-click .jpg opens Media Viewer

### Deliverables

```
src/Apps/
├── AppConfig.ts
├── TextEditor/
└── MediaViewer/
```

---

## Phase 6: Farcaster

**Goal:** Farcaster miniapp integration.

### Tasks

- [ ] Implement Farcaster SDK detection
- [ ] Handle miniapp context
- [ ] Adapt UI for Farcaster frame size
- [ ] Implement miniapp launching (other apps)
- [ ] Test in Warpcast

### Validation

- [ ] Berry OS loads in Farcaster
- [ ] Context detected correctly
- [ ] UI adapts to frame
- [ ] Can launch other miniapps

### Deliverables

```
src/OS/lib/
└── FarcasterIntegration.ts

docs/
└── FARCASTER.md
```

---

## Phase 7: Nouns

**Goal:** Nouns ecosystem applications.

### Tasks

**Proposal Editor:**
- [ ] Create Nouns Proposal Editor app
- [ ] Draft proposals
- [ ] Save drafts to database
- [ ] Preview formatting

**Auction Viewer:**
- [ ] Create Auction Viewer app
- [ ] Display current auction
- [ ] Historical auctions

**Integration:**
- [ ] Nouns subgraph queries
- [ ] Contract interactions (read-only initially)

### Validation

- [ ] Proposal Editor creates drafts
- [ ] Drafts persist across sessions
- [ ] Auction Viewer shows live data

### Deliverables

```
src/Apps/Nouns/
├── ProposalEditor/
└── AuctionViewer/

app/lib/Nouns/
├── Goldsky/
└── Contracts/
```

---

## Phase 8: Polish

**Goal:** Refinement and quality.

### Tasks

**Animations:**
- [ ] Window open/close animations
- [ ] Minimize/restore animations
- [ ] Menu transitions
- [ ] Respect prefers-reduced-motion

**Accessibility:**
- [ ] Keyboard navigation
- [ ] Focus management
- [ ] ARIA labels
- [ ] Screen reader testing

**Performance:**
- [ ] Profile and optimize
- [ ] Lazy load heavy components
- [ ] Optimize re-renders

**Bugs:**
- [ ] Fix reported issues
- [ ] Cross-browser testing
- [ ] Mobile device testing

### Validation

- [ ] Animations smooth, disable-able
- [ ] Keyboard-only navigation works
- [ ] No console errors
- [ ] Performance acceptable on mobile

---

## Future Phases (Post-MVP)

- **Deep Linking:** URL-based app state
- **Notifications:** Desktop notification system
- **Shortcuts:** Keyboard shortcuts
- **Clipboard:** Cross-app clipboard
- **Sound:** System sounds
- **NFT Themes:** Mintable custom themes
- **App Store:** User-installable apps

---

## Development Workflow

### Starting a Phase

1. Review phase requirements
2. Read relevant documentation
3. Set up any new dependencies
4. Create directory structure
5. Implement incrementally
6. Test each feature
7. Validate all checkboxes

### Completing a Phase

1. All validation checkboxes pass
2. Code reviewed
3. Documentation updated
4. Deployed to preview
5. Manual testing complete
6. Move to next phase

### If Stuck

1. Re-read relevant docs
2. Check existing code for patterns
3. Simplify the approach
4. Ask for clarification
5. Don't over-engineer