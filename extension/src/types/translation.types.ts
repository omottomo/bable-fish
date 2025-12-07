/**
 * Translation Session Types
 * Based on data-model.md
 */

export type Language = 'en' | 'ja' | 'zh';

export type SessionStatus = 'idle' | 'connecting' | 'active' | 'error' | 'disconnected';

export interface TranslationSession {
  sessionId: string;
  sourceLanguage: Language;
  targetLanguage: Language;
  status: SessionStatus;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
  sequenceNumber: number;
  duration: number; // milliseconds, typically ~100ms
}

export interface TranslationResponse {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
  confidence: number; // 0-1
  isFinal: boolean;
}

export interface LatencyMetrics {
  p50: number; // 50th percentile latency in ms
  p95: number; // 95th percentile latency in ms
  p99: number; // 99th percentile latency in ms
  average: number;
  count: number;
}
