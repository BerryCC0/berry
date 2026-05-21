# Names + WalletPanel — Presentation Layer Plan

Companion to [`_design.md`](./_design.md). The design file shows *what* each
view should look like; this file specifies *how* we build it — primitives,
tokens, sequence, acceptance criteria.

Read [`_design.md`](./_design.md) first; the wireframes are referenced here
by view name.

---

## 1. Visual system (use these, don't invent)

Berry has 196 `--berry-*` CSS variables in [`app/globals.css`](../../../../../app/globals.css)
plus per-theme overrides. Everything we build references these tokens — no
hard-coded colors, no magic numbers in CSS modules.

### Tokens we'll actually use

**Spacing**
- `--berry-padding-content: 16px` — view padding
- `--berry-margin-horizontal: 16px` — section margins
- `--berry-gap-interactive: 8px` — between buttons / inputs
- Custom (no token, use literal): `12px` for row-internal gaps, `4px` for tight stacks

**Typography**
- `--berry-font-system` — UI text (Chicago/Lucida/Geneva per theme)
- `--berry-font-mono` — addresses, hashes, content hashes
- Sizes: `--berry-font-caption` (11px) / `--berry-font-label` (13px) / `--berry-font-body` (14px) / `--berry-font-title` (16px) / `--berry-font-heading` (20px)

**Color**
- Surfaces: `--berry-bg` (window), `--berry-bg-secondary` (header/footer bands), `--berry-bg-tertiary` (input fields, raised cards)
- Text: `--berry-text-primary`, `--berry-text-secondary`, `--berry-text-muted`
- Accent: `--berry-accent` (Nouns red `#e93737`) — use sparingly, primary CTAs and active state
- States: `--berry-success`, `--berry-warning`, `--berry-error`, `--berry-info`
- Lines: `--berry-border`, `--berry-separator`

**Radius**
- `--berry-radius-card: 8px` — rows, cards
- `--berry-radius-button: 6px` — buttons
- `--berry-radius-input: 4px` — text fields

**Touch targets**
- `--berry-min-target: 28px` — minimum hit area for interactive elements

**Motion**
- `--berry-duration-fast: 150ms` — hover/press feedback
- `--berry-duration-normal: 250ms` — view transitions, save success
- `--berry-duration-slow: 400ms` — modal enter/exit (rarely needed here)
- `--berry-transition-speed: 0.15s` + `--berry-easing: ease` — short-hand for routine transitions

### Conventions observed in existing code

From [`WalletInfo.module.css`](../WalletPanel/components/WalletInfo.module.css)
and [`TokenList.tsx`](../WalletPanel/components/TokenList.tsx):

- Header/identity rows live in `--berry-bg-secondary` strips with a 1px
  `--berry-border` separator at the bottom.
- Pressed buttons use `transform: scale(0.95)` or `0.98`. We adopt this.
- Network status uses a colored dot + text in a card-style div with `--berry-bg-primary` (= --berry-bg) and 1px border.
- Skeleton loaders are three repeated rows with `--berry-bg-tertiary` blocks.
  We reuse this exact pattern for `<NamesListSkeleton>` etc.
- Empty states are short text in the same container, no illustration.
- Loading transitions: just opacity, no shimmer (Mac OS 8 wouldn't shimmer).

---

## 2. What primitives already exist

Audit of [`src/OS/Primitives/`](../../../Primitives/):

| Primitive | What it does | We use it for |
|-----------|--------------|---------------|
| `Button` | variants: `default \| primary \| text \| icon`, sizes `small \| medium \| large`, `fullWidth`, `active`, forwardRef | **Every button.** Stop hand-rolling `<button>` tags. |
| `Dialog` | Modal with backdrop | Transfer-name confirmation, "are you sure" for cancel-during-wait |
| `Select` | Dropdown | Duration picker on Register (1y / 2y / 5y / 10y) |
| `ScrollArea` | Custom scrollbar | View body wrapper if we want consistent scrollbar |

**No primitive exists** for: Input, Card, Tabs, Badge, Pill, ProgressIndicator,
Toast. We build these locally as `_identity/components/` (truly shared) or
`Names/components/` (Names-only).

---

## 3. Shared primitives to build

Each entry: where it lives, the API, what it composes from.

### `_identity/components/` (shared between Wallet and Names)

```
src/OS/Apps/system/_identity/components/
├── IdentityHeader.tsx        ← address + ENS + avatar row, used in IdentityShell
├── AddressChip.tsx           ← avatar + name OR truncated address, click-to-copy
├── AvatarBubble.tsx          ← 24/32/48px ENS avatar with gradient fallback
└── index.ts
```

**`AvatarBubble`** — `{ src?: string; address: string; size?: 24 | 32 | 48 }`. Renders the ENS avatar img with fallback to a gradient circle showing 2 chars of the address. Pulled from WalletInfo's existing avatar block.

**`AddressChip`** — `{ address: string; ensName?: string; copyable?: boolean; size?: 'sm' | 'md' }`. Renders avatar + display name (ensName or truncated) + optional copy button. Used in IdentityHeader and reusable elsewhere.

**`IdentityHeader`** — pulls connected wallet via `useWallet` + `useENS`. Renders an `AddressChip` on the left. Renders the `SurfaceToggle` on the right. This **replaces** the current `header={<span />}` workaround in WalletPanel.

### `Names/components/` (Names-only)

```
src/OS/Apps/system/Names/components/
├── TabStrip.tsx              ← horizontal scrollable tab nav (handles overflow)
├── NameListItem.tsx          ← row in MyNames (avatar dot, name, secondary info, chevron OR checkbox)
├── NameListSkeleton.tsx      ← 3-row skeleton during MyNames load
├── BulkActionBar.tsx         ← top-of-list bar in select mode: count + Cancel + bulk actions
├── EmptyState.tsx            ← centered icon + message + optional CTA
├── ErrorState.tsx            ← centered warning + message + retry
├── RecordRow.tsx             ← single record (label + value + edit pencil + dirty state)
├── RecordSection.tsx         ← grouped records (Records / Addresses / Content Hash / Subnames / Fuses)
├── ExpiryPill.tsx            ← "expires Mar 2027" with color (green/amber/red by proximity)
├── StepIndicator.tsx         ← numbered/checked steps for DNS Import + Register flows
├── SearchInput.tsx           ← debounced text input with submit-on-enter
├── ChainBadge.tsx            ← small label for "Ethereum" / "Base" / "BTC" on multi-chain addrs
├── DurationStepper.tsx       ← +/- 1y / 2y / 5y / 10y for Register
├── PriceDisplay.tsx          ← ETH + USD price with formatting
├── SubnameRow.tsx            ← row in the Subnames section with manage chevron + overflow menu
├── CreateSubnameModal.tsx    ← modal for creating a new subname (label, owner, resolver, expiry, fuses)
├── FuseChecklist.tsx         ← grid of fuse checkboxes with tooltips, "burn fuses" submit
├── WarningBanner.tsx         ← inline warning panel (red bg) used for irreversible action notices
├── AvatarPickerModal.tsx     ← URL vs NFT picker for setting the avatar text record
├── NftGrid.tsx               ← responsive 3-4 column thumbnail grid with selection state
├── TransferModal.tsx         ← destination address input + batch awareness for bulk transfer
└── index.ts
```

**`RecordRow`** — the most-reused. `{ label, value, editable, onChange?, isDirty?, mono?, customEditor? }`. View mode shows label + value + pencil; edit mode shows inline text input with cancel/save. Avatar row passes `customEditor` so its pencil opens `AvatarPickerModal` instead of an inline input.

**`ExpiryPill`** — `{ expiry: bigint | number }`. Computes time-to-expiry and colors:
- `> 90 days`: muted text, no background
- `30–90 days`: amber
- `< 30 days`: red
- `expired`: red with "expired" label

**`StepIndicator`** — `{ steps: string[]; current: number; }`. Numbered circles with connector lines. Used in DNS Import wizard (5 steps) and Register flow (4 steps).

**`BulkActionBar`** — `{ count: number; onCancel(); actions: { label, enabled, onClick }[] }`. Pinned to the top of MyNames when in select mode. Actions disable based on selection eligibility (e.g. Renew disabled if any selected name is DNS-imported).

**`FuseChecklist`** — `{ name, isWrapped, burnedFuses, onBurn(selected) }`. Renders the 8 user-settable fuses with tooltips. Already-burned fuses show checked + disabled. The PARENT_CANNOT_CONTROL fuse renders read-only.

**`AvatarPickerModal`** — `{ name, currentValue, onSave(value) }`. Two-mode picker: URL/IPFS/data: input, or NFT grid from `useMyNfts`. On save, calls `useSetTextRecord` with `key: 'avatar'`.

**`NftGrid`** — `{ nfts: MyNft[]; selected?: string; onSelect(ensAvatarUri) }`. Just the grid — pagination and search controls live in `AvatarPickerModal`.

---

## 4. IdentityShell finalization

**Decision:** WalletPanel's `WalletInfo` content moves up into a new
`IdentityHeader` component shared with Names. Both surfaces render
`IdentityHeader` in the shell's header band; the rest of each surface is
unique.

This kills the current `header={<span />}` workaround and makes the swap
visually seamless — the header bar's avatar + ENS + address don't even move
during the swap, only the body crossfades.

### Before / after layouts

**Wallet surface (after):**
```
┌──────────────────────────────────────────┐
│ [avatar] iwylie.eth          Names → │   ← IdentityShell.header (shared)
│          0x225f…3B5  ⎘  Ethereum         │
├──────────────────────────────────────────┤
│ ┌─── Assets ─────────────────────────┐  │
│ │ ETH    2.418     $7,612            │  │   ← WalletPanel body
│ │ ...                                │  │
│ └────────────────────────────────────┘  │
│ [Send] [Receive] [Buy] [Swap]            │
│                                          │
│ Forget Session         Disconnect        │
└──────────────────────────────────────────┘
```

**Names surface (after):**
```
┌──────────────────────────────────────────┐
│ [avatar] iwylie.eth          ← Wallet  │   ← Same header, swap button mirrored
│          0x225f…3B5  ⎘  Ethereum         │
├──────────────────────────────────────────┤
│ [My Names] [Lookup] [DNS] [Register]     │   ← TabStrip
├──────────────────────────────────────────┤
│ { view content }                         │
└──────────────────────────────────────────┘
```

The header band is taller than what we have now (two lines instead of one)
because it absorbs WalletInfo's network row. Total header height ≈ 64px.

### Migration path

1. Build `AvatarBubble`, `AddressChip`, `IdentityHeader` in
   `_identity/components/`.
2. Update `IdentityShell` to render `IdentityHeader` by default
   (remove the conditional `header ?? <default>` branch — header is now
   always the same component).
3. Delete `WalletPanel/components/WalletInfo.tsx` and its CSS module
   (functionality fully absorbed by `IdentityHeader`).
4. Remove `header={<span />}` from WalletPanel's two render paths.
5. Add chain badge handling — currently WalletInfo shows "Connected to {chainName}"; that goes inside IdentityHeader's second line.

---

## 5. Build order

Eight phases. Each phase has a working, mergeable scope and explicit
acceptance criteria. Don't skip ahead — later phases compose earlier
primitives.

### Phase P1 — Identity primitives (shared shell content)

**Build:** `AvatarBubble`, `AddressChip`, `IdentityHeader`. Update
`IdentityShell` to always render `IdentityHeader`. Update WalletPanel to
not pass `header` (uses default). Delete `WalletInfo.tsx`.

**Acceptance:**
- Wallet surface shows same identity info as before, sourced from `IdentityHeader`.
- Names surface shows the same identity header.
- Swap button is in the same screen position on both surfaces; clicking it preserves the visual position of the header content.
- Disconnected state still renders the connect CTA in WalletPanel body; the header shows "Not connected" text + a reachable swap button.

### Phase P2 — List / empty / error / skeleton primitives + bulk select

**Build:** `NameListItem` (with checkbox mode), `NameListSkeleton`, `EmptyState`, `ErrorState`, `BulkActionBar`. Restyle the existing `MyNames.tsx` view to use them. Wire bulk-select mode + bulk renew (sequential txs via `useRenewEnsName` if more than ensjs's native batch supports, else single `renewNames` call).

**Acceptance:**
- Connected wallet with names: list renders with avatar dots, primary indicator, expiry pill, wrapped tag. Clicking a row opens NameDetail.
- Connected wallet, no names: EmptyState with "No ENS names yet" + a CTA button labeled "Register .eth" that switches the tab to Register.
- Loading: 3-row skeleton matching final row height.
- Error: ErrorState with retry button that re-fetches the query.
- Disconnected: EmptyState with "Connect wallet" copy.
- "Select" button (top right of MyNames) toggles bulk-select mode.
- In select mode: rows show checkboxes; BulkActionBar replaces the header. Actions: Renew (enabled only when all selected are .eth), Transfer (opens TransferModal pre-populated with the multi-name set), ⋯ overflow (Bulk Set Resolver, future).
- Bulk Renew sends one transaction via `useRenewEnsName.renew({ nameOrNames: [...], duration, value })` where `value` is the summed price across all selected names from `useEnsPrice` calls.
- After bulk tx succeeds: invalidate `['ens', 'names-for-address']` so the list refetches with new expiries.

### Phase P3 — TabStrip + Lookup view

**Build:** `TabStrip` (handles narrow widths by horizontal scroll if needed), `SearchInput`, `ChainBadge`. Restyle Lookup view.

**Acceptance:**
- TabStrip renders 4 tabs at 420px width without overflow; gracefully scrolls horizontally below ~340px.
- SearchInput debounces 250ms after typing stops, OR submits on Enter.
- Lookup with `vitalik.eth`: shows owner, expiry pill, multi-chain addresses with ChainBadge per row, text records.
- Invalid input: inline validation message, no query fired.
- Read records display in same row component as NameDetail's RecordRow but in read-only mode.

### Phase P4 — RecordRow + RecordSection + NameDetail (base)

**Build:** `RecordRow` (view + edit modes), `RecordSection`, `ExpiryPill`, `TransferModal`. Restyle NameDetail view. Wire dirty tracking + batch save through `useSetEnsRecords`.

**Acceptance:**
- Read existing records for a name (use a known test name like `vitalik.eth` if user owns nothing).
- Click pencil on a row → input replaces value with current value preselected.
- Editing N rows accumulates dirty state visible in a footer "Save N changes" button.
- Save button disabled when nothing dirty.
- Click save → wallet prompt → confirming state → success → records re-fetch + dirty cleared.
- "Set as primary name" button: calls `useSetPrimaryName.setPrimary(name)`, button shows confirming state, on receipt the IdentityHeader's name updates (cache invalidation via React Query).
- Transfer button: opens TransferModal → destination address → `useTransferEnsName.transfer({ name, newOwnerAddress, contract })`. Auto-picks `contract` based on whether the name is wrapped.
- Records are grouped into three RecordSections: "Profile" (text records), "Addresses" (multi-chain), "Content Hash". Subnames and Fuses sections come in P5/P6 — for P4 they can be empty placeholders.

### Phase P5 — Subnames section

**Build:** `SubnameRow`, `CreateSubnameModal`. Wire `useCreateSubname`, `useDeleteSubname`, and a new API query (or React Query select) that pulls children from `ponder_live.ens_domains WHERE parent = currentNode`.

**Acceptance:**
- Subnames section in NameDetail lists all subnames whose parent is the current name.
- Empty subnames state: "No subnames yet" with the "+ Create subname" CTA inline.
- Click "+ Create subname" → modal:
  - label input (one DNS label, no dots)
  - owner address (defaults to connected wallet)
  - resolver address (defaults to parent's resolver)
  - expiry picker (NameWrapper only, defaults to parent's expiry)
  - optional fuses checkbox group
- Submit → calls `useCreateSubname.create({ name: "label.parent", owner, contract: parent.isWrapped ? "nameWrapper" : "registry", ... })`.
- After success: invalidate the subname query + close modal.
- SubnameRow overflow menu: "Manage" (navigates to that subname's NameDetail), "Delete" (confirm dialog → `useDeleteSubname.remove`).
- API: extend `/api/ens/names-for-address` OR add a new `/api/ens/subnames/[parentNode]` that returns names by parent. Latter is cleaner — parent listing is a different query shape.

### Phase P6 — Fuse management

**Build:** `FuseChecklist`, `WarningBanner`. Render the Fuses RecordSection in NameDetail. Wire `useSetFuses`.

**Acceptance:**
- Fuses section visible only when `domain.isWrapped === true`.
- For unwrapped names: section shows a small "Wrap this name to enable fuses" notice with a disabled button (wrapping is future scope).
- For wrapped names: render the 8 user-settable fuses as a vertical checklist.
  - Already-burned fuses: ✓ + disabled.
  - PARENT_CANNOT_CONTROL: read-only display, separate row at the bottom labeled "Set by parent".
  - Each fuse: tooltip with a short explanation of the effect.
- Above the burn button: `WarningBanner` reading "Burning fuses is permanent. Once burned, fuses cannot be unburned and the corresponding action will be blocked on this name forever."
- Burn button enabled only when ≥1 unburned fuse is checked. Disabled while pending.
- Submit → `useSetFuses.setFuses({ name, fuses: selectedFuseNames })`.
- After success: refetch fuse state (likely via `useEnsRecords` extended or a new `useEnsFuseData` that reads `getWrapperData`).

### Phase P7 — Avatar picker (NFT selector)

**Build:** `AvatarPickerModal`, `NftGrid`. Wire `useMyNfts` and the existing `useSetTextRecord`. Update `RecordRow` to accept `customEditor` so the avatar row opens this modal instead of an inline text input.

**Acceptance:**
- Avatar row in NameDetail's Profile section has a pencil that opens AvatarPickerModal (instead of inline text edit).
- Modal opens with two radio options: "From URL" and "From your NFTs".
  - URL mode: text input that accepts URL, IPFS URI, or data: URI.
  - NFT mode: search input (filter by collection name) + 3-4 column thumbnail grid.
- NFT grid loads from `useMyNfts(address)` — infinite scroll or "Load more" button using the paginated query.
- Click a thumbnail: selected state (border accent) + the formatted ENSIP-12 URI (`eip155:1/erc721:0x.../tokenId`) appears below the grid.
- "Set as avatar" button writes via `useSetTextRecord.setText({ name, key: 'avatar', value: selectedValue })`.
- After tx success: modal closes, RecordRow refreshes via React Query invalidation, the avatar in NameDetail's header shows the new image.
- Edge case: NFT with no image → server-side filter excludes it from the grid (verified in P7 acceptance).
- Edge case: user has no NFTs → empty state in modal: "No NFTs found. Pick from URL instead."

### Phase P8 — StepIndicator + DNS Import wizard

**Build:** `StepIndicator`. Restyle DNS Import view. Implement gasless and onchain paths.

**Acceptance:**
- Step 1: domain input with format validation (must contain a dot, not `.eth`).
- Step 2: DNSSEC check — fires a DNS-over-HTTPS query to confirm DNSSEC, shows ✓/✗ with the registrar name detected from NS records.
- If Vercel is detected as the registrar: inline warning with a link to the [July 2026 reminder](#) (or just text explaining the limitation).
- Step 3: path picker — Gasless vs Onchain radio cards.
- Step 4a (Gasless): TXT record string in a monospace block with Copy button. "Check resolution" button polls `useEnsAddressRecord(domain)` every 5s until it returns the expected address.
- Step 4b (Onchain): "Fetch proof" → loading state via `useDnsImportData` → "Submit proof" button → tx pending → success.
- Step 5: success state with "Verify on app.ens.domains" link.

### Phase P9 — Register flow + DurationStepper + PriceDisplay

**Build:** `DurationStepper`, `PriceDisplay`. Restyle Register view. Verify session persistence behavior from existing infrastructure.

**Acceptance:**
- Name input with `.eth` suffix shown inside the field.
- Availability check happens on debounce, shows ✓ available / ✗ taken inline.
- DurationStepper: 1y / 2y / 3y / 5y / 10y options. Default 1y.
- PriceDisplay updates as duration changes; shows ETH + USD (use existing useEthPrice hook).
- Commit button → wallet prompt → confirming state.
- After commit: countdown timer ticks down from 60s. Window can be closed; reopen with same wallet, land in same state with same countdown (existing `useRegisterCommitSession` does this).
- Register button enabled only after countdown.
- Cancel button at any time clears the session and resets to input.
- Done state shows the name + "Set as primary" + "Open in detail" buttons.

### Phase P10 — Animations + polish

**Build:** swap crossfade, tab transitions, button press states, save success toast.

**Acceptance:**
- Surface swap: clicking toggle fades current window opacity 1→0 over 100ms, then launches new app, which fades 0→1 over 100ms. Total ~200ms. CSS-only (no Framer Motion).
- Tab change: instant body content swap, no transition (tabs are within-surface).
- Buttons: `transform: scale(0.98)` on `:active`, matching WalletPanel's existing pattern.
- Save success: small inline confirmation in the dirty-state footer ("✓ Saved" for 1.5s before clearing). No global toast system needed.
- Loading transitions: opacity 0.6 on outgoing content during refetch (matches WalletPanel's existing skeleton pattern).

### Phase P11 — Verification + mobile

**Build:** mobile CSS modules where layouts differ. Manual screenshot pass against `_design.md` wireframes.

**Acceptance:**
- All views render correctly at 420×640 desktop default.
- All views render correctly at 360×480 (minimum size).
- Mobile (`Names.mobile.module.css`): full-window TabStrip pinned to top, view body fills remaining space. WalletPanel mobile already works via existing styles.
- Manual screenshot of each view vs the wireframe in `_design.md` — record any deviations in this file before merging.

---

## 6. Animation specifications

**Swap implementation** — in `useSurfaceSwap`:

```ts
async function swap() {
  const win = useWindowStore.getState().getWindow(currentWindowId);
  if (!win) return null;
  const { x, y, width, height } = win;

  // Fade out the current window via a CSS class added to the window root
  const winEl = document.querySelector(`[data-window-id="${currentWindowId}"]`);
  winEl?.classList.add('berry-window-fading-out');
  await new Promise(r => setTimeout(r, 100));

  closeApp(currentWindowId);
  const newId = launchApp(toAppId, { x, y, width, height });
  if (!newId) return null;

  // Next paint, fade the new window in
  requestAnimationFrame(() => {
    const newEl = document.querySelector(`[data-window-id="${newId}"]`);
    newEl?.classList.add('berry-window-fading-in');
  });
  return newId;
}
```

CSS in `globals.css`:
```css
.berry-window-fading-out { opacity: 0; transition: opacity 100ms ease-out; }
.berry-window-fading-in {
  animation: berry-window-fade-in 100ms ease-out forwards;
}
@keyframes berry-window-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

Requires Window component to render `data-window-id={id}` — check whether it already does; if not, that's a small WindowManager touch-up.

**Button press** — use existing pattern from WalletInfo:
```css
.button:active { transform: scale(0.98); }
```

**Skeleton fade** — use the existing pulse animation from `WalletInfo.module.css`:
```css
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.skeleton { animation: pulse 2s ease infinite; background: var(--berry-bg-tertiary); }
```

---

## 7. Mobile strategy

WalletPanel currently has no `.mobile.module.css` — its layout is fluid
enough to work at any width. We aim for the same with Names but accept
that TabStrip and multi-chain Addresses rows may need mobile variants.

**Risk areas:**

- **TabStrip at 360px**: 4 tabs × min 28px target × 8px gaps = ~144px text + padding. Should fit. If labels get longer ("DNS Import" is 9 chars), enable horizontal scroll via `overflow-x: auto`.
- **NameDetail Addresses section**: each row has ChainBadge + address chip + edit button. At 360px, address truncates more aggressively (`0x22…3B5` instead of `0x225f…3B5`).
- **DNS Import wizard**: step indicator stays horizontal but step content stacks vertically. No layout change beyond container width.

**No separate `Names.mobile.tsx`** — Mac OS 8 design assumes desktop. The
existing platform detection (`usePlatform()`) is used only if we need to
swap *content*, not layout. Layout is responsive via CSS.

---

## 8. Verification approach

No Storybook, no Chromatic. We use **manual screenshots** against
`_design.md` wireframes. Per phase:

1. Run `npm run dev` and connect a wallet with at least one ENS name.
2. Open the relevant view in the Names app.
3. Capture a screenshot for each acceptance criterion.
4. Diff against the wireframe — note any intentional deviations.
5. Run `npx tsc --noEmit` and `npx eslint` before merging the phase.

**Cross-theme check:** Berry has multiple themes (default Aqua-ish,
Platinum, System 7 — visible from the `--berry-*` variable overrides
in `globals.css`). Open System Settings → Appearance and verify the Names
app looks coherent in each. The token-only approach should make this
automatic but watch for hard-coded grays in skeleton components.

**Connected vs disconnected:** every view must work without a wallet
(Lookup), with a wallet but no names owned (MyNames empty state), and
mid-transaction (loading/confirming states). Take the screenshot in all
three.

---

## 9. Where things might go wrong

Things to watch for that aren't obvious from the wireframes:

- **ENS avatar URLs can return 4xx**: the metadata service sometimes fails for fresh registrations. Always have a gradient fallback.
- **Empty resolver**: if a name has no resolver set, all record reads return null. NameDetail needs an empty-records state with a "Set resolver" CTA — not a phase 4 concern but worth noting.
- **NameWrapper expiry vs Registry expiry**: wrapped names have an additional NameWrapper expiry that can be shorter than the BaseRegistrar expiry. ExpiryPill should show the earlier of the two.
- **DNS import polling**: Step 4a (gasless) polls for resolution. If the user's DNS provider has aggressive caching, resolution may take 10–60 minutes. Show a "still checking…" hint after 60s.
- **TanStack Query cache invalidation**: setting a primary name doesn't auto-invalidate `useENS(address)` since they use different query keys. We need to explicitly call `queryClient.invalidateQueries(['ens'])` after any write that affects reverse resolution.

---

## 10. Out of scope (explicit defer)

- L2 ENS writes (Universal Resolver handles reads; writes need a chain switcher)
- Wrapping unwrapped names (`wrapName` hook works; no view yet — surfaces as a CTA in the Fuses section)
- IPFS upload for avatars (paste-URL + NFT picker cover most use cases)
- Notification system integration for tx success/failure
- Keyboard shortcuts (Cmd-N for new register, etc.)
- Accessibility audit (separate pass after visual is settled)

---

## Build order summary

| Phase | What | Effort | Mergeable on its own? |
|-------|------|--------|----------------------|
| P1 | Identity primitives, IdentityHeader, delete WalletInfo | S | Yes — wallet still works |
| P2 | List primitives + bulk select, restyle MyNames | M | Yes |
| P3 | TabStrip, SearchInput, restyle Lookup | M | Yes |
| P4 | RecordRow, RecordSection, restyle NameDetail (base) | L | Yes — base detail view |
| P5 | Subnames section (SubnameRow, CreateSubnameModal) | M | Yes — adds to P4 |
| P6 | Fuse management (FuseChecklist, WarningBanner) | M | Yes — adds to P4 |
| P7 | Avatar picker (AvatarPickerModal, NftGrid) | M | Yes — adds to P4 |
| P8 | StepIndicator, restyle DNS Import | M | Yes |
| P9 | DurationStepper, PriceDisplay, restyle Register | M | Yes |
| P10 | Animations + polish | S | Yes |
| P11 | Mobile + verification | S | Yes — final pass |

Recommended grouping:

- **Session 1: P1 → P2 → P3** — visual rhythm gets established with shared primitives.
- **Session 2: P4** — the base detail view. Largest single phase.
- **Session 3: P5 + P6** — both extend NameDetail with new sections; build them together so the section layout stays coherent.
- **Session 4: P7** — Avatar picker is self-contained; can be done independently after P4.
- **Session 5: P8 → P9** — wizard-style views share the StepIndicator and have similar acceptance patterns.
- **Session 6: P10 + P11** — polish pass before declaring presentation done.

P5, P6, and P7 are all NameDetail extensions and can be parallelized if you
want multiple sessions touching the same area — they don't conflict because
they live in different RecordSections.
