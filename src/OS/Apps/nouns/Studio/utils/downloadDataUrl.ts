/**
 * Trigger a file download from a data URL. Browser-only.
 *
 * Used by the "Export PNG" action — produces a downloaded copy of the
 * composite Noun for the user to drop into a Discord/X/Farcaster post.
 */

export function downloadDataUrl(dataUrl: string, filename: string): void {
  if (typeof document === 'undefined') return;
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  // Some browsers require the anchor to be in the DOM to follow downloads.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** Safe-ish slug for filenames. */
export function slugify(input: string, fallback = 'untitled'): string {
  const s = input
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || fallback;
}
