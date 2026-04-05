# Desktop & Dock Panel — Refactor Spec

## Problems (from screenshots)

### Wallpaper Section
- **Tiny swatches.** 28px color squares are hard to distinguish and hard to tap on mobile. 13 swatches crammed into a flex-wrap row with 6px gaps look like a mess.
- **No visual grouping.** Era-matched wallpapers (first 6) are mixed in with generic solids (last 7). No way to tell which wallpaper belongs to which era.
- **Label clipping.** The SettingRow label "Wallpaper" with description "Background color or image URL" gets truncated because the WallpaperPicker inside the `.control` div is too wide.
- **Custom URL input cramped.** The URL input + Apply button row is squeezed under the swatches with minimal padding.
- **No image wallpaper previews.** Only solid colors are available. No actual wallpaper images. (Out of scope for this refactor but worth noting.)

### Desktop Icons Section
- **Too many settings.** Seven rows in one group: show/hide, icon size, grid spacing, snap to grid, arrange button, current desktop apps (chips), add-to-desktop selector. This is overwhelming — most users will never touch grid spacing or snap-to-grid.
- **Redundant controls.** "Snap Icons to Grid" and "Icon Grid Spacing" are advanced layout options that could be collapsed or hidden behind a disclosure.
- **Desktop Apps chips overflow.** ChipList renders horizontally with `flex-shrink: 0` on `.control`, so when there are many pinned apps the chips push past the panel boundary.
- **"Add to Desktop" UX.** Select dropdown + Add button pattern is clunky. On macOS, adding items to the desktop is drag-and-drop, not a two-step form.

### Dock Section
- **Same ChipList overflow.** Pinned dock apps overflow the row, especially with longer names like "Nouns Auction".
- **"Finder cannot be removed" text.** This is crammed into the description of the SettingRow and gets cut off. Should be handled at the component level (disable the remove button on Finder) rather than as helper text.

### Berry Menu Section
- **Same add-app pattern.** Same clunky Select + Add button.
- **Feels disconnected.** Berry Menu is a third section with its own pinned apps list — the panel has three separate "pin apps to X" workflows that all look identical. Should be consolidated or differentiated visually.

### General Layout
- **SettingRow flex layout breaks.** The `display: flex; justify-content: space-between` layout assumes the control is compact (a toggle, a dropdown). When the control is a ChipList or WallpaperPicker, it overflows because `.control { flex-shrink: 0 }` prevents it from wrapping.
- **No responsive behavior.** Panel is fixed `max-width: 600px` with no adaptation for narrow windows.

---

## Design Direction

Follow macOS Ventura+ System Settings > Desktop & Dock as the reference. Key principles:

1. **Wallpaper gets a hero treatment** — large preview of the current wallpaper at the top, not buried inside a SettingRow.
2. **Fewer visible settings** — hide advanced desktop icon options behind a disclosure triangle.
3. **Full-width chip lists** — pinned app lists should flow onto their own rows below the label, not cram into the right side of a SettingRow.
4. **Single "Pinned Apps" pattern** — consolidate the add-app UX into a reusable component.
5. **Era-aware wallpaper grouping** — show recommended wallpaper for the current era first.

---

## Proposed Layout

```
┌─────────────────────────────────────────────────┐
│  Desktop & Dock                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │                                           │  │
│  │        Current Wallpaper Preview          │  │
│  │          (160px tall, rounded)            │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Recommended for [Era Name]                     │
│  [swatch] [swatch] [swatch] [swatch] ...        │
│                                                 │
│  All Colors                                     │
│  [swatch] [swatch] [swatch] [swatch] ...        │
│                                                 │
│  Custom URL  [________________________] [Apply] │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  DESKTOP                                        │
│  ┌───────────────────────────────────────────┐  │
│  │ Show Icons                        [toggle]│  │
│  │─────────────────────────────────────────  │  │
│  │ Icon Size                    [  Medium ▾] │  │
│  │─────────────────────────────────────────  │  │
│  │ ▶ Advanced...  (grid, snap, arrange)      │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Desktop Apps                                   │
│  [Macintosh HD ×]                               │
│  [+ Add app...]                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  DOCK                                           │
│  ┌───────────────────────────────────────────┐  │
│  │ Position                     [  Bottom ▾] │  │
│  │─────────────────────────────────────────  │  │
│  │ Auto-hide                         [toggle]│  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Pinned Apps                                    │
│  [Finder 🔒] [Nouns Auction ×] [Camp ×] ...    │
│  [+ Add app...]                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  BERRY MENU                                     │
│  Pinned Apps                                    │
│  [Finder ×] [Calculator ×]                      │
│  [+ Add app...]                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│  [Reset to Defaults]                            │
└─────────────────────────────────────────────────┘
```

---

## Component Changes

### 1. WallpaperSection (new)

Replace the current SettingRow-wrapped WallpaperPicker with a dedicated `WallpaperSection` component that renders outside the SettingGroup pattern.

**Layout:**
- **Hero preview:** Full-width rounded rect (160px tall) showing the current wallpaper color/image. If it's a solid color, fill the rect. If it's a URL, render as `background-image: cover`.
- **"Recommended for [Era]" row:** Filter `WALLPAPERS` to show only the era-matched one(s) for the current era. Show as larger swatches (40px) with the era name as a subheading.
- **"All Colors" row:** Remaining swatches at 36px. Grouped in a flex-wrap row with 8px gaps.
- **Custom URL row:** Same input + button, but full-width below the swatches with more breathing room.

**Data change:** Add an `era` field to each wallpaper in `WALLPAPERS` so we can filter:
```typescript
export const WALLPAPERS = [
  { name: "Classic Teal", value: "#008080", era: "platinum" },
  { name: "Aqua Blue", value: "#3A6EA5", era: "aqua" },
  // ...
  { name: "Deep Purple", value: "#2D1B4E" },  // no era = generic
];
```

### 2. PinnedAppsList (new reusable component)

Extract the "chips + add dropdown" pattern into a shared component used by Desktop Apps, Dock, and Berry Menu.

```typescript
interface PinnedAppsListProps {
  items: { id: string; label: string }[];
  onRemove: (id: string) => void;
  onAdd: (id: string) => void;
  availableApps: { id: string; name: string }[];
  lockedIds?: string[];       // e.g., ["finder"] — show lock icon, disable remove
  placeholder?: string;       // e.g., "Add app..."
}
```

**Layout:**
- Chips wrap onto multiple rows naturally (not constrained to a single SettingRow).
- Locked items show a small lock icon instead of ×.
- The "add" action is a ghost chip (`+ Add app...`) that opens a popover/dropdown on click — not a separate SettingRow with a Select + Button.
- Entire component renders below a section label, not inside a SettingRow.

### 3. AdvancedDisclosure (new)

A simple disclosure triangle component for hiding rarely-used settings:

```typescript
interface AdvancedDisclosureProps {
  label: string;           // "Advanced" or "More Options"
  children: React.ReactNode;
  defaultOpen?: boolean;
}
```

Renders as a `<details>/<summary>` element styled to match the panel. Collapsed by default.

### 4. SettingRow fix

The `.control` class needs `flex-shrink: 0` removed (or made conditional) so that wide controls like ChipList can wrap. Better yet, use a variant:

```typescript
// For wide controls that need their own row:
<SettingRow label="Desktop Apps" layout="stacked">
  <PinnedAppsList ... />
</SettingRow>
```

When `layout="stacked"`, the SettingRow renders label above and control below (flex-direction: column) instead of side-by-side.

---

## Detailed Changes

### Desktop Group

**Keep visible:**
- Show Desktop Icons (toggle)
- Icon Size (select)

**Move behind "Advanced...":**
- Icon Grid Spacing
- Snap Icons to Grid
- Arrange Icons (button)

These are power-user settings. Hiding them reduces the group from 7 rows to 2 rows + 1 disclosure + the pinned apps list.

### Dock Group

**Keep as-is:**
- Position (select)
- Auto-hide (toggle)

**Fix:**
- Pinned Apps: switch from ChipList-in-SettingRow to PinnedAppsList as full-width component below the group.
- Finder gets `lockedIds={["finder"]}` — lock icon instead of × button, no more "cannot be removed" description text.

### Berry Menu Group

**Fix:**
- Same PinnedAppsList treatment.
- Remove the SettingRow wrapper. Just a section label + PinnedAppsList.

---

## CSS Fixes

### Swatch sizing
```css
.wallpaperSwatch {
  width: 40px;    /* was 28px */
  height: 40px;
  border-radius: 8px;  /* was 6px */
  gap: 8px;       /* was 6px */
}
```

### Hero preview
```css
.wallpaperPreview {
  width: 100%;
  height: 160px;
  border-radius: 12px;
  margin-bottom: 16px;
  background-size: cover;
  background-position: center;
  border: 1px solid var(--berry-border);
}
```

### PinnedAppsList chips
```css
.pinnedAppsList {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
}

.addAppChip {
  /* Ghost chip style — dashed border, muted text */
  border: 1px dashed var(--berry-border);
  color: var(--berry-text-secondary);
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  background: transparent;
  transition: border-color 0.15s, color 0.15s;
}

.addAppChip:hover {
  border-color: var(--berry-accent);
  color: var(--berry-accent);
}
```

### SettingRow stacked variant
```css
.rowStacked {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.rowStacked .control {
  width: 100%;
  flex-shrink: 1;
}
```

---

## Implementation Plan

### Phase 1 — Data & Shared Components
1. Add `era?: EraId` field to WALLPAPERS entries in `defaults.ts`
2. Create `PinnedAppsList` component (chips + ghost add chip + popover)
3. Create `AdvancedDisclosure` component (styled `<details>`)
4. Add `layout?: "inline" | "stacked"` prop to SettingRow, fix `.control` flex-shrink

### Phase 2 — WallpaperSection
5. Build `WallpaperSection` with hero preview, era grouping, and larger swatches
6. Remove old `WallpaperPicker` from Panel.module.css

### Phase 3 — Panel Rewrite
7. Rewrite `DesktopDockPanel` using new components:
   - WallpaperSection at the top
   - Desktop group with 2 visible settings + AdvancedDisclosure
   - PinnedAppsList for desktop apps, dock apps, and berry menu
   - Finder locked in dock
8. Remove the three `selectedXxxApp` state variables and Select+Button patterns

### Phase 4 — Polish
9. Responsive behavior: stack hero preview vertically on narrow windows
10. Dark mode pass on all new components
11. TypeScript compile check

---

## Design Decisions

1. **Wallpaper collection** — Keep the custom URL input for user images. Replace the current 13 flat solid colors with a curated collection inspired by macOS wallpaper history: era-matched gradients (not just flat colors), a few classic macOS-inspired color palettes, and some Nouns-themed options. CSS gradients, not hosted images — keeps it lightweight.
2. **Dock size slider** — Not needed here. Berry OS already lets users resize the dock via click-drag on the dock itself.
3. **Berry Menu** — Keep as its own section. The Berry Menu is the Apple Menu equivalent (top-left of menubar), distinct enough from Dock to warrant its own group. Same PinnedAppsList treatment as Dock.
