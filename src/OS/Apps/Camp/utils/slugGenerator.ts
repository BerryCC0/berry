/**
 * Slug Generation Utilities
 * Generate URL-safe slugs from proposal titles
 */

import { GOLDSKY_ENDPOINT } from '@/app/lib/nouns/constants';

/**
 * Generate a URL-safe slug from a title
 * Converts "My Proposal Title!" to "my-proposal-title"
 */
export function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .substring(0, 60);         // Limit length
}

/**
 * Make slug unique by appending timestamp
 */
export function makeSlugUnique(baseSlug: string): string {
  const timestamp = Date.now().toString(36); // Base36 for shorter string
  return `${baseSlug}-${timestamp}`;
}

/**
 * Generate a unique slug from text (always adds timestamp)
 */
export function generateUniqueSlug(text: string): string {
  const baseSlug = generateSlugFromTitle(text);
  return makeSlugUnique(baseSlug);
}

/**
 * Alias for generateSlugFromTitle
 */
export const generateSlug = generateSlugFromTitle;

/**
 * Check if a candidate with this slug already exists for the given proposer
 */
async function checkSlugExists(proposer: string, slug: string): Promise<boolean> {
  try {
    const id = `${proposer.toLowerCase()}-${slug}`;
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query CheckSlug($id: ID!) { proposalCandidate(id: $id) { id } }`,
        variables: { id },
      }),
    });
    
    const json = await response.json();
    return !!json.data?.proposalCandidate;
  } catch {
    // If check fails, assume it might exist to be safe
    return true;
  }
}

/**
 * Generate a slug, only adding unique suffix if there's a conflict
 * This keeps URLs clean when possible
 */
export async function generateSlugWithConflictCheck(
  title: string,
  proposer: string
): Promise<string> {
  const baseSlug = generateSlugFromTitle(title);
  
  // Check if the base slug is available
  const exists = await checkSlugExists(proposer, baseSlug);
  
  if (!exists) {
    // No conflict, use the clean slug
    return baseSlug;
  }
  
  // Conflict exists, add timestamp suffix
  return makeSlugUnique(baseSlug);
}