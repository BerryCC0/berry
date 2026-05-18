/**
 * Tool registry — central map of all installed tools and their keyboard
 * shortcuts.
 */

import { brushTool } from './brush';
import { bucketTool } from './bucket';
import { eraserTool } from './eraser';
import { eyedropperTool } from './eyedropper';
import { moveTool } from './move';
import { selectionTool } from './selection';
import {
  ellipseTool,
  filledEllipseTool,
  filledRectangleTool,
  lineTool,
  rectangleTool,
} from './shapes';
import type { Tool, ToolId } from '../types';

export const TOOLS: Record<ToolId, Tool> = {
  brush: brushTool,
  eraser: eraserTool,
  eyedropper: eyedropperTool,
  bucket: bucketTool,
  line: lineTool,
  rectangle: rectangleTool,
  filledRectangle: filledRectangleTool,
  ellipse: ellipseTool,
  filledEllipse: filledEllipseTool,
  move: moveTool,
  selection: selectionTool,
};

/** Display order in the toolbox panel (top to bottom). */
export const TOOL_ORDER: ToolId[] = [
  'brush',
  'eraser',
  'eyedropper',
  'bucket',
  'line',
  'rectangle',
  'filledRectangle',
  'ellipse',
  'filledEllipse',
  'move',
  'selection',
];

/** Keyboard shortcut → tool id map. */
export const SHORTCUT_MAP: Record<string, ToolId> = {
  b: 'brush',
  e: 'eraser',
  i: 'eyedropper',
  g: 'bucket',
  l: 'line',
  r: 'rectangle',
  // Shift+R handled in keybindings hook
  o: 'ellipse',
  // Shift+O handled in keybindings hook
  v: 'move',
  m: 'selection',
};
