"use client";

/**
 * DesktopIcon Component
 * Individual desktop icon with click, double-click, and drag handling
 */

import { useCallback, useRef, useState, useEffect } from "react";
import { useDesktopStore, type DesktopIcon as DesktopIconType } from "@/OS/store/desktopStore";
import { appLauncher } from "@/OS/lib/AppLauncher";

interface DesktopIconProps {
  icon: DesktopIconType;
  isSelected: boolean;
  styles: Record<string, string>;
}

// Minimum drag distance before considering it a drag (not a click)
const DRAG_THRESHOLD = 5;

export function DesktopIcon({ icon, isSelected, styles }: DesktopIconProps) {
  const selectIcon = useDesktopStore((state) => state.selectIcon);
  const moveIcon = useDesktopStore((state) => state.moveIcon);
  
  const lastClickTime = useRef(0);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const iconStartPos = useRef({ x: 0, y: 0 });
  
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  // Handle mouse down - start potential drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Select the icon on mouse down
      selectIcon(icon.id);
      
      // Record starting positions
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      iconStartPos.current = { x: icon.x, y: icon.y };
      isDragging.current = true;
      hasDragged.current = false;
    },
    [icon.id, icon.x, icon.y, selectIcon]
  );

  // Global mouse move and up handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      
      // Check if we've moved past the threshold
      if (!hasDragged.current && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        hasDragged.current = true;
      }
      
      if (hasDragged.current) {
        // Update visual position during drag
        setDragOffset({
          x: iconStartPos.current.x + dx,
          y: iconStartPos.current.y + dy,
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      isDragging.current = false;
      
      if (hasDragged.current && dragOffset) {
        // Commit the move to the store (store handles snap-to-grid)
        // Clamp to desktop bounds
        const desktopElement = document.querySelector('[class*="iconContainer"]');
        if (desktopElement) {
          const bounds = desktopElement.getBoundingClientRect();
          const iconWidth = 80; // Approximate icon width
          const iconHeight = 80; // Approximate icon height
          
          const clampedX = Math.max(0, Math.min(dragOffset.x, bounds.width - iconWidth));
          const clampedY = Math.max(0, Math.min(dragOffset.y, bounds.height - iconHeight));
          
          moveIcon(icon.id, clampedX, clampedY);
        } else {
          moveIcon(icon.id, dragOffset.x, dragOffset.y);
        }
        
        setDragOffset(null);
        hasDragged.current = false;
      } else {
        // It was a click, not a drag
        const now = Date.now();
        const timeSinceLastClick = now - lastClickTime.current;

        // Double-click detection (within 400ms)
        if (timeSinceLastClick < 400) {
          appLauncher.launch(icon.appId);
          lastClickTime.current = 0;
        } else {
          lastClickTime.current = now;
        }
        
        setDragOffset(null);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [icon.id, icon.appId, moveIcon, dragOffset]);

  const iconClassName = [
    styles.icon,
    isSelected ? styles.iconSelected : "",
    dragOffset ? styles.iconDragging : "",
  ].filter(Boolean).join(" ");
  
  const labelClassName = `${styles.iconLabel} ${isSelected ? styles.iconLabelSelected : ""}`;

  // Use drag offset position if dragging, otherwise use stored position
  const displayX = dragOffset ? dragOffset.x : icon.x;
  const displayY = dragOffset ? dragOffset.y : icon.y;

  return (
    <div
      className={iconClassName}
      onMouseDown={handleMouseDown}
      style={{
        left: displayX,
        top: displayY,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={icon.icon}
        alt={icon.label}
        className={styles.iconImage}
        draggable={false}
      />
      <span className={labelClassName}>{icon.label}</span>
    </div>
  );
}

