# Berry OS - Mobile & Touch

> Touch interactions, gestures, and responsive design.

## Platform Differences

| Feature | Desktop | Mobile/Farcaster |
|---------|---------|------------------|
| Windows | Floating, draggable, resizable | Fullscreen only |
| Touch targets | 28px minimum | 44px minimum |
| Hover states | Yes | No |
| Context menu | Right-click | Long press |
| Text selection | Click + drag | Long press |
| Scrolling | Scroll wheel, scrollbars | Touch scroll |
| Window switching | Click window, dock | Dock only |

---

## Window Behavior

### Desktop
- Windows float freely on desktop
- Can drag by title bar
- Can resize by edges/corners
- Multiple visible windows
- Click to focus

### Mobile
- Windows take full available space
- No drag or resize
- One window visible at a time
- Minimized windows hidden
- Switch via dock

```css
/* Desktop: Floating windows */
/* Window.desktop.module.css */
.window {
  position: absolute;
  border: 1px solid var(--berry-border);
  border-radius: var(--berry-window-corner-radius);
  box-shadow: var(--berry-window-shadow);
}

/* Mobile: Fullscreen windows */
/* Window.mobile.module.css */
.window {
  position: fixed;
  top: var(--berry-menubar-height);
  left: 0;
  right: 0;
  bottom: var(--berry-dock-size);
  border: none;
  border-radius: 0;
  box-shadow: none;
}
```

---

## Touch Targets

All interactive elements must be at least 44x44 pixels on mobile.

```css
/* Desktop button */
/* Button.desktop.module.css */
.button {
  min-height: 28px;
  min-width: 60px;
  padding: 4px 12px;
}

/* Mobile button */
/* Button.mobile.module.css */
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}
```

### Touch Target Checklist

- [ ] Buttons: 44px minimum
- [ ] Menu items: 44px height
- [ ] Dock icons: 44px minimum
- [ ] Desktop icons: 64px+ (already large)
- [ ] Window controls: 44px tap area
- [ ] Scrollbar (if visible): 44px wide

---

## Gestures

### Supported Gestures

| Gesture | Action |
|---------|--------|
| Tap | Click/select |
| Long press (500ms) | Context menu |
| Swipe (in lists) | Scroll |
| Pull down (at top) | Refresh (if applicable) |

### Gestures NOT Used

To avoid conflicts with device gestures:
- No edge swipes (conflicts with back gesture)
- No swipe up from bottom (conflicts with home gesture)
- No pinch zoom (except in media viewer)

### Implementation

```typescript
// Long press for context menu
const useLongPress = (callback: () => void, delay = 500) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const start = useCallback(() => {
    timeoutRef.current = setTimeout(callback, delay);
  }, [callback, delay]);
  
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);
  
  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
  };
};

// Usage
const DesktopIcon = ({ onContextMenu }) => {
  const longPressProps = useLongPress(onContextMenu);
  
  return (
    <div {...longPressProps}>
      {/* icon content */}
    </div>
  );
};
```

---

## Menu Bar (Mobile)

On mobile, the menu bar transforms:

### Desktop Menu Bar
- Apple menu on left
- App menus in center
- Clock + wallet on right
- Full width, always visible

### Mobile Menu Bar
- Hamburger menu on left (opens drawer)
- App title in center
- Clock + wallet on right
- Compact height

```typescript
// MenuBar.tsx
const MenuBar = () => {
  const { type } = usePlatform();
  
  if (type === 'mobile' || type === 'farcaster') {
    return <MobileMenuBar />;
  }
  
  return <DesktopMenuBar />;
};

// MobileMenuBar.tsx
const MobileMenuBar = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  return (
    <>
      <div className={styles.menuBar}>
        <button 
          className={styles.hamburger}
          onClick={() => setIsDrawerOpen(true)}
        >
          ☰
        </button>
        <span className={styles.appTitle}>{currentAppTitle}</span>
        <div className={styles.right}>
          <WalletButton />
          <Clock />
        </div>
      </div>
      
      {isDrawerOpen && (
        <MenuDrawer onClose={() => setIsDrawerOpen(false)} />
      )}
    </>
  );
};
```

---

## Dock (Mobile)

Mobile dock is always visible at bottom:

```css
/* Dock.mobile.module.css */
.dock {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--berry-dock-size);
  background: var(--berry-dock-bg);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 8px;
  /* Safe area for devices with home indicator */
  padding-bottom: max(8px, env(safe-area-inset-bottom));
}

.dockIcon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## Desktop Icons (Mobile)

On mobile, desktop icons are larger and spaced further apart:

```css
/* DesktopIcon.mobile.module.css */
.icon {
  width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px;
}

.iconImage {
  width: 48px;
  height: 48px;
}

.iconLabel {
  font-size: 12px;
  text-align: center;
}
```

---

## Scrolling

### Custom Scrollbars (Desktop)
Mac OS 8 style scrollbars on desktop.

### Native Scrolling (Mobile)
Use native touch scrolling on mobile. Hide custom scrollbars.

```css
/* Desktop: Custom scrollbars */
/* Scrollable.desktop.module.css */
.scrollable {
  overflow: auto;
}

.scrollable::-webkit-scrollbar {
  width: var(--berry-scrollbar-width);
}

.scrollable::-webkit-scrollbar-thumb {
  background: var(--berry-scrollbar-thumb);
}

/* Mobile: Native scrolling */
/* Scrollable.mobile.module.css */
.scrollable {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.scrollable::-webkit-scrollbar {
  display: none;
}
```

---

## Safe Areas

Handle device notches and home indicators:

```css
/* globals.css */
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}

/* MenuBar accounts for notch */
.menuBar {
  padding-top: var(--safe-area-top);
}

/* Dock accounts for home indicator */
.dock {
  padding-bottom: max(8px, var(--safe-area-bottom));
}
```

---

## Orientation

Handle orientation changes:

```typescript
// PlatformDetection.ts includes orientation
interface PlatformInfo {
  // ...
  orientation: 'portrait' | 'landscape';
}

// Components can respond
const Desktop = () => {
  const { orientation } = usePlatform();
  
  return (
    <div className={orientation === 'landscape' ? styles.landscape : styles.portrait}>
      {/* ... */}
    </div>
  );
};
```

---

## Keyboard on Mobile

Handle virtual keyboard:

```typescript
// Detect keyboard
const useKeyboardVisible = () => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      // Viewport height decreases when keyboard opens
      const isKeyboard = window.innerHeight < window.screen.height * 0.75;
      setIsVisible(isKeyboard);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return isVisible;
};

// Hide dock when keyboard visible
const Dock = () => {
  const isKeyboardVisible = useKeyboardVisible();
  
  if (isKeyboardVisible) return null;
  
  return <div className={styles.dock}>{/* ... */}</div>;
};
```

---

## Testing Mobile

### Checklist

- [ ] Test on actual mobile device (not just simulator)
- [ ] Test touch targets (can you tap accurately?)
- [ ] Test long press (context menu appears?)
- [ ] Test scrolling (smooth?)
- [ ] Test orientation change
- [ ] Test with keyboard open
- [ ] Test safe areas (notch, home indicator)
- [ ] Test in Farcaster app (if applicable)

### Device Testing

**iOS:**
- Safari on iPhone
- Farcaster (Warpcast) app

**Android:**
- Chrome on Android phone
- Farcaster (Warpcast) app

### Browser DevTools

1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select device preset or set custom dimensions
4. Test touch events with mouse

Note: Actual device testing is essential. DevTools doesn't catch all issues.