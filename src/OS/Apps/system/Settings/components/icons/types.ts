import type { ReactNode } from "react";
import type { CategoryId } from "../CategoryNav";

/** Each era exports a glyph set — one SVG component per category */
export type GlyphSet = Record<CategoryId, () => ReactNode>;
