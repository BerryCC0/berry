# Berry OS - Farcaster Integration

> Miniapp integration and launching other miniapps.

## Overview

Berry OS runs as a Farcaster miniapp. When running inside Farcaster (Warpcast), Berry OS:
- Detects the Farcaster context
- Uses mobile styling
- Can access Farcaster user information
- Can launch other Farcaster miniapps

**Documentation:** https://miniapps.farcaster.xyz/docs/getting-started

---

## Detection

Berry OS detects Farcaster by checking for the SDK context:

```typescript
// PlatformDetection.ts
const detectPlatform = (): PlatformInfo => {
  // Check for Farcaster miniapp context
  if (typeof window !== 'undefined' && (window as any).sdk?.context) {
    return {
      type: 'farcaster',
      isTouchDevice: true,
      isFarcaster: true,
      // ... other properties
    };
  }
  
  // ... other platform detection
};
```

---

## Farcaster SDK Setup

### Installation

```bash
npm install @farcaster/frame-sdk
```

### Initialization

```typescript
// /src/OS/lib/FarcasterIntegration.ts
import { sdk } from '@farcaster/frame-sdk';

class FarcasterIntegration {
  private initialized = false;
  private context: FrameContext | null = null;
  
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Get context from Farcaster
      this.context = await sdk.context;
      
      // Signal ready to Farcaster
      await sdk.actions.ready();
      
      this.initialized = true;
      
      console.log('Farcaster context:', this.context);
    } catch (error) {
      console.error('Failed to initialize Farcaster:', error);
    }
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
  
  getContext(): FrameContext | null {
    return this.context;
  }
  
  /**
   * Get current Farcaster user info
   */
  getUser(): FarcasterUser | null {
    if (!this.context?.user) return null;
    
    return {
      fid: this.context.user.fid,
      username: this.context.user.username,
      displayName: this.context.user.displayName,
      pfpUrl: this.context.user.pfpUrl,
    };
  }
  
  /**
   * Launch another Farcaster miniapp
   */
  async launchMiniapp(url: string): Promise<void> {
    if (!this.initialized) {
      console.warn('Farcaster not initialized');
      return;
    }
    
    try {
      await sdk.actions.openUrl(url);
    } catch (error) {
      console.error('Failed to launch miniapp:', error);
    }
  }
  
  /**
   * Close the Berry OS miniapp
   */
  async close(): Promise<void> {
    if (!this.initialized) return;
    
    try {
      await sdk.actions.close();
    } catch (error) {
      console.error('Failed to close miniapp:', error);
    }
  }
}

export const farcaster = new FarcasterIntegration();
```

### Types

```typescript
interface FrameContext {
  user?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  client?: {
    clientFid: number;
    added: boolean;
  };
}

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}
```

---

## Initialization Flow

```typescript
// app/layout.tsx or OS initialization
useEffect(() => {
  const platform = detectPlatform();
  
  if (platform.isFarcaster) {
    farcaster.initialize().then(() => {
      const user = farcaster.getUser();
      if (user) {
        console.log(`Hello, ${user.displayName || user.username}!`);
      }
    });
  }
}, []);
```

---

## Launching Other Miniapps

Berry OS can launch other Farcaster miniapps as "external apps":

```typescript
// In an app or system component
import { farcaster } from '@/OS/lib/FarcasterIntegration';

const launchExternalMiniapp = async (miniappUrl: string) => {
  if (!farcaster.isInitialized()) {
    // Not in Farcaster, open in new tab
    window.open(miniappUrl, '_blank');
    return;
  }
  
  await farcaster.launchMiniapp(miniappUrl);
};

// Usage
<button onClick={() => launchExternalMiniapp('https://some-miniapp.com')}>
  Launch Other App
</button>
```

### Miniapp Directory

Berry OS could have a directory of popular Farcaster miniapps:

```typescript
const miniappDirectory = [
  {
    id: 'paragraph',
    name: 'Paragraph',
    url: 'https://paragraph.xyz',
    icon: '/icons/paragraph.png',
    description: 'Write and publish',
  },
  {
    id: 'zora',
    name: 'Zora',
    url: 'https://zora.co',
    icon: '/icons/zora.png',
    description: 'Mint and collect',
  },
  // ... more miniapps
];
```

---

## User Context

Use Farcaster user info in Berry OS:

```typescript
// Hook to get Farcaster user
const useFarcasterUser = () => {
  const { isFarcaster } = usePlatform();
  const [user, setUser] = useState<FarcasterUser | null>(null);
  
  useEffect(() => {
    if (isFarcaster) {
      farcaster.initialize().then(() => {
        setUser(farcaster.getUser());
      });
    }
  }, [isFarcaster]);
  
  return user;
};

// Usage in component
const ProfileWidget = () => {
  const farcasterUser = useFarcasterUser();
  
  if (farcasterUser) {
    return (
      <div className={styles.profile}>
        <img src={farcasterUser.pfpUrl} alt="" />
        <span>{farcasterUser.displayName || farcasterUser.username}</span>
      </div>
    );
  }
  
  return <WalletButton />;
};
```

---

## Frame Size

Farcaster miniapps run in a specific frame size. Berry OS adapts:

```typescript
// Farcaster frames are typically:
// - Mobile width (similar to phone)
// - Variable height based on content

// Berry OS uses mobile styles for Farcaster
// See MOBILE.md for mobile styling details
```

---

## Actions Available

The Farcaster SDK provides these actions:

```typescript
// Open a URL (can be another miniapp)
await sdk.actions.openUrl('https://example.com');

// Close the miniapp
await sdk.actions.close();

// Signal ready (call after initialization)
await sdk.actions.ready();

// View a cast
await sdk.actions.viewCast({ hash: '0x...' });

// View a profile
await sdk.actions.viewProfile({ fid: 123 });
```

---

## Conditional Features

Some features only make sense in Farcaster:

```typescript
const ShareButton = () => {
  const { isFarcaster } = usePlatform();
  
  // Different share behavior based on context
  const handleShare = async () => {
    if (isFarcaster) {
      // Use Farcaster sharing (future SDK feature)
      // For now, could compose a cast
    } else {
      // Use Web Share API or clipboard
      await navigator.share({ url: window.location.href });
    }
  };
  
  return <button onClick={handleShare}>Share</button>;
};
```

---

## Testing in Farcaster

### Local Development

1. Run dev server: `npm run dev`
2. Use ngrok or similar to expose localhost: `ngrok http 3000`
3. Open in Warpcast using the ngrok URL

### Testing Checklist

- [ ] SDK detects correctly
- [ ] `sdk.actions.ready()` called
- [ ] User context loads
- [ ] Mobile styling applied
- [ ] External miniapp launching works
- [ ] No console errors from SDK
- [ ] Works on iOS Warpcast
- [ ] Works on Android Warpcast

---

## Graceful Degradation

Berry OS works without Farcaster:

```typescript
// All Farcaster calls are guarded
const safeGetUser = () => {
  try {
    if (farcaster.isInitialized()) {
      return farcaster.getUser();
    }
  } catch (error) {
    console.warn('Farcaster user unavailable:', error);
  }
  return null;
};

// Features degrade gracefully
const handleAction = () => {
  if (farcaster.isInitialized()) {
    // Farcaster-specific behavior
  } else {
    // Fallback behavior
  }
};
```

---

## Future Integration

Potential future Farcaster features:
- Cast composition from within Berry OS
- Farcaster social graph integration
- Frame notifications
- Farcaster wallet connection