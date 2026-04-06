"use client";

/**
 * SnapPreview Component
 * Shows a translucent overlay indicating where a window will snap
 * when the user releases the drag near a screen edge.
 *
 * Per HIG-SPEC-DESKTOP §5:
 * - Left edge → left half
 * - Right edge → right half
 * - Top edge → maximize
 * - Renders as a translucent blue overlay with rounded corners
 */

import { useWindowStore } from "@/OS/store/windowStore";

const previewStyle: React.CSSProperties = {
  position: "fixed",
  background: "rgba(0, 122, 255, 0.15)",
  border: "2px solid rgba(0, 122, 255, 0.4)",
  borderRadius: "12px",
  zIndex: 9998,
  pointerEvents: "none",
  transition: "all 0.15s ease",
};

export function SnapPreview() {
  const snapPreview = useWindowStore((state) => state.snapPreview);

  if (!snapPreview) return null;

  const menuBarHeight = 28;
  const dockHeight = 70;
  const vh = typeof globalThis.window !== "undefined" ? globalThis.window.innerHeight : 800;
  const vw = typeof globalThis.window !== "undefined" ? globalThis.window.innerWidth : 1200;
  const usableHeight = vh - menuBarHeight - dockHeight;

  let style: React.CSSProperties;

  switch (snapPreview) {
    case "left":
      style = {
        ...previewStyle,
        top: menuBarHeight + 4,
        left: 4,
        width: Math.floor(vw / 2) - 8,
        height: usableHeight - 8,
      };
      break;
    case "right":
      style = {
        ...previewStyle,
        top: menuBarHeight + 4,
        left: Math.floor(vw / 2) + 4,
        width: Math.floor(vw / 2) - 8,
        height: usableHeight - 8,
      };
      break;
    case "maximize":
      style = {
        ...previewStyle,
        top: menuBarHeight + 4,
        left: 4,
        width: vw - 8,
        height: usableHeight - 8,
      };
      break;
    default:
      return null;
  }

  return <div style={style} />;
}
