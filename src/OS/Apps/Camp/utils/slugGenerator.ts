/**
 * Slug Generation Utilities
 * Generate URL-safe slugs from proposal titles
 */

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
 * Make slug unique by appending timestamp if needed
 */
export function makeSlugUnique(baseSlug: string): string {
  const timestamp = Date.now().toString(36); // Base36 for shorter string
  return `${baseSlug}-${timestamp}`;
}

/**
 * Generate a unique slug from text
 */
export function generateUniqueSlug(text: string): string {
  const baseSlug = generateSlugFromTitle(text);
  return makeSlugUnique(baseSlug);
}

/**
 * Alias for generateSlugFromTitle
 */
export const generateSlug = generateSlugFromTitle;

