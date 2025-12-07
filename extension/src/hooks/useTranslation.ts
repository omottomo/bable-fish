/**
 * useTranslation Hook
 *
 * React hook for managing WebSocket translation connection and state
 * Integrates websocketClient and translationService
 */

import { useState, useEffect, useCallback } from 'react';
import { websocketClient } from '../services/websocketClient';
import { translationService } from '../services/translationService';
import type { Language } from '../types/translation.types';

interface TranslationState {
  text: string;
  isFinal: boolean;
  confidence: number;
}

interface UseTranslationReturn {
  isConnected: boolean;
  isTranslating: boolean;
  translationState: TranslationState | null;
  error: string | null;
  isReconnecting: boolean;
  startTranslation: (sourceLanguage: Language, targetLanguage: Language) => Promise<void>;
  stopTranslation: () => void;
  sendAudioChunk: (chunk: ArrayBuffer, sequenceNumber: number, timestamp: number) => Promise<void>;
}

const TRANSLATION_SERVER_URL = process.env.TRANSLATION_SERVER_URL || 'ws://localhost:8080/translate';

export function useTranslation(): UseTranslationReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationState, setTranslationState] = useState<TranslationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  /**
   * Start translation session
   */
  const startTranslation = useCallback(
    async (sourceLanguage: Language, targetLanguage: Language) => {
      try {
        setError(null);

        // Validate languages are different
        if (sourceLanguage === targetLanguage) {
          throw new Error('Source and target languages must be different');
        }

        // Connect to WebSocket server
        await websocketClient.connect(TRANSLATION_SERVER_URL);
        setIsConnected(true);

        // Generate client ID
        const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Start session
        await websocketClient.startSession({
          sourceLanguage,
          targetLanguage,
          clientId,
        });

        // Initialize translation service
        translationService.initSession(clientId, sourceLanguage, targetLanguage);

        setIsTranslating(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start translation';
        setError(errorMessage);
        setIsConnected(false);
        throw err;
      }
    },
    []
  );

  /**
   * Stop translation session
   */
  const stopTranslation = useCallback(() => {
    websocketClient.disconnect();
    translationService.reset();
    setIsConnected(false);
    setIsTranslating(false);
    setTranslationState(null);
    setIsReconnecting(false);
  }, []);

  /**
   * Send audio chunk to server
   */
  const sendAudioChunk = useCallback(
    async (chunk: ArrayBuffer, sequenceNumber: number, timestamp: number) => {
      if (!isConnected) {
        throw new Error('Not connected to translation server');
      }

      try {
        await websocketClient.sendAudioChunk(chunk, sequenceNumber, timestamp);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send audio chunk';
        setError(errorMessage);
        throw err;
      }
    },
    [isConnected]
  );

  /**
   * Setup WebSocket event listeners
   */
  useEffect(() => {
    // Translation result handler
    translationService.onTranslationResult((result) => {
      setTranslationState({
        text: result.text,
        isFinal: result.isFinal,
        confidence: result.confidence,
      });
      setError(null); // Clear errors on successful translation
    });

    // WebSocket translation handler
    websocketClient.onTranslation((response) => {
      translationService.handleTranslationResponse(response);
    });

    // Session started handler
    websocketClient.onSessionStarted((payload) => {
      translationService.updateStatus('active');
      setIsTranslating(true);
    });

    // Error handler
    websocketClient.onError((errorPayload) => {
      setError(errorPayload.message);

      // Handle specific error codes
      switch (errorPayload.code) {
        case 'CONNECTION_TIMEOUT':
          setError('Connection timeout. Please check your network and try again.');
          setIsConnected(false);
          setIsTranslating(false);
          break;

        case 'INVALID_LANGUAGE':
          setError('Invalid language selection. Please select valid source and target languages.');
          setIsTranslating(false);
          break;

        case 'SERVER_ERROR':
          setError('Translation server error. Please try again later.');
          break;

        case 'AUDIO_DECODE_ERROR':
          setError('Failed to process audio. Please check your audio source.');
          break;

        default:
          setError(errorPayload.message);
      }
    });

    // Reconnecting handler
    websocketClient.onReconnecting(() => {
      setIsReconnecting(true);
      setError('Connection lost. Reconnecting...');
    });

    // Max retries handler
    websocketClient.onMaxRetriesReached(() => {
      setIsReconnecting(false);
      setIsConnected(false);
      setIsTranslating(false);
      setError('Failed to connect after multiple attempts. Please check your network.');
    });
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (isConnected) {
        websocketClient.disconnect();
      }
    };
  }, [isConnected]);

  return {
    isConnected,
    isTranslating,
    translationState,
    error,
    isReconnecting,
    startTranslation,
    stopTranslation,
    sendAudioChunk,
  };
}
