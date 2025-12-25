/**
 * Icon Registry
 * Central registry for all system and app icons
 * 
 * Icons are served from /public/icons/ and referenced here by ID.
 * To add a new icon:
 * 1. Place the SVG/PNG in /public/icons/
 * 2. Add an entry to the appropriate registry below
 * 
 * Per ARCHITECTURE.md, this is a system utility in /src/OS/lib/
 */

const ICONS_BASE_PATH = "/icons";

/**
 * System icon IDs
 */
export type SystemIconId =
  | "berry"
  | "hard-drive"
  | "folder"
  | "folder-open"
  | "document"
  | "launchpad"
  | "default";

/**
 * App icon IDs
 */
export type AppIconId =
  | "finder"
  | "calculator"
  | "settings"
  | "wallet"
  | "about"
  | "text-editor"
  | "image-viewer"
  | "sound-jam"
  | "movie-player"
  | "pdf-viewer"
  | "nouns-auction"
  | "camp"
  | "treasury"
  | "nounspot";

/**
 * File type icon IDs
 */
export type FileIconId =
  | "file-text"
  | "file-image"
  | "file-audio"
  | "file-video"
  | "file-pdf"
  | "file-code"
  | "file-archive"
  | "file-generic";

/**
 * All icon IDs
 */
export type IconId = SystemIconId | AppIconId | FileIconId;

/**
 * Icon registry mapping IDs to paths
 */
const iconRegistry: Record<IconId, string> = {
  // System icons
  "berry": `${ICONS_BASE_PATH}/berry.svg`,
  "hard-drive": `${ICONS_BASE_PATH}/hard-drive.svg`,
  "folder": `${ICONS_BASE_PATH}/folder.svg`,
  "folder-open": `${ICONS_BASE_PATH}/folder-open.svg`,
  "document": `${ICONS_BASE_PATH}/document.svg`,
  "launchpad": `${ICONS_BASE_PATH}/launchpad.svg`,
  "default": `${ICONS_BASE_PATH}/default.svg`,

  // App icons
  "finder": `${ICONS_BASE_PATH}/finder.svg`,
  "calculator": `${ICONS_BASE_PATH}/calculator.svg`,
  "settings": `${ICONS_BASE_PATH}/settings.png`,
  "wallet": `${ICONS_BASE_PATH}/wallet.svg`,
  "about": `${ICONS_BASE_PATH}/about.svg`,
  "text-editor": `${ICONS_BASE_PATH}/text-editor.svg`,
  "image-viewer": `${ICONS_BASE_PATH}/image-viewer.svg`,
  "sound-jam": `${ICONS_BASE_PATH}/sound-jam.svg`,
  "movie-player": `${ICONS_BASE_PATH}/movie-player.svg`,
  "pdf-viewer": `${ICONS_BASE_PATH}/pdf-viewer.svg`,
  "nouns-auction": `${ICONS_BASE_PATH}/loading.gif`,
  "camp": `${ICONS_BASE_PATH}/camp.svg`,
  "treasury": `${ICONS_BASE_PATH}/treasury.png`,
  "nounspot": `${ICONS_BASE_PATH}/nounspot.svg`,

  // File type icons
  "file-text": `${ICONS_BASE_PATH}/file-text.svg`,
  "file-image": `${ICONS_BASE_PATH}/file-image.svg`,
  "file-audio": `${ICONS_BASE_PATH}/file-audio.svg`,
  "file-video": `${ICONS_BASE_PATH}/file-video.svg`,
  "file-pdf": `${ICONS_BASE_PATH}/file-pdf.svg`,
  "file-code": `${ICONS_BASE_PATH}/file-code.svg`,
  "file-archive": `${ICONS_BASE_PATH}/file-archive.svg`,
  "file-generic": `${ICONS_BASE_PATH}/file-generic.svg`,
};

/**
 * File extension to icon mapping
 * Per FILESYSTEM.md, maps file extensions to appropriate icons
 */
const extensionToIcon: Record<string, FileIconId> = {
  // Text files
  txt: "file-text",
  md: "file-text",
  rtf: "file-text",

  // Code files
  js: "file-code",
  ts: "file-code",
  jsx: "file-code",
  tsx: "file-code",
  json: "file-code",
  html: "file-code",
  css: "file-code",

  // Images
  jpg: "file-image",
  jpeg: "file-image",
  png: "file-image",
  gif: "file-image",
  webp: "file-image",
  svg: "file-image",
  ico: "file-image",

  // Audio
  mp3: "file-audio",
  wav: "file-audio",
  ogg: "file-audio",
  m4a: "file-audio",

  // Video
  mp4: "file-video",
  webm: "file-video",
  mov: "file-video",
  avi: "file-video",

  // Documents
  pdf: "file-pdf",

  // Archives
  zip: "file-archive",
  tar: "file-archive",
  gz: "file-archive",
  rar: "file-archive",
};

/**
 * MIME type to icon mapping
 */
const mimeToIcon: Record<string, FileIconId> = {
  "text/plain": "file-text",
  "text/markdown": "file-text",
  "text/html": "file-code",
  "text/css": "file-code",
  "text/javascript": "file-code",
  "application/json": "file-code",
  "application/javascript": "file-code",
  "application/pdf": "file-pdf",
  "image/jpeg": "file-image",
  "image/png": "file-image",
  "image/gif": "file-image",
  "image/webp": "file-image",
  "image/svg+xml": "file-image",
  "audio/mpeg": "file-audio",
  "audio/wav": "file-audio",
  "audio/ogg": "file-audio",
  "video/mp4": "file-video",
  "video/webm": "file-video",
  "application/zip": "file-archive",
  "application/x-tar": "file-archive",
  "application/gzip": "file-archive",
};

/**
 * Get icon path by ID
 */
export function getIcon(id: IconId): string {
  return iconRegistry[id] || iconRegistry["default"];
}

/**
 * Get icon path for an app
 */
export function getAppIcon(appId: string): string {
  // Check if it's a known app icon
  if (appId in iconRegistry) {
    return iconRegistry[appId as AppIconId];
  }
  // Fallback to default
  return iconRegistry["default"];
}

/**
 * Get icon path for a file by extension
 */
export function getIconForExtension(extension: string): string {
  const ext = extension.toLowerCase().replace(/^\./, "");
  const iconId = extensionToIcon[ext] || "file-generic";
  return iconRegistry[iconId];
}

/**
 * Get icon path for a file by MIME type
 */
export function getIconForMimeType(mimeType: string): string {
  const iconId = mimeToIcon[mimeType] || "file-generic";
  return iconRegistry[iconId];
}

/**
 * Get icon path for a file (by name, extension, or mime)
 */
export function getIconForFile(
  fileName: string,
  mimeType?: string,
  isDirectory?: boolean
): string {
  // Directories
  if (isDirectory) {
    return iconRegistry["folder"];
  }

  // Try MIME type first
  if (mimeType && mimeType in mimeToIcon) {
    return iconRegistry[mimeToIcon[mimeType]];
  }

  // Fall back to extension
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext && ext in extensionToIcon) {
    return iconRegistry[extensionToIcon[ext]];
  }

  // Generic file
  return iconRegistry["file-generic"];
}

/**
 * Check if an icon exists in the registry
 */
export function hasIcon(id: string): boolean {
  return id in iconRegistry;
}

/**
 * Get all registered icon IDs
 */
export function getAllIconIds(): IconId[] {
  return Object.keys(iconRegistry) as IconId[];
}

/**
 * Icon Registry singleton for convenient access
 */
export const iconRegistry_ = {
  get: getIcon,
  getApp: getAppIcon,
  getForExtension: getIconForExtension,
  getForMimeType: getIconForMimeType,
  getForFile: getIconForFile,
  has: hasIcon,
  all: getAllIconIds,
  
  // Direct access to paths
  paths: iconRegistry,
};

