# Berry OS - Persistence

> Storage strategy, multi-wallet identity, and data flow.

## Overview

Berry OS supports two persistence modes:

| Mode | When | Storage | Durability |
|------|------|---------|------------|
| **Ephemeral** | No wallet connected | In-memory | Lost on refresh |
| **Persistent** | Wallet connected | Neon Postgres | Survives refresh, cross-device |

All features work in both modes. Connecting a wallet upgrades to persistent storage.

---

## Multi-Wallet Identity

Users can link multiple wallets to a single Berry OS profile.

### Concepts

- **Primary Wallet**: Main display wallet, used as profile identifier
- **Linked Wallets**: Additional wallets associated with the profile
- **Profile**: Collection of all user data (themes, layouts, settings)

### UX Flows

#### First-Time User (No Wallet)

```
User visits Berry OS
    │
    ▼
Berry OS loads with ephemeral session
    │
    ▼
User customizes theme, opens apps
(all state in memory)
    │
    ▼
User clicks "Connect Wallet"
    │
    ▼
Reown modal opens → User connects Wallet A
    │
    ▼
Check: Does Wallet A exist in database?
    │
    ├─ NO: Create new profile
    │       └─► Wallet A = primary
    │       └─► Migrate ephemeral state to database
    │       └─► "Welcome! Your preferences are now saved."
    │
    └─ YES: Load existing profile
            └─► "Welcome back! Restoring your preferences..."
            └─► Ephemeral state discarded, saved state loaded
```

#### Linking Additional Wallet

```
User is connected with Wallet A (has profile)
    │
    ▼
User opens Wallet Panel → clicks "Link Another Wallet"
    │
    ▼
Reown modal opens → User connects Wallet B
    │
    ▼
Check: Does Wallet B exist in database?
    │
    ├─ NO: Link to current profile
    │       └─► Wallet B added to profile.linkedWallets
    │       └─► "Wallet linked! You can now access your profile from either wallet."
    │
    └─ YES (different profile): Conflict!
            └─► "This wallet is linked to another profile."
            └─► Options:
                 • "Use that profile instead" (switch profiles)
                 • "Merge profiles" (future feature, complex)
                 • "Cancel"
```

#### Returning User

```
User visits Berry OS (no wallet connected yet)
    │
    ▼
Berry OS loads with ephemeral session
    │
    ▼
User clicks "Connect Wallet"
    │
    ▼
User connects Wallet B (which is linked to a profile)
    │
    ▼
Profile found → Load saved state
    │
    ▼
"Welcome back!" + restore theme, windows, layout
```

#### Switching Wallets in Reown

**Question answered:** What happens when user switches wallets in the Reown modal?

```
User is connected with Wallet A
    │
    ▼
User opens Reown modal → switches to Wallet B
    │
    ▼
Berry OS receives wallet change event
    │
    ▼
Check: Is Wallet B linked to same profile as Wallet A?
    │
    ├─ YES (same profile): No action needed
    │       └─► Just update displayed address
    │
    ├─ NO (different profile): Profile switch
    │       └─► Save current state to Wallet A's profile
    │       └─► Load Wallet B's profile
    │       └─► Apply new theme, layout, etc.
    │
    └─ NO (Wallet B has no profile): Offer to link
            └─► "Link this wallet to your current profile?"
            └─► Yes: Add to linkedWallets
            └─► No: Create separate profile (loses current state)
```

### Data Model

```typescript
interface UserProfile {
  id: string;                         // Internal profile ID (UUID)
  primaryWallet: WalletInfo;
  linkedWallets: WalletInfo[];
  createdAt: number;
  lastActiveAt: number;
}

interface WalletInfo {
  address: string;                    // Wallet address
  chain: string;                      // 'ethereum', 'polygon', 'solana', etc.
  chainId: number;                    // Chain ID (1 for mainnet, etc.)
  linkedAt: number;                   // When this wallet was linked
  label?: string;                     // User-defined label ("My Ledger")
}
```

---

## Database Schema

```sql
-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW()
);

-- Wallets (many-to-one with profiles)
CREATE TABLE wallets (
  address VARCHAR(66) NOT NULL,
  chain VARCHAR(20) NOT NULL,
  chain_id INTEGER NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  label VARCHAR(100),
  linked_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (address, chain)
);

-- User themes
CREATE TABLE user_themes (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme_data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Desktop layouts
CREATE TABLE desktop_layouts (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  layout_data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Window states
CREATE TABLE window_states (
  id SERIAL PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  window_id VARCHAR(50) NOT NULL,
  state_data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Dock configuration
CREATE TABLE dock_configs (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  config_data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- App-specific state
CREATE TABLE app_states (
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  app_id VARCHAR(50) NOT NULL,
  state_data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (profile_id, app_id)
);

-- Indexes
CREATE UNIQUE INDEX idx_primary_wallet ON wallets(profile_id) WHERE is_primary = TRUE;
CREATE INDEX idx_wallet_profile ON wallets(profile_id);
CREATE INDEX idx_window_states_profile ON window_states(profile_id);
```

---

## Persistence Interface

```typescript
// /src/OS/lib/Persistence.ts
interface PersistenceAdapter {
  // Profile management
  getProfileByWallet(address: string, chain: string): Promise<UserProfile | null>;
  createProfile(wallet: WalletInfo): Promise<UserProfile>;
  linkWallet(profileId: string, wallet: WalletInfo): Promise<void>;
  unlinkWallet(profileId: string, address: string, chain: string): Promise<void>;
  setPrimaryWallet(profileId: string, address: string, chain: string): Promise<void>;
  
  // Theme
  saveTheme(profileId: string, theme: Theme): Promise<void>;
  loadTheme(profileId: string): Promise<Theme | null>;
  
  // Desktop layout
  saveDesktopLayout(profileId: string, layout: DesktopLayout): Promise<void>;
  loadDesktopLayout(profileId: string): Promise<DesktopLayout | null>;
  
  // Window state
  saveWindowState(profileId: string, windows: WindowState[]): Promise<void>;
  loadWindowState(profileId: string): Promise<WindowState[]>;
  
  // Dock configuration
  saveDockConfig(profileId: string, config: DockConfig): Promise<void>;
  loadDockConfig(profileId: string): Promise<DockConfig | null>;
  
  // App-specific state
  saveAppState(profileId: string, appId: string, state: unknown): Promise<void>;
  loadAppState(profileId: string, appId: string): Promise<unknown | null>;
  
  // Bulk operations
  loadAllUserData(profileId: string): Promise<UserData>;
  clearAllUserData(profileId: string): Promise<void>;
}

interface UserData {
  theme: Theme | null;
  desktopLayout: DesktopLayout | null;
  windowState: WindowState[];
  dockConfig: DockConfig | null;
  appStates: Record<string, unknown>;
}
```

---

## In-Memory Adapter

For ephemeral sessions (no wallet):

```typescript
class InMemoryAdapter implements PersistenceAdapter {
  private data = new Map<string, unknown>();
  
  private key(profileId: string, type: string): string {
    return `${profileId}:${type}`;
  }
  
  async saveTheme(profileId: string, theme: Theme): Promise<void> {
    this.data.set(this.key(profileId, 'theme'), theme);
  }
  
  async loadTheme(profileId: string): Promise<Theme | null> {
    return this.data.get(this.key(profileId, 'theme')) as Theme || null;
  }
  
  async saveDesktopLayout(profileId: string, layout: DesktopLayout): Promise<void> {
    this.data.set(this.key(profileId, 'desktop'), layout);
  }
  
  async loadDesktopLayout(profileId: string): Promise<DesktopLayout | null> {
    return this.data.get(this.key(profileId, 'desktop')) as DesktopLayout || null;
  }
  
  async saveWindowState(profileId: string, windows: WindowState[]): Promise<void> {
    this.data.set(this.key(profileId, 'windows'), windows);
  }
  
  async loadWindowState(profileId: string): Promise<WindowState[]> {
    return this.data.get(this.key(profileId, 'windows')) as WindowState[] || [];
  }
  
  async saveDockConfig(profileId: string, config: DockConfig): Promise<void> {
    this.data.set(this.key(profileId, 'dock'), config);
  }
  
  async loadDockConfig(profileId: string): Promise<DockConfig | null> {
    return this.data.get(this.key(profileId, 'dock')) as DockConfig || null;
  }
  
  async saveAppState(profileId: string, appId: string, state: unknown): Promise<void> {
    this.data.set(this.key(profileId, `app:${appId}`), state);
  }
  
  async loadAppState(profileId: string, appId: string): Promise<unknown | null> {
    return this.data.get(this.key(profileId, `app:${appId}`)) || null;
  }
  
  async loadAllUserData(profileId: string): Promise<UserData> {
    return {
      theme: await this.loadTheme(profileId),
      desktopLayout: await this.loadDesktopLayout(profileId),
      windowState: await this.loadWindowState(profileId),
      dockConfig: await this.loadDockConfig(profileId),
      appStates: {},
    };
  }
  
  async clearAllUserData(profileId: string): Promise<void> {
    const prefix = `${profileId}:`;
    for (const key of this.data.keys()) {
      if (key.startsWith(prefix)) {
        this.data.delete(key);
      }
    }
  }
  
  // Profile methods (no-op for in-memory)
  async getProfileByWallet(): Promise<UserProfile | null> { return null; }
  async createProfile(wallet: WalletInfo): Promise<UserProfile> {
    return {
      id: 'ephemeral',
      primaryWallet: wallet,
      linkedWallets: [],
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };
  }
  async linkWallet(): Promise<void> {}
  async unlinkWallet(): Promise<void> {}
  async setPrimaryWallet(): Promise<void> {}
}
```

---

## Neon Postgres Adapter

For persistent sessions (wallet connected):

```typescript
import { neon } from '@neondatabase/serverless';

class NeonAdapter implements PersistenceAdapter {
  private sql: ReturnType<typeof neon>;
  
  constructor() {
    this.sql = neon(process.env.DATABASE_URL!);
  }
  
  async getProfileByWallet(address: string, chain: string): Promise<UserProfile | null> {
    const result = await this.sql`
      SELECT p.*, w.address, w.chain, w.chain_id, w.is_primary, w.label, w.linked_at
      FROM profiles p
      JOIN wallets w ON w.profile_id = p.id
      WHERE w.address = ${address} AND w.chain = ${chain}
    `;
    
    if (result.length === 0) return null;
    
    const wallets = await this.sql`
      SELECT * FROM wallets WHERE profile_id = ${result[0].id}
    `;
    
    return this.mapToUserProfile(result[0], wallets);
  }
  
  async createProfile(wallet: WalletInfo): Promise<UserProfile> {
    const profileResult = await this.sql`
      INSERT INTO profiles DEFAULT VALUES RETURNING *
    `;
    
    const profileId = profileResult[0].id;
    
    await this.sql`
      INSERT INTO wallets (address, chain, chain_id, profile_id, is_primary)
      VALUES (${wallet.address}, ${wallet.chain}, ${wallet.chainId}, ${profileId}, TRUE)
    `;
    
    return {
      id: profileId,
      primaryWallet: wallet,
      linkedWallets: [],
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };
  }
  
  async linkWallet(profileId: string, wallet: WalletInfo): Promise<void> {
    await this.sql`
      INSERT INTO wallets (address, chain, chain_id, profile_id, is_primary)
      VALUES (${wallet.address}, ${wallet.chain}, ${wallet.chainId}, ${profileId}, FALSE)
    `;
  }
  
  async saveTheme(profileId: string, theme: Theme): Promise<void> {
    await this.sql`
      INSERT INTO user_themes (profile_id, theme_data)
      VALUES (${profileId}, ${JSON.stringify(theme)})
      ON CONFLICT (profile_id)
      DO UPDATE SET theme_data = ${JSON.stringify(theme)}, updated_at = NOW()
    `;
  }
  
  async loadTheme(profileId: string): Promise<Theme | null> {
    const result = await this.sql`
      SELECT theme_data FROM user_themes WHERE profile_id = ${profileId}
    `;
    if (result.length === 0) return null;
    return JSON.parse(result[0].theme_data);
  }
  
  async saveDesktopLayout(profileId: string, layout: DesktopLayout): Promise<void> {
    await this.sql`
      INSERT INTO desktop_layouts (profile_id, layout_data)
      VALUES (${profileId}, ${JSON.stringify(layout)})
      ON CONFLICT (profile_id)
      DO UPDATE SET layout_data = ${JSON.stringify(layout)}, updated_at = NOW()
    `;
  }
  
  async loadDesktopLayout(profileId: string): Promise<DesktopLayout | null> {
    const result = await this.sql`
      SELECT layout_data FROM desktop_layouts WHERE profile_id = ${profileId}
    `;
    if (result.length === 0) return null;
    return JSON.parse(result[0].layout_data);
  }
  
  async saveWindowState(profileId: string, windows: WindowState[]): Promise<void> {
    await this.sql`DELETE FROM window_states WHERE profile_id = ${profileId}`;
    
    for (const window of windows) {
      await this.sql`
        INSERT INTO window_states (profile_id, window_id, state_data)
        VALUES (${profileId}, ${window.id}, ${JSON.stringify(window)})
      `;
    }
  }
  
  async loadWindowState(profileId: string): Promise<WindowState[]> {
    const result = await this.sql`
      SELECT state_data FROM window_states WHERE profile_id = ${profileId}
    `;
    return result.map(row => JSON.parse(row.state_data));
  }
  
  async saveAppState(profileId: string, appId: string, state: unknown): Promise<void> {
    await this.sql`
      INSERT INTO app_states (profile_id, app_id, state_data)
      VALUES (${profileId}, ${appId}, ${JSON.stringify(state)})
      ON CONFLICT (profile_id, app_id)
      DO UPDATE SET state_data = ${JSON.stringify(state)}, updated_at = NOW()
    `;
  }
  
  async loadAppState(profileId: string, appId: string): Promise<unknown | null> {
    const result = await this.sql`
      SELECT state_data FROM app_states 
      WHERE profile_id = ${profileId} AND app_id = ${appId}
    `;
    if (result.length === 0) return null;
    return JSON.parse(result[0].state_data);
  }
  
  async loadAllUserData(profileId: string): Promise<UserData> {
    const [theme, layout, windows, dock] = await Promise.all([
      this.loadTheme(profileId),
      this.loadDesktopLayout(profileId),
      this.loadWindowState(profileId),
      this.loadDockConfig(profileId),
    ]);
    
    return { theme, desktopLayout: layout, windowState: windows, dockConfig: dock, appStates: {} };
  }
  
  async clearAllUserData(profileId: string): Promise<void> {
    await this.sql`DELETE FROM profiles WHERE id = ${profileId}`;
  }
  
  private mapToUserProfile(profile: any, wallets: any[]): UserProfile {
    const primary = wallets.find(w => w.is_primary);
    const linked = wallets.filter(w => !w.is_primary);
    
    return {
      id: profile.id,
      primaryWallet: {
        address: primary.address,
        chain: primary.chain,
        chainId: primary.chain_id,
        linkedAt: new Date(primary.linked_at).getTime(),
        label: primary.label,
      },
      linkedWallets: linked.map(w => ({
        address: w.address,
        chain: w.chain,
        chainId: w.chain_id,
        linkedAt: new Date(w.linked_at).getTime(),
        label: w.label,
      })),
      createdAt: new Date(profile.created_at).getTime(),
      lastActiveAt: new Date(profile.last_active_at).getTime(),
    };
  }
}
```

---

## Persistence Manager

Switches between adapters automatically:

```typescript
class PersistenceManager {
  private adapter: PersistenceAdapter;
  private profileId: string | null = null;
  
  constructor() {
    this.adapter = new InMemoryAdapter();
    this.profileId = 'ephemeral';
  }
  
  async upgradeToWallet(profile: UserProfile): Promise<void> {
    // Get current ephemeral data
    const currentData = await this.adapter.loadAllUserData(this.profileId!);
    
    // Switch to Neon
    this.adapter = new NeonAdapter();
    this.profileId = profile.id;
    
    // Migrate data
    if (currentData.theme) {
      await this.adapter.saveTheme(profile.id, currentData.theme);
    }
    if (currentData.desktopLayout) {
      await this.adapter.saveDesktopLayout(profile.id, currentData.desktopLayout);
    }
    if (currentData.windowState.length) {
      await this.adapter.saveWindowState(profile.id, currentData.windowState);
    }
    if (currentData.dockConfig) {
      await this.adapter.saveDockConfig(profile.id, currentData.dockConfig);
    }
  }
  
  downgradeToEphemeral(): void {
    this.adapter = new InMemoryAdapter();
    this.profileId = 'ephemeral';
  }
  
  // Proxy methods
  async saveTheme(theme: Theme): Promise<void> {
    if (!this.profileId) return;
    await this.adapter.saveTheme(this.profileId, theme);
  }
  
  async loadTheme(): Promise<Theme | null> {
    if (!this.profileId) return null;
    return this.adapter.loadTheme(this.profileId);
  }
  
  async saveDesktopLayout(layout: DesktopLayout): Promise<void> {
    if (!this.profileId) return;
    await this.adapter.saveDesktopLayout(this.profileId, layout);
  }
  
  async loadDesktopLayout(): Promise<DesktopLayout | null> {
    if (!this.profileId) return null;
    return this.adapter.loadDesktopLayout(this.profileId);
  }
  
  // ... similar for other methods
  
  async loadAllUserData(): Promise<UserData | null> {
    if (!this.profileId) return null;
    return this.adapter.loadAllUserData(this.profileId);
  }
}

export const persistence = new PersistenceManager();
```

---

## Auto-Save Strategy

### Debounce Settings

| Data Type | Debounce | Trigger |
|-----------|----------|---------|
| Theme | Immediate | On change |
| Desktop icons | 2 seconds | After drag |
| Window position | 2 seconds | After drag |
| App state | 2 seconds | On change |

### Implementation

```typescript
import { debounce } from 'lodash-es';

const debouncedSaveDesktop = debounce(async (layout: DesktopLayout) => {
  await persistence.saveDesktopLayout(layout);
}, 2000);

const debouncedSaveWindows = debounce(async (windows: WindowState[]) => {
  await persistence.saveWindowState(windows);
}, 2000);

// Flush on page hide
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      debouncedSaveDesktop.flush();
      debouncedSaveWindows.flush();
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

---

## Data Types

```typescript
interface DesktopLayout {
  icons: DesktopIcon[];
  gridSize: number;
  snapToGrid: boolean;
}

interface DesktopIcon {
  id: string;
  appId: string;
  label: string;
  icon: string;
  x: number;
  y: number;
}

interface WindowState {
  id: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  zIndex: number;
  appState?: unknown;
}

interface DockConfig {
  position: 'bottom' | 'left' | 'right';
  size: number;
  pinnedApps: string[];
}
```

---

## Environment Variables

```env
# .env.local
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
```

---

## Testing Checklist

- [ ] Without wallet: Changes persist during session
- [ ] Without wallet: Changes lost on refresh
- [ ] Connect wallet: Profile created
- [ ] Connect wallet: Ephemeral data migrates
- [ ] Refresh: State restored
- [ ] Disconnect: Return to ephemeral
- [ ] Reconnect: State restored
- [ ] Link wallet: Same profile accessible
- [ ] Multiple chains: Works correctly