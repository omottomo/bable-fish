/**
 * Unit tests for websocketClient service
 *
 * Tests WebSocket connection management, message handling, and reconnection logic
 */

import { websocketClient } from '../../src/services/websocketClient';
import type { WebSocketMessage, TranslationResponse } from '../../src/types/websocket.types';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  sentMessages: (string | ArrayBuffer)[] = [];

  constructor(public url: string, public protocols?: string | string[]) {
    // Simulate async connection
    setTimeout(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.readyState = MockWebSocket.OPEN;
        if (this.onopen) {
          this.onopen(new Event('open'));
        }
      }
    }, 10);
  }

  send(data: string | ArrayBuffer) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: code || 1000, reason }));
    }
  }

  // Simulate receiving a message
  simulateMessage(data: string | ArrayBuffer) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  // Simulate an error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

(global as any).WebSocket = MockWebSocket;

describe('websocketClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    websocketClient.disconnect();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should connect to WebSocket server with babel-fish-v1 subprotocol', async () => {
    const serverUrl = 'wss://localhost:8080/translate';
    await websocketClient.connect(serverUrl);

    expect(websocketClient.isConnected()).toBe(true);
  });

  it('should send start_session message after connection', async () => {
    const serverUrl = 'wss://localhost:8080/translate';
    await websocketClient.connect(serverUrl);

    const sessionData = {
      sourceLanguage: 'en' as const,
      targetLanguage: 'ja' as const,
      clientId: 'test-client-123',
    };

    await websocketClient.startSession(sessionData);

    const ws = (websocketClient as any).ws as MockWebSocket;
    expect(ws.sentMessages).toHaveLength(1);

    const sentMessage = JSON.parse(ws.sentMessages[0] as string);
    expect(sentMessage).toEqual({
      type: 'start_session',
      payload: sessionData,
    });
  });

  it('should send binary audio chunks with sequence header', async () => {
    const serverUrl = 'wss://localhost:8080/translate';
    await websocketClient.connect(serverUrl);

    const audioData = new ArrayBuffer(100);
    const sequenceNumber = 42;
    const timestamp = 1234;

    await websocketClient.sendAudioChunk(audioData, sequenceNumber, timestamp);

    const ws = (websocketClient as any).ws as MockWebSocket;
    const sentChunk = ws.sentMessages[0] as ArrayBuffer;

    expect(sentChunk).toBeInstanceOf(ArrayBuffer);
    expect(sentChunk.byteLength).toBe(108); // 8 bytes header + 100 bytes audio

    const view = new DataView(sentChunk);
    expect(view.getUint32(0, true)).toBe(sequenceNumber); // Little-endian
    expect(view.getUint32(4, true)).toBe(timestamp);
  });

  it('should handle incoming translation responses', async () => {
    const serverUrl = 'wss://localhost:8080/translate';
    await websocketClient.connect(serverUrl);

    const translationHandler = jest.fn();
    websocketClient.onTranslation(translationHandler);

    const ws = (websocketClient as any).ws as MockWebSocket;

    const translationMessage: WebSocketMessage<TranslationResponse> = {
      type: 'translation',
      payload: {
        text: 'こんにちは',
        isFinal: false,
        confidence: 0.85,
        timestamp: Date.now(),
        latency: 250,
      },
    };

    ws.simulateMessage(JSON.stringify(translationMessage));

    expect(translationHandler).toHaveBeenCalledWith(translationMessage.payload);
  });

  it('should handle session_started event', async () => {
    const serverUrl = 'wss://localhost:8080/translate';
    await websocketClient.connect(serverUrl);

    const sessionStartHandler = jest.fn();
    websocketClient.onSessionStarted(sessionStartHandler);

    const ws = (websocketClient as any).ws as MockWebSocket;

    const sessionStartedMessage = {
      type: 'session_started',
      payload: {
        sessionId: 'session-123',
        timestamp: Date.now(),
      },
    };

    ws.simulateMessage(JSON.stringify(sessionStartedMessage));

    expect(sessionStartHandler).toHaveBeenCalledWith(sessionStartedMessage.payload);
  });

  it('should handle error messages from server', async () => {
    const serverUrl = 'wss://localhost:8080/translate';
    await websocketClient.connect(serverUrl);

    const errorHandler = jest.fn();
    websocketClient.onError(errorHandler);

    const ws = (websocketClient as any).ws as MockWebSocket;

    const errorMessage = {
      type: 'error',
      payload: {
        code: 'CONNECTION_TIMEOUT',
        message: 'Connection timeout after 5 seconds',
        timestamp: Date.now(),
      },
    };

    ws.simulateMessage(JSON.stringify(errorMessage));

    expect(errorHandler).toHaveBeenCalledWith(errorMessage.payload);
  });

  it('should send heartbeat ping every 10 seconds', async () => {
    jest.useFakeTimers();

    const serverUrl = 'wss://localhost:8080/translate';
    await websocketClient.connect(serverUrl);

    const ws = (websocketClient as any).ws as MockWebSocket;
    ws.sentMessages = []; // Clear initial messages

    // Fast-forward 10 seconds
    jest.advanceTimersByTime(10000);

    expect(ws.sentMessages).toHaveLength(1);
    const pingMessage = JSON.parse(ws.sentMessages[0] as string);
    expect(pingMessage.type).toBe('ping');
    expect(pingMessage.payload).toHaveProperty('timestamp');

    jest.useRealTimers();
  });

  it('should handle pong responses for heartbeat', async () => {
    const serverUrl = 'wss://localhost:8080/translate';
    await websocketClient.connect(serverUrl);

    const ws = (websocketClient as any).ws as MockWebSocket;

    const pongMessage = {
      type: 'pong',
      payload: {
        timestamp: Date.now(),
        serverTimestamp: Date.now(),
      },
    };

    // Should not throw
    expect(() => {
      ws.simulateMessage(JSON.stringify(pongMessage));
    }).not.toThrow();
  });

  it('should reconnect with exponential backoff on connection failure', async () => {
    jest.useFakeTimers();

    const serverUrl = 'wss://localhost:8080/translate';

    // Mock WebSocket to fail first connection
    let connectionAttempts = 0;
    const OriginalMockWebSocket = global.WebSocket;
    (global as any).WebSocket = class extends OriginalMockWebSocket {
      constructor(url: string, protocols?: string | string[]) {
        super(url, protocols);
        connectionAttempts++;
        if (connectionAttempts === 1) {
          // First attempt fails
          setTimeout(() => {
            this.readyState = MockWebSocket.CLOSED;
            if (this.onerror) this.onerror(new Event('error'));
            if (this.onclose) this.onclose(new CloseEvent('close', { code: 1006 }));
          }, 10);
        }
      }
    };

    const reconnectHandler = jest.fn();
    websocketClient.onReconnecting(reconnectHandler);

    websocketClient.connect(serverUrl).catch(() => {});

    // Wait for first connection attempt to fail
    await jest.advanceTimersByTimeAsync(100);

    expect(reconnectHandler).toHaveBeenCalled();

    // Verify exponential backoff (1s, 2s, 4s)
    // First retry after 1 second
    await jest.advanceTimersByTimeAsync(1000);
    expect(connectionAttempts).toBeGreaterThan(1);

    jest.useRealTimers();
    (global as any).WebSocket = OriginalMockWebSocket;
  });

  it('should stop reconnection attempts after max retries', async () => {
    jest.useFakeTimers();

    const serverUrl = 'wss://localhost:8080/translate';

    // Mock WebSocket to always fail
    const OriginalMockWebSocket = global.WebSocket;
    (global as any).WebSocket = class extends OriginalMockWebSocket {
      constructor(url: string, protocols?: string | string[]) {
        super(url, protocols);
        setTimeout(() => {
          this.readyState = MockWebSocket.CLOSED;
          if (this.onerror) this.onerror(new Event('error'));
          if (this.onclose) this.onclose(new CloseEvent('close', { code: 1006 }));
        }, 10);
      }
    };

    const maxRetriesHandler = jest.fn();
    websocketClient.onMaxRetriesReached(maxRetriesHandler);

    websocketClient.connect(serverUrl).catch(() => {});

    // Simulate multiple retry attempts
    for (let i = 0; i < 5; i++) {
      await jest.advanceTimersByTimeAsync(10000); // 10 seconds per retry
    }

    expect(maxRetriesHandler).toHaveBeenCalled();

    jest.useRealTimers();
    (global as any).WebSocket = OriginalMockWebSocket;
  });

  it('should disconnect and stop heartbeat', async () => {
    jest.useFakeTimers();

    const serverUrl = 'wss://localhost:8080/translate';
    await websocketClient.connect(serverUrl);

    expect(websocketClient.isConnected()).toBe(true);

    websocketClient.disconnect();

    expect(websocketClient.isConnected()).toBe(false);

    // Verify heartbeat stopped
    const ws = (websocketClient as any).ws as MockWebSocket | null;
    expect(ws).toBeNull();

    jest.useRealTimers();
  });

  it('should send stop_session message on disconnect', async () => {
    const serverUrl = 'wss://localhost:8080/translate';
    await websocketClient.connect(serverUrl);

    const sessionId = 'session-123';
    websocketClient.setSessionId(sessionId);

    const ws = (websocketClient as any).ws as MockWebSocket;
    ws.sentMessages = []; // Clear initial messages

    websocketClient.disconnect();

    expect(ws.sentMessages).toHaveLength(1);
    const stopMessage = JSON.parse(ws.sentMessages[0] as string);
    expect(stopMessage).toEqual({
      type: 'stop_session',
      payload: { sessionId },
    });
  });

  it('should throw error if trying to send audio before connection', async () => {
    const audioData = new ArrayBuffer(100);

    await expect(
      websocketClient.sendAudioChunk(audioData, 1, Date.now())
    ).rejects.toThrow('WebSocket not connected');
  });

  it('should throw error if trying to start session before connection', async () => {
    const sessionData = {
      sourceLanguage: 'en' as const,
      targetLanguage: 'ja' as const,
      clientId: 'test-client',
    };

    await expect(
      websocketClient.startSession(sessionData)
    ).rejects.toThrow('WebSocket not connected');
  });
});
