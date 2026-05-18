/**
 * Studio types.
 *
 * Algorithmic structure inspired by Noundry Studio (CC0):
 * https://github.com/volkyeth/noundry/tree/main/apps/studio/src
 */

export const CANVAS_SIZE = 32;
export const TOTAL_PIXELS = CANVAS_SIZE * CANVAS_SIZE; // 1024

/** A pixel coordinate (integer 0..31 within the trait canvas). */
export type Point = { x: number; y: number };

/** A rectangular region in canvas coords. */
export type Rect = { x: number; y: number; width: number; height: number };

/** Hex color `#rrggbb` or `#rrggbbaa`. */
export type Color = string;

/** The 5 Noun parts, in z-order (background drawn first, glasses on top). */
export type NounPart = 'background' | 'body' | 'accessory' | 'head' | 'glasses';

/** Canonical z-order — also the order shown in the layers panel. */
export const NOUN_PARTS: NounPart[] = [
  'background',
  'body',
  'accessory',
  'head',
  'glasses',
];

/** Whether the studio is editing one trait or a full Noun project. */
export type StudioMode = 'project' | 'trait';

/** Identifier for an installed tool. */
export type ToolId =
  | 'brush'
  | 'eraser'
  | 'eyedropper'
  | 'bucket'
  | 'line'
  | 'rectangle'
  | 'filledRectangle'
  | 'ellipse'
  | 'filledEllipse'
  | 'move'
  | 'selection';

/**
 * The runtime context every tool receives. Tools are pure functions of input
 * (pointer events) → mutations on the active layer canvas via this context.
 */
export interface ToolContext {
  /** The active layer's canvas — tools draw here. */
  canvas: HTMLCanvasElement;
  /** All layers, keyed by part. Used by tools that need to read other layers
   *  (eyedropper). Tools should NOT write to non-active layers. */
  layers: Record<NounPart, HTMLCanvasElement>;
  /** The active layer's part — useful for tools that vary behavior per part. */
  activePart: NounPart;
  /** Switch active tool (used by eyedropper to revert). */
  selectTool: (id: ToolId) => void;
  /** Commit the active layer's canvas to its history (for undo). */
  commit: () => void;
}

/** A Tool implementation. */
export interface Tool {
  id: ToolId;
  name: string;
  shortcut: string;
  /** Pointer pressed at point (canvas coords). */
  onPointerDown(point: Point, ctx: ToolContext): void;
  /** Pointer moved while down. */
  onPointerMove(point: Point, ctx: ToolContext): void;
  /** Pointer released. */
  onPointerUp(point: Point, ctx: ToolContext): void;
  /** Optional: render a hover preview to an overlay canvas (e.g. brush ghost). */
  hoverPreview?(point: Point, overlayCtx: CanvasRenderingContext2D): void;
}

/** Per-layer state stored in the layers store. */
export interface LayerState {
  part: NounPart;
  /** The native 32×32 canvas where pixels live. */
  canvas: HTMLCanvasElement;
  /** History stack of ImageData snapshots (for undo). */
  history: ImageData[];
  /** Index into history for the current state. */
  historyIndex: number;
  /** Visible in composite render. */
  visible: boolean;
  /** Prevents accidental edits. */
  locked: boolean;
  /** True if the layer has been edited since load/import. */
  edited: boolean;
}

/** Available drawing modes for shape tools (rectangle/ellipse/line). */
export type ShapeMode = 'outline' | 'filled';
