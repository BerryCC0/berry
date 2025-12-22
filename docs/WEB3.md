# Berry OS - Web3 Integration

> Wallet connection using Reown AppKit.

## Overview

Berry OS uses **Reown AppKit** (formerly WalletConnect) for wallet connections. Wallet connection is **optional** - Berry OS works fully without it.

**With wallet:**
- Data persists across sessions
- Cross-device sync
- Multi-wallet profiles

**Without wallet:**
- Ephemeral session (in-memory)
- Data lost on refresh
- Full functionality during session

---

## Supported Chains

**EVM:**
- Ethereum Mainnet
- Base

**Non-EVM:**
- Solana

---

## Setup

### Installation

```bash
npm install @reown/appkit @reown/appkit-adapter-wagmi wagmi viem @tanstack/react-query
```

### Configuration

```typescript
// /app/lib/Web3/config.ts
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, polygon, base, optimism, arbitrum } from 'viem/chains';

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID!;

const metadata = {
  name: 'Berry OS',
  description: 'Mac OS 8 recreation for the Nouns ecosystem',
  url: 'https://berryos.app',
  icons: ['https://berryos.app/icons/berry.png'],
};

const chains = [mainnet, polygon, base, optimism, arbitrum] as const;

const wagmiAdapter = new WagmiAdapter({
  chains,
  projectId,
});

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  metadata,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
```

### Provider

```typescript
// /app/lib/Web3/Provider.tsx
'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './config';

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### Root Layout

```typescript
// /app/layout.tsx
import { Web3Provider } from './lib/Web3/Provider';
import { PlatformProvider } from '@/OS/lib/PlatformDetection';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>
          <PlatformProvider>
            {children}
          </PlatformProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
```

---

## Wallet Hook

```typescript
// /src/OS/hooks/useWallet.ts
import { useAccount, useDisconnect, useChainId } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useSessionStore } from '@/OS/store/sessionStore';
import { useEffect } from 'react';

export const useWallet = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();
  
  const { 
    connectWallet, 
    disconnectWallet, 
    profile 
  } = useSessionStore();
  
  // Sync wallet state with session store
  useEffect(() => {
    if (isConnected && address) {
      connectWallet({
        address,
        chain: getChainName(chainId),
        chainId,
        linkedAt: Date.now(),
      });
    } else if (!isConnected && profile) {
      disconnectWallet();
    }
  }, [isConnected, address, chainId]);
  
  return {
    isConnected,
    address,
    chainId,
    profile,
    connect: () => open(),
    disconnect: () => disconnect(),
  };
};

const getChainName = (chainId: number): string => {
  const chains: Record<number, string> = {
    1: 'ethereum',
    137: 'polygon',
    8453: 'base',
    10: 'optimism',
    42161: 'arbitrum',
  };
  return chains[chainId] || 'unknown';
};
```

---

## Wallet Panel

OS app for wallet management:

```typescript
// /src/OS/Apps/WalletPanel/WalletPanel.tsx
import { useWallet } from '@/OS/hooks/useWallet';
import styles from './WalletPanel.module.css';

const WalletPanel = () => {
  const { isConnected, address, profile, connect, disconnect } = useWallet();
  
  if (!isConnected) {
    return (
      <div className={styles.disconnected}>
        <div className={styles.icon}>🔓</div>
        <h2>Connect Wallet</h2>
        <p>
          Connect your wallet to save your Berry OS customizations 
          across sessions and devices.
        </p>
        <button onClick={connect} className={styles.connectButton}>
          Connect Wallet
        </button>
        <p className={styles.note}>
          Your wallet is only used as a key for saving preferences.
        </p>
      </div>
    );
  }
  
  return (
    <div className={styles.connected}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          {address?.slice(0, 2)}
        </div>
        <div className={styles.info}>
          <span className={styles.status}>Connected</span>
          <span className={styles.address}>
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
      </div>
      
      {profile && (
        <div className={styles.section}>
          <h3>Linked Wallets</h3>
          <ul className={styles.walletList}>
            <li className={styles.primaryWallet}>
              <span>
                {profile.primaryWallet.address.slice(0, 6)}...
                {profile.primaryWallet.address.slice(-4)}
              </span>
              <span className={styles.badge}>Primary</span>
            </li>
            {profile.linkedWallets.map((wallet) => (
              <li key={wallet.address}>
                <span>
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </span>
                <span className={styles.chain}>{wallet.chain}</span>
              </li>
            ))}
          </ul>
          <button onClick={connect} className={styles.linkButton}>
            Link Another Wallet
          </button>
        </div>
      )}
      
      <button onClick={disconnect} className={styles.disconnectButton}>
        Disconnect
      </button>
    </div>
  );
};

export default WalletPanel;
```

---

## Menu Bar Integration

```typescript
// /src/OS/components/MenuBar/WalletButton.tsx
import { useWallet } from '@/OS/hooks/useWallet';
import { appLauncher } from '@/OS/lib/AppLauncher';
import styles from './WalletButton.module.css';

export const WalletButton = () => {
  const { isConnected, address } = useWallet();
  
  const handleClick = () => {
    appLauncher.launch('wallet-panel');
  };
  
  return (
    <button onClick={handleClick} className={styles.walletButton}>
      {isConnected ? (
        <>
          <span className={styles.indicator}>●</span>
          <span>{address?.slice(0, 4)}...{address?.slice(-3)}</span>
        </>
      ) : (
        <span>Connect</span>
      )}
    </button>
  );
};
```

---

## Session Flow

### First Connection

```
1. User clicks "Connect Wallet"
2. Reown AppKit modal opens
3. User selects wallet and connects
4. useWallet hook detects connection
5. sessionStore.connectWallet() called
   ├── Check if wallet exists in database
   ├── If exists: Load existing profile
   └── If new: Create new profile
6. Migrate ephemeral state to database
7. User sees "Connected" status
```

### Returning User

```
1. User visits Berry OS
2. Page loads with ephemeral session
3. User connects same wallet
4. Profile found in database
5. Saved state restored
6. User sees their customizations
```

---

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id

# Get from: https://cloud.reown.com/
```

---

## Security Notes

1. **No auto-signing**: Never sign without user approval
2. **Read-only by default**: Only reads chain data
3. **Wallet as key**: Address used only as persistence key
4. **No private keys**: Never has access to private keys

---

## Testing Checklist

- [ ] Connect button opens Reown modal
- [ ] Can connect with MetaMask
- [ ] Can connect with WalletConnect
- [ ] Address displays correctly
- [ ] Profile created on first connect
- [ ] Profile restored on reconnect
- [ ] Linking second wallet works
- [ ] Disconnect works
- [ ] Works on mobile browsers
- [ ] Works in Farcaster app