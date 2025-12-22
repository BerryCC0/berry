# Berry OS - Styling Guide

> CSS Modules, theming system, and platform-specific styles.

## Core Rules

| Do | Don't |
|----|-------|
| Use CSS Modules exclusively | Use Tailwind |
| Use CSS custom properties for theming | Use inline styles |
| Create platform-specific CSS files | Use CSS-in-JS (styled-components, emotion) |
| Use semantic class names | Use utility classes |
| Keep styles co-located with components | Create global style dumps |

---

## CSS Modules

Every component has its own CSS Module file. Styles are scoped to the component automatically.

### File Structure

```
ComponentName/
├── ComponentName.tsx
├── ComponentName.desktop.module.css    # Desktop styles
├── ComponentName.tablet.module.css     # Tablet styles (optional)
├── ComponentName.mobile.module.css     # Mobile + Farcaster styles
└── ComponentName.module.css            # Shared base styles (optional)
```

### Basic Usage

```typescript
// ComponentName.tsx
import styles from './ComponentName.desktop.module.css';

const ComponentName = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Hello</h1>
      <button className={styles.button}>Click me</button>
    </div>
  );
};
```

```css
/* ComponentName.desktop.module.css */
.container {
  padding: 16px;
  background: var(--berry-bg);
}

.title {
  font-size: 18px;
  color: var(--berry-text);
}

.button {
  padding: 8px 16px;
  background: var(--berry-button-primary-bg);
  color: var(--berry-button-primary-text);
  border: var(--berry-button-border-width) solid var(--berry-button-border);
  border-radius: var(--berry-button-border-radius);
}

.button:hover {
  opacity: var(--berry-button-hover-opacity);
}
```

### Naming Conventions

```css
/* Use camelCase for class names */
.windowContainer { }    /* ✓ Good */
.window-container { }   /* ✗ Avoid */
.WindowContainer { }    /* ✗ Avoid */

/* Use descriptive names */
.titleBar { }           /* ✓ Good */
.tb { }                 /* ✗ Too short */
.theMainTitleBarDiv { } /* ✗ Too long */

/* State modifiers */
.button { }
.buttonActive { }       /* ✓ Good */
.button.active { }      /* ✗ Avoid (composition issues) */
```

---

## Platform-Specific Styles

Berry OS loads different stylesheets based on the detected platform.

### Platform Style Files

| Platform | File suffix | When used |
|----------|-------------|-----------|
| Desktop | `.desktop.module.css` | Screen ≥ 1025px |
| Tablet | `.tablet.module.css` | Screen 768-1024px with touch |
| Mobile | `.mobile.module.css` | Screen < 768px |
| Farcaster | `.mobile.module.css` | Farcaster miniapp context |

### Loading Platform Styles

```typescript
// Automatic platform style loading
import { usePlatform } from '@/OS/lib/PlatformDetection';
import desktopStyles from './Window.desktop.module.css';
import mobileStyles from './Window.mobile.module.css';

const Window = () => {
  const { type } = usePlatform();
  
  // Farcaster uses mobile styles
  const styles = (type === 'mobile' || type === 'farcaster') 
    ? mobileStyles 
    : desktopStyles;
  
  return <div className={styles.window}>...</div>;
};
```

### Shared Base Styles

For styles that don't change across platforms, use a base file:

```
Window/
├── Window.module.css           # Shared base (colors, fonts)
├── Window.desktop.module.css   # Desktop-specific (layout, sizes)
└── Window.mobile.module.css    # Mobile-specific (layout, touch)
```

```typescript
import baseStyles from './Window.module.css';
import platformStyles from './Window.desktop.module.css';

// Merge styles (platform overrides base)
const styles = { ...baseStyles, ...platformStyles };
```

### Platform Differences

| Aspect | Desktop | Mobile/Farcaster |
|--------|---------|------------------|
| Touch targets | 32px minimum | 44px minimum |
| Font size | 12-14px | 14-16px |
| Spacing | 8px grid | 12px grid |
| Hover states | Yes | No |
| Window chrome | Full (title bar, resize handles) | Minimal (title bar only) |

---

## Theme System

Berry OS uses CSS custom properties for theming. All colors, sizes, and visual properties come from theme variables.

### Theme Variables

```css
/* Applied to :root by ThemeProvider */
:root {
  /* Window chrome */
  --berry-window-title-bar: #CCCCCC;
  --berry-window-title-bar-active: #FFFFFF;
  --berry-window-border: #000000;
  --berry-window-border-width: 1px;
  --berry-window-corner-radius: 0px;
  --berry-window-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  
  /* Desktop */
  --berry-desktop-bg: #008080;
  --berry-desktop-icon-size: 64px;
  --berry-desktop-icon-spacing: 16px;
  
  /* Dock */
  --berry-dock-bg: #EEEEEE;
  --berry-dock-size: 64px;
  --berry-dock-icon-size: 48px;
  
  /* Menu bar */
  --berry-menubar-bg: #FFFFFF;
  --berry-menubar-height: 28px;
  --berry-menubar-text: #000000;
  
  /* Typography */
  --berry-font-system: 'Chicago', 'Courier New', monospace;
  --berry-font-size: 12px;
  --berry-text: #000000;
  --berry-text-secondary: #666666;
  
  /* Buttons */
  --berry-button-primary-bg: #0000FF;
  --berry-button-primary-text: #FFFFFF;
  --berry-button-border-radius: 4px;
  --berry-button-border-width: 1px;
  --berry-button-border: #000000;
  --berry-button-hover-opacity: 0.8;
  
  /* Colors */
  --berry-primary: #0000FF;
  --berry-secondary: #CCCCCC;
  --berry-accent: #FF00FF;
  --berry-success: #00FF00;
  --berry-warning: #FFAA00;
  --berry-error: #FF0000;
  --berry-bg: #FFFFFF;
  --berry-bg-secondary: #EEEEEE;
  --berry-border: #000000;
  
  /* Scrollbars */
  --berry-scrollbar-width: 16px;
  --berry-scrollbar-track: #EEEEEE;
  --berry-scrollbar-thumb: #999999;
  
  /* Animations */
  --berry-transition-speed: 0.1s;
  --berry-easing: linear;
}
```

### Using Theme Variables

Always use CSS variables instead of hardcoded values:

```css
/* ✓ Good - uses theme variables */
.window {
  background: var(--berry-bg);
  border: var(--berry-window-border-width) solid var(--berry-window-border);
  border-radius: var(--berry-window-corner-radius);
  box-shadow: var(--berry-window-shadow);
}

.button {
  background: var(--berry-button-primary-bg);
  color: var(--berry-button-primary-text);
  transition: opacity var(--berry-transition-speed) var(--berry-easing);
}

/* ✗ Bad - hardcoded values */
.window {
  background: #FFFFFF;
  border: 1px solid black;
  border-radius: 0;
}
```

### Theme Interface

```typescript
// /src/OS/types/theme.ts
interface Theme {
  id: string;
  name: string;
  preset: 'classic' | 'dark' | 'light' | 'custom';
  
  windowChrome: {
    titleBarColor: string;
    titleBarColorActive: string;
    borderColor: string;
    borderWidth: number;
    cornerRadius: number;
    shadowColor: string;
    shadowBlur: number;
  };
  
  desktop: {
    backgroundColor: string;
    wallpaper?: string;
    iconSize: 'small' | 'medium' | 'large';
    iconSpacing: number;
  };
  
  dock: {
    backgroundColor: string;
    size: number;
    iconSize: number;
    position: 'bottom' | 'left' | 'right';
  };
  
  menuBar: {
    backgroundColor: string;
    textColor: string;
    height: number;
  };
  
  typography: {
    systemFont: string;
    fontSize: number;
  };
  
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    textSecondary: string;
    background: string;
    backgroundSecondary: string;
    border: string;
  };
  
  buttons: {
    primaryBackground: string;
    primaryText: string;
    borderRadius: number;
    borderWidth: number;
    borderColor: string;
  };
}
```

### Built-in Themes

**Classic (Default)**
- Authentic Mac OS 8 look
- Teal desktop, gray windows
- Black borders, no rounded corners
- Chicago font

**Dark**
- Modern dark mode
- Dark gray backgrounds
- Subtle rounded corners
- System font stack

**Light**
- Clean, modern light theme
- White backgrounds
- Subtle shadows
- System font stack

### Theme Provider

```typescript
// /src/OS/lib/ThemeProvider.tsx
const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { currentTheme } = useThemeStore();
  
  useEffect(() => {
    const cssVars = themeToCSSVariables(currentTheme);
    const root = document.documentElement;
    
    Object.entries(cssVars).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }, [currentTheme]);
  
  return <>{children}</>;
};
```

---

## Mac OS 8 Aesthetic

Berry OS recreates the Mac OS 8 visual style. Here's how to achieve it:

### Window Chrome

```css
.window {
  background: var(--berry-bg);
  border: 1px solid var(--berry-border);
  box-shadow: 
    1px 1px 0 var(--berry-border),
    inset -1px -1px 0 #888888,
    inset 1px 1px 0 #FFFFFF;
}

.titleBar {
  height: 20px;
  background: linear-gradient(
    to bottom,
    #FFFFFF 0%,
    #CCCCCC 50%,
    #999999 100%
  );
  border-bottom: 1px solid var(--berry-border);
  display: flex;
  align-items: center;
  padding: 0 4px;
}

.titleBarActive {
  background: linear-gradient(
    to right,
    #000000 0%,
    #CCCCCC 2px,
    #000000 4px,
    #CCCCCC 6px,
    /* Pinstripe pattern continues */
  );
}

.closeButton {
  width: 12px;
  height: 12px;
  background: #FFFFFF;
  border: 1px solid #000000;
  box-shadow: inset -1px -1px 0 #888888;
}
```

### Classic Scrollbars

```css
.scrollbar {
  width: var(--berry-scrollbar-width);
  background: var(--berry-scrollbar-track);
  border-left: 1px solid var(--berry-border);
}

.scrollbarThumb {
  background: var(--berry-scrollbar-thumb);
  border: 1px solid var(--berry-border);
  box-shadow: 
    inset -1px -1px 0 #666666,
    inset 1px 1px 0 #FFFFFF;
}

.scrollbarArrow {
  width: 16px;
  height: 16px;
  background: #CCCCCC;
  border: 1px solid var(--berry-border);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Buttons

```css
.button {
  padding: 4px 12px;
  background: #CCCCCC;
  border: 1px solid var(--berry-border);
  border-radius: 4px;
  box-shadow: 
    inset -1px -1px 0 #666666,
    inset 1px 1px 0 #FFFFFF;
  font-family: var(--berry-font-system);
  font-size: var(--berry-font-size);
}

.button:active {
  background: #AAAAAA;
  box-shadow: 
    inset 1px 1px 0 #666666,
    inset -1px -1px 0 #FFFFFF;
}

.buttonPrimary {
  background: var(--berry-button-primary-bg);
  color: var(--berry-button-primary-text);
  border: 2px solid var(--berry-border);
}
```

### Desktop Pattern

```css
.desktop {
  background-color: var(--berry-desktop-bg);
  /* Classic stippled pattern */
  background-image: 
    linear-gradient(45deg, #006666 25%, transparent 25%),
    linear-gradient(-45deg, #006666 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #006666 75%),
    linear-gradient(-45deg, transparent 75%, #006666 75%);
  background-size: 2px 2px;
}
```

### Icons

```css
.icon {
  width: var(--berry-desktop-icon-size);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.iconImage {
  width: 32px;
  height: 32px;
  image-rendering: pixelated; /* Crisp pixel art */
}

.iconLabel {
  font-family: var(--berry-font-system);
  font-size: 10px;
  color: var(--berry-text);
  text-shadow: 1px 1px 0 var(--berry-bg);
  text-align: center;
  max-width: 64px;
}

.iconSelected .iconLabel {
  background: var(--berry-primary);
  color: var(--berry-button-primary-text);
}
```

---

## Responsive Design

### Breakpoints

```css
/* Mobile first, then enhance for larger screens */

/* Base: Mobile (< 768px) */
.container {
  padding: 12px;
}

/* Tablet (768px - 1024px) */
@media (min-width: 768px) {
  .container {
    padding: 16px;
  }
}

/* Desktop (> 1024px) */
@media (min-width: 1025px) {
  .container {
    padding: 8px;
  }
}
```

### Touch Targets

```css
/* Desktop: Smaller targets, hover states */
.button {
  min-height: 28px;
  min-width: 28px;
}

.button:hover {
  background: var(--berry-primary-hover);
}

/* Mobile: Larger targets, no hover */
/* In .mobile.module.css */
.button {
  min-height: 44px;
  min-width: 44px;
}

/* No hover state - handled by active */
.button:active {
  background: var(--berry-primary-hover);
}
```

### Window Behavior

```css
/* Desktop: Floating windows */
/* In .desktop.module.css */
.window {
  position: absolute;
  width: auto;
  height: auto;
  /* Can be dragged, resized */
}

/* Mobile: Fullscreen windows */
/* In .mobile.module.css */
.window {
  position: fixed;
  top: var(--berry-menubar-height);
  left: 0;
  right: 0;
  bottom: var(--berry-dock-size);
  width: 100%;
  height: auto;
  border-radius: 0;
  /* No drag, no resize */
}
```

---

## Global Styles

Global styles live in `/styles/globals.css` and are minimal:

```css
/* /styles/globals.css */

/* Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Root variables (default theme) */
:root {
  --berry-window-title-bar: #CCCCCC;
  --berry-desktop-bg: #008080;
  /* ... all theme variables ... */
}

/* Font faces */
@font-face {
  font-family: 'Chicago';
  src: url('/fonts/Chicago.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Geneva';
  src: url('/fonts/Geneva.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

/* Base body styles */
body {
  font-family: var(--berry-font-system);
  font-size: var(--berry-font-size);
  color: var(--berry-text);
  background: var(--berry-desktop-bg);
  overflow: hidden; /* Prevent body scroll */
  -webkit-font-smoothing: none; /* Crisp pixel fonts */
}

/* Selection */
::selection {
  background: var(--berry-primary);
  color: var(--berry-button-primary-text);
}

/* Focus outline */
:focus-visible {
  outline: 2px solid var(--berry-primary);
  outline-offset: 2px;
}

/* Scrollbar styling (Webkit) */
::-webkit-scrollbar {
  width: var(--berry-scrollbar-width);
  height: var(--berry-scrollbar-width);
}

::-webkit-scrollbar-track {
  background: var(--berry-scrollbar-track);
}

::-webkit-scrollbar-thumb {
  background: var(--berry-scrollbar-thumb);
  border: 1px solid var(--berry-border);
}
```

---

## Common Patterns

### Conditional Classes

```typescript
import styles from './Component.module.css';

// Using template literals
<div className={`${styles.button} ${isActive ? styles.buttonActive : ''}`}>

// Using array join
<div className={[
  styles.button,
  isActive && styles.buttonActive,
  isDisabled && styles.buttonDisabled
].filter(Boolean).join(' ')}>

// Using a utility (optional)
import { cn } from '@/lib/utils';
<div className={cn(styles.button, isActive && styles.buttonActive)}>
```

### CSS Composition

```css
/* Base button styles */
.button {
  padding: 8px 16px;
  border-radius: var(--berry-button-border-radius);
  font-family: var(--berry-font-system);
  cursor: pointer;
}

/* Variants compose base */
.buttonPrimary {
  composes: button;
  background: var(--berry-button-primary-bg);
  color: var(--berry-button-primary-text);
}

.buttonSecondary {
  composes: button;
  background: var(--berry-secondary);
  color: var(--berry-text);
}
```

### Z-Index Scale

```css
/* Define z-index scale in globals or theme */
:root {
  --z-desktop: 0;
  --z-window: 100;
  --z-window-focused: 200;
  --z-modal: 1000;
  --z-dropdown: 1100;
  --z-tooltip: 1200;
  --z-dock: 1300;
  --z-menubar: 1400;
  --z-notification: 1500;
}
```

### Animation Patterns

```css
/* Use theme transition speed */
.button {
  transition: 
    background var(--berry-transition-speed) var(--berry-easing),
    transform var(--berry-transition-speed) var(--berry-easing);
}

/* Respect reduce motion preference */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Window open animation */
.windowEnter {
  animation: windowOpen 0.15s var(--berry-easing);
}

@keyframes windowOpen {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

---

## Checklist

When creating a new component:

- [ ] Created `.desktop.module.css`
- [ ] Created `.mobile.module.css`
- [ ] Using CSS variables for all colors/sizes
- [ ] Touch targets ≥ 44px on mobile
- [ ] No hover states on mobile
- [ ] Class names are camelCase
- [ ] No hardcoded colors or sizes
- [ ] Tested with Classic and Dark themes
- [ ] Respects `prefers-reduced-motion`