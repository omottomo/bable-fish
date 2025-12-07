/**
 * WebSocket Protocol Types
 * Based on contracts/websocket-protocol.md
 */

import { Language } from './translation.types';

// Client → Server Messages

export interface StartSessionMessage {
  type: 'start_session';
  payload: {
    sourceLanguage: Language;
    targetLanguage: Language;
    clientId: string; // UUID
  };
}

export interface StopSessionMessage {
  type: 'stop_session';
  payload: {
    sessionId: string;
  };
}

export interface PingMessage {
  type: 'ping';
  payload: {
    timestamp: number;
  };
}

export type ClientMessage = StartSessionMessage | StopSessionMessage | PingMessage;

// Server → Client Messages

export interface SessionStartedMessage {
  type: 'session_started';
  payload: {
    sessionId: string;
    timestamp: number;
  };
}

export interface TranslationMessage {
  type: 'translation';
  payload: {
    text: string;
    isFinal: boolean;
    confidence: number; // 0-1
    timestamp: number;
    latency: number; // ms from audio received to translation sent
  };
}

export interface SessionStoppedMessage {
  type: 'session_stopped';
  payload: {
    sessionId: string;
    reason: 'client_requested' | 'error' | 'timeout';
  };
}

export type ErrorCode =
  | 'CONNECTION_TIMEOUT'
  | 'INVALID_LANGUAGE'
  | 'SERVER_ERROR'
  | 'AUDIO_DECODE_ERROR';

export interface ErrorMessage {
  type: 'error';
  payload: {
    code: ErrorCode;
    message: string; // user-friendly error message
    timestamp: number;
  };
}

export interface PongMessage {
  type: 'pong';
  payload: {
    timestamp: number;
    serverTimestamp: number;
  };
}

export type ServerMessage =
  | SessionStartedMessage
  | TranslationMessage
  | SessionStoppedMessage
  | ErrorMessage
  | PongMessage;

// Audio Chunk Binary Format
// Binary header (first 8 bytes):
// - Bytes 0-3: Sequence number (uint32, little-endian)
// - Bytes 4-7: Timestamp (uint32, milliseconds since session start)
// - Bytes 8+: Audio data (WebM/Opus)

export interface AudioChunkHeader {
  sequenceNumber: number;
  timestamp: number;
}

// Generic WebSocket message type
export interface WebSocketMessage<T> {
  type: string;
  payload: T;
}

// Payload types for convenience
export type SessionStartPayload = StartSessionMessage['payload'];
export type TranslationResponse = TranslationMessage['payload'];
export type ErrorPayload = ErrorMessage['payload'];
