# Berry OS - System Settings

> User-customizable preferences and system configuration.

## Overview

The System Settings app allows users to personalize their Berry OS experience. Settings are persisted per-wallet in the Neon database (see [PERSISTENCE.md](./PERSISTENCE.md)).

---

## Settings Categories

### Appearance

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| Theme | Built-in themes, Custom themes | Berry Classic | Color scheme and styling |
| Accent Color | Preset colors or custom hex | Nouns Red (#E93737) | UI accent color |
| Wallpaper | Preset images or custom URL | Classic Teal | Desktop background |
| Window Style | Classic, Modern | Classic | Window chrome appearance |
| Desktop Icon Size | Small, Medium, Large | Medium | Icon size on desktop |
| Font Size | Small, Default, Large | Default | System-wide text size |
| Reduce Motion | On, Off | Off | Minimize animations |
| Reduce Transparency | On, Off | Off | Solid backgrounds instead of blur |

#### Built-in Themes

| Theme | Description |
|-------|-------------|
| Berry Classic | Light theme with classic Mac OS feel |
| Berry Dark | Dark mode variant |
| Nouns | Nouns brand colors (red, yellow, teal) |
| Nouns Dark | Dark Nouns variant |
| Midnight | Deep blue/purple dark theme |
| Paper | Minimal, high-contrast light theme |

#### Custom Themes

Users can create and save custom themes:

```typescript
interface CustomTheme {
  id: string;
  name: string;
  author?: string;
  
  colors: {
    // Backgrounds
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    
    // Text
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    
    // Accent
    accent: string;
    accentHover: string;
    accentActive: string;
    
    // Window chrome
    windowBg: string;
    windowBorder: string;
    titleBarBg: string;
    titleBarText: string;
    
    // Controls
    buttonBg: string;
    buttonText: string;
    inputBg: string;
    inputBorder: string;
    
    // Dock
    dockBg: string;
    dockBorder: string;
    
    // Menu bar
    menuBarBg: string;
    menuBarText: string;
    
    // Semantic
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  
  // Optional overrides
  borderRadius?: 'none' | 'small' | 'medium' | 'large';
  fontFamily?: string;
  windowShadow?: string;
}
```

#### Theme Editor

The Settings app includes a visual theme editor:
- Live preview as you customize
- Color picker for each token
- Import/export themes as JSON
- Share themes via URL

```typescript
// Theme stored in database
CREATE TABLE custom_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) NOT NULL,
  name VARCHAR(100) NOT NULL,
  theme JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

// Index for public theme gallery
CREATE INDEX idx_custom_themes_public ON custom_themes(is_public, created_at DESC);
```

### Desktop & Dock

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| Show Desktop Icons | On, Off | On | Display app icons on desktop |
| Desktop Icon Grid | Compact, Normal, Spacious | Normal | Desktop icon spacing |
| Dock Position | Bottom, Left, Right | Bottom | Where the dock appears |
| Dock Auto-hide | On, Off | Off | Hide dock until hover |

**Note:** Dock size and icon scaling are controlled by direct manipulation (drag to resize) and persisted automatically. See [PERSISTENCE.md](./PERSISTENCE.md).

### Windows

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| Show Window Shadows | On, Off | On | Drop shadows on windows |
| Snap to Edges | On, Off | On | Windows snap to screen edges |
| Snap Threshold | 10px - 50px | 20px | Distance to trigger snap |
| Remember Window Positions | On, Off | On | Restore window layout on reload |
| Max Open Windows | 10 - 50 | 20 | Limit simultaneous windows |

**Note:** Double-clicking the title bar always minimizes the window (classic Mac OS behavior).

### Notifications

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| Enable Notifications | On, Off | On | Show system notifications |
| Notification Position | Top-right, Top-left, Bottom-right, Bottom-left | Top-right | Where notifications appear |
| Notification Duration | 3s, 5s, 10s, Persistent | 5s | How long notifications display |
| Sound Effects | On, Off | Off | Play notification sounds |

**See [NOTIFICATIONS.md](./NOTIFICATIONS.md) for the full notification system architecture.**

### Privacy & Data

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| Remember Connected Wallet | On, Off | On | Auto-reconnect on return |
| Clear Data on Disconnect | On, Off | Off | Wipe local data when disconnecting |
| ENS Resolution | On, Off | On | Resolve ENS names for addresses |

### Accessibility

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| High Contrast | On, Off | Off | Increase color contrast |
| Large Click Targets | On, Off | Off | Bigger interactive elements |
| Keyboard Navigation | On, Off | On | Full keyboard support |
| Screen Reader Hints | On, Off | On | Enhanced ARIA labels |
| Focus Indicators | Default, Enhanced | Default | Visibility of focus rings |

---

## Settings Schema

```typescript
// /src/types/settings.ts

interface SystemSettings {
  // Appearance
  appearance: {
    themeId: string; // Built-in theme ID or custom theme UUID
    accentColor: string;
    wallpaper: string;
    windowStyle: 'classic' | 'modern';
    desktopIconSize: 'small' | 'medium' | 'large';
    fontSize: 'small' | 'default' | 'large';
    reduceMotion: boolean;
    reduceTransparency: boolean;
  };
  
  // Desktop & Dock
  desktop: {
    showIcons: boolean;
    iconGridSize: 'compact' | 'normal' | 'spacious';
    dockPosition: 'bottom' | 'left' | 'right';
    dockAutoHide: boolean;
  };
  
  // Windows
  windows: {
    showShadows: boolean;
    snapToEdges: boolean;
    snapThreshold: number;
    rememberPositions: boolean;
    maxOpenWindows: number;
  };
  
  // Notifications
  notifications: {
    enabled: boolean;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    duration: number; // milliseconds
    soundEffects: boolean;
  };
  
  // Privacy
  privacy: {
    rememberWallet: boolean;
    clearDataOnDisconnect: boolean;
    ensResolution: boolean;
  };
  
  // Accessibility
  accessibility: {
    highContrast: boolean;
    largeClickTargets: boolean;
    keyboardNavigation: boolean;
    screenReaderHints: boolean;
    focusIndicators: 'default' | 'enhanced';
  };
}
```

---

## Default Settings

```typescript
// /src/lib/settings/defaults.ts

export const DEFAULT_SETTINGS: SystemSettings = {
  appearance: {
    themeId: 'berry-classic',
    accentColor: '#E93737',
    wallpaper: '/wallpapers/classic-teal.png',
    windowStyle: 'classic',
    desktopIconSize: 'medium',
    fontSize: 'default',
    reduceMotion: false,
    reduceTransparency: false,
  },
  
  desktop: {
    showIcons: true,
    iconGridSize: 'normal',
    dockPosition: 'bottom',
    dockAutoHide: false,
  },
  
  windows: {
    showShadows: true,
    snapToEdges: true,
    snapThreshold: 20,
    rememberPositions: true,
    maxOpenWindows: 20,
  },
  
  notifications: {
    enabled: true,
    position: 'top-right',
    duration: 5000,
    soundEffects: false,
  },
  
  privacy: {
    rememberWallet: true,
    clearDataOnDisconnect: false,
    ensResolution: true,
  },
  
  accessibility: {
    highContrast: false,
    largeClickTargets: false,
    keyboardNavigation: true,
    screenReaderHints: true,
    focusIndicators: 'default',
  },
};

// Built-in themes
export const BUILT_IN_THEMES = {
  'berry-classic': {
    id: 'berry-classic',
    name: 'Berry Classic',
    colors: { /* ... */ },
  },
  'berry-dark': {
    id: 'berry-dark',
    name: 'Berry Dark',
    colors: { /* ... */ },
  },
  'nouns': {
    id: 'nouns',
    name: 'Nouns',
    colors: { /* ... */ },
  },
  'nouns-dark': {
    id: 'nouns-dark',
    name: 'Nouns Dark',
    colors: { /* ... */ },
  },
  'midnight': {
    id: 'midnight',
    name: 'Midnight',
    colors: { /* ... */ },
  },
  'paper': {
    id: 'paper',
    name: 'Paper',
    colors: { /* ... */ },
  },
} as const;
```

---

## Settings Store

```typescript
// /src/stores/settingsStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SETTINGS } from '@/lib/settings/defaults';

interface SettingsStore {
  settings: SystemSettings;
  
  // Update a single setting
  setSetting: <K extends keyof SystemSettings>(
    category: K,
    key: keyof SystemSettings[K],
    value: SystemSettings[K][keyof SystemSettings[K]]
  ) => void;
  
  // Update entire category
  setCategory: <K extends keyof SystemSettings>(
    category: K,
    values: Partial<SystemSettings[K]>
  ) => void;
  
  // Reset to defaults
  resetSettings: () => void;
  resetCategory: (category: keyof SystemSettings) => void;
  
  // Import/export
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      
      setSetting: (category, key, value) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [category]: {
              ...state.settings[category],
              [key]: value,
            },
          },
        }));
      },
      
      setCategory: (category, values) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [category]: {
              ...state.settings[category],
              ...values,
            },
          },
        }));
      },
      
      resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS });
      },
      
      resetCategory: (category) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [category]: DEFAULT_SETTINGS[category],
          },
        }));
      },
      
      exportSettings: () => {
        return JSON.stringify(get().settings, null, 2);
      },
      
      importSettings: (json) => {
        try {
          const imported = JSON.parse(json);
          // TODO: Validate with Zod schema
          set({ settings: { ...DEFAULT_SETTINGS, ...imported } });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'berry-settings',
      // Only persist to localStorage for ephemeral users
      // Connected users sync to Neon database
    }
  )
);
```

---

## Applying Settings

### Theme

```typescript
// /src/lib/settings/applyTheme.ts

export function applyTheme(settings: SystemSettings['appearance']) {
  const root = document.documentElement;
  
  // Determine effective theme
  let theme = settings.theme;
  if (theme === 'system') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? 'dark' 
      : 'light';
  }
  
  // Set theme class
  root.classList.remove('theme-light', 'theme-dark');
  root.classList.add(`theme-${theme}`);
  
  // Set accent color
  root.style.setProperty('--accent-color', settings.accentColor);
  
  // Set font size
  const fontSizes = { small: '14px', default: '16px', large: '18px' };
  root.style.setProperty('--base-font-size', fontSizes[settings.fontSize]);
  
  // Reduce motion
  if (settings.reduceMotion) {
    root.classList.add('reduce-motion');
  } else {
    root.classList.remove('reduce-motion');
  }
  
  // Reduce transparency
  if (settings.reduceTransparency) {
    root.classList.add('reduce-transparency');
  } else {
    root.classList.remove('reduce-transparency');
  }
}
```

### CSS Variables

```css
/* /src/styles/settings.css */

:root {
  /* Defaults - overridden by JS */
  --accent-color: #E93737;
  --base-font-size: 16px;
}

/* Reduce motion */
.reduce-motion,
.reduce-motion * {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}

/* Reduce transparency */
.reduce-transparency .window-chrome,
.reduce-transparency .dock,
.reduce-transparency .menu-bar {
  backdrop-filter: none !important;
  background-color: var(--bg-solid) !important;
}

/* High contrast */
.high-contrast {
  --border-color: #000;
  --text-color: #000;
  --bg-color: #fff;
}

.theme-dark.high-contrast {
  --border-color: #fff;
  --text-color: #fff;
  --bg-color: #000;
}

/* Enhanced focus indicators */
.enhanced-focus *:focus-visible {
  outline: 3px solid var(--accent-color) !important;
  outline-offset: 2px !important;
}

/* Large click targets */
.large-click-targets button,
.large-click-targets [role="button"],
.large-click-targets a {
  min-height: 44px;
  min-width: 44px;
}
```

---

## Settings App UI

```typescript
// /src/OS/Apps/Settings/index.tsx

const SettingsApp = () => {
  const { settings, setSetting, resetCategory } = useSettingsStore();
  const [activeSection, setActiveSection] = useState('appearance');
  
  const sections = [
    { id: 'appearance', label: 'Appearance', icon: 'palette' },
    { id: 'desktop', label: 'Desktop & Dock', icon: 'desktop' },
    { id: 'windows', label: 'Windows', icon: 'window' },
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { id: 'privacy', label: 'Privacy & Data', icon: 'shield' },
    { id: 'accessibility', label: 'Accessibility', icon: 'accessibility' },
  ];
  
  return (
    <div className={styles.settings}>
      <nav className={styles.sidebar}>
        {sections.map((section) => (
          <button
            key={section.id}
            className={activeSection === section.id ? styles.active : ''}
            onClick={() => setActiveSection(section.id)}
          >
            <Icon name={section.icon} />
            {section.label}
          </button>
        ))}
      </nav>
      
      <main className={styles.content}>
        {activeSection === 'appearance' && (
          <AppearanceSettings 
            settings={settings.appearance}
            onChange={(key, value) => setSetting('appearance', key, value)}
            onReset={() => resetCategory('appearance')}
          />
        )}
        {/* Other sections... */}
      </main>
    </div>
  );
};
```

---

## Database Sync

For connected users, settings sync to Neon:

```typescript
// /src/lib/settings/sync.ts

export async function syncSettingsToDatabase(
  walletAddress: string,
  settings: SystemSettings
) {
  await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, settings }),
  });
}

export async function loadSettingsFromDatabase(
  walletAddress: string
): Promise<SystemSettings | null> {
  const response = await fetch(`/api/settings?wallet=${walletAddress}`);
  if (!response.ok) return null;
  return response.json();
}
```

```sql
-- Settings table
CREATE TABLE user_settings (
  wallet_address VARCHAR(42) PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Platform-Specific Defaults

Some settings have different defaults based on platform:

```typescript
// /src/lib/settings/platformDefaults.ts

import { getPlatform } from '@/lib/platform';

export function getPlatformDefaults(): Partial<SystemSettings> {
  const platform = getPlatform();
  
  switch (platform) {
    case 'MOBILE':
      return {
        desktop: {
          ...DEFAULT_SETTINGS.desktop,
          dockPosition: 'bottom',
          dockAutoHide: false,
          showIcons: false, // Use app drawer on mobile
        },
        windows: {
          ...DEFAULT_SETTINGS.windows,
          maxOpenWindows: 10,
          snapToEdges: false, // Full screen on mobile
        },
      };
      
    case 'FARCASTER':
      return {
        desktop: {
          ...DEFAULT_SETTINGS.desktop,
          showIcons: false,
          dockAutoHide: true,
        },
        notifications: {
          ...DEFAULT_SETTINGS.notifications,
          enabled: false, // Farcaster handles notifications
        },
      };
      
    default:
      return {};
  }
}
```

---

## Testing Checklist

- [ ] All settings persist across page reload
- [ ] Settings sync to database for connected users
- [ ] Theme changes apply immediately
- [ ] Reduce motion disables all animations
- [ ] Reduce transparency removes blur effects
- [ ] High contrast mode meets WCAG AA
- [ ] Settings export/import works correctly
- [ ] Reset to defaults works per-category and globally
- [ ] Platform-specific defaults apply correctly
- [ ] Settings UI is keyboard navigable