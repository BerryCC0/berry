# Studio

Pixel-art editor for 32×32 Nouns traits, built into Berry OS as a first-class
app. Artists draw heads / bodies / accessories / glasses, save drafts scoped
to their wallet, and submit finished traits to Camp's proposal builder for an
on-chain `Descriptor.addX(bytes, uint80, uint16)` call wrapped in a signed
CC0 contribution agreement.

## Credit

Studio is heavily inspired by **[Noundry Studio](https://github.com/volkyeth/noundry/tree/main/apps/studio/src)**
by `volkyeth` and contributors. Nouns artwork is CC0 — and so is Noundry's
source — so we lift the drawing model, tool implementations, and RLE
encoding logic with permission of the license. UI is rewritten in Berry's
CSS-module + Primitives stack rather than ported from Chakra.

Where a file is a direct port of Noundry source, an attribution comment is
included at the top.

## Architecture

- **`model/`** — Zustand stores for workspace state, cursor, brush, clipboard,
  selection, and history. Pure logic, ported from Noundry's `model/`.
- **`tools/`** — drawing tool implementations (brush, eraser, eyedropper,
  bucket, line, rectangle, ellipse, move, selection). Pure logic, ported.
- **`components/`** — Berry-native UI: `PixelCanvas`, `ToolboxPanel`,
  `PalettePanel`, `TraitGallery`, `SaveControls`, `SubmitToCampButton`, etc.
- **`hooks/`** — `useDescriptorPalette` (on-chain palette read),
  `useStudioTraits` (API wrapper), `useAutoSave`, `useStudioWorkspace`.
- **`utils/`** — PNG encode/decode helpers, AppBus event helpers.

## Persistence

Traits are saved to Postgres table `studio_traits` (wallet-scoped). The schema
lives in [docs/MIGRATION_NEON_TO_RAILWAY.md](../../../../docs/MIGRATION_NEON_TO_RAILWAY.md)
and the table creation SQL is documented in the studio plan file.

## Submission flow

1. Artist drafts a trait in Studio.
2. Clicks "Submit to Camp" — Studio emits `studio:submit-trait` via Berry's
   AppBus carrying the pixel data + palette snapshot.
3. Camp's proposal builder picks up the event, opens an `ArtworkTraitWizard`
   pre-filled with the trait.
4. Wizard handles palette validation, RLE encoding (via `app/lib/.../artwork/`),
   CC0 agreement signing, and writes back: a single on-chain action plus an
   auto-generated proposal description with the signed agreement block.
5. After successful candidate / proposal submission, Camp emits
   `studio:trait-submitted`. Studio updates the trait's status to `submitted`.
