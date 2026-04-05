# Berry OS

A browser-based operating system for the Nouns DAO ecosystem. Berry OS recreates the Mac OS 8 desktop experience — windows, dock, menu bar, filesystem, theming — with 17 built-in applications for governance, auctions, treasury, messaging, and more. All backed by on-chain data indexed from Nouns smart contracts.

**Live at:** [berry.nouns.com](https://berry.nouns.com) (Vercel)
**Indexer:** [berryos.up.railway.app](https://berryos.up.railway.app) (Railway)

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, React 19, TypeScript |
| State | Zustand stores + typed EventBus |
| Styling | CSS Modules (no Tailwind), CSS custom properties |
| Web3 | Reown AppKit, wagmi, viem (EVM + Solana + Bitcoin) |
| Database | Neon Postgres (serverless) |
| Indexer | Ponder (Ethereum event indexer) |
| Messaging | XMTP (end-to-end encrypted) |
| Deployment | Vercel (frontend), Railway (indexer) |

## Architecture

```
berry/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout + providers
│   ├── page.tsx                  # Boot sequence → desktop
│   ├── [appId]/[[...params]]/    # Deep link routing
│   ├── s/[shortId]/              # Short link resolution
│   ├── api/                      # 40+ API routes
│   └── lib/
│       ├── Web3/                 # AppKit + wagmi config
│       ├── nouns/                # ABIs, hooks, contracts, rendering
│       ├── bim/                  # Messaging DB helpers
│       └── ponder-db.ts          # Ponder SQL client
│
├── src/OS/                       # Operating system layer
│   ├── components/               # Desktop, Dock, MenuBar, Window, Launchpad
│   ├── store/                    # 9 Zustand stores
│   ├── lib/                      # WindowManager, AppLauncher, Persistence, EventBus, i18n
│   ├── hooks/                    # Boot, wallet, persistence, settings hooks
│   ├── types/                    # App, window, theme, event, platform types
│   └── Apps/                     # 17 built-in applications
│       ├── NounsAuction/         # Live auction bidding + history
│       ├── Camp/                 # Governance (proposals, candidates, voters, activity)
│       ├── Clients/              # Client incentive rewards dashboard
│       ├── Probe/                # Noun explorer with trait filtering
│       ├── Treasury/             # DAO treasury balances + held Nouns
│       ├── CrystalBall/          # Next-noun predictor + auction settler
│       ├── Nounspot/             # Physical locations map (Three.js globe)
│       ├── BIM/                  # XMTP messaging (servers, channels, DMs)
│       ├── WalletPanel/          # Wallet connection + token balances
│       ├── Finder/               # Virtual filesystem browser
│       ├── Settings/             # OS preferences (8 panels)
│       ├── Calculator/           # Basic calculator
│       ├── TextEditor/           # Text/markdown/CSV viewer
│       ├── ImageViewer/          # Image viewer with zoom/pan/rotate
│       ├── SoundJam/             # Audio player with waveform
│       ├── MoviePlayer/          # Video player
│       └── PDFViewer/            # PDF viewer
│
├── ponder/                       # Ethereum event indexer (separate service)
│   ├── ponder.config.ts          # 9 contracts, Mainnet
│   ├── ponder.schema.ts          # 40+ tables across 3 subgraphs
│   └── src/
│       ├── core/                 # NounsToken, AuctionHouse, Descriptor
│       ├── governance/           # NounsDAO, NounsDAOData
│       ├── treasury/             # ClientRewards, Treasury, Payer, Streams
│       ├── helpers/              # ENS resolution
│       └── api/                  # Hono REST API (40+ endpoints)
│
├── messages/                     # i18n (en, es, pt, de, ja, zh, ko)
├── public/
│   ├── filesystem/               # Virtual filesystem content
│   └── icons/                    # App and file type icons
└── docs/                         # Architecture documentation (20 files)
```

## Key Concepts

**OS Shell.** Desktop, Dock, MenuBar, Window manager, and Launchpad provide the operating system chrome. Windows are draggable and resizable on desktop, fullscreen on mobile. Platform detection adapts the entire UI for desktop, tablet, mobile, and Farcaster miniapp contexts.

**Apps.** Each app is a React component that receives window control callbacks (`onClose`, `onMinimize`, `onTitleChange`, `onStateChange`). Apps are lazy-loaded, wrapped in error boundaries, and registered in `OSAppConfig.ts`. Singleton apps (Calculator, Settings) allow only one instance; others support multiple windows.

**Persistence.** Without a wallet, state is ephemeral (in-memory). When a wallet connects, Berry OS upgrades to persistent storage (Neon Postgres), saving themes, settings, desktop layout, dock config, and window states. All user data is keyed by wallet address.

**Ponder Indexer.** A separate service indexes 9 Nouns smart contracts into Postgres. The frontend queries this via SQL (`ponder_live.*` schema) and REST API. Zero-downtime deployments via per-deployment schema with live views.

**Client Rewards.** Berry OS is registered as Client ID 11 in the Nouns client incentive system. The client ID is threaded through auction bids and governance votes to earn protocol rewards.

## Development

```bash
# Install dependencies
npm install

# Run the frontend
npm run dev

# Run the indexer (separate terminal, from repo root)
cd ponder && npm install && npm run dev
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and configure:

- `NEXT_PUBLIC_REOWN_PROJECT_ID` — Reown AppKit project ID
- `DATABASE_URL` — Neon Postgres connection string
- `PONDER_RPC_URL_1` — Ethereum RPC for the indexer
- `ALCHEMY_API_KEY` — Alchemy (sale detection, traces)
- `TENDERLY_ACCESS_KEY` — Tenderly (proposal simulation)
- `GOOGLE_TRANSLATE_API_KEY` — Google Cloud Translation
- `MORALIS_API_KEY` — Moralis (token balances)
- `NEXT_PUBLIC_PERSONA_TEMPLATE_ID` — Persona (KYC for proposal creation)

### Scripts

- `npm run dev` — Start development server
- `npm run build` — Build for production (generates filesystem index first)
- `npm run lint` — ESLint
- `npm run generate-fs-index` — Regenerate virtual filesystem `_index.json` files

## Documentation

All architecture docs live in [`/docs`](./docs/):

| Document | Covers |
|----------|--------|
| [ARCHITECTURE](docs/ARCHITECTURE.md) | System layers, stores, event bus, initialization |
| [APPS](docs/APPS.md) | App structure, registration, lifecycle, permissions |
| [WINDOW_MANAGEMENT](docs/WINDOW_MANAGEMENT.md) | Window state, dragging, resizing, z-index |
| [STYLING](docs/STYLING.md) | CSS Modules, theming, Mac OS 8 aesthetic |
| [ROUTING](docs/ROUTING.md) | Deep linking, URL structure, short links |
| [PERSISTENCE](docs/PERSISTENCE.md) | Storage strategy, wallet identity, auto-save |
| [WEB3](docs/WEB3.md) | Wallet connection, multi-chain support |
| [NOUNS](docs/NOUNS.md) | Contract addresses, ABIs, treasury tokens |
| [PONDER](docs/PONDER.md) | Indexer architecture, schema, deployment |
| [API](docs/API.md) | API route reference (40+ endpoints) |
| [CAMP](docs/CAMP.md) | Governance app (proposals, candidates, voting) |
| [CLIENTS](docs/CLIENTS.md) | Client incentive rewards dashboard |
| [BIM](docs/BIM.md) | XMTP messaging system |
| [PROBE](docs/PROBE.md) | Noun explorer |
| [CRYSTAL_BALL](docs/CRYSTAL_BALL.md) | Auction predictor |
| [NOUNSPOT](docs/NOUNSPOT.md) | Physical locations directory |
| [I18N](docs/I18N.md) | Internationalization (7 languages) |
| [MOBILE](docs/MOBILE.md) | Touch interactions, responsive design |
| [FARCASTER](docs/FARCASTER.md) | Farcaster miniapp integration |
| [SECURITY](docs/SECURITY.md) | Input sanitization, XSS, wallet security |
| [PERFORMANCE](docs/PERFORMANCE.md) | Bundle size, code splitting, re-renders |
| [FILESYSTEM](docs/FILESYSTEM.md) | Virtual filesystem design |
| [SYSTEM_SETTINGS](docs/SYSTEM_SETTINGS.md) | User preferences, accessibility |
| [STATE_SERIALIZATION](docs/STATE_SERIALIZATION.md) | Serializable state patterns |
| [NOTIFICATIONS](docs/NOTIFICATIONS.md) | Notification system |
| [TENDERLY_SIMULATION](docs/TENDERLY_SIMULATION.md) | Proposal simulation |
| [MEDIA_APPS](docs/MEDIA_APPS.md) | TextEditor, ImageViewer, SoundJam, MoviePlayer, PDFViewer |
| [PHASES](docs/PHASES.md) | Implementation status |

## License

Part of the Nouns ecosystem. All Nouns artwork is CC0 (public domain).
