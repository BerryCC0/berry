/**
 * Decode a NounV2 `dataURI(tokenId)` result — base64-encoded JSON with an
 * embedded SVG data-URI — into just the image string.
 */
export function parseNounDataURI(data: unknown): string | null {
  if (!data || typeof data !== 'string') return null;
  try {
    const prefix = 'data:application/json;base64,';
    const raw = data.startsWith(prefix) ? data.slice(prefix.length) : data;
    const json =
      typeof atob === 'function' ? atob(raw) : Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as { image?: string };
    return parsed.image ?? null;
  } catch {
    return null;
  }
}
