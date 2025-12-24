/**
 * Noun Rendering Index
 */

// Types
export type { NounSeed, ImagePart, DecodedImage, ImageData as ImageDataType } from './types';
export type { TraitType } from '../utils/trait-name-utils';

// SVG Builder
export { buildSVG } from '../utils/svg-builder';

// Render functions
export {
  renderNounSVG,
  getNounDataUrl,
  getTraitName,
  getNounTraits,
  loadImageData,
  isImageDataLoaded,
} from './render';

// Image Data (for advanced use cases)
export { ImageData } from '../utils/image-data';
