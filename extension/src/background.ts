/**
 * Background Service Worker (Manifest V3)
 * Handles extension lifecycle and messaging
 */

// Extension installed/updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Babel Fish] Extension installed/updated', details.reason);

  if (details.reason === 'install') {
    // Set default language preferences on first install
    chrome.storage.sync.set({
      language_preferences: {
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        updatedAt: new Date().toISOString(),
      },
    });
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Babel Fish Background] Message received:', message);

  // Handle different message types
  switch (message.type) {
    case 'START_TRANSLATION':
      handleStartTranslation(sender.tab?.id);
      return false; // Synchronous response

    case 'STOP_TRANSLATION':
      handleStopTranslationBackground(sender.tab?.id);
      return false; // Synchronous response

    case 'GET_TAB_AUDIO':
      handleGetTabAudio(sender.tab?.id, sendResponse);
      return true; // Keep sendResponse channel open

    default:
      console.warn('[Babel Fish Background] Unknown message type:', message.type);
      return false; // Synchronous response
  }
});

/**
 * Handle start translation request
 */
function handleStartTranslation(tabId?: number) {
  if (!tabId) {
    console.error('[Babel Fish Background] No tab ID provided');
    return;
  }

  console.log('[Babel Fish Background] Starting translation for tab:', tabId);

  // Request tab audio capture
  chrome.tabCapture.capture(
    {
      audio: true,
      video: false,
    },
    (stream) => {
      if (chrome.runtime.lastError) {
        console.error('[Babel Fish Background] Tab capture error:', chrome.runtime.lastError);
        return;
      }

      if (!stream) {
        console.error('[Babel Fish Background] No stream received');
        return;
      }

      console.log('[Babel Fish Background] Audio stream captured successfully');

      // Send stream to content script
      chrome.tabs.sendMessage(tabId, {
        type: 'AUDIO_STREAM_READY',
        streamId: stream.id,
      });
    }
  );
}

/**
 * Handle stop translation request
 */
function handleStopTranslationBackground(tabId?: number) {
  if (!tabId) {
    console.error('[Babel Fish Background] No tab ID provided');
    return;
  }

  console.log('[Babel Fish Background] Stopping translation for tab:', tabId);

  // Notify content script to stop
  chrome.tabs.sendMessage(tabId, {
    type: 'STOP_TRANSLATION',
  });
}

/**
 * Handle get tab audio request
 */
function handleGetTabAudio(tabId: number | undefined, sendResponse: (response: any) => void) {
  if (!tabId) {
    sendResponse({ error: 'No tab ID provided' });
    return;
  }

  // Implementation for retrieving current audio state
  sendResponse({ success: true, tabId });
}

console.log('[Babel Fish Background] Service worker initialized');
