/**
 * Deterministic group-id generation for multi-action aggregates. Replaces the
 * legacy `Date.now()`-based ids which produced non-reproducible output (same
 * input → different on-disk state).
 *
 * The id is a stable hash of the action's id plus its field values, so
 * re-running encode on the same input produces the same group id. This makes
 * the encoder pure and the round-trip tests deterministic.
 */

/**
 * Build a deterministic group id for a multi-action aggregate. Format:
 * `<actionId>-<8-char-hash>`.
 *
 * The hash is a non-cryptographic FNV-1a — fast, dependency-free, and
 * collision rate is fine for the few hundred groups a proposal ever has.
 */
export function multiActionId(actionId: string, fields: object): string {
  const payload = `${actionId}:${stableStringify(fields)}`;
  return `${actionId}-${fnv1a(payload).toString(16).padStart(8, '0')}`;
}

/**
 * Stringify an object with stable key ordering so two equivalent objects
 * produce the same hash. JSON.stringify alone doesn't sort keys.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

/** FNV-1a 32-bit hash. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // Multiply by 16777619 mod 2^32 without overflowing 32-bit math
    hash = Math.imul(hash, 0x01000193);
  }
  // Coerce to unsigned 32-bit
  return hash >>> 0;
}
