# Names + WalletPanel — Visual Design Sketch

Wireframes for the twin-surface identity app. Infrastructure is in place
(IdentityShell, SurfaceToggle, ENS hooks); presentation phase implements
these layouts.

Window dimensions: **420 × 640** (default, both surfaces). Resizable down to
360 × 480. Singleton, no dock icon — entered via MenuBar.

## Shared shell

```
┌─────────────────────────────────────────────┐
│ ●●●  [avatar]  iwylie.eth         Names → │  ← IdentityShell.header
├─────────────────────────────────────────────┤
│                                             │
│   { surface content }                       │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

- Left: avatar + primary name (or truncated address if no ENS).
- Right: SurfaceToggle. Label is the *other* surface's name ("Names →" on
  Wallet, "← Wallet" on Names).
- Click toggle → window closes + reopens as the other app at the same
  position and size. ~200ms crossfade for the swap.

## Wallet surface

```
┌─────────────────────────────────────────────┐
│ ●●●  iwylie.eth                   Names → │
├─────────────────────────────────────────────┤
│  iwylie.eth                                 │
│  0x225f…3B5  [copy]   Ethereum              │
│                                             │
│  ┌─── Balances ────────────────────────┐   │
│  │ ETH    2.418     $7,612             │   │
│  │ USDC   1,200.00  $1,200             │   │
│  │ wstETH 0.502     $1,890             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [ Send ]  [ Receive ]  [ Buy ]  [ Swap ]   │
│                                             │
│  ─────────────────────────────────          │
│  Forget Session         Disconnect          │
└─────────────────────────────────────────────┘
```

Unchanged from today's WalletPanel — just wrapped in IdentityShell so the
toggle is reachable in the header.

## Names surface — tab nav

```
┌─────────────────────────────────────────────┐
│ ●●●  iwylie.eth              ← Wallet     │
├─────────────────────────────────────────────┤
│  [My Names] [Lookup] [DNS Import] [Register]│
├─────────────────────────────────────────────┤
│                                             │
│   { view content }                          │
│                                             │
└─────────────────────────────────────────────┘
```

Tab strip directly below the IdentityShell header. Active tab has a subtle
fill + outlined border. Inactive tabs are bare buttons.

## View: My Names

```
│  My Names                          [Select] │
│  ─────────────────────────────────          │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ●  iwylie.eth          ★ primary    │   │
│  │    expires Mar 2027     edit →      │   │
│  ├─────────────────────────────────────┤   │
│  │ ●  nounsfoundation.org              │   │
│  │    DNS · imported       edit →      │   │
│  ├─────────────────────────────────────┤   │
│  │ ●  wylie.berry.eth                  │   │
│  │    subname               edit →     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  + Register new .eth name                   │
```

- Each row: avatar dot, name, secondary info (expiry / type / "primary"
  badge), edit affordance.
- Sort: primary first, then by expiry ascending, then subnames.
- Empty state: "No ENS names yet" + CTA to Register or DNS Import.
- Connect-prompt state if no wallet: "Connect a wallet to see your names".
- **Select** button (top right) toggles bulk-select mode.

### Bulk-select mode

```
│  3 selected           [Cancel] [Renew] [⋯] │
│  ─────────────────────────────────          │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ☑  iwylie.eth          ★ primary    │   │
│  │    expires Mar 2027                 │   │
│  ├─────────────────────────────────────┤   │
│  │ ☑  cool.eth                          │   │
│  │    expires Jul 2026                 │   │
│  ├─────────────────────────────────────┤   │
│  │ ☐  nounsfoundation.org              │   │
│  │    DNS · imported                   │   │
│  ├─────────────────────────────────────┤   │
│  │ ☑  wylie.eth                         │   │
│  │    expires Jan 2028                 │   │
│  └─────────────────────────────────────┘   │
```

- Rows gain a checkbox in place of the trailing chevron.
- Header bar: count + Cancel + bulk actions. Actions enabled only when
  selection is non-empty and contains only names eligible for the action
  (e.g. Renew is .eth only; DNS-imported and subnames are disabled).
- "⋯" overflow menu for less common bulk actions: Bulk Transfer, Bulk
  Set Resolver (less common — extend later).
- Bulk Renew → one tx via `renewNames({ nameOrNames: [...], duration, value })`.
  ensjs supports the array form natively.
- Bulk Transfer → opens the Transfer modal with the multi-name set; we
  encode one `transferName` per name and submit via wagmi's batch
  capabilities or sequential transactions with a progress indicator.

## View: Name Detail

```
│  ← Back                                     │
│                                             │
│  iwylie.eth                                 │
│  Owner: iwylie.eth  ·  expires Mar 2027     │
│                                             │
│  ╭─ Records ──────────────────────────╮   │
│  │ avatar       https://… …png    [✎] │   │
│  │ description  building Berry OS [✎] │   │
│  │ url          berry.cc          [✎] │   │
│  │ twitter      wylinx            [✎] │   │
│  │ github       BerryCC0          [✎] │   │
│  │ farcaster    wylie             [✎] │   │
│  │ + Add record                       │   │
│  ╰────────────────────────────────────╯   │
│                                             │
│  ╭─ Addresses ────────────────────────╮   │
│  │ Ethereum  0x225f…3B5           [✎] │   │
│  │ Base      0x225f…3B5           [✎] │   │
│  │ + Add chain                        │   │
│  ╰────────────────────────────────────╯   │
│                                             │
│  ╭─ Content Hash ─────────────────────╮   │
│  │ ipfs://Qmf…                    [✎] │   │
│  ╰────────────────────────────────────╯   │
│                                             │
│  ╭─ Subnames ─────────────────────────╮   │
│  │  team.iwylie.eth         manage →  │   │
│  │  shop.iwylie.eth         manage →  │   │
│  │  + Create subname                  │   │
│  ╰────────────────────────────────────╯   │
│                                             │
│  ╭─ Fuses (wrapped names only) ───────╮   │
│  │  ✓ Parent cannot control            │   │
│  │  ☐ Cannot unwrap                    │   │
│  │  ☐ Cannot transfer                  │   │
│  │  ☐ Cannot set resolver              │   │
│  │  ☐ Cannot set TTL                   │   │
│  │  ☐ Cannot create subdomain          │   │
│  │  ☐ Cannot burn fuses                │   │
│  │  ☐ Cannot approve                   │   │
│  │  ⚠ Burning fuses is permanent.     │   │
│  │  [ Burn selected fuses ]            │   │
│  ╰────────────────────────────────────╯   │
│                                             │
│  [ Set as primary ]  [ Transfer ]  [ Save ] │
```

- Inline editors: pencil icon turns the row into an editable field.
- Dirty rows accumulate into the bottom "Save" multicall. Disabled until
  there are changes.
- Save → wallet prompt → confirming → success toast → records re-fetched.
- Transfer opens a modal with a destination address input.
- Set as primary sends ReverseRegistrar.setName(name); requires the name
  to resolve to the connected address.

### Subnames section

- Only rendered when the user owns the parent.
- Lists subnames pulled from `ens_domains` where `parent = current node`.
- Each row: subname text + chevron to the subname's own NameDetail view.
- "+ Create subname" opens a modal with: label input, owner address,
  resolver address (defaults to parent's), expiry (NameWrapper only),
  optional fuses to burn at creation.
- Modal calls `useCreateSubname.create({ name: "label.parent.eth", owner, contract: "nameWrapper", ... })`.
- Subname rows can be deleted by the parent owner via overflow menu on
  the row → `useDeleteSubname.remove({ name, contract })`.

### Fuses section (wrapped names only)

- Hidden when `domain.isWrapped === false`. For unwrapped names, show
  a small "Wrap name to enable fuses" CTA inline that calls `wrapName`
  (out of scope for v1 — flag as coming soon).
- Each fuse row: checkbox + name + short tooltip explaining the effect.
  Already-burned fuses are shown with a checkmark and disabled — they
  cannot be unburned.
- Big red warning above the burn button: **Burning fuses is permanent
  and irreversible.** Tooltip on each fuse explains the consequence.
- Submit calls `useSetFuses.setFuses({ name, fuses: selectedFuseNames })`.
- The 8 user-settable fuses: `CANNOT_UNWRAP`, `CANNOT_BURN_FUSES`,
  `CANNOT_TRANSFER`, `CANNOT_SET_RESOLVER`, `CANNOT_SET_TTL`,
  `CANNOT_CREATE_SUBDOMAIN`, `CANNOT_APPROVE`, plus the parent-set
  `PARENT_CANNOT_CONTROL` (read-only from this side).
- Order: surface the most common (CANNOT_UNWRAP, CANNOT_TRANSFER) at the
  top; PARENT_CANNOT_CONTROL is read-only at the bottom for context.

## View: Lookup

```
│  Look up an ENS name                        │
│  ─────────────────────────────────          │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ vitalik.eth                  [search]│   │
│  └─────────────────────────────────────┘   │
│                                             │
│  vitalik.eth                                │
│  Owner: vitalik.eth                         │
│  Expires: Mar 2032 (7 years)                │
│                                             │
│  ETH  0xd8dA…6045                           │
│  BTC  bc1q…                                 │
│                                             │
│  description  Coffee.                       │
│  url          vitalik.ca                    │
│  avatar       [thumbnail]                   │
│  twitter      vitalikbuterin                │
│                                             │
│  [ Open in Etherscan ]  [ Open in detail ]  │
```

- Search debounced 250ms after typing stops, OR explicit submit.
- Same record layout as NameDetail, but read-only.
- "Open in detail" only enabled when the connected wallet owns the name.

## View: DNS Import

```
│  Import a DNS name                          │
│  ─────────────────────────────────          │
│                                             │
│  ① Domain                                   │
│  ┌─────────────────────────────────────┐   │
│  │ nounsfoundation.org           [next]│   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ② DNSSEC                                   │
│  ✓ DNSSEC enabled                           │
│  ✗ DNSSEC not detected — enable at registrar│
│  ⚠ Registrar (Vercel) doesn't support DNSSEC│
│                                             │
│  ③ Path                                     │
│  ○ Gasless — TXT record only, free          │
│  ○ Onchain — full ENS features, ~$30 gas    │
│                                             │
│  ④ Configure                                │
│  (gasless path)                             │
│    Add this TXT record at the apex:         │
│    ┌─────────────────────────────────┐    │
│    │ ENS1 0x238A…ef01 0x225f…3B5     │    │
│    └─────────────────────────────────┘    │
│    [ Copy ]  [ Check resolution ]          │
│                                             │
│  (onchain path)                             │
│    [ Fetch proof ]  →  [ Submit proof ]    │
│                                             │
│  ⑤ Done                                     │
│  nounsfoundation.org → 0x225f…3B5           │
│  [ Verify on app.ens.domains ]              │
```

- Steps gate progression: can't pick path until DNSSEC is confirmed.
- Vercel-style "registrar doesn't support DNSSEC" warning links to docs
  on transferring to Cloudflare/Porkbun.
- Gasless path is just instructions, no transaction. Polling button at the
  bottom checks via UniversalResolver every few seconds.
- Onchain path: spinner during proof fetch, then a "submit" step that
  triggers DNSRegistrar.proveAndClaimWithResolver.

## View: Register

```
│  Register .eth                              │
│  ─────────────────────────────────          │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ wylie                          .eth │   │
│  └─────────────────────────────────────┘   │
│  ✓ Available                                │
│                                             │
│  Duration:  [ ─ ]  1 year  [ + ]            │
│  Price:     0.0042 ETH  (~$13)              │
│                                             │
│  ① Commit                                   │
│     hides your name on-chain                │
│     [ Commit ] → confirming…                │
│                                             │
│  ② Wait                                     │
│     60s … 0:54                              │
│                                             │
│  ③ Register                                 │
│     [ Register & pay 0.0042 ETH ]           │
│                                             │
│  ④ Done                                     │
│     wylie.eth is yours                      │
│     [ Set as primary ]  [ Open in detail ]  │
```

- Secret is stored in sessionStorage during the wait so a closed window
  can recover. Warn the user not to close the tab.
- Duration stepper: 1, 2, 3, 5, 10 years. Price recomputes via useEnsPrice.
- Final step offers to set the new name as primary in a follow-up tx
  (or pre-set via the `reverseRecord: true` flag during register).

## Theming notes

All colors via `--berry-*` CSS variables; nothing hard-coded.

- `--berry-window-bg` for surface bg
- `--berry-divider` for borders + section rules
- `--berry-active` for tab fill, button pressed
- `--berry-hover` for hover states
- `--berry-text-muted` for secondary text (expiry, helper copy)

Match WalletPanel's existing visual weight — same fonts, same row heights,
same Mac OS 8-ish chrome. The surfaces should feel like two sides of one
folder.

## Interaction model

- **Swap animation**: CSS opacity 1 → 0 (100ms) → close → launch new → 0 → 1 (100ms).
  Total ~200ms. Less = jarring. More = sluggish.
- **Tab change**: instant, no transition. Tabs are within-surface, not OS-level.
- **Record save**: optimistic UI — fields stay in dirty state until receipt
  confirms, then re-fetch records and clear dirty marks.
- **Wallet not connected**: every view that needs writes shows a Connect CTA
  in place of the action button. Read views (Lookup) work without.

## Avatar picker (NFT selector)

Modal opened from the avatar row in NameDetail's Records section. Lets
the user pick any ERC-721 or ERC-1155 NFT they own as their ENS avatar.

```
┌─────────────────────────────────────────────┐
│  Set avatar                          [×]   │
│  ─────────────────────────────────          │
│                                             │
│  ○ From URL                                 │
│    ┌──────────────────────────────────┐   │
│    │ https://…                        │   │
│    └──────────────────────────────────┘   │
│                                             │
│  ○ From your NFTs                           │
│    ┌──────────────────────────────────┐   │
│    │ [search collections]              │   │
│    └──────────────────────────────────┘   │
│    ┌────┬────┬────┬────┐                 │
│    │img │img │img │img │                 │
│    ├────┼────┼────┼────┤                 │
│    │img │img │img │img │                 │
│    ├────┼────┼────┼────┤                 │
│    │img │img │img │img │                 │
│    └────┴────┴────┴────┘                 │
│    [Load more]                              │
│                                             │
│  Selected: Nouns #1865                      │
│  eip155:1/erc721:0x9C…/1865                 │
│                                             │
│           [ Cancel ]  [ Set as avatar ]     │
```

- Two modes (radio): paste URL/IPFS/data: directly, or pick from owned NFTs.
- NFT grid: pulled from `useMyNfts(address)` (Alchemy NFT v3 with spam
  filter). 4-column grid of square thumbnails. NFTs with no image are
  filtered out server-side.
- Click a thumbnail → highlighted state + shows the ENSIP-12 NFT avatar
  URI (`eip155:1/erc721:…/tokenId`) below the grid.
- Pagination: "Load more" if `useMyNfts` has a next page.
- Search: filter by collection name (client-side filter on already-loaded
  pages; server-side filter not supported by Alchemy without extra params).
- On save: writes the avatar text record via `useSetTextRecord` — for
  NFT-typed avatars, the ENS metadata service resolves the URI to the
  actual image at query time.
- Preview: the row in NameDetail shows the chosen image immediately after
  save (optimistic update via React Query cache).

## Out of scope (future passes)

- L2 ENS writes (Base, Linea) — Universal Resolver handles reads, writes need a chain switcher
- Wrapping unwrapped names (`wrapName` hook works; no view yet)
- IPFS upload for avatars (paste-URL only — NFT selector covers most use cases)
- Notification system integration for tx success/failure
- Keyboard shortcuts (Cmd-N for new register, etc.)
