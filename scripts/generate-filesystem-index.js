/**
 * Filesystem Index Generator
 * 
 * Generates _index.json files for each directory in /public/filesystem/
 * Run this script whenever you add, remove, or modify files.
 * 
 * Note: We use _index.json instead of .index.json because Next.js
 * blocks dotfiles from being served from the public folder.
 * 
 * Usage: node scripts/generate-filesystem-index.js
 */

const fs = require('fs');
const path = require('path');

const FILESYSTEM_ROOT = './public/filesystem';

// MIME type mappings
const MIME_TYPES = {
  // Text
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  ts: 'text/javascript',
  jsx: 'text/javascript',
  tsx: 'text/javascript',
  json: 'application/json',
  xml: 'application/xml',
  
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/ico',
  
  // Video
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mov: 'video/quicktime',
  
  // Audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  aac: 'audio/aac',
  m4a: 'audio/aac',
  
  // Documents
  pdf: 'application/pdf',
  
  // Archives
  zip: 'application/zip',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  
  // Fonts
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
};

// Icon mappings based on file type
function getIconForFile(name, isDirectory, mimeType) {
  if (isDirectory) {
    return '/icons/folder.svg';
  }
  
  if (!mimeType) {
    return '/icons/file-generic.svg';
  }
  
  // Text files
  if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/xml') {
    return '/icons/file-text.svg';
  }
  
  // Images
  if (mimeType.startsWith('image/')) {
    return '/icons/file-image.svg';
  }
  
  // Audio
  if (mimeType.startsWith('audio/')) {
    return '/icons/file-audio.svg';
  }
  
  // Video
  if (mimeType.startsWith('video/')) {
    return '/icons/file-video.svg';
  }
  
  // PDF
  if (mimeType === 'application/pdf') {
    return '/icons/file-pdf.svg';
  }
  
  // Archives
  if (mimeType === 'application/zip' || mimeType.includes('tar') || mimeType.includes('gzip')) {
    return '/icons/file-archive.svg';
  }
  
  // Fonts
  if (mimeType.startsWith('font/')) {
    return '/icons/file-font.svg';
  }
  
  return '/icons/file-generic.svg';
}

function getMimeType(filename) {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return MIME_TYPES[ext] || undefined;
}

function getFileInfo(filePath, relativePath) {
  const stats = fs.statSync(filePath);
  const name = path.basename(filePath);
  const ext = path.extname(name).slice(1);
  const isDirectory = stats.isDirectory();
  const mimeType = isDirectory ? undefined : getMimeType(name);
  
  return {
    name,
    path: relativePath.replace(/\\/g, '/'), // Normalize path separators
    type: isDirectory ? 'directory' : 'file',
    size: stats.size,
    mimeType,
    extension: isDirectory ? undefined : ext || undefined,
    icon: getIconForFile(name, isDirectory, mimeType),
    createdAt: Math.floor(stats.birthtimeMs),
    modifiedAt: Math.floor(stats.mtimeMs),
    isHidden: name.startsWith('.'),
  };
}

function generateIndex(dirPath, relativePath = '/') {
  const entries = fs.readdirSync(dirPath);
  const files = [];
  
  for (const entry of entries) {
    // Skip index files and hidden files
    if (entry === '_index.json' || entry.startsWith('.')) continue;
    
    const fullPath = path.join(dirPath, entry);
    const entryRelativePath = path.posix.join(relativePath, entry);
    
    const fileInfo = getFileInfo(fullPath, entryRelativePath);
    files.push(fileInfo);
    
    // Recursively process directories
    if (fs.statSync(fullPath).isDirectory()) {
      generateIndex(fullPath, entryRelativePath);
    }
  }
  
  // Sort: directories first, then files, alphabetically
  files.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
  
  // Write index file
  const indexPath = path.join(dirPath, '_index.json');
  fs.writeFileSync(indexPath, JSON.stringify(files, null, 2));
  console.log(`Generated: ${indexPath} (${files.length} items)`);
}

// Ensure filesystem root exists
if (!fs.existsSync(FILESYSTEM_ROOT)) {
  console.error(`Filesystem root not found: ${FILESYSTEM_ROOT}`);
  console.log('Creating directory structure...');
  fs.mkdirSync(FILESYSTEM_ROOT, { recursive: true });
}

// Run
console.log('Generating filesystem indexes...\n');
generateIndex(FILESYSTEM_ROOT);
console.log('\n✓ Filesystem index generation complete!');

