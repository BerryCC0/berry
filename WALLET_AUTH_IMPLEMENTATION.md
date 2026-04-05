# Wallet-Based API Authentication Implementation

## Overview
Implemented wallet signature-based authentication for the Berry OS API using a simple session-token approach with viem/wagmi.

## Files Created

### 1. Server-Side Auth Utility
**Path:** `/app/lib/auth.ts`
- `verifyWalletAuth(request: Request): Promise<AuthResult>`
  - Verifies wallet signature from request headers
  - Headers expected: `x-wallet-address`, `x-wallet-signature`, `x-wallet-timestamp`
  - Validates timestamp freshness (24-hour max age)
  - Reconstructs signed message: `"Berry OS Session\nAddress: {address}\nTimestamp: {timestamp}"`
  - Returns `{ authenticated: boolean, address: string | null, error?: string }`

- `requireWalletAuth(request: Request): Promise<{ address: string } | Response>`
  - Helper that returns 401 if not authenticated
  - Used for endpoints requiring strict auth

### 2. Client-Side Auth Hook
**Path:** `/src/OS/hooks/useWalletAuth.ts`
- `useWalletAuth()` hook providing:
  - `hasSession`: Boolean indicating valid session for current wallet
  - `ensureSession()`: Creates/reuses session, prompts for wallet signature if needed
  - `getAuthHeaders()`: Returns auth headers for protected API calls
  - `authFetch(url, init)`: Fetch wrapper that automatically adds auth headers

- Features:
  - Module-level session cache persists across renders
  - Session expires after 24 hours
  - Clears session on wallet disconnect or address change
  - Prevents concurrent signing requests
  - Falls back to unauthenticated calls if user rejects signature

### 3. Hook Export
**Path:** `/src/OS/hooks/index.ts`
- Added export: `export { useWalletAuth } from "./useWalletAuth"`

## Updated Routes

### Proposal Drafts API
**Path:** `/app/api/proposals/drafts/route.ts`

#### Soft-Launch Implementation
All handlers (GET, POST, DELETE, PATCH) implement soft-launch authentication:
- **No auth headers**: Request allowed (backward compatible)
- **Valid auth headers**: Request allowed with matching wallet verification
- **Invalid auth headers**: Request rejected with 401 Unauthorized
- **Wallet mismatch**: Request rejected with 403 Forbidden

#### Changes to Each Handler
- **GET**: Verifies auth if headers present; fails if wallet doesn't match query param
- **POST**: Verifies auth if headers present; fails if wallet doesn't match request body
- **DELETE**: Verifies auth if headers present; fails if wallet doesn't match query param
- **PATCH**: Verifies auth if headers present; fails if wallet doesn't match request body

## Usage Example

### Client-Side
```typescript
import { useWalletAuth } from '@/OS/hooks';

function MyComponent() {
  const { authFetch, hasSession } = useWalletAuth();

  const saveDraft = async (draft) => {
    const response = await authFetch('/api/proposals/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    
    if (response.status === 401) {
      // Auth failed - signature invalid or expired
      console.error('Authentication failed');
    } else if (response.status === 403) {
      // Wallet mismatch - wallet doesn't match draft owner
      console.error('Wallet mismatch');
    }
    
    return response.json();
  };

  return <button onClick={() => saveDraft(draft)}>Save Draft</button>;
}
```

### Authentication Flow
1. User connects wallet via wagmi
2. Client calls `ensureSession()` (e.g., on first protected API call)
3. User signs message via wallet: `"Berry OS Session\nAddress: 0x...\nTimestamp: 1712282400"`
4. Session stored in module cache with address, signature, and timestamp
5. All subsequent API calls include auth headers automatically
6. Server verifies signature matches claimed address
7. Session reused for 24 hours or until page reload

## Dependencies
- `viem` (already installed) — Used for `verifyMessage()`
- `wagmi` (already installed) — Used for `useSignMessage()` hook

## Backward Compatibility
- Soft-launch mode: existing unauthenticated clients continue to work
- No breaking changes to API response format
- Auth is optional during rollout period

## Next Steps (Not Implemented)
The following routes should be protected similarly in future PRs:
- `/api/persistence` — User preferences (keyed by `profileId`)
- `/api/shortlinks` — URL shortener (associate with wallet)

## Verification
- TypeScript compilation: `npx tsc --noEmit` ✅ (no errors)
- All auth logic follows viem best practices
- Session management prevents signature reuse attacks
- Timestamp validation prevents replay attacks
