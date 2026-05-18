/**
 * Berry Studio artwork encoding library. See encoder.ts for the pipeline
 * overview. Attribution to Noundry's CC0 reference is in each file header.
 */

export {
  compressAndEncodeTrait,
  encodeArtwork,
  packToBoundedPixels,
  rleEncode,
  type EncodedTrait,
  type BoundedPixels,
} from "./encoder";

export { decodeTrait, rleDecode } from "./decoder";

export {
  buildPaletteDict,
  nearestPaletteIndex,
  parseHexColor,
  type RGBA,
} from "./palette";

export {
  generateAgreementText,
  generateAgreementMarkdown,
  NOUNS_CC0_AGREEMENT_URL,
  type AgreementInput,
} from "./agreement";
