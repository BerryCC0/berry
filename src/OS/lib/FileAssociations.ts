/**
 * File Associations
 * Maps file types (MIME types) to apps that can open them
 */

// MIME type to app ID mapping
const mimeAssociations: Record<string, string> = {
  // Text - TextEditor
  "text/plain": "text-editor",
  "text/markdown": "text-editor",
  "text/html": "text-editor",
  "text/css": "text-editor",
  "text/javascript": "text-editor",
  "application/json": "text-editor",
  "application/xml": "text-editor",
  "text/csv": "text-editor",

  // Images - ImageViewer
  "image/jpeg": "image-viewer",
  "image/png": "image-viewer",
  "image/gif": "image-viewer",
  "image/webp": "image-viewer",
  "image/svg+xml": "image-viewer",
  "image/bmp": "image-viewer",
  "image/ico": "image-viewer",

  // Video - MoviePlayer
  "video/mp4": "movie-player",
  "video/webm": "movie-player",
  "video/ogg": "movie-player",
  "video/quicktime": "movie-player",

  // Audio - SoundJam
  "audio/mpeg": "sound-jam",
  "audio/wav": "sound-jam",
  "audio/ogg": "sound-jam",
  "audio/webm": "sound-jam",
  "audio/aac": "sound-jam",
  "audio/mp4": "sound-jam",

  // Documents - PDFViewer
  "application/pdf": "pdf-viewer",
};

// Extension to MIME type mapping (fallback)
const extensionToMime: Record<string, string> = {
  // Text
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  ts: "text/javascript",
  jsx: "text/javascript",
  tsx: "text/javascript",
  json: "application/json",
  xml: "application/xml",
  csv: "text/csv",

  // Images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/ico",

  // Video
  mp4: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  mov: "video/quicktime",

  // Audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  aac: "audio/aac",
  m4a: "audio/mp4",

  // Documents
  pdf: "application/pdf",
};

/**
 * Get app ID for a given MIME type
 */
export function getAppForMimeType(mimeType?: string): string | null {
  if (!mimeType) return null;
  return mimeAssociations[mimeType] || null;
}

/**
 * Get app ID for a given file extension
 */
export function getAppForExtension(ext: string): string | null {
  const mimeType = extensionToMime[ext.toLowerCase()];
  return mimeType ? getAppForMimeType(mimeType) : null;
}

/**
 * Get MIME type for a given file extension
 */
export function getMimeTypeForExtension(ext: string): string | undefined {
  return extensionToMime[ext.toLowerCase()];
}

/**
 * Check if a MIME type can be opened
 */
export function canOpenMimeType(mimeType?: string): boolean {
  return getAppForMimeType(mimeType) !== null;
}

/**
 * Check if a file extension can be opened
 */
export function canOpenExtension(ext: string): boolean {
  return getAppForExtension(ext) !== null;
}

/**
 * Get all supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return Object.keys(extensionToMime);
}

