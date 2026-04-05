# Berry OS Design System Specification

## Vision

Berry OS's design system is a **love letter to Apple's design history**. Each theme faithfully recreates a specific era of Apple's Human Interface Guidelines — from the 1-bit pixel simplicity of 1984 through the translucent Liquid Glass of 2025. The theme system isn't just cosmetic; it's the product differentiator. Every theme is a time capsule: accurate in typography, chrome, materials, spacing, and interaction feel.

Beneath the era-specific surface, a shared architectural backbone ensures that all themes remain accessible, performant, and internally consistent. The HIG's 11 foundational principles (1987) apply universally regardless of which era is active.

---

## Architecture

### Design Token Layers

The system uses three token layers:

1. **Universal tokens** — Shared across all themes. Spacing scale, z-index scale, breakpoints, accessibility minimums, animation timing functions. These never change between themes.

2. **Era tokens** — Theme-specific values that define the visual character of each era. Colors, gradients, border radii, shadows, typography, window chrome, button treatments. These are what make Platinum look different from Aqua.

3. **Semantic tokens** — Functional mappings (e.g., `--berry-interactive`, `--berry-destructive`, `--berry-surface`) that resolve to different era token values depending on the active theme. App developers target semantic tokens; the theme system resolves them.

### Mapping to Current Code

The existing `CustomTheme` interface in `types/settings.ts` maps to era tokens. The proposed changes extend this system rather than replacing it:

```
CustomTheme.colors     → era tokens (colors)
CustomTheme.borderRadius → era tokens (geometry)
CustomTheme.fontFamily   → era tokens (typography)
CustomTheme.windowShadow → era tokens (depth)
```

**New fields needed on `CustomTheme`:**

```typescript
interface CustomTheme {
  // ... existing fields ...

  // Era identification (new)
  era?: EraId;

  // Extended era tokens (new)
  typography?: {
    systemFont: string;
    monoFont?: string;
    headingFont?: string;
    baseFontSize: number;       // px
    menuFontSize: number;       // px
    titleFontSize: number;      // px
    fontSmoothing: 'auto' | 'antialiased' | 'none';
  };

  windowChrome?: {
    titleBarHeight: number;     // px
    titleBarGradient?: string;  // CSS gradient or solid
    trafficLightStyle: 'boxes' | 'circles-flat' | 'circles-gel' | 'circles-glass';
    trafficLightSize: number;   // px
    borderStyle: 'solid' | 'bevel-outset' | 'bevel-inset' | 'none';
    shadowStyle: 'hard' | 'soft' | 'elevated' | 'glass' | 'none';
    resizeHandleStyle: 'lines' | 'corner' | 'invisible';
  };

  dock?: {
    style: 'shelf' | 'glass' | 'flat' | 'none';
    backdropBlur?: number;      // px, 0 = no blur
    magnification: boolean;
    reflections: boolean;       // Aqua-era dock floor reflection
  };

  menuBar?: {
    transparency: number;       // 0-1
    backdropBlur?: number;      // px
    separator: 'line' | 'shadow' | 'none';
  };

  materials?: {
    // For Aqua/Liquid Glass eras
    glassOpacity?: number;      // 0-1
    glassBlur?: number;         // px
    glassRefraction?: boolean;
    // For skeuomorphic eras
    texture?: string;           // CSS background-image for linen/leather/pinstripe
  };

  animations?: {
    transitionDuration: number; // ms, base duration
    easing: string;             // CSS easing function
    enableBounce: boolean;      // Aqua-era bounce effects
    enableGenie: boolean;       // Minimize genie effect
  };
}
```

**New `windowStyle` enum expansion** on `AppearanceSettings`:

```typescript
windowStyle: 'system1' | 'system7' | 'platinum' | 'aqua' | 'skeuomorphic' | 'flat' | 'big-sur' | 'liquid-glass';
```

This replaces the current binary `'classic' | 'modern'` with era-specific window rendering modes. Each mode activates a different CSS class that controls the chrome rendering logic.

---

## Universal Tokens (Shared Across All Themes)

These values are constants. They do not change between themes.

### Spacing Scale

Based on an 8pt grid (HIG standard since iOS 7):

| Token | Value | Usage |
|-------|-------|-------|
| `--space-0` | 0px | Reset |
| `--space-1` | 4px | Tight padding, icon-to-label gap |
| `--space-2` | 8px | Default inner padding, compact gaps |
| `--space-3` | 12px | Standard component padding |
| `--space-4` | 16px | Section padding, iPhone horizontal margins |
| `--space-5` | 24px | Card padding, group gaps |
| `--space-6` | 32px | Section gaps |
| `--space-7` | 48px | Major section separation |
| `--space-8` | 64px | Page-level spacing |

### Z-Index Scale (unchanged)

| Token | Value | Layer |
|-------|-------|-------|
| `--z-desktop` | 0 | Desktop background |
| `--z-window` | 100 | Unfocused windows |
| `--z-window-focused` | 200 | Focused window |
| `--z-modal` | 1000 | Modal dialogs |
| `--z-dropdown` | 1100 | Dropdown menus |
| `--z-tooltip` | 1200 | Tooltips |
| `--z-dock` | 1300 | Dock |
| `--z-menubar` | 1400 | Menu bar |

### Breakpoints

| Token | Value | Context |
|-------|-------|---------|
| `--bp-mobile` | 480px | Phone portrait |
| `--bp-tablet` | 768px | Tablet / phone landscape |
| `--bp-desktop` | 1024px | Desktop minimum |
| `--bp-wide` | 1440px | Wide desktop |

### Accessibility Minimums (Non-Negotiable)

These override theme values when accessibility settings are active:

| Constraint | Value | Source |
|-----------|-------|--------|
| Min touch target | 44×44px | HIG (all eras) |
| Min text contrast | 4.5:1 (AA) | WCAG 2.1 |
| Min large text contrast | 3:1 (AA) | WCAG 2.1 |
| Min focus ring | 2px solid | HIG + WCAG |
| Min body text | 11px (captions only) | HIG |
| Recommended body text | 16–17px | HIG (modern eras) |
| Max animation duration | 500ms | HIG |
| Reduce motion | `prefers-reduced-motion` | System |

### Animation Timing Functions

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-default` | `cubic-bezier(0.25, 0.1, 0.25, 1.0)` | Standard transitions |
| `--ease-in` | `cubic-bezier(0.42, 0, 1.0, 1.0)` | Elements leaving |
| `--ease-out` | `cubic-bezier(0, 0, 0.58, 1.0)` | Elements entering |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1.0)` | Bouncy (Aqua era) |
| `--ease-glass` | `cubic-bezier(0.2, 0.8, 0.2, 1.0)` | Liquid Glass transitions |

---

## Era Themes

### Overview

| # | Theme ID | Era Name | Apple Era | Years | Character |
|---|----------|----------|-----------|-------|-----------|
| 1 | `system1` | System 1 | Original Macintosh | 1984–1990 | 1-bit monochrome, pixel art, Susan Kare icons |
| 2 | `platinum` | Platinum | Mac OS 8–9 | 1997–2001 | Beveled 3D, Charcoal font, metallic grays |
| 3 | `aqua` | Aqua | Mac OS X 10.0–10.4 | 2001–2006 | Gel buttons, pinstripes, Lucida Grande, lickable |
| 4 | `skeuomorphic` | Rich & Real | iOS 4–6 / OS X Lion | 2010–2013 | Leather, linen, wood, peak texture |
| 5 | `flat` | Clarity | iOS 7 / OS X Yosemite | 2013–2016 | Flat, vibrant, Helvetica Neue → SF Pro |
| 6 | `big-sur` | Rounded | macOS Big Sur–Sonoma | 2020–2024 | Squircles, neumorphism, rounded everything |
| 7 | `liquid-glass` | Liquid Glass | macOS Tahoe / iOS 26 | 2025+ | Translucent refraction, dynamic light, glass layers |

Plus the existing **Nouns** and **Nouns Dark** themes, which use HIG principles but with Nouns DAO branding. These are "custom era" themes — structurally `flat` era but with Nouns colors and personality.

---

### Theme 1: System 1 (1984)

**Design philosophy:** Pixel economy as virtue. Every element is black or white. No gray, no color, no gradients. Susan Kare's bitmap aesthetic. The constraint is the style.

#### Typography
| Property | Value |
|----------|-------|
| System font | `"Chicago", monospace` |
| Base size | 12px |
| Menu/title size | 12px |
| Font smoothing | `none` (preserve bitmap crispness) |
| Line height | 1.4 |

#### Colors
| Token | Value | Notes |
|-------|-------|-------|
| bgPrimary | `#FFFFFF` | Pure white |
| bgSecondary | `#FFFFFF` | No gray in this era |
| bgTertiary | `#FFFFFF` | |
| textPrimary | `#000000` | Pure black |
| textSecondary | `#000000` | No gray text |
| textMuted | `#000000` | |
| accent | `#000000` | Selection = inverse video |
| windowBg | `#FFFFFF` | |
| windowBorder | `#000000` | 1px solid |
| titleBarBg | `#FFFFFF` | White with horizontal stripes pattern when active |
| titleBarText | `#000000` | Centered |
| buttonBg | `#FFFFFF` | |
| buttonText | `#000000` | |
| menuBarBg | `#FFFFFF` | |
| menuBarText | `#000000` | |
| dockBg | `N/A` | No Dock in this era — use minimal shelf or hide |
| success | `#000000` | |
| warning | `#000000` | |
| error | `#000000` | |
| info | `#000000` | |

#### Window Chrome
| Property | Value |
|----------|-------|
| Title bar height | 18px |
| Traffic light style | `boxes` (small close box, zoom box) |
| Traffic light size | 10px |
| Border style | `solid` (1px black) |
| Shadow style | `none` |
| Corner radius | 0px |
| Resize handle | Diagonal line pattern, bottom-right |
| Active window indicator | Horizontal stripes in title bar |

#### Controls
| Property | Value |
|----------|-------|
| Border radius | `none` (0px) — sharp rectangular buttons |
| Button style | 1px black border, white fill, black text, 2–4px rounded corners |
| Default button | Thicker border (2px) |
| Pressed state | Invert colors (black bg, white text) |
| Scrollbar | 16px wide, black arrows, gray thumb, white track |
| Checkbox | Small square, checkmark when active |
| Selection | White text on black background (inverse video) |

#### Dock
The Dock didn't exist in 1984. Options: (a) hide the Dock entirely and use only the menu bar, or (b) render a minimal bottom shelf with 1-bit icon style. Recommend option (b) for usability — a flat white shelf with 1px black top border, no blur, no transparency.

#### Wallpaper
8×8 pixel repeating pattern on white background (faithful to the original Control Panel pattern selector). Default: solid white or classic diagonal crosshatch.

#### CSS Implementation Notes
- Use `image-rendering: pixelated` on icons to preserve bitmap crispness
- Disable font smoothing: `-webkit-font-smoothing: none`
- All transitions: `none` (instantaneous state changes)
- Selection: `::selection { background: #000; color: #fff; }`

---

### Theme 2: Platinum (Mac OS 8) — *Current default, needs refinement*

**Design philosophy:** The sculpted desktop. Every surface has depth through beveled edges — light highlights on top-left, dark shadows on bottom-right. Metallic grays suggest aluminum. The Appearance Manager era.

This is closest to what Berry OS currently ships, but the current implementation mixes Platinum chrome with modern glass Dock/Launchpad. The goal is to make it fully period-accurate.

#### Typography
| Property | Value |
|----------|-------|
| System font | `"Charcoal", "Chicago", "Geneva", sans-serif` |
| Base size | 12px |
| Menu/title size | 12px |
| Font smoothing | `auto` (bitmap at small sizes) |
| Line height | 1.4 |

Note: Charcoal replaced Chicago as the default in Mac OS 8. Chicago should remain available as a user option.

#### Colors
| Token | Value | Notes |
|-------|-------|-------|
| bgPrimary | `#E0E0E0` | Platinum gray — the defining color |
| bgSecondary | `#C0C0C0` | Darker gray for recessed areas |
| bgTertiary | `#F0F0F0` | Lighter gray for raised highlights |
| textPrimary | `#000000` | |
| textSecondary | `#333333` | |
| textMuted | `#808080` | Disabled/grayed state |
| accent | `#3366FF` | Default highlight blue (user-selectable in real OS 8) |
| accentHover | `#2255DD` | |
| accentActive | `#1144BB` | |
| windowBg | `#E0E0E0` | |
| windowBorder | `#808080` | Dark edge of bevel |
| titleBarBg | `linear-gradient(180deg, #E8E8E8 0%, #C0C0C0 100%)` | Subtle gradient |
| titleBarText | `#000000` | Bold, centered |
| buttonBg | `linear-gradient(180deg, #F0F0F0 0%, #D0D0D0 100%)` | Raised bevel |
| buttonText | `#000000` | |
| inputBg | `#FFFFFF` | Recessed (inset bevel) |
| inputBorder | `#808080` | |
| dockBg | `#E0E0E0` | Solid gray, no transparency |
| dockBorder | `#808080` | |
| menuBarBg | `#E0E0E0` | Solid, opaque |
| menuBarText | `#000000` | |
| success | `#008000` | Period-accurate green |
| warning | `#CC8800` | Period-accurate amber |
| error | `#CC0000` | Period-accurate red |
| info | `#0066CC` | Period-accurate blue |

#### Window Chrome
| Property | Value |
|----------|-------|
| Title bar height | 22px |
| Traffic light style | `boxes` (close box left, zoom box right, collapse right) |
| Traffic light size | 12px |
| Border style | `bevel-outset` — light edge top/left (#F0F0F0), dark edge bottom/right (#808080) |
| Shadow style | `hard` — `2px 2px 0 rgba(0,0,0,0.3)` |
| Corner radius | 0px |
| Resize handle | Diagonal lines pattern, bottom-right |

#### Controls — Bevel System
The defining visual feature of Platinum is the **bevel system**:

```css
/* Raised (buttons, title bars) */
.raised {
  border-top: 1px solid #F0F0F0;
  border-left: 1px solid #F0F0F0;
  border-bottom: 1px solid #808080;
  border-right: 1px solid #808080;
  background: linear-gradient(180deg, #E8E8E8, #D0D0D0);
}

/* Pressed (active buttons) — bevels invert */
.pressed {
  border-top: 1px solid #808080;
  border-left: 1px solid #808080;
  border-bottom: 1px solid #F0F0F0;
  border-right: 1px solid #F0F0F0;
  background: linear-gradient(180deg, #C0C0C0, #D0D0D0);
}

/* Recessed (input fields, scroll track) */
.recessed {
  border-top: 1px solid #808080;
  border-left: 1px solid #808080;
  border-bottom: 1px solid #F0F0F0;
  border-right: 1px solid #F0F0F0;
  background: #FFFFFF;
}
```

#### Dock
No Dock existed in Mac OS 8. Same approach as System 1: render a minimal bottom shelf consistent with the era aesthetic. Solid Platinum gray, beveled top edge, no blur, no magnification, no reflections. Icons sit on the shelf without animation.

#### What Needs to Change from Current Berry Classic
1. **Remove** `backdrop-filter: blur()` from the Dock — use solid gray
2. **Remove** frosted glass from Launchpad — use solid Platinum gray with bevel
3. **Add** proper bevel rendering to all buttons (currently using simple gradients without light/dark edge simulation)
4. **Fix** scrollbar to use period-accurate Platinum style (currently too modern)
5. **Switch** default font to Charcoal (currently Chicago — which is System 7 era)
6. **Remove** all CSS transitions from interactive elements (Platinum had instant feedback)

---

### Theme 3: Aqua (Mac OS X)

**Design philosophy:** "So beautiful you want to lick it." Gel buttons, water-droplet surfaces, translucent glass, glossy everything. Pinstripe texture backgrounds. Lucida Grande. The Dock floor reflection. The genie minimize effect.

#### Typography
| Property | Value |
|----------|-------|
| System font | `"Lucida Grande", "Lucida Sans Unicode", sans-serif` |
| Base size | 12px |
| Menu size | 11px |
| Title size | 13px |
| Font smoothing | `antialiased` |
| Line height | 1.5 |

#### Colors
| Token | Value | Notes |
|-------|-------|-------|
| bgPrimary | `#E8E8E8` | Light gray with pinstripe overlay |
| bgSecondary | `#D9D9D9` | Toolbar gradient base |
| bgTertiary | `#F0F0F0` | |
| textPrimary | `#000000` | |
| textSecondary | `#555555` | |
| textMuted | `#999999` | |
| accent | `#2B6EFF` | Aqua blue — the signature color |
| accentHover | `#1E5AD4` | |
| accentActive | `#1048AA` | |
| windowBg | `#E8E8E8` | With pinstripe texture |
| windowBorder | `transparent` | Windows defined by shadow, not borders |
| titleBarBg | `linear-gradient(180deg, #E8E8E8 0%, #CCCCCC 100%)` | |
| titleBarText | `#4A4A4A` | Slightly muted, centered |
| buttonBg | `linear-gradient(180deg, #FFFFFF 0%, #CCCCCC 50%, #B8B8B8 100%)` | Gel button |
| buttonText | `#000000` | |
| inputBg | `#FFFFFF` | With subtle inset shadow |
| inputBorder | `#B0B0B0` | Soft border |
| dockBg | `linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))` | Semi-transparent shelf |
| dockBorder | `rgba(255,255,255,0.5)` | |
| menuBarBg | `rgba(232,232,232,0.85)` | Slightly translucent |
| menuBarText | `#000000` | |
| success | `#28C940` | Traffic light green |
| warning | `#FFBD2E` | Traffic light yellow |
| error | `#FF5F57` | Traffic light red |
| info | `#2B6EFF` | Aqua blue |

#### Window Chrome
| Property | Value |
|----------|-------|
| Title bar height | 22px |
| Traffic light style | `circles-gel` — glossy 3D spheres with highlight/shadow |
| Traffic light size | 12px (rendered as glossy spheres) |
| Border style | `none` — windows defined by drop shadow |
| Shadow style | `soft` — `0 4px 16px rgba(0,0,0,0.25)` |
| Corner radius | 6px (top corners only) |
| Resize handle | Diagonal lines in bottom-right corner |
| Pinstripe texture | Fine vertical alternating lines as background |

#### Signature Elements
- **Gel buttons**: Multi-stop gradient with glossy highlight on top half, darker bottom half, subtle inner glow
- **Pinstripe texture**: `repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px)` as window background
- **Drop shadows**: Prominent on active windows, reduced on inactive
- **Brushed metal variant**: Optional toolbar texture for media apps (QuickTime, iTunes style)

#### Dock — Aqua Style
The Aqua Dock is iconic:
- Semi-transparent glass shelf
- Floor reflection below icons (CSS reflection or mirrored gradient)
- Smooth icon magnification on hover (scale 1.0 → 1.3)
- Bounce animation on app launch
- Separator line between apps and utilities
- `backdrop-filter: blur(10px)` (lighter than modern macOS)

#### Animations
| Animation | Duration | Easing |
|-----------|----------|--------|
| Button press | 100ms | ease-out |
| Window open | 250ms | ease-spring (bounce) |
| Window minimize | 500ms | ease-in (genie effect) |
| Dock magnify | 150ms | ease-out |
| Dock bounce | 600ms | ease-spring |
| Menu dropdown | 150ms | ease-out |

---

### Theme 4: Rich & Real (Peak Skeuomorphism, 2010–2013)

**Design philosophy:** Every app is a real-world object. The Calendar is a leather-bound journal. Notes is a yellow legal pad. Game Center is a green felt casino table. Textures are king. Retina displays made it photorealistic.

#### Typography
| Property | Value |
|----------|-------|
| System font | `"Helvetica Neue", "Helvetica", sans-serif` |
| Base size | 14px |
| Menu size | 13px |
| Title size | 17px |
| Font smoothing | `antialiased` |
| Line height | 1.5 |

#### Colors
| Token | Value | Notes |
|-------|-------|-------|
| bgPrimary | `#EFEBE5` | Warm linen undertone |
| bgSecondary | `#E0DCD6` | |
| bgTertiary | `#D6D2CC` | |
| textPrimary | `#1A1A1A` | Near-black, warm |
| textSecondary | `#555555` | |
| textMuted | `#999999` | |
| accent | `#007AFF` | iOS blue |
| windowBg | `#EFEBE5` | With linen texture |
| windowBorder | `#B0A898` | Warm gray border |
| titleBarBg | `linear-gradient(180deg, #E8E4DE 0%, #D6D2CC 100%)` | Warm gradient |
| titleBarText | `#333333` | |
| buttonBg | `linear-gradient(180deg, #FEFEFE 0%, #D8D8D8 50%, #C8C8C8 100%)` | Glossy |
| buttonText | `#333333` | |
| menuBarBg | `rgba(239,235,229,0.92)` | Linen-tinted, slightly transparent |
| menuBarText | `#1A1A1A` | |

#### Window Chrome
| Property | Value |
|----------|-------|
| Title bar height | 22px |
| Traffic light style | `circles-gel` (same as Aqua, refined) |
| Traffic light size | 12px |
| Border style | `solid` with subtle inner shadow |
| Shadow style | `soft` — `0 4px 20px rgba(0,0,0,0.2)` |
| Corner radius | 6px |

#### Signature Elements
- **Linen texture**: `background-image` with subtle woven pattern overlay at low opacity
- **Leather stitching**: Optional header treatment for certain app windows
- **Warm color temperature**: Everything shifted slightly warm compared to Aqua's cool grays
- **Glossy buttons**: Similar to Aqua but with more refined gradients and subtle inner shadows

#### Dock
Same as Aqua era but with refined reflections and slightly more translucent glass. The skeuomorphic era didn't dramatically change the Dock.

---

### Theme 5: Clarity (iOS 7 / Yosemite Flat)

**Design philosophy:** "True simplicity is derived from so much more than just the absence of clutter." Jony Ive's three pillars: Clarity, Deference, Depth. Content is king; chrome gets out of the way. Typography carries the hierarchy. Color is the primary affordance for interactivity.

#### Typography
| Property | Value |
|----------|-------|
| System font | `"SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif` |
| Base size | 14px (13pt SF Pro) |
| Menu size | 13px |
| Title size | 13px (bold weight carries hierarchy) |
| Heading size | 20px+ (SF Pro Display for large text) |
| Font smoothing | `antialiased` |
| Line height | 1.47 |

San Francisco Pro: Use SF Pro Text for sizes ≤19px, SF Pro Display for sizes ≥20px. The optical size axis handles this automatically with variable fonts.

#### Colors
| Token | Value | Notes |
|-------|-------|-------|
| bgPrimary | `#FFFFFF` | Pure white |
| bgSecondary | `#F5F5F5` | Subtle off-white |
| bgTertiary | `#EBEBEB` | |
| textPrimary | `#000000` | |
| textSecondary | `#8E8E93` | iOS system gray |
| textMuted | `#C7C7CC` | |
| accent | `#007AFF` | iOS blue — the *only* interactive color cue |
| accentHover | `#0066DD` | |
| accentActive | `#0055BB` | |
| windowBg | `#FFFFFF` | |
| windowBorder | `transparent` | No visible borders |
| titleBarBg | `#FFFFFF` | Flat, no gradient |
| titleBarText | `#000000` | Left-aligned, no bold |
| buttonBg | `transparent` | Text-only buttons, colored by accent |
| buttonText | `#007AFF` | Interactive = blue |
| inputBg | `#FFFFFF` | |
| inputBorder | `#E0E0E0` | Minimal line border |
| dockBg | `rgba(255,255,255,0.7)` | Translucent with blur |
| dockBorder | `rgba(0,0,0,0.1)` | |
| menuBarBg | `rgba(255,255,255,0.8)` | Translucent |
| menuBarText | `#000000` | |
| success | `#34C759` | SF green |
| warning | `#FF9500` | SF orange |
| error | `#FF3B30` | SF red |
| info | `#5AC8FA` | SF teal |

#### Dark Variant Colors
| Token | Value |
|-------|-------|
| bgPrimary | `#1C1C1E` |
| bgSecondary | `#2C2C2E` |
| bgTertiary | `#3A3A3C` |
| textPrimary | `#FFFFFF` |
| textSecondary | `#8E8E93` |
| windowBg | `#1C1C1E` |
| menuBarBg | `rgba(28,28,30,0.8)` |

#### Window Chrome
| Property | Value |
|----------|-------|
| Title bar height | 22px |
| Traffic light style | `circles-flat` — solid colored circles, no gloss |
| Traffic light size | 12px |
| Border style | `none` |
| Shadow style | `soft` — `0 2px 10px rgba(0,0,0,0.12)` (lighter than Aqua) |
| Corner radius | 6px |
| Toolbar style | Flat, minimal, icon + text buttons |

#### Signature Elements
- **Vibrancy/translucency**: Sidebars and menu bar show blurred content beneath (`backdrop-filter: blur(20px)`)
- **No chrome**: Buttons are text-only (colored by accent). No gradients, no borders, no bevels.
- **Typography hierarchy**: Weight and size carry all hierarchy. Bold = important. Blue = interactive. Gray = secondary.
- **Thin separators**: 0.5px lines (on Retina) or 1px on standard, using `#E0E0E0`
- **Full bleed content**: Content extends edge-to-edge with minimal margins

#### Dock — Flat Style
- Translucent white/dark shelf with backdrop blur (20px)
- Rounded corners (12px radius)
- No reflection, no magnification by default
- Clean, minimal separator
- Subtle hover state (scale 1.05, 100ms)

#### Animations
| Animation | Duration | Easing |
|-----------|----------|--------|
| All transitions | 200–300ms | ease-default |
| No bounce effects | — | — |
| Parallax on tilt | Continuous | linear |

---

### Theme 6: Rounded (Big Sur–Sonoma)

**Design philosophy:** Approachability through roundness. Everything gets softer — bigger corner radii, thicker toolbars, squircle icons. A subtle return of depth through color and shadow (sometimes called neumorphism), but without realistic textures.

#### Typography
| Property | Value |
|----------|-------|
| System font | `"SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif` |
| Base size | 14px |
| Menu size | 13px |
| Title size | 13px (semibold) |
| Heading size | 22px+ |
| Font smoothing | `antialiased` |
| Line height | 1.47 |

#### Colors
| Token | Value | Notes |
|-------|-------|-------|
| bgPrimary | `#FFFFFF` | |
| bgSecondary | `#F5F5F7` | Apple's signature warm off-white |
| bgTertiary | `#E8E8ED` | |
| textPrimary | `#1D1D1F` | Not pure black — slightly warm |
| textSecondary | `#6E6E73` | |
| textMuted | `#AEAEB2` | |
| accent | `#007AFF` | |
| windowBg | `#FFFFFF` | |
| windowBorder | `rgba(0,0,0,0.08)` | Very subtle |
| titleBarBg | `#F6F6F6` | Flat, slightly off-white |
| titleBarText | `#1D1D1F` | |
| buttonBg | `#E5E5EA` | Filled, rounded |
| buttonText | `#1D1D1F` | |
| menuBarBg | `rgba(246,246,246,0.8)` | |
| menuBarText | `#1D1D1F` | |

#### Window Chrome
| Property | Value |
|----------|-------|
| Title bar height | 28px (taller than previous eras) |
| Traffic light style | `circles-flat` |
| Traffic light size | 12px |
| Border style | `none` (defined by shadow + subtle border) |
| Shadow style | `elevated` — `0 4px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)` |
| Corner radius | 10px (all corners) |
| Full-height sidebar | Yes — sidebar extends full window height |

#### Signature Elements
- **Rounded everything**: Buttons 8px radius, cards 12px, windows 10px, Dock 16px
- **Full-height sidebars**: Navigation sidebars extend from top to bottom of window
- **Thicker toolbars**: More generous padding, larger icons
- **Squircle app icons**: All icons forced into rounded-rectangle shape
- **SF Symbols**: Extensive use of Apple's symbol library for all UI icons
- **Vibrancy in sidebars**: Enhanced frosted glass effect

#### Dock — Big Sur Style
- Rounded rectangle (16px radius)
- Frosted glass (`backdrop-filter: blur(20px)`, `rgba(255,255,255,0.6)`)
- Subtle shadow: `0 8px 32px rgba(0,0,0,0.12)`
- Light magnification on hover (scale 1.08)
- No floor reflection

---

### Theme 7: Liquid Glass (macOS Tahoe / 2025+)

**Design philosophy:** The interface is made of glass. Translucent surfaces reveal, distort, and reflect content beneath them. Light interacts dynamically with every surface. Depth comes not from shadows but from optical properties — refraction, reflection, blur. The most technologically ambitious design language Apple has ever shipped.

#### Typography
| Property | Value |
|----------|-------|
| System font | `"SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif` |
| Base size | 14px |
| Menu size | 13px |
| Title size | 13px (semibold) |
| Font smoothing | `antialiased` |
| Line height | 1.47 |

#### Colors
| Token | Value | Notes |
|-------|-------|-------|
| bgPrimary | `#FAFAFA` | Slightly warm |
| bgSecondary | `#F0F0F2` | |
| bgTertiary | `#E5E5EA` | |
| textPrimary | `#1D1D1F` | High contrast against glass |
| textSecondary | `#6E6E73` | |
| textMuted | `#AEAEB2` | |
| accent | `#007AFF` | |
| windowBg | `rgba(255,255,255,0.72)` | **Glass** — translucent |
| windowBorder | `rgba(255,255,255,0.5)` | Glass edge |
| titleBarBg | `rgba(255,255,255,0.6)` | Glass title bar |
| titleBarText | `#1D1D1F` | |
| buttonBg | `rgba(255,255,255,0.5)` | Glass button |
| buttonText | `#1D1D1F` | |
| menuBarBg | `rgba(255,255,255,0.65)` | Glass menu bar |
| menuBarText | `#1D1D1F` | |
| dockBg | `rgba(255,255,255,0.45)` | Most translucent glass |
| dockBorder | `rgba(255,255,255,0.6)` | |

#### Window Chrome
| Property | Value |
|----------|-------|
| Title bar height | 28px |
| Traffic light style | `circles-glass` — floating above glass surface |
| Traffic light size | 12px |
| Border style | `none` — glass edges defined by refraction |
| Shadow style | `glass` — `0 8px 32px rgba(0,0,0,0.08), inset 0 0.5px 0 rgba(255,255,255,0.6)` |
| Corner radius | 12px |
| Glass material | `backdrop-filter: blur(40px) saturate(1.8)` |

#### Materials System
The defining feature of Liquid Glass is the **materials system**:

```css
/* Glass layer — for controls, chrome, containers */
.glass {
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(40px) saturate(1.8);
  -webkit-backdrop-filter: blur(40px) saturate(1.8);
  border: 0.5px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
}

/* Glass layer — dark mode */
.glass-dark {
  background: rgba(30, 30, 30, 0.55);
  backdrop-filter: blur(40px) saturate(1.8);
  border: 0.5px solid rgba(255, 255, 255, 0.1);
}

/* Solid layer — for text areas, content that needs readability */
.solid {
  background: #FFFFFF;
  border-radius: 10px;
}

/* CRITICAL RULE: No glass over text. No nested glass. */
```

**Liquid Glass rules (from HIG):**
1. Glass layers are for controls and chrome, NOT for text content
2. Never nest glass inside glass — it creates visual noise
3. Respect `prefers-reduced-transparency` — fall back to solid
4. Text on glass must maintain 4.5:1 contrast minimum
5. Glass elements should float — use `inset 0 0.5px 0 rgba(255,255,255,0.6)` top highlight

#### Dock — Liquid Glass
- Glass material: `backdrop-filter: blur(40px) saturate(1.8)`
- Background: `rgba(255,255,255,0.35)`
- Border: `0.5px solid rgba(255,255,255,0.5)`
- Radius: 20px
- Magnification on hover (scale 1.1)
- Subtle refraction effect on desktop wallpaper beneath

#### Animations
| Animation | Duration | Easing |
|-----------|----------|--------|
| Window open | 300ms | ease-glass |
| Glass transitions | 250ms | ease-glass |
| Hover states | 150ms | ease-out |
| Interactive refraction | Continuous | — |

---

## The Nouns Skin System

### Philosophy

The Nouns identity isn't another era theme — it's a **layerable skin** that can be applied on top of any era. You should be able to run "Nouns × Platinum," "Nouns × Aqua," or "Nouns × Liquid Glass" and get a coherent experience where the era's chrome and interaction model stay intact but the color palette, accent treatments, and decorative elements become unmistakably Nouns.

The skin is derived from the actual on-chain data — the 238-color descriptor palette and 457 traits — not from an abstract brand guide. Nouns' visual DNA lives in that contract.

### The On-Chain Palette: What It Tells Us

The Nouns descriptor contract contains **238 colors** plus 2 background colors. Analyzing the full palette by hue family reveals the true Nouns color personality:

| Family | Count | Share | Character |
|--------|-------|-------|-----------|
| **Orange** | 53 | 22% | The dominant family. Warm ambers, burnt siennas, bright tangerines. |
| **Red** | 39 | 16% | Hot reds, crimsons, rust tones. Fire energy. |
| **Blue** | 31 | 13% | Deep navies to bright sky blues. Counterbalance to the warmth. |
| **Yellow** | 24 | 10% | Chartreuse to pure gold. The "Nouns Yellow" lives here. |
| **Green** | 22 | 9% | Forest to neon. Less prominent than you'd expect. |
| **Neutral** | 21 | 9% | Grays and desaturated tones. The skeleton. |
| **Pink/Magenta** | 19 | 8% | Hot pinks, fuchsias, mauve. Playful accents. |
| **Near-white** | 12 | 5% | Warm creams, cool lavenders. Backgrounds. |
| **Teal/Cyan** | 11 | 5% | The signature Nouns Teal neighborhood. |
| **Purple** | 5 | 2% | Deep violets. Rare, which makes them special. |

**Key insight:** Nouns is a **warm** palette. Orange+Red+Yellow = **48%** of all colors. The palette skews dramatically toward warm hues — this is the visual DNA. The cool tones (blue, teal, green) provide contrast but don't dominate.

**The two backgrounds** — `#d5d7e1` (Cool: blue-gray) and `#e1d7d5` (Warm: pink-gray) — are subtle complements, not vivid colors. They're designed to let the character art pop.

**Brand colors vs. palette reality:**

| Brand Color | Closest On-Chain Match | Distance |
|------------|----------------------|----------|
| Nouns Red `#E93737` | `#df2c39` | Very close (15) — red is everywhere in the palette |
| Nouns Yellow `#FFEF00` | `#fff006` | Nearly identical (6) — yellow is well-represented |
| Nouns Teal `#00D1C7` | `#26b1f3` | Moderate gap (66) — teal is actually rare on-chain |

This tells us something: the "official" Nouns Red and Yellow are deeply native to the on-chain art. The Teal is more of a brand addition — it's the rarest color family in the actual palette.

### Nouns Skin Color System

Rather than just 3 brand colors, the skin derives a complete semantic palette from the on-chain data:

```typescript
interface NounsSkin {
  // Core brand (the familiar three)
  brand: {
    red: '#E93737';        // Nouns Red — accent, destructive, energy
    yellow: '#FFEF16';     // Nouns Yellow — highlight, warning, optimism
    teal: '#00D1C7';       // Nouns Teal — info, links, calm
  };

  // Extended palette (derived from on-chain color families)
  extended: {
    // Warm spectrum (the dominant 48%)
    ember: '#AE3208';      // Deep burnt orange — used for depth
    tangerine: '#F98F30';  // Bright orange — used for warmth
    gold: '#FFC110';       // Rich gold — used for premium/treasury
    rust: '#903707';       // Dark rust — used for earthy grounding

    // Cool counterpoints
    sky: '#63A0F9';        // Light blue — secondary interactive
    indigo: '#5648ED';     // Deep indigo — tertiary interactive
    mint: '#4BEA69';       // Bright green — success states
    magenta: '#F938D8';    // Hot pink — playful accent

    // Neutrals (from on-chain)
    warmGray: '#807F7E';   // Mid neutral
    coolGray: '#62616D';   // Blue-tinted neutral
    sand: '#C5B9A1';       // The first palette color — warm beige
    cream: '#CFC2AB';      // Light warm neutral
  };

  // Backgrounds (from descriptor contract)
  backgrounds: {
    cool: '#D5D7E1';       // Cool gray-blue (background 0)
    warm: '#E1D7D5';       // Warm gray-pink (background 1)
  };
}
```

### How the Skin Layers onto Eras

The skin replaces **color tokens only** — it never changes typography, border radii, shadow styles, window chrome geometry, or interaction patterns. Those belong to the era.

| Era Token | Skin Override | Notes |
|-----------|--------------|-------|
| `accent` | `brand.red` (#E93737) | The primary interactive color |
| `accentHover` | Darken by 10% (#D62F2F) | |
| `accentActive` | Darken by 20% (#C22727) | |
| `success` | `extended.mint` (#4BEA69) | |
| `warning` | `brand.yellow` (#FFEF16) | |
| `error` | `brand.red` (#E93737) | Same as accent (intentional) |
| `info` | `brand.teal` (#00D1C7) | |
| `menuBarBg` | `brand.red` (#E93737) | Bold brand signal — red menu bar |
| `menuBarText` | `#FFFFFF` | White on red |
| `titleBarBg` | Era-specific but tinted — e.g., Platinum bevel tinted with `backgrounds.warm`, Aqua gel with yellow highlight | |
| Desktop wallpaper | `backgrounds.cool` or `backgrounds.warm` (user choice) | The two canonical Nouns backgrounds |

**Example combinations:**

**Nouns × Platinum:** Beveled gray chrome, but the highlight color is Nouns Red instead of the default blue. Menu bar is solid red with white text. Buttons use Platinum bevels but the default button border glows red. Desktop background is `#E1D7D5` (Warm). Charcoal font.

**Nouns × Aqua:** Gel buttons with a red-tinted gel instead of Aqua blue. Pinstripe background tinted warm. Traffic lights stay RGB (they're iconic). Dock shelf with subtle warm tint. Lucida Grande font.

**Nouns × Liquid Glass:** Glass materials everywhere, but the glass has a warm tint derived from `backgrounds.warm`. Accent elements glow Nouns Red through the glass. Menu bar glass tinted with red at low opacity.

### Traits as UI Elements

The 457 on-chain traits are pixel art at 32×32 resolution. Rather than using them as literal UI chrome, they serve specific decorative roles:

**Glasses as identity signifiers:**
The 24 glasses variants are the most iconic Nouns trait — the signature "Nouns glasses" are recognizable worldwide. These can be used as:
- User avatar frame decoration (the glasses rendered over a user's PFP)
- Empty state illustrations (a pair of glasses looking at a "nothing here" message)
- Loading indicator (glasses with animated reflection)
- App icon accents (each Berry OS app could optionally have a Nouns glasses overlay on its icon when the Nouns skin is active)

**Heads as illustration library:**
The 255 head traits are effectively a CC0 illustration library — aardvarks, bananas, sharks, computers, abstract shapes. These can serve as:
- Empty state art (random head for "no results" or "getting started" screens)
- Achievement/milestone decorations
- Randomized personality touches (each window could have a tiny random head in the corner — opt-in and subtle)

**Bodies as color reference:**
The 35 body colors (bege-bsod, blue-sky, cold, gold, magenta, teal, etc.) map almost 1:1 to accent color options. Instead of abstract color swatches in the Settings palette picker, show the actual Noun body colors with their trait names.

### Skin Implementation

```typescript
// New type: skin that layers on top of any era theme
interface NounsSkinConfig {
  enabled: boolean;

  // Which brand elements to apply
  recolorMenuBar: boolean;     // Red menu bar (default: true)
  recolorAccent: boolean;      // Red accent color (default: true)
  useNounsBackgrounds: boolean; // Warm/Cool backgrounds (default: true)

  // Trait decorations
  glassesOverlayOnIcons: boolean;   // Nouns glasses on app icons (default: false)
  traitEmptyStates: boolean;        // Random traits for empty states (default: true)

  // User's Noun (if they own one)
  ownedNounId?: number;        // Uses this Noun's traits for personalization
  // e.g., their Noun's glasses style becomes the glasses overlay
  // their Noun's body color becomes the accent color
}
```

**Personal Noun integration:** If the connected wallet owns a Noun, the skin can be personalized to that specific Noun's traits. Your Noun's glasses style overlays icons. Your Noun's body color becomes the accent. Your Noun's background (warm or cool) becomes the desktop. This makes the skin feel like *your* Noun is running the OS.

### Dark Mode for Nouns Skin

The warm palette actually works beautifully in dark mode:

| Token | Light | Dark |
|-------|-------|------|
| bgPrimary | `#FFFFFF` | `#1A1412` (warm near-black, not pure #121212) |
| bgSecondary | `backgrounds.warm` (#E1D7D5) | `#2A2220` (warm dark gray) |
| bgTertiary | `backgrounds.cool` (#D5D7E1) | `#3A3230` (warm mid-gray) |
| accent | `brand.red` | `brand.red` (stays vivid) |
| menuBarBg | `brand.red` (#E93737) | `#1A1412` with red bottom border |
| textPrimary | `#1A1412` | `#F9E8DD` (warm near-white from the palette) |
| textSecondary | `extended.warmGray` | `#C5B9A1` (sand — the first palette color) |

The key to dark Nouns: **warm blacks, not cool blacks.** The neutral grays should always lean warm, matching the on-chain palette's personality. `#1A1412` instead of `#121212`. `#2A2220` instead of `#1E1E1E`.

### The "My Noun" Desktop Wallpaper

When the Nouns skin is active and the user has connected a wallet holding a Noun, offer to render their Noun as a centered desktop wallpaper — the 32×32 pixel art scaled up with `image-rendering: pixelated` against the warm or cool background. The SVG rendering already exists via `renderNounSVG()`.

This is the most personal possible wallpaper: your on-chain identity, rendered faithfully from contract data, as the foundation of your desktop.

---

## Cross-Cutting Concerns

### Accessibility

Every era theme must pass these checks regardless of historical accuracy:

1. **Contrast**: All text must meet WCAG AA (4.5:1). If a historically accurate color fails this, adjust the text color to pass while keeping the background faithful.

2. **Touch targets**: When `largeClickTargets` is enabled, all interactive elements expand to 44×44px minimum, regardless of era. The visual appearance can stay small (e.g., 12px traffic lights) but the hit area must be 44px.

3. **Reduce motion**: When active, all `transition` and `animation` properties resolve to `0.01ms`. No bouncing, no genie effects, no parallax.

4. **Reduce transparency**: When active, all `backdrop-filter` values resolve to `none`, and all `rgba()` backgrounds resolve to their opaque equivalents. Liquid Glass falls back to Big Sur's solid rounded style.

5. **High contrast**: When active, all borders become `2px solid currentColor` and all subtle shadows become visible borders.

6. **Focus indicators**: Tab-navigable elements get a `3px solid` focus ring offset by `3px`, using the accent color. This applies in all eras, even though keyboard navigation wasn't a focus in 1984.

### Font Loading Strategy

Era fonts must be loaded before rendering:

| Era | Fonts Required | Format |
|-----|---------------|--------|
| System 1 | Chicago | WOFF2 (already loaded) |
| Platinum | Charcoal, Chicago (fallback) | WOFF2 (Charcoal needs adding) |
| Aqua | Lucida Grande | System font (macOS), WOFF2 fallback |
| Skeuomorphic | Helvetica Neue | System font, WOFF2 fallback |
| Flat / Big Sur / Glass | SF Pro | System font (`-apple-system`), fallback to system-ui |

Use `font-display: swap` for custom fonts to prevent invisible text during load. The system font stack provides immediate fallbacks.

### Theme Transitions

When switching themes, animate the transition:
- Duration: 400ms
- Easing: `ease-out`
- Properties: `background-color`, `color`, `border-color`, `box-shadow`, `border-radius`
- Do NOT animate: `backdrop-filter`, `font-family`, layout properties

Apply a brief cross-fade to handle structural changes (e.g., bevel → flat border). The `windowStyle` change should be instantaneous — don't try to morph between eras.

### Dark Mode

Each era handles dark mode differently:

| Era | Dark Mode Approach |
|-----|-------------------|
| System 1 | Invert to white-on-black (like a negative) |
| Platinum | Darker grays (#404040 bg, #C0C0C0 text, bevels preserved) |
| Aqua | Darker window chrome, muted gel colors, same structure |
| Skeuomorphic | Darker textures, same leather/linen but in dark variants |
| Flat | iOS/macOS dark mode colors (well documented by Apple) |
| Big Sur | macOS dark mode (well documented) |
| Liquid Glass | Dark glass materials (documented above) |

### Performance

- **Backdrop filter budget**: Maximum 3 simultaneous `backdrop-filter` elements visible at once (Dock + menu bar + 1 window). More than this degrades performance on lower-end devices.
- **Texture images**: Keep under 50KB each. Use CSS patterns where possible instead of images.
- **Font subsetting**: Load only Latin character sets for era-specific fonts.
- **GPU compositing**: Elements with `backdrop-filter`, `transform`, or `opacity` animations should be on their own compositing layer (`will-change` or `transform: translateZ(0)`).

---

## Implementation Phases

### Phase 1: Foundation (Refactor)
- Extend `CustomTheme` interface with new fields
- Expand `windowStyle` enum to era-specific values
- Add universal spacing tokens to `globals.css`
- Create CSS class system for era-specific window rendering
- Refactor `applySettings.ts` to handle new token structure

### Phase 2: Fix Existing (Platinum Accuracy)
- Make current Berry Classic truly Platinum-accurate
- Remove modern glass from Platinum Dock/Launchpad
- Implement proper bevel system
- Add Charcoal font
- Fix all the inconsistencies identified in the audit

### Phase 3: New Eras (One at a Time)
Build themes in this order (each builds on the previous):
1. **System 1** — simplest, establishes the monochrome rendering path
2. **Flat** — establishes the modern rendering path (translucency, SF Pro)
3. **Aqua** — introduces gel buttons, pinstripes, Lucida Grande
4. **Big Sur** — extends Flat with rounded geometry
5. **Liquid Glass** — extends Big Sur with glass materials
6. **Skeuomorphic** — most complex (textures, warm colors)

### Phase 4: Polish
- Theme transition animations
- Dark mode variants for all eras
- Theme preview thumbnails in Settings
- Wallpaper presets matched to each era (e.g., Aqua → space wallpaper, Big Sur → layered hills)
- Sound effects per era (optional)

---

## Reference: Current → Target Mapping

| Current Theme | Becomes | Changes Needed |
|--------------|---------|----------------|
| Berry Classic | `platinum` | Fix bevels, remove glass Dock, add Charcoal font |
| Berry Dark | `platinum` (dark) | Same fixes + dark bevel palette |
| Nouns | `nouns` (brand theme) | Minimal — assign `flat` as windowStyle |
| Nouns Dark | `nouns-dark` | Minimal — assign `flat` as windowStyle |
| Midnight | Keep as `midnight` (brand theme) | Assign `flat` as windowStyle |
| Paper | Keep as `paper` (brand theme) | Assign `flat` as windowStyle |
| — (new) | `system1` | Build from scratch |
| — (new) | `aqua` | Build from scratch |
| — (new) | `skeuomorphic` | Build from scratch |
| — (new) | `flat` | Extract from current Dock/Launchpad patterns |
| — (new) | `big-sur` | Build from scratch |
| — (new) | `liquid-glass` | Build from scratch |
