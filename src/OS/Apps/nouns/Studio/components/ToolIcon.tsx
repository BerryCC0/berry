/**
 * ToolIcon — inline SVG icon for each tool. Berry uses CSS Modules + custom
 * primitives rather than react-icons, so we render compact pixel-style
 * symbols directly.
 */

import type { ToolId } from '../types';

interface ToolIconProps {
  id: ToolId;
  size?: number;
}

export function ToolIcon({ id, size = 18 }: ToolIconProps) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor' };
  switch (id) {
    case 'brush':
      return (
        <svg {...props}>
          <path d="M3 18l4-4 3 3-4 4H3v-3zm6.5-4.5l7-7a2 2 0 012.83 2.83l-7 7-2.83-2.83z" />
        </svg>
      );
    case 'eraser':
      return (
        <svg {...props}>
          <path d="M3 17l6-6 8 8-6 6H4l-1-1v-2l1-1-1-4zm10-10l4-4a2 2 0 012.83 0l2.83 2.83a2 2 0 010 2.83l-4 4-5.66-5.66z" />
        </svg>
      );
    case 'eyedropper':
      return (
        <svg {...props}>
          <path d="M5 19l3-3 8-8 2 2-8 8-3 3H3v-2zm10-10l4-4 2 2-4 4-2-2z" />
        </svg>
      );
    case 'bucket':
      return (
        <svg {...props}>
          <path d="M4 9l8-8 8 8-8 8L4 9zm0 12l1.5-4h13L20 21H4z" />
        </svg>
      );
    case 'line':
      return (
        <svg {...props}>
          <path d="M3 21l18-18-2-2L1 19l2 2z" />
        </svg>
      );
    case 'rectangle':
      return (
        <svg {...props}>
          <path d="M3 4h18v16H3V4zm2 2v12h14V6H5z" />
        </svg>
      );
    case 'filledRectangle':
      return (
        <svg {...props}>
          <path d="M3 4h18v16H3z" />
        </svg>
      );
    case 'ellipse':
      return (
        <svg {...props}>
          <path d="M12 4c5 0 9 4 9 8s-4 8-9 8-9-4-9-8 4-8 9-8zm0 2c-3.9 0-7 3-7 6s3.1 6 7 6 7-3 7-6-3.1-6-7-6z" />
        </svg>
      );
    case 'filledEllipse':
      return (
        <svg {...props}>
          <ellipse cx="12" cy="12" rx="9" ry="8" />
        </svg>
      );
    case 'move':
      return (
        <svg {...props}>
          <path d="M12 2l4 4h-3v4h4V7l4 4-4 4v-3h-4v4h3l-4 4-4-4h3v-4H7v3l-4-4 4-4v3h4V6H8l4-4z" />
        </svg>
      );
    case 'selection':
      return (
        <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2">
          <rect x="4" y="4" width="16" height="16" />
        </svg>
      );
    default:
      return <svg {...props} />;
  }
}
