/**
 * Noun Rendering Types
 */

export interface NounSeed {
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
}

export interface DecodedImage {
  paletteIndex: number;
  bounds: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  rects: Array<[length: number, colorIndex: number]>;
}

export interface ImagePart {
  filename: string;
  data: string;
}

export interface ImageData {
  palette: string[];
  bgcolors: string[];
  images: {
    bodies: ImagePart[];
    accessories: ImagePart[];
    heads: ImagePart[];
    glasses: ImagePart[];
  };
}

export type TraitType = 'background' | 'body' | 'accessory' | 'head' | 'glasses';

