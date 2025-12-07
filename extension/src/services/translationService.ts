/**
 * Translation Service
 *
 * Manages translation session state and processes translation responses
 * Tracks latency metrics and handles interim/final results
 */

import type { TranslationSession } from '../types/translation.types';
import type { TranslationResponse } from '../types/websocket.types';

interface TranslationResult {
  text: string;
  isFinal: boolean;
  confidence: number;
}

interface LatencyMetrics {
  count: number;
  p50: number;
  p95: number;
  p99: number;
}

type ResultHandler = (result: TranslationResult) => void;

class TranslationServiceClass {
  private session: TranslationSession | null = null;
  private latencies: number[] = [];
  private resultHandlers: ResultHandler[] = [];

  /**
   * Initialize a new translation session
   */
  initSession(sessionId: string, sourceLanguage: string, targetLanguage: string): void {
    this.session = {
      sessionId,
      sourceLanguage: sourceLanguage as 'en' | 'ja' | 'zh',
      targetLanguage: targetLanguage as 'en' | 'ja' | 'zh',
      status: 'active',
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.latencies = [];
  }

  /**
   * Get current session
   */
  getSession(): TranslationSession | null {
    return this.session;
  }

  /**
   * Update session status
   */
  updateStatus(status: TranslationSession['status']): void {
    if (this.session) {
      this.session.status = status;
      this.session.lastActivityAt = new Date();
    }
  }

  /**
   * Handle translation response from server
   */
  handleTranslationResponse(response: TranslationResponse): void {
    if (!this.session) {
      throw new Error('No active translation session');
    }

    // Update session activity
    this.session.lastActivityAt = new Date();

    // Track latency
    if (response.latency) {
      this.latencies.push(response.latency);
    }

    // Filter low-confidence interim results
    if (!response.isFinal && response.confidence < 0.6) {
      return; // Don't emit low-confidence interim results
    }

    // Emit translation result
    const result: TranslationResult = {
      text: response.text,
      isFinal: response.isFinal,
      confidence: response.confidence,
    };

    this.resultHandlers.forEach((handler) => handler(result));
  }

  /**
   * Get latency statistics
   */
  getLatencyMetrics(): LatencyMetrics {
    if (this.latencies.length === 0) {
      return { count: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const count = sorted.length;

    const p50Index = Math.floor(count * 0.5);
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);

    return {
      count,
      p50: sorted[p50Index],
      p95: sorted[p95Index],
      p99: sorted[p99Index],
    };
  }

  /**
   * Register result handler
   */
  onTranslationResult(handler: ResultHandler): void {
    this.resultHandlers.push(handler);
  }

  /**
   * Reset session and clear state
   */
  reset(): void {
    this.session = null;
    this.latencies = [];
    this.resultHandlers = [];
  }
}

// Export singleton instance
export const translationService = new TranslationServiceClass();
