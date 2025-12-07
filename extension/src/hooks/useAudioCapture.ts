/**
 * useAudioCapture Hook
 *
 * React hook for managing audio capture from browser tab
 * Handles permissions, audio stream lifecycle, and chunk processing
 */

import { useState, useEffect, useCallback } from 'react';
import { audioCapture } from '../services/audioCapture';
import { createAudioChunk } from '../utils/audioChunker';

interface UseAudioCaptureReturn {
  isCapturing: boolean;
  error: string | null;
  startCapture: () => Promise<void>;
  stopCapture: () => Promise<void>;
  onAudioChunk: (handler: (chunk: ArrayBuffer, sequenceNumber: number, timestamp: number) => void) => void;
}

export function useAudioCapture(): UseAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sequenceNumber, setSequenceNumber] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(0);
  const [chunkCallback, setChunkCallback] = useState<
    ((chunk: ArrayBuffer, sequenceNumber: number, timestamp: number) => void) | null
  >(null);

  /**
   * Start capturing audio
   */
  const startCapture = useCallback(async () => {
    try {
      setError(null);
      setSequenceNumber(0);
      setSessionStartTime(Date.now());

      // Start audio capture
      await audioCapture.start();

      // Setup chunk handler
      await audioCapture.onChunk(async (blob) => {
        const currentSeq = sequenceNumber;
        setSequenceNumber((prev) => prev + 1);

        const timestamp = Date.now() - sessionStartTime;

        // Convert blob to ArrayBuffer with header
        const chunkWithHeader = await createAudioChunk(blob, currentSeq, timestamp);

        // Invoke callback if set
        if (chunkCallback) {
          chunkCallback(chunkWithHeader, currentSeq, timestamp);
        }
      });

      // Setup error handler
      await audioCapture.onError((event) => {
        console.error('Audio capture error:', event);
        setError('Audio capture failed. Please check microphone permissions.');
        setIsCapturing(false);
      });

      // Start recording
      await audioCapture.startRecording();

      setIsCapturing(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start audio capture';
      setError(errorMessage);
      setIsCapturing(false);
      throw err;
    }
  }, [sequenceNumber, sessionStartTime, chunkCallback]);

  /**
   * Stop capturing audio
   */
  const stopCapture = useCallback(async () => {
    try {
      await audioCapture.stop();
      setIsCapturing(false);
      setSequenceNumber(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop audio capture';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Register callback for audio chunks
   */
  const onAudioChunk = useCallback(
    (handler: (chunk: ArrayBuffer, sequenceNumber: number, timestamp: number) => void) => {
      setChunkCallback(() => handler);
    },
    []
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (isCapturing) {
        audioCapture.stop().catch(console.error);
      }
    };
  }, [isCapturing]);

  return {
    isCapturing,
    error,
    startCapture,
    stopCapture,
    onAudioChunk,
  };
}
