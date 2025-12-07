/**
 * Translation Overlay Component
 *
 * Displays real-time translated text in a fixed overlay on the webpage
 * Initially fixed size/position (resize/drag added in US3/US4)
 */

import React, { useState, useEffect } from 'react';

interface TranslationOverlayProps {
  text: string;
  isVisible: boolean;
  isFinal: boolean;
  onClose: () => void;
}

export const TranslationOverlay: React.FC<TranslationOverlayProps> = ({
  text,
  isVisible,
  isFinal,
  onClose,
}) => {
  const [displayText, setDisplayText] = useState<string>('');

  useEffect(() => {
    setDisplayText(text);
  }, [text]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      data-testid="translation-overlay"
      className="fixed top-4 right-4 bg-black bg-opacity-90 text-white rounded-lg shadow-2xl z-[999999] max-w-md"
      style={{
        width: '400px',
        minHeight: '150px',
        maxHeight: '400px',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold">Translation</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
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
      <div className="px-4 py-4 overflow-y-auto" style={{ maxHeight: '320px' }}>
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
    </div>
  );
};

export default TranslationOverlay;
