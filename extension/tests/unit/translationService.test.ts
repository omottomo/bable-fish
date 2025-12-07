/**
 * Unit tests for translationService
 *
 * Tests session state management and interim/final result handling
 */

import { translationService } from '../../src/services/translationService';
import type { TranslationResponse } from '../../src/types/websocket.types';
import type { TranslationSession } from '../../src/types/translation.types';

describe('translationService', () => {
  beforeEach(() => {
    translationService.reset();
  });

  it('should initialize a new translation session', () => {
    const sessionId = 'session-123';
    const sourceLanguage = 'en';
    const targetLanguage = 'ja';

    translationService.initSession(sessionId, sourceLanguage, targetLanguage);

    const session = translationService.getSession();
    expect(session).toBeDefined();
    expect(session?.sessionId).toBe(sessionId);
    expect(session?.sourceLanguage).toBe(sourceLanguage);
    expect(session?.targetLanguage).toBe(targetLanguage);
    expect(session?.status).toBe('active');
    expect(session?.createdAt).toBeInstanceOf(Date);
  });

  it('should update session status', () => {
    translationService.initSession('session-123', 'en', 'ja');

    translationService.updateStatus('connecting');
    expect(translationService.getSession()?.status).toBe('connecting');

    translationService.updateStatus('active');
    expect(translationService.getSession()?.status).toBe('active');

    translationService.updateStatus('error');
    expect(translationService.getSession()?.status).toBe('error');
  });

  it('should handle interim translation results', () => {
    translationService.initSession('session-123', 'en', 'ja');

    const interimResult: TranslationResponse = {
      text: 'こんに',
      isFinal: false,
      confidence: 0.6,
      timestamp: Date.now(),
      latency: 200,
    };

    const resultHandler = jest.fn();
    translationService.onTranslationResult(resultHandler);

    translationService.handleTranslationResponse(interimResult);

    expect(resultHandler).toHaveBeenCalledWith({
      text: 'こんに',
      isFinal: false,
      confidence: 0.6,
    });

    // Verify session was updated
    const session = translationService.getSession();
    expect(session?.lastActivityAt).toBeInstanceOf(Date);
  });

  it('should handle final translation results', () => {
    translationService.initSession('session-123', 'en', 'ja');

    const finalResult: TranslationResponse = {
      text: 'こんにちは',
      isFinal: true,
      confidence: 0.95,
      timestamp: Date.now(),
      latency: 250,
    };

    const resultHandler = jest.fn();
    translationService.onTranslationResult(resultHandler);

    translationService.handleTranslationResponse(finalResult);

    expect(resultHandler).toHaveBeenCalledWith({
      text: 'こんにちは',
      isFinal: true,
      confidence: 0.95,
    });
  });

  it('should replace interim results with final results', () => {
    translationService.initSession('session-123', 'en', 'ja');

    const resultHandler = jest.fn();
    translationService.onTranslationResult(resultHandler);

    // First, interim result
    const interimResult: TranslationResponse = {
      text: 'Hello wor',
      isFinal: false,
      confidence: 0.7,
      timestamp: Date.now(),
      latency: 150,
    };
    translationService.handleTranslationResponse(interimResult);

    // Then, final result
    const finalResult: TranslationResponse = {
      text: 'Hello world',
      isFinal: true,
      confidence: 0.98,
      timestamp: Date.now(),
      latency: 300,
    };
    translationService.handleTranslationResponse(finalResult);

    expect(resultHandler).toHaveBeenCalledTimes(2);
    expect(resultHandler).toHaveBeenLastCalledWith({
      text: 'Hello world',
      isFinal: true,
      confidence: 0.98,
    });
  });

  it('should track latency metrics for translations', () => {
    translationService.initSession('session-123', 'en', 'ja');

    const responses: TranslationResponse[] = [
      { text: 'Test 1', isFinal: true, confidence: 0.9, timestamp: Date.now(), latency: 200 },
      { text: 'Test 2', isFinal: true, confidence: 0.9, timestamp: Date.now(), latency: 300 },
      { text: 'Test 3', isFinal: true, confidence: 0.9, timestamp: Date.now(), latency: 450 },
      { text: 'Test 4', isFinal: true, confidence: 0.9, timestamp: Date.now(), latency: 250 },
      { text: 'Test 5', isFinal: true, confidence: 0.9, timestamp: Date.now(), latency: 350 },
    ];

    responses.forEach((response) => {
      translationService.handleTranslationResponse(response);
    });

    const metrics = translationService.getLatencyMetrics();

    expect(metrics.count).toBe(5);
    expect(metrics.p50).toBe(300); // Median
    expect(metrics.p95).toBe(450); // 95th percentile
    expect(metrics.p99).toBe(450); // 99th percentile
  });

  it('should calculate P50 latency correctly', () => {
    translationService.initSession('session-123', 'en', 'ja');

    const latencies = [100, 200, 300, 400, 500];
    latencies.forEach((latency, index) => {
      translationService.handleTranslationResponse({
        text: `Test ${index}`,
        isFinal: true,
        confidence: 0.9,
        timestamp: Date.now(),
        latency,
      });
    });

    const metrics = translationService.getLatencyMetrics();
    expect(metrics.p50).toBe(300); // Median of [100, 200, 300, 400, 500]
  });

  it('should calculate P95 latency correctly', () => {
    translationService.initSession('session-123', 'en', 'ja');

    // Create 100 responses with known latencies
    for (let i = 1; i <= 100; i++) {
      translationService.handleTranslationResponse({
        text: `Test ${i}`,
        isFinal: true,
        confidence: 0.9,
        timestamp: Date.now(),
        latency: i * 10, // 10, 20, 30, ..., 1000
      });
    }

    const metrics = translationService.getLatencyMetrics();
    expect(metrics.p95).toBe(950); // 95th percentile
  });

  it('should reset session state', () => {
    translationService.initSession('session-123', 'en', 'ja');

    const resultHandler = jest.fn();
    translationService.onTranslationResult(resultHandler);

    translationService.handleTranslationResponse({
      text: 'Test',
      isFinal: true,
      confidence: 0.9,
      timestamp: Date.now(),
      latency: 200,
    });

    expect(translationService.getSession()).toBeDefined();

    translationService.reset();

    expect(translationService.getSession()).toBeNull();
    expect(translationService.getLatencyMetrics().count).toBe(0);
  });

  it('should validate session state transitions', () => {
    translationService.initSession('session-123', 'en', 'ja');

    // idle → connecting → active
    translationService.updateStatus('idle');
    expect(translationService.getSession()?.status).toBe('idle');

    translationService.updateStatus('connecting');
    expect(translationService.getSession()?.status).toBe('connecting');

    translationService.updateStatus('active');
    expect(translationService.getSession()?.status).toBe('active');

    // active → error
    translationService.updateStatus('error');
    expect(translationService.getSession()?.status).toBe('error');

    // error → connecting (retry)
    translationService.updateStatus('connecting');
    expect(translationService.getSession()?.status).toBe('connecting');
  });

  it('should throw error when handling translation without session', () => {
    const response: TranslationResponse = {
      text: 'Test',
      isFinal: true,
      confidence: 0.9,
      timestamp: Date.now(),
      latency: 200,
    };

    expect(() => {
      translationService.handleTranslationResponse(response);
    }).toThrow('No active translation session');
  });

  it('should store session metadata correctly', () => {
    const beforeInit = Date.now();
    translationService.initSession('session-123', 'en', 'ja');
    const afterInit = Date.now();

    const session = translationService.getSession();

    expect(session?.createdAt.getTime()).toBeGreaterThanOrEqual(beforeInit);
    expect(session?.createdAt.getTime()).toBeLessThanOrEqual(afterInit);
    expect(session?.lastActivityAt.getTime()).toBeGreaterThanOrEqual(beforeInit);
    expect(session?.lastActivityAt.getTime()).toBeLessThanOrEqual(afterInit);
  });

  it('should update lastActivityAt on each translation', () => {
    translationService.initSession('session-123', 'en', 'ja');

    const initialSession = translationService.getSession();
    const initialActivityTime = initialSession!.lastActivityAt.getTime();

    // Wait a bit
    const waitTime = 50;
    const startWait = Date.now();
    while (Date.now() - startWait < waitTime) {
      // Busy wait
    }

    translationService.handleTranslationResponse({
      text: 'Test',
      isFinal: true,
      confidence: 0.9,
      timestamp: Date.now(),
      latency: 200,
    });

    const updatedSession = translationService.getSession();
    const updatedActivityTime = updatedSession!.lastActivityAt.getTime();

    expect(updatedActivityTime).toBeGreaterThan(initialActivityTime);
  });

  it('should filter out low-confidence interim results', () => {
    translationService.initSession('session-123', 'en', 'ja');

    const resultHandler = jest.fn();
    translationService.onTranslationResult(resultHandler);

    // Low confidence interim result (should be filtered)
    const lowConfidenceResult: TranslationResponse = {
      text: 'Uncertain text',
      isFinal: false,
      confidence: 0.3,
      timestamp: Date.now(),
      latency: 200,
    };

    translationService.handleTranslationResponse(lowConfidenceResult);

    // Should not emit low-confidence interim results
    expect(resultHandler).not.toHaveBeenCalled();

    // High confidence interim result (should pass)
    const highConfidenceResult: TranslationResponse = {
      text: 'Confident text',
      isFinal: false,
      confidence: 0.7,
      timestamp: Date.now(),
      latency: 200,
    };

    translationService.handleTranslationResponse(highConfidenceResult);

    expect(resultHandler).toHaveBeenCalledWith({
      text: 'Confident text',
      isFinal: false,
      confidence: 0.7,
    });
  });

  it('should allow final results regardless of confidence', () => {
    translationService.initSession('session-123', 'en', 'ja');

    const resultHandler = jest.fn();
    translationService.onTranslationResult(resultHandler);

    // Even low-confidence final results should be emitted
    const finalResult: TranslationResponse = {
      text: 'Low confidence final',
      isFinal: true,
      confidence: 0.4,
      timestamp: Date.now(),
      latency: 200,
    };

    translationService.handleTranslationResponse(finalResult);

    expect(resultHandler).toHaveBeenCalledWith({
      text: 'Low confidence final',
      isFinal: true,
      confidence: 0.4,
    });
  });
});
