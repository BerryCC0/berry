# Berry OS - State Serialization

> How to structure app state for persistence.

## Overview

Berry OS persists app state to the database when a wallet is connected. For this to work, state must be **serializable** - convertible to JSON and back without data loss.

---

## What Can Be Serialized

| Type | Serializable | Notes |
|------|--------------|-------|
| `string` | ✓ | |
| `number` | ✓ | Including `Infinity` → `null` |
| `boolean` | ✓ | |
| `null` | ✓ | |
| `array` | ✓ | If contents are serializable |
| `object` | ✓ | Plain objects only |
| `undefined` | ✗ | Becomes `null` or omitted |
| `function` | ✗ | Stripped entirely |
| `Symbol` | ✗ | Stripped entirely |
| `Map` | ✗ | Convert to object or array |
| `Set` | ✗ | Convert to array |
| `Date` | ⚠️ | Becomes ISO string, must parse back |
| `BigInt` | ✗ | Convert to string |
| `RegExp` | ✗ | Convert to string pattern |
| `Error` | ✗ | Convert to message string |
| DOM elements | ✗ | Never store references |
| Class instances | ⚠️ | Loses prototype, becomes plain object |
| Circular refs | ✗ | Will throw error |

---

## Structuring Serializable State

### Good Patterns

```typescript
// ✓ Plain objects with primitive values
interface CalculatorState {
  display: string;
  memory: number;
  operator: string | null;
  operand: number | null;
}

// ✓ Arrays of serializable items
interface FinderState {
  currentPath: string;
  history: string[];
  selectedPaths: string[];  // Not Set<string>
  viewMode: 'icons' | 'list';
}

// ✓ Nested plain objects
interface TextEditorState {
  content: string;
  cursor: {
    line: number;
    column: number;
  };
  selection: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  } | null;
  isDirty: boolean;
}

// ✓ Dates as ISO strings or timestamps
interface ProposalDraftState {
  title: string;
  content: string;
  createdAt: number;      // Timestamp (ms since epoch)
  updatedAt: number;
  // NOT: createdAt: Date
}
```

### Patterns to Avoid

```typescript
// ✗ Functions - will be stripped
interface BadState {
  onClick: () => void;           // Lost on serialization
  validator: (x: string) => boolean;
}

// ✗ Sets and Maps - convert them
interface BadState {
  selectedItems: Set<string>;    // Use string[] instead
  cache: Map<string, Data>;      // Use Record<string, Data>
}

// ✗ Class instances - lose methods
interface BadState {
  parser: MarkdownParser;        // Instance methods lost
  date: Date;                    // Becomes string, not Date
}

// ✗ DOM references
interface BadState {
  inputRef: HTMLInputElement;    // Can't serialize DOM
  canvasContext: CanvasRenderingContext2D;
}

// ✗ Circular references
const a = { b: null };
const b = { a: a };
a.b = b;  // Circular - JSON.stringify will throw
```

---

## Converting Non-Serializable Types

### Set → Array

```typescript
// In component/hook
const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

// When saving state
const serializableState = {
  selectedPaths: Array.from(selectedPaths),
};

// When restoring state
const restoredSet = new Set(savedState.selectedPaths);
```

### Map → Record or Array

```typescript
// Map<string, T> → Record<string, T>
const fileCache = new Map<string, FileData>();

// Serialize
const serialized = Object.fromEntries(fileCache);

// Restore
const restored = new Map(Object.entries(serialized));


// Map<K, V> where K is not string → Array of tuples
const windowOrder = new Map<number, string>(); // zIndex → windowId

// Serialize
const serialized = Array.from(windowOrder.entries());

// Restore
const restored = new Map(serialized);
```

### Date → Number or String

```typescript
// Prefer timestamps for simplicity
interface State {
  createdAt: number;  // Date.now()
}

// Serialize
const state = { createdAt: Date.now() };

// Restore
const date = new Date(state.createdAt);


// Or ISO string if human-readable needed
interface State {
  createdAt: string;  // ISO 8601
}

// Serialize
const state = { createdAt: new Date().toISOString() };

// Restore
const date = new Date(state.createdAt);
```

### BigInt → String

```typescript
// Useful for blockchain values (wei, token IDs)
interface State {
  balance: string;  // BigInt as string
}

// Serialize
const state = { balance: balance.toString() };

// Restore
const balance = BigInt(state.balance);
```

---

## State Versioning

App state structure may change over time. Use versioning to handle migrations.

### Version Field

```typescript
interface AppState {
  _version: number;  // Always include this
  // ... rest of state
}

const CURRENT_VERSION = 2;

const defaultState: AppState = {
  _version: CURRENT_VERSION,
  // ... defaults
};
```

### Migration Functions

```typescript
type Migration = (state: unknown) => unknown;

const migrations: Record<number, Migration> = {
  // v1 → v2: Renamed 'items' to 'entries'
  1: (state: any) => ({
    ...state,
    _version: 2,
    entries: state.items,
    items: undefined,
  }),
  
  // v2 → v3: Added 'settings' object
  2: (state: any) => ({
    ...state,
    _version: 3,
    settings: {
      theme: 'default',
      autoSave: true,
    },
  }),
};

function migrateState(state: unknown): AppState {
  let current = state as any;
  
  // Handle missing version (legacy state)
  if (current._version === undefined) {
    current._version = 1;
  }
  
  // Apply migrations sequentially
  while (current._version < CURRENT_VERSION) {
    const migration = migrations[current._version];
    if (!migration) {
      console.error(`Missing migration for version ${current._version}`);
      return defaultState;
    }
    current = migration(current);
  }
  
  return current as AppState;
}
```

### Using Migrations

```typescript
// In app component
const MyApp = ({ windowId, initialState, onStateChange }: AppProps) => {
  const [state, setState] = useState<AppState>(() => {
    if (initialState) {
      return migrateState(initialState);
    }
    return defaultState;
  });
  
  // Report state changes (already current version)
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);
  
  // ...
};
```

---

## Size Limits

Persisted state has size limits to prevent abuse:

| Data Type | Limit |
|-----------|-------|
| Theme | 50 KB |
| Desktop layout | 20 KB |
| Window state (all windows) | 100 KB |
| App state (per app) | 500 KB |
| Proposal draft | 1 MB |

### Checking Size

```typescript
function getStateSize(state: unknown): number {
  return new TextEncoder().encode(JSON.stringify(state)).length;
}

function validateStateSize(state: unknown, limitKB: number): boolean {
  const size = getStateSize(state);
  const limit = limitKB * 1024;
  
  if (size > limit) {
    console.warn(`State size ${size} exceeds limit ${limit}`);
    return false;
  }
  return true;
}

// Before saving
if (!validateStateSize(appState, 500)) {
  // Handle: trim state, warn user, or refuse to save
}
```

### Strategies for Large State

```typescript
// 1. Don't persist derived data
interface BadState {
  items: Item[];
  filteredItems: Item[];  // Derived - don't persist
  sortedItems: Item[];    // Derived - don't persist
}

interface GoodState {
  items: Item[];
  filterQuery: string;    // Persist the query, derive on load
  sortBy: 'name' | 'date';
}

// 2. Paginate or limit history
interface GoodState {
  history: string[];  // Keep last 50 entries
}

const addToHistory = (path: string) => {
  setState(prev => ({
    ...prev,
    history: [...prev.history, path].slice(-50),
  }));
};

// 3. Compress text content
import pako from 'pako';

function compressText(text: string): string {
  const compressed = pako.deflate(text);
  return btoa(String.fromCharCode(...compressed));
}

function decompressText(compressed: string): string {
  const binary = atob(compressed);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return pako.inflate(bytes, { to: 'string' });
}
```

---

## Validation on Load

Always validate restored state:

```typescript
import { z } from 'zod';

const AppStateSchema = z.object({
  _version: z.number(),
  content: z.string(),
  cursor: z.object({
    line: z.number().min(0),
    column: z.number().min(0),
  }),
  isDirty: z.boolean(),
});

function loadState(saved: unknown): AppState {
  try {
    // Migrate first
    const migrated = migrateState(saved);
    
    // Validate schema
    const validated = AppStateSchema.parse(migrated);
    
    return validated;
  } catch (error) {
    console.error('Failed to load state:', error);
    return defaultState;
  }
}
```

---

## Testing Serialization

```typescript
// Test that state survives round-trip
function testSerialization(state: AppState): boolean {
  try {
    const serialized = JSON.stringify(state);
    const deserialized = JSON.parse(serialized);
    
    // Deep equality check
    const reserialized = JSON.stringify(deserialized);
    return serialized === reserialized;
  } catch (error) {
    console.error('Serialization test failed:', error);
    return false;
  }
}

// Run during development
if (process.env.NODE_ENV === 'development') {
  const testState = createTestState();
  if (!testSerialization(testState)) {
    console.warn('State may not serialize correctly!');
  }
}
```

---

## Checklist for New Apps

When creating a new app:

- [ ] All state types are serializable
- [ ] No functions in state
- [ ] No DOM references in state
- [ ] Sets converted to arrays
- [ ] Maps converted to objects/arrays
- [ ] Dates stored as timestamps
- [ ] State has `_version` field
- [ ] Migrations defined for schema changes
- [ ] State size under limit (500 KB)
- [ ] Derived data not persisted
- [ ] Validation schema defined
- [ ] Round-trip serialization tested