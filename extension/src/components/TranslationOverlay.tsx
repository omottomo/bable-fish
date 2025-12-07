/**
 * Translation Overlay Component
 *
 * Displays real-time translated text in a resizable and draggable overlay
 * Features:
 * - Resize by dragging corners/edges (T054-T058)
 * - Reposition by dragging header (T060-T064)
 * - Persist size and position (T056, T062)
 * - Bounds constraints: 200-800w, 100-600h
 */

import React, { useState, useEffect, useRef } from 'react';

interface TranslationOverlayProps {
  text: string;
  isVisible: boolean;
  isFinal: boolean;
  onClose: () => void;
  initialWidth?: number;
  initialHeight?: number;
  initialX?: number;
  initialY?: number;
  onSizeChange?: (width: number, height: number) => void;
  onPositionChange?: (x: number, y: number) => void;
}

// Size constraints from spec
const MIN_WIDTH = 200;
const MAX_WIDTH = 800;
const MIN_HEIGHT = 100;
const MAX_HEIGHT = 600;

export const TranslationOverlay: React.FC<TranslationOverlayProps> = ({
  text,
  isVisible,
  isFinal,
  onClose,
  initialWidth = 400,
  initialHeight = 300,
  initialX = window.innerWidth - 420,
  initialY = 16,
  onSizeChange,
  onPositionChange,
}) => {
  const [displayText, setDisplayText] = useState<string>('');
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [x, setX] = useState(initialX);
  const [y, setY] = useState(initialY);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');

  const overlayRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0, overlayX: 0, overlayY: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0, width: 0, height: 0, overlayX: 0, overlayY: 0 });

  useEffect(() => {
    setDisplayText(text);
  }, [text]);

  // T057: Load persisted size on mount
  useEffect(() => {
    if (initialWidth !== 400) setWidth(initialWidth);
    if (initialHeight !== 300) setHeight(initialHeight);
    if (initialX !== window.innerWidth - 420) setX(initialX);
    if (initialY !== 16) setY(initialY);
  }, [initialWidth, initialHeight, initialX, initialY]);

  // T061: Drag logic for repositioning
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      overlayX: x,
      overlayY: y,
    };
  };

  // T055: Resize drag logic
  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    resizeStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      width,
      height,
      overlayX: x,
      overlayY: y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Calculate new position
        const deltaX = e.clientX - dragStartPos.current.x;
        const deltaY = e.clientY - dragStartPos.current.y;

        let newX = dragStartPos.current.overlayX + deltaX;
        let newY = dragStartPos.current.overlayY + deltaY;

        // Constrain to viewport bounds
        newX = Math.max(0, Math.min(newX, window.innerWidth - width));
        newY = Math.max(0, Math.min(newY, window.innerHeight - height));

        setX(newX);
        setY(newY);

        // T062: Persist position
        onPositionChange?.(newX, newY);
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStartPos.current.x;
        const deltaY = e.clientY - resizeStartPos.current.y;

        let newWidth = width;
        let newHeight = height;
        let newX = x;
        let newY = y;

        // Handle different resize directions
        if (resizeHandle.includes('e')) {
          newWidth = resizeStartPos.current.width + deltaX;
        }
        if (resizeHandle.includes('w')) {
          newWidth = resizeStartPos.current.width - deltaX;
          newX = resizeStartPos.current.overlayX + deltaX;
        }
        if (resizeHandle.includes('s')) {
          newHeight = resizeStartPos.current.height + deltaY;
        }
        if (resizeHandle.includes('n')) {
          newHeight = resizeStartPos.current.height - deltaY;
          newY = resizeStartPos.current.overlayY + deltaY;
        }

        // T055: Constrain to min/max bounds
        newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
        newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));

        // Update position for north/west resizing
        if (resizeHandle.includes('w')) {
          newX = resizeStartPos.current.overlayX + (resizeStartPos.current.width - newWidth);
        }
        if (resizeHandle.includes('n')) {
          newY = resizeStartPos.current.overlayY + (resizeStartPos.current.height - newHeight);
        }

        setWidth(newWidth);
        setHeight(newHeight);
        setX(newX);
        setY(newY);

        // T056: Persist size
        onSizeChange?.(newWidth, newHeight);
        onPositionChange?.(newX, newY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle('');
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, width, height, x, y, resizeHandle, onSizeChange, onPositionChange]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      data-testid="translation-overlay"
      className="fixed bg-black bg-opacity-90 text-white rounded-lg shadow-2xl z-[999999] select-none"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        left: `${x}px`,
        top: `${y}px`,
        transition: isDragging || isResizing ? 'none' : 'all 0.1s ease-out', // T058: Smooth animation
      }}
    >
      {/* T060: Draggable Header */}
      <div
        data-testid="drag-handle"
        className="flex justify-between items-center px-4 py-3 border-b border-gray-700 cursor-move"
        onMouseDown={handleDragStart}
      >
        <h3 className="text-sm font-semibold">Translation</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Close translation overlay"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Translation Text */}
      <div className="px-4 py-4 overflow-y-auto" style={{ height: `${height - 120}px` }}>
        {displayText ? (
          <p
            className={`text-base leading-relaxed ${
              isFinal ? 'text-white' : 'text-gray-300 italic'
            }`}
          >
            {displayText}
          </p>
        ) : (
          <p className="text-gray-500 text-sm italic">Waiting for audio...</p>
        )}
      </div>

      {/* Status Indicator */}
      {!isFinal && displayText && (
        <div className="px-4 py-2 border-t border-gray-700">
          <div className="flex items-center text-xs text-gray-400">
            <span className="animate-pulse mr-2">●</span>
            <span>Translating...</span>
          </div>
        </div>
      )}

      {/* T054: Resize Handles */}
      {/* Corner handles */}
      <div
        data-testid="resize-handle-nw"
        className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize"
        onMouseDown={(e) => handleResizeStart(e, 'nw')}
        style={{ transform: 'translate(-50%, -50%)' }}
      />
      <div
        data-testid="resize-handle-ne"
        className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize"
        onMouseDown={(e) => handleResizeStart(e, 'ne')}
        style={{ transform: 'translate(50%, -50%)' }}
      />
      <div
        data-testid="resize-handle-sw"
        className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize"
        onMouseDown={(e) => handleResizeStart(e, 'sw')}
        style={{ transform: 'translate(-50%, 50%)' }}
      />
      <div
        data-testid="resize-handle-br"
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-gray-600 rounded-tl opacity-50 hover:opacity-100"
        onMouseDown={(e) => handleResizeStart(e, 'se')}
      />

      {/* Edge handles */}
      <div
        className="absolute top-0 left-1/2 w-16 h-2 cursor-ns-resize"
        onMouseDown={(e) => handleResizeStart(e, 'n')}
        style={{ transform: 'translateX(-50%)' }}
      />
      <div
        className="absolute bottom-0 left-1/2 w-16 h-2 cursor-ns-resize"
        onMouseDown={(e) => handleResizeStart(e, 's')}
        style={{ transform: 'translateX(-50%)' }}
      />
      <div
        className="absolute left-0 top-1/2 w-2 h-16 cursor-ew-resize"
        onMouseDown={(e) => handleResizeStart(e, 'w')}
        style={{ transform: 'translateY(-50%)' }}
      />
      <div
        className="absolute right-0 top-1/2 w-2 h-16 cursor-ew-resize"
        onMouseDown={(e) => handleResizeStart(e, 'e')}
        style={{ transform: 'translateY(-50%)' }}
      />
    </div>
  );
};

export default TranslationOverlay;
