/**
 * Error Handler Utility
 * CSP-compliant error handling with user-friendly messages
 */

import { ErrorCode } from '../types/websocket.types';

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  timestamp: number;
  recoverable: boolean;
}

// User-friendly error messages
const ERROR_MESSAGES: Record<ErrorCode | string, string> = {
  CONNECTION_TIMEOUT: 'Connection to translation server timed out. Please check your internet connection and try again.',
  INVALID_LANGUAGE: 'Invalid language selection. Please select both source and target languages.',
  SERVER_ERROR: 'Translation server encountered an error. Please try again later.',
  AUDIO_DECODE_ERROR: 'Failed to process audio. Please ensure audio is playing and try again.',
  PERMISSION_DENIED: 'Audio capture permission denied. Please grant permission to use this extension.',
  NO_LANGUAGE_SELECTED: 'Please select both source and target languages before starting translation.',
  NETWORK_ERROR: 'Network connection lost. Attempting to reconnect...',
  AD_LOAD_FAILED: 'Advertisement failed to load. Translation will continue.',
};

export class ErrorHandler {
  /**
   * Create an application error with user-friendly message
   */
  static createError(
    code: ErrorCode | string,
    message: string,
    recoverable: boolean = true
  ): AppError {
    return {
      code,
      message,
      userMessage: ERROR_MESSAGES[code] || 'An unexpected error occurred. Please try again.',
      timestamp: Date.now(),
      recoverable,
    };
  }

  /**
   * Log error without PII (CSP-compliant, no eval)
   */
  static logError(error: AppError | Error, context?: Record<string, any>): void {
    const errorData = {
      timestamp: new Date().toISOString(),
      error: error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error,
      context: context || {},
    };

    // CSP-compliant logging (no eval, no inline scripts)
    console.error('[Babel Fish Error]', errorData);

    // In production, could send to error tracking service
    // (non-PII data only, respecting user privacy)
  }

  /**
   * Handle WebSocket error
   */
  static handleWebSocketError(error: Event | CloseEvent): AppError {
    if (error instanceof CloseEvent) {
      if (error.code === 1006) {
        return this.createError('CONNECTION_TIMEOUT', 'WebSocket closed abnormally');
      }
    }

    return this.createError('NETWORK_ERROR', 'WebSocket connection error');
  }

  /**
   * Handle audio capture error
   */
  static handleAudioCaptureError(error: Error): AppError {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return this.createError('PERMISSION_DENIED', 'Audio capture permission denied', false);
    }

    return this.createError('AUDIO_DECODE_ERROR', error.message);
  }

  /**
   * Validate language selection
   */
  static validateLanguages(source?: string, target?: string): AppError | null {
    if (!source || !target) {
      return this.createError('NO_LANGUAGE_SELECTED', 'Language not selected');
    }

    if (source === target) {
      return this.createError('INVALID_LANGUAGE', 'Source and target languages must be different');
    }

    const validLanguages = ['en', 'ja', 'zh'];
    if (!validLanguages.includes(source) || !validLanguages.includes(target)) {
      return this.createError('INVALID_LANGUAGE', 'Invalid language code');
    }

    return null;
  }
}
