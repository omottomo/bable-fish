/**
 * Ad Display Component
 *
 * Displays PropellerAds advertisements in a fixed 300x250 container
 * Handles graceful degradation if ads fail to load
 */

import React, { useEffect, useRef, useState } from 'react';
import { adService } from '../services/adService';

interface AdDisplayProps {
  zoneId: string;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  onAdLoaded?: () => void;
  onAdFailed?: () => void;
}

export const AdDisplay: React.FC<AdDisplayProps> = ({
  zoneId,
  position = 'bottom-left',
  onAdLoaded,
  onAdFailed,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isAdBlocked, setIsAdBlocked] = useState(false);

  useEffect(() => {
    const loadAd = async () => {
      if (!containerRef.current) {
        return;
      }

      try {
        setIsLoading(true);
        setLoadFailed(false);

        // Initialize ad service
        await adService.initialize(zoneId);

        // Display ad in container
        const success = await adService.displayAd(containerRef.current, zoneId);

        if (success) {
          setIsLoading(false);
          onAdLoaded?.();
        } else {
          throw new Error('Ad display failed');
        }
      } catch (error) {
        console.warn('[AdDisplay] Ad load failed:', error);
        setIsLoading(false);
        setLoadFailed(true);

        // Check if ad blocker is active
        if (adService.isAdBlocked()) {
          setIsAdBlocked(true);
        }

        onAdFailed?.();
      }
    };

    loadAd();

    return () => {
      // Cleanup on unmount
      adService.destroy();
    };
  }, [zoneId, onAdLoaded, onAdFailed]);

  // Position classes
  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
  };

  // Don't render if ad is blocked (silent failure)
  if (isAdBlocked) {
    return null;
  }

  return (
    <div
      data-testid="ad-display"
      className={`fixed ${positionClasses[position]} z-[999998]`}
      style={{
        width: '300px',
        height: '250px',
      }}
    >
      {/* Ad Container */}
      <div
        ref={containerRef}
        className="w-full h-full bg-gray-100 rounded-lg shadow-lg overflow-hidden"
      >
        {isLoading && !loadFailed && (
          <div className="flex items-center justify-center w-full h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-xs text-gray-600">Loading ad...</p>
            </div>
          </div>
        )}

        {loadFailed && !isAdBlocked && (
          <div className="flex items-center justify-center w-full h-full bg-gray-50">
            <div className="text-center px-4">
              <p className="text-xs text-gray-500">Advertisement</p>
              <p className="text-xs text-gray-400 mt-1">Failed to load</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdDisplay;
