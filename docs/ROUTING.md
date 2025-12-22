# Berry OS - Routing & Deep Linking

> URL structure, deep linking, and shareable states.

## Overview

Berry OS uses **client-side routing** to enable deep linking without page reloads. Every app state can be represented as a URL, making Berry OS experiences shareable.

**Goals:**
- Open Berry OS directly to a specific app
- Share a link that opens an app with specific content
- Browser back/forward buttons work naturally
- No page reloads during navigation

---

## URL Structure

```
https://berryos.app/                          # Desktop (home)
https://berryos.app/app/[appId]               # Open app
https://berryos.app/app/[appId]/[...params]   # Open app with params
https://berryos.app/s/[shortId]               # Short link redirect
```

### Examples

```
/                                   # Desktop, no apps open
/app/calculator                     # Open Calculator
/app/finder                         # Open Finder at root
/app/finder/Documents               # Open Finder at /Documents
/app/finder/Documents/Projects      # Open Finder at /Documents/Projects
/app/media-viewer/Pictures/photo.jpg  # Open image in Media Viewer
/app/text-editor?file=/Documents/notes.txt  # Open file in Text Editor
/app/proposal-editor?id=draft-123   # Open specific proposal draft
/s/x7Kg2mPq                         # Short link → expands to full URL
```

---

## Next.js App Router Structure

```
app/
├── page.tsx                        # Desktop (/)
├── app/
│   └── [appId]/
│       └── [[...params]]/
│           └── page.tsx            # App routes (/app/*)
└── s/
    └── [shortId]/
        └── page.tsx                # Short links (/s/*)
```

---

## Route Handling

### Desktop Route (/)

```typescript
// app/page.tsx
'use client';

import { Desktop } from '@/OS/components/Desktop';
import { useRouteSync } from '@/OS/hooks/useRouteSync';

export default function DesktopPage() {
  // Sync URL with window state
  useRouteSync();
  
  return <Desktop />;
}
```

### App Route (/app/[appId]/[[...params]])

```typescript
// app/app/[appId]/[[...params]]/page.tsx
'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { appLauncher } from '@/OS/lib/AppLauncher';
import { getOSApp } from '@/OS/Apps/OSAppConfig';
import { getUserApp } from '@/Apps/AppConfig';

export default function AppRoute() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const appId = params.appId as string;
  const pathParams = (params.params as string[]) || [];
  
  useEffect(() => {
    // Validate app exists
    const app = getOSApp(appId) || getUserApp(appId);
    if (!app) {
      console.error(`App not found: ${appId}`);
      router.push('/');
      return;
    }
    
    // Build initial state from URL
    const initialState = buildInitialState(appId, pathParams, searchParams);
    
    // Launch app with state
    appLauncher.launch(appId, { initialState });
    
    // Navigate to root (app is now open as window)
    // Use shallow routing to avoid page reload
    router.push('/', { scroll: false });
    
  }, [appId, pathParams, searchParams, router]);
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--berry-desktop-bg)',
      color: 'var(--berry-text)',
      fontFamily: 'var(--berry-font-system)',
    }}>
      Opening {appId}...
    </div>
  );
}

function buildInitialState(
  appId: string, 
  pathParams: string[], 
  searchParams: URLSearchParams
): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  
  // Handle path params based on app
  switch (appId) {
    case 'finder':
      // /app/finder/Documents/Projects → path: /Documents/Projects
      if (pathParams.length > 0) {
        state.path = '/' + pathParams.join('/');
      }
      break;
      
    case 'media-viewer':
      // /app/media-viewer/Pictures/photo.jpg → filePath: /Pictures/photo.jpg
      if (pathParams.length > 0) {
        state.filePath = '/' + pathParams.join('/');
      }
      break;
      
    case 'text-editor':
      // /app/text-editor?file=/path/to/file.txt
      const file = searchParams.get('file');
      if (file) {
        state.filePath = file;
      }
      break;
      
    case 'proposal-editor':
      // /app/proposal-editor?id=draft-123
      const id = searchParams.get('id');
      if (id) {
        state.draftId = id;
      }
      break;
      
    default:
      // Generic: pass all search params as state
      searchParams.forEach((value, key) => {
        state[key] = value;
      });
  }
  
  return state;
}
```

### Short Link Route (/s/[shortId])

```typescript
// app/s/[shortId]/page.tsx
'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { shortLinks } from '@/OS/lib/ShortLinks';

export default function ShortLinkRoute() {
  const params = useParams();
  const router = useRouter();
  const shortId = params.shortId as string;
  
  useEffect(() => {
    const resolve = async () => {
      const fullPath = await shortLinks.resolve(shortId);
      
      if (fullPath) {
        router.push(fullPath);
      } else {
        console.error(`Short link not found: ${shortId}`);
        router.push('/');
      }
    };
    
    resolve();
  }, [shortId, router]);
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--berry-desktop-bg)',
      color: 'var(--berry-text)',
      fontFamily: 'var(--berry-font-system)',
    }}>
      Redirecting...
    </div>
  );
}
```

---

## URL ↔ State Sync

Berry OS keeps the URL in sync with the current state so browser navigation works.

### Route Sync Hook

```typescript
// /src/OS/hooks/useRouteSync.ts
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWindowStore } from '@/OS/store/windowStore';
import { systemBus } from '@/OS/lib/EventBus';

export const useRouteSync = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { windows, focusedWindowId } = useWindowStore();
  
  // Update URL when focused window changes
  useEffect(() => {
    if (!focusedWindowId) {
      // No windows open, ensure we're at root
      if (pathname !== '/') {
        router.push('/', { scroll: false });
      }
      return;
    }
    
    const window = windows.get(focusedWindowId);
    if (!window) return;
    
    // Build URL for current app state
    const url = buildUrlForWindow(window);
    
    // Update URL without navigation
    if (url !== pathname) {
      router.replace(url, { scroll: false });
    }
  }, [focusedWindowId, windows, pathname, router]);
  
  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Browser navigated back/forward
      // The route components will handle opening the right app
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
};

function buildUrlForWindow(window: WindowState): string {
  const { appId, appState } = window;
  
  // Simple case: just the app
  if (!appState) {
    return `/app/${appId}`;
  }
  
  // Build URL based on app type
  switch (appId) {
    case 'finder':
      if (appState.path && appState.path !== '/') {
        return `/app/finder${appState.path}`;
      }
      return '/app/finder';
      
    case 'media-viewer':
      if (appState.filePath) {
        return `/app/media-viewer${appState.filePath}`;
      }
      return '/app/media-viewer';
      
    case 'text-editor':
      if (appState.filePath) {
        return `/app/text-editor?file=${encodeURIComponent(appState.filePath)}`;
      }
      return '/app/text-editor';
      
    case 'proposal-editor':
      if (appState.draftId) {
        return `/app/proposal-editor?id=${appState.draftId}`;
      }
      return '/app/proposal-editor';
      
    default:
      return `/app/${appId}`;
  }
}
```

### URL Update Strategy

| Action | URL Behavior |
|--------|--------------|
| Open app | `router.push('/app/[appId]')` |
| Focus different window | `router.replace('/app/[appId]')` |
| Close all windows | `router.push('/')` |
| Navigate in Finder | `router.replace('/app/finder/[path]')` |
| Browser back | Previous URL, opens that app/state |
| Browser forward | Next URL, opens that app/state |

**Note:** Use `router.replace` for state changes within an app (doesn't add history entry). Use `router.push` for opening new apps (adds history entry).

---

## Short Links

Generate short, shareable URLs for any Berry OS state.

### Database Schema

```sql
CREATE TABLE short_links (
  id VARCHAR(12) PRIMARY KEY,           -- Short ID: "x7Kg2mPq"
  full_path TEXT NOT NULL,              -- Full URL path
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),  -- Optional: who created it
  expires_at TIMESTAMP,                 -- Optional: expiration
  click_count INTEGER DEFAULT 0,
  metadata JSONB                        -- Optional: additional data
);

CREATE INDEX idx_short_links_created_by ON short_links(created_by);
CREATE INDEX idx_short_links_expires ON short_links(expires_at);
```

### Short Links Service

```typescript
// /src/OS/lib/ShortLinks.ts
import { nanoid } from 'nanoid';
import { persistence } from './Persistence';

interface ShortLinkOptions {
  expiresIn?: number;       // Milliseconds until expiration
  metadata?: unknown;       // Additional data to store
}

interface ShortLink {
  id: string;
  fullPath: string;
  createdAt: number;
  expiresAt?: number;
  clickCount: number;
}

class ShortLinksService {
  /**
   * Create a short link
   */
  async create(fullPath: string, options?: ShortLinkOptions): Promise<string> {
    const id = nanoid(8); // 8 character ID
    
    const expiresAt = options?.expiresIn 
      ? Date.now() + options.expiresIn 
      : undefined;
    
    await persistence.createShortLink({
      id,
      fullPath,
      expiresAt,
      metadata: options?.metadata,
    });
    
    // Return full short URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://berryos.app';
    return `${baseUrl}/s/${id}`;
  }
  
  /**
   * Resolve a short link to full path
   */
  async resolve(id: string): Promise<string | null> {
    const link = await persistence.getShortLink(id);
    
    if (!link) {
      return null;
    }
    
    // Check expiration
    if (link.expiresAt && link.expiresAt < Date.now()) {
      return null;
    }
    
    // Increment click count (fire and forget)
    persistence.incrementShortLinkClicks(id).catch(console.error);
    
    return link.fullPath;
  }
  
  /**
   * Get user's short links
   */
  async getMyLinks(): Promise<ShortLink[]> {
    return persistence.getShortLinksByUser();
  }
  
  /**
   * Delete a short link
   */
  async delete(id: string): Promise<void> {
    await persistence.deleteShortLink(id);
  }
}

export const shortLinks = new ShortLinksService();
```

### Creating Share Links in Apps

```typescript
// In any app component
import { shortLinks } from '@/OS/lib/ShortLinks';

const ShareButton = ({ currentState }) => {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const handleShare = async () => {
    // Build the full path for current state
    const fullPath = buildSharePath(currentState);
    
    // Create short link
    const url = await shortLinks.create(fullPath, {
      expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
      metadata: { appId: 'proposal-editor', type: 'draft' },
    });
    
    setShareUrl(url);
    
    // Copy to clipboard
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button onClick={handleShare}>
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
};
```

---

## App-Specific Routing

Each app can define how it interprets URL parameters.

### Finder

```
/app/finder                    → Opens at root (/)
/app/finder/Documents          → Opens at /Documents
/app/finder/Documents/Projects → Opens at /Documents/Projects
```

```typescript
// Finder handles initialState.path
const Finder = ({ initialState }: AppProps) => {
  const [currentPath, setCurrentPath] = useState(
    initialState?.path || '/'
  );
  
  // Navigate and update URL
  const navigateTo = (path: string) => {
    setCurrentPath(path);
    // URL will update via useRouteSync
  };
  
  return (/* ... */);
};
```

### Media Viewer

```
/app/media-viewer                        → Opens empty
/app/media-viewer/Pictures/photo.jpg     → Opens specific image
```

```typescript
// Media Viewer handles initialState.filePath
const MediaViewer = ({ initialState }: AppProps) => {
  const [filePath, setFilePath] = useState<string | null>(
    initialState?.filePath || null
  );
  
  useEffect(() => {
    if (filePath) {
      loadMedia(filePath);
    }
  }, [filePath]);
  
  return (/* ... */);
};
```

### Proposal Editor (Nouns)

```
/app/proposal-editor              → New proposal
/app/proposal-editor?id=draft-123 → Load saved draft
```

```typescript
// Proposal Editor handles initialState.draftId
const ProposalEditor = ({ initialState }: AppProps) => {
  const [draftId, setDraftId] = useState<string | null>(
    initialState?.draftId || null
  );
  
  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    }
  }, [draftId]);
  
  const handleSaveDraft = async (content: string) => {
    const id = await saveDraft(content);
    setDraftId(id);
    // URL updates to include ?id=...
  };
  
  return (/* ... */);
};
```

---

## Handling Multiple Windows

When multiple windows are open, the URL reflects the **focused** window.

### Browser History State Diagram

```
User opens Berry OS at /
    │
    ▼
Desktop (no windows)
URL: /
History: [/]
    │
    ▼ Clicks Calculator icon
    │
Calculator opens + focuses
URL: /app/calculator
History: [/, /app/calculator]
    │
    ▼ Clicks Finder icon
    │
Finder opens + focuses
URL: /app/finder
History: [/, /app/calculator, /app/finder]
    │
    ▼ Navigates to /Documents in Finder
    │
URL: /app/finder/Documents
History: [/, /app/calculator, /app/finder, /app/finder/Documents]
    │
    ▼ Clicks Calculator in dock (focus, not new window)
    │
Calculator focuses (already open)
URL: /app/calculator
History: [/, /app/calculator, /app/finder, /app/finder/Documents, /app/calculator]
    │
    ▼ User presses BACK button
    │
URL: /app/finder/Documents
→ Finder focuses (at /Documents)
→ Calculator stays open but unfocused
    │
    ▼ User presses BACK again
    │
URL: /app/finder
→ Finder navigates to / (root)
    │
    ▼ User presses BACK again
    │
URL: /app/calculator
→ Calculator focuses
    │
    ▼ User presses BACK again
    │
URL: /
→ No window focused (or focus Finder as always-running)
```

### Key Behaviors

| Action | URL Change | History Impact |
|--------|------------|----------------|
| Open new app | `push` | Adds entry |
| Focus existing window | `replace` | No new entry |
| Navigate within app | `replace` | No new entry |
| Close window | (focus next) | No change |
| Browser back | (previous) | Focus existing window |
| Browser forward | (next) | Focus existing window |

```typescript
// Window focus changes → URL updates
useEffect(() => {
  if (focusedWindowId) {
    const window = windows.get(focusedWindowId);
    const url = buildUrlForWindow(window);
    router.replace(url, { scroll: false });  // replace, not push
  }
}, [focusedWindowId]);
```

### Edge Cases

**Opening from URL when windows exist:**
- User has Finder open
- They paste a URL: `/app/calculator`
- Calculator opens and focuses
- URL changes to `/app/calculator`
- Finder stays open but unfocused

**Browser back with multiple windows:**
- User has Calculator focused (URL: `/app/calculator`)
- User opened it after Finder (URL before: `/app/finder`)
- User presses back
- URL becomes `/app/finder`
- Finder focuses (doesn't close Calculator)

```typescript
// Handle browser back to focus existing window
useEffect(() => {
  const handleRouteChange = () => {
    const path = window.location.pathname;
    
    if (path.startsWith('/app/')) {
      const appId = path.split('/')[2];
      
      // Check if window for this app already exists
      const existingWindows = windowStore.getWindowsByApp(appId);
      
      if (existingWindows.length > 0) {
        // Focus existing window instead of opening new
        windowStore.focusWindow(existingWindows[0].id);
      }
      // If no existing window, app route handler will open it
    }
  };
  
  window.addEventListener('popstate', handleRouteChange);
  return () => window.removeEventListener('popstate', handleRouteChange);
}, []);
```

---

## Deep Link Session Handling

**Question answered:** What happens if user bookmarks a deep link and their session expired?

### Scenario: User bookmarks a proposal draft

```
User creates draft, gets URL:
/app/proposal-editor?id=draft-abc123

User bookmarks it, closes browser

Days later, user opens bookmark...
```

### Handling Strategy

```typescript
// app/app/proposal-editor/page.tsx
const ProposalEditorRoute = () => {
  const searchParams = useSearchParams();
  const draftId = searchParams.get('id');
  
  const loadDraft = async () => {
    if (!draftId) {
      // No draft specified, open empty editor
      return launchEditor();
    }
    
    // Try to load the draft
    const draft = await persistence.getProposalDraft(draftId);
    
    if (!draft) {
      // Draft not found - could be:
      // 1. User not logged in (draft is in their profile)
      // 2. Draft was deleted
      // 3. Invalid/old ID
      
      return handleDraftNotFound(draftId);
    }
    
    // Draft found, launch editor with it
    return launchEditor({ draft });
  };
  
  const handleDraftNotFound = async (draftId: string) => {
    const isLoggedIn = useSessionStore.getState().profile !== null;
    
    if (!isLoggedIn) {
      // Prompt to connect wallet
      showDialog({
        title: 'Connect Wallet',
        message: 'Connect your wallet to load your saved draft.',
        actions: [
          { label: 'Connect', action: () => openWalletModal() },
          { label: 'Start New', action: () => launchEditor() },
        ],
      });
    } else {
      // Logged in but draft not found
      showDialog({
        title: 'Draft Not Found',
        message: 'This draft may have been deleted or the link is invalid.',
        actions: [
          { label: 'Start New', action: () => launchEditor() },
        ],
      });
    }
  };
};
```

### General Pattern for Authenticated Deep Links

```typescript
const handleAuthenticatedDeepLink = async (resourceId: string) => {
  // 1. Try to load resource
  const resource = await loadResource(resourceId);
  
  if (resource) {
    // Success - proceed
    return openWithResource(resource);
  }
  
  // 2. Resource not found - check auth state
  const isLoggedIn = hasConnectedWallet();
  
  if (!isLoggedIn) {
    // 3a. Not logged in - prompt to connect
    promptWalletConnection({
      reason: 'Connect to access your saved content',
      onSuccess: () => handleAuthenticatedDeepLink(resourceId), // Retry
      onCancel: () => openFreshState(),
    });
  } else {
    // 3b. Logged in but resource not found - it's gone
    showNotFoundError();
  }
};
```

---

## External Links

Opening Berry OS from external sites:

### Link Format

```html
<!-- Open Berry OS to specific app -->
<a href="https://berryos.app/app/calculator">Open Calculator</a>

<!-- Open with specific content -->
<a href="https://berryos.app/app/proposal-editor?id=prop-456">
  View Proposal Draft
</a>

<!-- Short link -->
<a href="https://berryos.app/s/x7Kg2mPq">View Shared Item</a>
```

### Farcaster Frame Integration

```typescript
// Sharing Berry OS content in Farcaster
const shareToFarcaster = async (path: string) => {
  const shortUrl = await shortLinks.create(path);
  
  // Compose cast with link
  // (Farcaster SDK will render preview)
};
```

---

## SEO & Metadata

For shared links, generate appropriate metadata:

```typescript
// app/app/[appId]/[[...params]]/page.tsx
import { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
  const appId = params.appId;
  const app = getOSApp(appId) || getUserApp(appId);
  
  if (!app) {
    return { title: 'Berry OS' };
  }
  
  return {
    title: `${app.name} - Berry OS`,
    description: app.description || `Open ${app.name} in Berry OS`,
    openGraph: {
      title: `${app.name} - Berry OS`,
      description: app.description,
      images: ['/og/berry-os.png'],
    },
  };
}
```

---

## Testing

### Manual Checklist

- [ ] `/` loads desktop
- [ ] `/app/calculator` opens Calculator
- [ ] `/app/finder/Documents` opens Finder at /Documents
- [ ] Invalid app ID redirects to `/`
- [ ] Browser back button works
- [ ] Browser forward button works
- [ ] URL updates when focusing different window
- [ ] Short links create and resolve
- [ ] Expired short links return null
- [ ] External links open correctly
- [ ] Works in Farcaster miniapp

### Test URLs

```
/                              # Should show desktop
/app/calculator                # Should open Calculator
/app/finder                    # Should open Finder at root
/app/finder/Documents          # Should open Finder at /Documents
/app/nonexistent               # Should redirect to /
/s/invalid                     # Should redirect to /
```

---

## Configuration

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_BASE_URL=https://berryos.app
```

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable trailing slashes for cleaner URLs (optional)
  trailingSlash: false,
  
  // Redirect old URL patterns if needed
  async redirects() {
    return [
      // Example: redirect old format to new
      // {
      //   source: '/open/:appId',
      //   destination: '/app/:appId',
      //   permanent: true,
      // },
    ];
  },
};

module.exports = nextConfig;
```

---

## Summary

| Feature | Implementation |
|---------|----------------|
| App routes | `/app/[appId]/[[...params]]/page.tsx` |
| Short links | `/s/[shortId]/page.tsx` + database |
| URL sync | `useRouteSync` hook |
| Browser nav | `popstate` event handler |
| Share links | `shortLinks.create()` |
| State → URL | `buildUrlForWindow()` |
| URL → State | `buildInitialState()` |