/**
 * Popup UI Entry Point
 * React app for extension popup
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageSelector } from './components/LanguageSelector';
import { useLanguagePreferences } from './hooks/useLanguagePreferences';
import type { Language } from './types/translation.types';
import './styles/tailwind.css';

const Popup: React.FC = () => {
  const {
    sourceLanguage,
    targetLanguage,
    loading,
    error,
    setLanguages,
  } = useLanguagePreferences();

  const [isTranslating, setIsTranslating] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [connectionTimeout, setConnectionTimeout] = React.useState<NodeJS.Timeout | null>(null);

  const handleSourceChange = (newSource: Language) => {
    if (targetLanguage) {
      setLanguages(newSource, targetLanguage);
    } else {
      // Just update source, wait for target selection
      setLanguages(newSource, newSource === 'en' ? 'ja' : 'en');
    }
  };

  const handleTargetChange = (newTarget: Language) => {
    if (sourceLanguage) {
      setLanguages(sourceLanguage, newTarget);
    } else {
      // Just update target, wait for source selection
      setLanguages(newTarget === 'en' ? 'ja' : 'en', newTarget);
    }
  };

  /**
   * T042: Validate language selection before starting
   */
  const validateLanguages = (): boolean => {
    if (!sourceLanguage || !targetLanguage) {
      setStatusMessage('Please select both source and target languages');
      return false;
    }

    if (sourceLanguage === targetLanguage) {
      setStatusMessage('Source and target languages must be different');
      return false;
    }

    return true;
  };

  /**
   * T040: Start translation
   * T041: Implement connection timeout (5 seconds)
   * T043: Add latency tracking integration
   * T044: CSP-compliant error handling (no eval, no inline scripts)
   */
  const handleStartTranslation = async () => {
    try {
      // T042: Validate languages
      if (!validateLanguages()) {
        return;
      }

      setStatusMessage('Starting translation...');
      setIsTranslating(true);

      // T041: Setup connection timeout (5 seconds)
      const timeout = setTimeout(() => {
        setStatusMessage('Connection timeout. Please check your network and try again.');
        setIsTranslating(false);
      }, 5000);

      setConnectionTimeout(timeout);

      // Query current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        throw new Error('No active tab found');
      }

      // Send message to content script to start translation
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'START_TRANSLATION',
        sourceLanguage,
        targetLanguage,
      });

      // Clear timeout on successful connection
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        setConnectionTimeout(null);
      }

      if (response?.success) {
        setStatusMessage('Translation active');

        // T043: Latency tracking is integrated in useTranslation hook
        // Available via window.__babelFishLatency in dev mode
        if (process.env.NODE_ENV === 'development') {
          console.log('[Babel Fish] Latency tracking enabled');
        }
      } else {
        throw new Error(response?.error || 'Failed to start translation');
      }
    } catch (err) {
      // T044: CSP-compliant error handling
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setStatusMessage(`Error: ${errorMessage}`);
      setIsTranslating(false);

      // Clear timeout on error
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        setConnectionTimeout(null);
      }

      // Log error (CSP-compliant - no eval)
      console.error('[Babel Fish] Translation error:', err);
    }
  };

  /**
   * T040: Stop translation
   */
  const handleStopTranslation = async () => {
    try {
      setStatusMessage('Stopping translation...');

      // Query current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        throw new Error('No active tab found');
      }

      // Send message to content script to stop translation
      await chrome.tabs.sendMessage(tab.id, {
        type: 'STOP_TRANSLATION',
      });

      setIsTranslating(false);
      setStatusMessage(null);

      // Clear any pending timeout
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        setConnectionTimeout(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop translation';
      setStatusMessage(`Error: ${errorMessage}`);
      console.error('[Babel Fish] Stop translation error:', err);
    }
  };

  /**
   * Cleanup on unmount
   */
  React.useEffect(() => {
    return () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
    };
  }, [connectionTimeout]);

  return (
    <div className="w-96 p-5">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Babel Fish</h1>
        <p className="text-sm text-gray-600 mt-1">
          Real-time browser audio translation
        </p>
      </div>

      {error && error.code === 'STORAGE_ERROR' && (
        <div
          data-testid="storage-error"
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"
        >
          {error.userMessage}
        </div>
      )}

      {statusMessage && (
        <div
          className={`mb-4 p-3 rounded-md text-sm ${
            statusMessage.startsWith('Error')
              ? 'bg-red-50 border border-red-200 text-red-700'
              : statusMessage.includes('timeout')
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
              : 'bg-blue-50 border border-blue-200 text-blue-700'
          }`}
        >
          {statusMessage}
        </div>
      )}

      <div className="mb-6">
        <LanguageSelector
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          onSourceChange={handleSourceChange}
          onTargetChange={handleTargetChange}
          error={error?.code === 'INVALID_LANGUAGE' ? error.userMessage : null}
          loading={loading}
        />
      </div>

      <div className="border-t pt-4">
        {!isTranslating ? (
          <button
            data-testid="start-translation"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md w-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={!sourceLanguage || !targetLanguage || loading}
            onClick={handleStartTranslation}
          >
            Start Translation
          </button>
        ) : (
          <button
            data-testid="stop-translation"
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md w-full transition-colors"
            onClick={handleStopTranslation}
          >
            Stop Translation
          </button>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        {isTranslating
          ? 'Translation is active on this page'
          : 'Select languages to start translating'}
      </div>
    </div>
  );
};

// Mount React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
