# Berry OS - Security

> Security considerations, input sanitization, and safe practices.

## Overview

Berry OS handles sensitive operations:
- Wallet connections and signatures
- User-generated content (proposal drafts)
- Filesystem path navigation
- URL/deep link parsing
- Database queries

This document centralizes security guidance for all of these.

---

## Principles

1. **Never trust user input** - Sanitize everything from URLs, forms, and file paths
2. **Wallet as identity, not authority** - Wallet proves who you are, not what you can do
3. **Fail closed** - When in doubt, deny access
4. **Defense in depth** - Multiple layers of validation
5. **No secrets in client code** - Everything in the browser is visible

---

## Input Sanitization

### Filesystem Paths

Users can navigate the filesystem via Finder and deep links. Malicious paths could attempt directory traversal.

```typescript
// /src/OS/lib/Filesystem.ts

/**
 * Sanitize and validate filesystem paths
 */
function sanitizePath(path: string): string {
  // Decode URI components
  let sanitized = decodeURIComponent(path);
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Normalize path separators
  sanitized = sanitized.replace(/\\/g, '/');
  
  // Remove directory traversal attempts
  sanitized = sanitized.replace(/\.\.+/g, '');
  
  // Remove multiple consecutive slashes
  sanitized = sanitized.replace(/\/+/g, '/');
  
  // Ensure starts with /
  if (!sanitized.startsWith('/')) {
    sanitized = '/' + sanitized;
  }
  
  // Remove trailing slash (except for root)
  if (sanitized !== '/' && sanitized.endsWith('/')) {
    sanitized = sanitized.slice(0, -1);
  }
  
  // Validate characters (alphanumeric, dash, underscore, dot, slash)
  if (!/^[a-zA-Z0-9\-_./\s]+$/.test(sanitized)) {
    throw new Error('Invalid path characters');
  }
  
  return sanitized;
}

// Usage
const safePath = sanitizePath(userInput);
const files = await filesystem.readDirectory(safePath);
```

### Search Queries

Search input could contain malicious patterns:

```typescript
/**
 * Sanitize search queries
 */
function sanitizeSearchQuery(query: string): string {
  // Trim and limit length
  let sanitized = query.trim().slice(0, 100);
  
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Escape regex special characters if using regex search
  sanitized = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  return sanitized;
}
```

### URL Parameters

Deep links pass parameters that become app state:

```typescript
// /app/app/[appId]/[[...params]]/page.tsx

function sanitizeUrlParams(params: string[]): string[] {
  return params.map(param => {
    // Decode
    let sanitized = decodeURIComponent(param);
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>'"&]/g, '');
    
    // Limit length
    sanitized = sanitized.slice(0, 200);
    
    return sanitized;
  });
}

function sanitizeSearchParams(searchParams: URLSearchParams): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  searchParams.forEach((value, key) => {
    // Whitelist known keys
    const allowedKeys = ['file', 'id', 'path', 'view'];
    if (!allowedKeys.includes(key)) return;
    
    // Sanitize value
    sanitized[key] = value.slice(0, 500).replace(/[<>'"]/g, '');
  });
  
  return sanitized;
}
```

---

## XSS Prevention

### User-Generated Content

Nouns proposal drafts contain user text that will be displayed:

```typescript
/**
 * Sanitize user-generated text content
 */
function sanitizeUserContent(content: string): string {
  // Use DOMPurify for HTML content
  // npm install dompurify @types/dompurify
  import DOMPurify from 'dompurify';
  
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false,
  });
}

// For plain text (no HTML allowed)
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}
```

### React Safety

React escapes content by default, but be careful with:

```typescript
// ✗ DANGEROUS - never use with user content
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✓ SAFE - React escapes this
<div>{userContent}</div>

// ✓ SAFE - if you must render HTML, sanitize first
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />
```

### URL Handling

```typescript
// ✗ DANGEROUS - could execute javascript:
<a href={userProvidedUrl}>Link</a>

// ✓ SAFE - validate protocol
function safeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

<a href={safeUrl(userProvidedUrl) || '#'}>Link</a>
```

---

## Wallet Security

### Signature Verification

When API requests claim to be from a wallet, verify the signature:

```typescript
// /app/api/preferences/route.ts
import { verifyMessage } from 'viem';

interface AuthenticatedRequest {
  address: string;
  message: string;
  signature: string;
  timestamp: number;
  data: unknown;
}

async function verifyWalletRequest(req: AuthenticatedRequest): Promise<boolean> {
  const { address, message, signature, timestamp } = req;
  
  // Check timestamp (prevent replay attacks)
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  if (now - timestamp > maxAge) {
    console.warn('Request timestamp too old');
    return false;
  }
  
  // Verify message format
  const expectedMessage = `Berry OS Authentication\nTimestamp: ${timestamp}`;
  if (message !== expectedMessage) {
    console.warn('Message format mismatch');
    return false;
  }
  
  // Verify signature
  try {
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    
    return isValid;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}
```

### Never Auto-Sign

```typescript
// ✗ WRONG - never sign without user action
useEffect(() => {
  signMessage({ message: 'auto signed' }); // NO!
}, []);

// ✓ CORRECT - explicit user action required
const handleSavePreferences = async () => {
  // Show user what they're signing
  const message = `Save Berry OS preferences\nTimestamp: ${Date.now()}`;
  
  // User clicks button, sees wallet popup, approves
  const signature = await signMessageAsync({ message });
  
  // Now send to API
  await savePreferences({ message, signature, data: preferences });
};
```

### Rate Limiting Signature Requests

Don't spam the user with signature requests:

```typescript
// Track recent signature requests
const signatureRequestTimes: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 3;

function canRequestSignature(): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  // Remove old timestamps
  while (signatureRequestTimes.length && signatureRequestTimes[0] < oneMinuteAgo) {
    signatureRequestTimes.shift();
  }
  
  return signatureRequestTimes.length < MAX_REQUESTS_PER_MINUTE;
}

function recordSignatureRequest(): void {
  signatureRequestTimes.push(Date.now());
}
```

---

## API Security

### CORS Configuration

```typescript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.ALLOWED_ORIGIN || 'https://berryos.app',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};
```

### Content Security Policy

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Required for Next.js
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.reown.com wss://relay.walletconnect.com",
      "frame-ancestors 'self' https://warpcast.com",
    ].join('; '),
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
];
```

### Database Query Safety

Always use parameterized queries:

```typescript
// ✗ DANGEROUS - SQL injection
const result = await sql`
  SELECT * FROM profiles WHERE id = '${userId}'
`;

// ✓ SAFE - parameterized (Neon serverless driver handles this)
const result = await sql`
  SELECT * FROM profiles WHERE id = ${userId}
`;
```

---

## Data Validation

### Zod Schemas

Use Zod for runtime validation:

```typescript
import { z } from 'zod';

// Theme validation
const ThemeSchema = z.object({
  id: z.string().max(50),
  name: z.string().max(100),
  preset: z.enum(['classic', 'dark', 'light', 'custom']),
  windowChrome: z.object({
    titleBarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    // ... other properties
  }),
  // ... rest of theme
});

// Validate before saving
function saveTheme(theme: unknown) {
  const validated = ThemeSchema.parse(theme); // Throws if invalid
  return persistence.saveTheme(validated);
}
```

### Size Limits

```typescript
const LIMITS = {
  theme: 50 * 1024,           // 50 KB
  desktopLayout: 20 * 1024,   // 20 KB
  windowState: 100 * 1024,    // 100 KB
  appState: 500 * 1024,       // 500 KB per app
  proposalDraft: 1024 * 1024, // 1 MB
  searchQuery: 100,           // 100 chars
  shortLinkPath: 2000,        // 2000 chars
};

function validateSize(data: unknown, limit: number): boolean {
  const size = new TextEncoder().encode(JSON.stringify(data)).length;
  return size <= limit;
}
```

---

## Sensitive Data Handling

### What NOT to Store

```typescript
// Never persist these:
// - Private keys (we never have access anyway)
// - Passwords (we don't have auth)
// - Session tokens (wallet is our session)
// - Credit card numbers (we don't do payments)

// Safe to persist (with wallet signature):
// - Theme preferences
// - Window positions
// - App state (non-sensitive)
// - Proposal drafts
```

### Logging Safety

```typescript
// ✗ DANGEROUS - logging sensitive data
console.log('User wallet:', address, 'signature:', signature);

// ✓ SAFE - redact sensitive info
console.log('User wallet:', address.slice(0, 6) + '...');

// ✗ DANGEROUS - logging full request body
console.log('Request:', JSON.stringify(req.body));

// ✓ SAFE - log only what you need
console.log('Request type:', req.body.type, 'from:', req.body.address?.slice(0, 6));
```

---

## Security Checklist

### Before Each Release

- [ ] No `console.log` of sensitive data
- [ ] All user input sanitized
- [ ] No `dangerouslySetInnerHTML` with unsanitized content
- [ ] Wallet signatures verified on API routes
- [ ] Database queries are parameterized
- [ ] Size limits enforced
- [ ] CORS configured correctly
- [ ] CSP headers present
- [ ] No secrets in client bundle

### Code Review Flags

Watch for these patterns in code review:

```typescript
// 🚩 Red flags:
dangerouslySetInnerHTML
eval(
new Function(
innerHTML =
document.write
$.html(
location.href = userInput
window.open(userInput)
sql`...${userInput}...`  // without parameterization
fetch(userInput)         // without URL validation
```

---

## Incident Response

If you discover a security issue:

1. **Don't panic** - but act quickly
2. **Don't disclose publicly** - until fixed
3. **Document** - what, when, how discovered
4. **Assess impact** - what data could be affected
5. **Fix** - patch the vulnerability
6. **Notify** - affected users if data was exposed
7. **Post-mortem** - how to prevent similar issues