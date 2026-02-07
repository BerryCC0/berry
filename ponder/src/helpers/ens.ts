/**
 * ENS Resolution Helper
 * Uses ensideas.com API for fast batch ENS lookups.
 */

const ENS_CACHE = new Map<string, string | null>();

/**
 * Resolve an Ethereum address to its ENS name.
 * Returns null if no ENS name is found.
 */
export async function resolveEns(address: string): Promise<string | null> {
  const lower = address.toLowerCase();

  if (ENS_CACHE.has(lower)) {
    return ENS_CACHE.get(lower) ?? null;
  }

  try {
    const res = await fetch(`https://api.ensideas.com/ens/resolve/${lower}`);
    if (!res.ok) {
      ENS_CACHE.set(lower, null);
      return null;
    }
    const data = (await res.json()) as { name?: string; address?: string };
    const name = data.name || null;
    ENS_CACHE.set(lower, name);
    return name;
  } catch {
    ENS_CACHE.set(lower, null);
    return null;
  }
}

/**
 * Extract a title from a proposal/candidate description.
 * Titles are the first line, typically formatted as "# Title" in markdown.
 */
export function extractTitle(description: string | undefined | null): string {
  if (!description) return "";
  const firstLine = description.split("\n")[0]?.trim() ?? "";
  // Remove markdown heading prefix
  return firstLine.replace(/^#+\s*/, "").trim();
}
