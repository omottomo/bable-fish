/**
 * Content Script
 * Injects Translation Overlay and Ad Display into web pages
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import TranslationOverlay from './components/TranslationOverlay';
import NotificationBanner from './components/NotificationBanner';
import AdDisplay from './components/AdDisplay';
import { useTranslation } from './hooks/useTranslation';
import { useAudioCapture } from './hooks/useAudioCapture';
import type { Language } from './types/translation.types';
import './styles/tailwind.css';

// Ad zone ID from environment or config
const AD_ZONE_ID = process.env.PROPELLERADS_ZONE_ID || 'demo-zone-id';

console.log('[Babel Fish Content] Content script loaded');

// Translation app state
let isTranslationActive = false;
let overlayRoot: HTMLDivElement | null = null;
let reactRoot: any = null;

/**
 * Translation App Component (injected into page)
 */
const TranslationApp: React.FC<{
  sourceLanguage: Language;
  targetLanguage: Language;
  onClose: () => void;
}> = ({ sourceLanguage, targetLanguage, onClose }) => {
  const {
    isConnected,
    isTranslating,
    translationState,
    error,
    isReconnecting,
    startTranslation,
    stopTranslation,
    sendAudioChunk,
  } = useTranslation();

  const {
    isCapturing,
    error: audioError,
    startCapture,
    stopCapture,
    onAudioChunk,
  } = useAudioCapture();

  const [showNotification, setShowNotification] = React.useState(false);
  const [notificationMessage, setNotificationMessage] = React.useState('');
  const [notificationType, setNotificationType] = React.useState<'error' | 'warning' | 'info' | 'success'>('info');

  // Start translation on mount
  React.useEffect(() => {
    const initialize = async () => {
      try {
        // Start translation connection
        await startTranslation(sourceLanguage, targetLanguage);

        // Start audio capture
        await startCapture();

        // Setup audio chunk handler
        onAudioChunk((chunk, sequenceNumber, timestamp) => {
          sendAudioChunk(chunk, sequenceNumber, timestamp).catch((err) => {
            console.error('Failed to send audio chunk:', err);
          });
        });
      } catch (err) {
        console.error('Failed to initialize translation:', err);
        const message = err instanceof Error ? err.message : 'Failed to start translation';
        setNotificationMessage(message);
        setNotificationType('error');
        setShowNotification(true);
      }
    };

    initialize();

    return () => {
      stopCapture().catch(console.error);
      stopTranslation();
    };
  }, [sourceLanguage, targetLanguage]);

  // Handle errors
  React.useEffect(() => {
    if (error) {
      setNotificationMessage(error);
      setNotificationType('error');
      setShowNotification(true);
    } else if (audioError) {
      setNotificationMessage(audioError);
      setNotificationType('error');
      setShowNotification(true);
    } else if (isReconnecting) {
      setNotificationMessage('Connection lost. Reconnecting...');
      setNotificationType('warning');
      setShowNotification(true);
    }
  }, [error, audioError, isReconnecting]);

  // Handle close
  const handleClose = () => {
    stopCapture().catch(console.error);
    stopTranslation();
    onClose();
  };

  return (
    <>
      <TranslationOverlay
        text={translationState?.text || ''}
        isVisible={isTranslating || isConnected}
        isFinal={translationState?.isFinal || false}
        onClose={handleClose}
      />

      {/* T049: Ad Display positioned to not overlap translation overlay */}
      {/* Translation overlay is top-right, so ads go bottom-left to avoid overlap */}
      <AdDisplay
        zoneId={AD_ZONE_ID}
        position="bottom-left"
        onAdLoaded={() => console.log('[Babel Fish] Ad loaded successfully')}
        onAdFailed={() => console.log('[Babel Fish] Ad failed to load (graceful degradation)')}
      />

      <NotificationBanner
        type={notificationType}
        message={notificationMessage}
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
        actionLabel={error ? 'Retry' : undefined}
        onAction={
          error
            ? () => {
                setShowNotification(false);
                startTranslation(sourceLanguage, targetLanguage).catch(console.error);
              }
            : undefined
        }
      />
    </>
  );
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Babel Fish Content] Message received:', message);

  switch (message.type) {
    case 'START_TRANSLATION':
      handleStartTranslation(message.sourceLanguage, message.targetLanguage);
      sendResponse({ success: true });
      break;

    case 'STOP_TRANSLATION':
      handleStopTranslation();
      sendResponse({ success: true });
      break;

    default:
      console.warn('[Babel Fish Content] Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true; // Keep message channel open for async response
});

/**
 * Handle start translation request
 */
function handleStartTranslation(sourceLanguage: Language, targetLanguage: Language) {
  console.log('[Babel Fish Content] Starting translation:', sourceLanguage, '→', targetLanguage);

  if (isTranslationActive) {
    console.warn('[Babel Fish Content] Translation already active');
    return;
  }

  // Create overlay root if doesn't exist
  if (!overlayRoot) {
    overlayRoot = document.createElement('div');
    overlayRoot.id = 'babel-fish-overlay-root';
    document.body.appendChild(overlayRoot);
  }

  // Mount React app
  if (!reactRoot) {
    reactRoot = createRoot(overlayRoot);
  }

  reactRoot.render(
    <TranslationApp
      sourceLanguage={sourceLanguage}
      targetLanguage={targetLanguage}
      onClose={handleStopTranslation}
    />
  );

  isTranslationActive = true;
}

/**
 * Handle stop translation
 */
function handleStopTranslation() {
  console.log('[Babel Fish Content] Stopping translation');

  if (!isTranslationActive) {
    console.warn('[Babel Fish Content] Translation not active');
    return;
  }

  // Unmount React app
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }

  // Remove overlay root
  if (overlayRoot) {
    overlayRoot.remove();
    overlayRoot = null;
  }

  isTranslationActive = false;
}

/**
 * Inject Ad Display into page
 * Will be implemented in Phase 5 (US5)
 */
function injectAdDisplay() {
  // Create root div for Ad component
  const adRoot = document.createElement('div');
  adRoot.id = 'babel-fish-ad-root';
  document.body.appendChild(adRoot);

  console.log('[Babel Fish Content] Ad display root created');
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[Babel Fish Content] DOM loaded, ready for injection');
  });
} else {
  console.log('[Babel Fish Content] DOM already loaded');
}
