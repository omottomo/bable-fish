/**
 * WebSocket Client Service
 *
 * Handles WebSocket connection to translation server with:
 * - Connection management and reconnection logic
 * - Heartbeat/ping-pong keepalive
 * - Message sending and receiving
 * - Error handling and exponential backoff
 */

import type {
  WebSocketMessage,
  SessionStartPayload,
  TranslationResponse,
  ErrorPayload,
} from '../types/websocket.types';

type MessageHandler<T> = (payload: T) => void;

interface ReconnectionConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

class WebSocketClientService {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectionAttempts: number = 0;
  private reconnectionConfig: ReconnectionConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
  };

  // Event handlers
  private translationHandlers: MessageHandler<TranslationResponse>[] = [];
  private sessionStartedHandlers: MessageHandler<any>[] = [];
  private errorHandlers: MessageHandler<ErrorPayload>[] = [];
  private reconnectingHandlers: (() => void)[] = [];
  private maxRetriesHandlers: (() => void)[] = [];

  /**
   * Connect to WebSocket server
   */
  async connect(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(serverUrl, 'babel-fish-v1');

        this.ws.onopen = () => {
          this.reconnectionAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          this.handleMessage(event);
        };

        this.ws.onerror = (event: Event) => {
          console.error('WebSocket error:', event);
        };

        this.ws.onclose = (event: CloseEvent) => {
          this.stopHeartbeat();

          if (event.code !== 1000) {
            // Abnormal closure, attempt reconnection
            this.attemptReconnection(serverUrl);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.stopHeartbeat();

    if (this.ws && this.sessionId) {
      // Send stop_session message before closing
      this.sendMessage({
        type: 'stop_session',
        payload: { sessionId: this.sessionId },
      });
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.sessionId = null;
    this.reconnectionAttempts = 0;
  }

  /**
   * Start a translation session
   */
  async startSession(data: SessionStartPayload): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    await this.sendMessage({
      type: 'start_session',
      payload: data,
    });
  }

  /**
   * Send audio chunk with binary header
   */
  async sendAudioChunk(
    audioData: ArrayBuffer,
    sequenceNumber: number,
    timestamp: number
  ): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    // Create binary message with header
    const headerSize = 8;
    const totalSize = headerSize + audioData.byteLength;
    const message = new ArrayBuffer(totalSize);

    const headerView = new DataView(message);
    headerView.setUint32(0, sequenceNumber, true); // Little-endian
    headerView.setUint32(4, timestamp, true);

    // Copy audio data after header
    const audioView = new Uint8Array(message, headerSize);
    const sourceView = new Uint8Array(audioData);
    audioView.set(sourceView);

    this.ws!.send(message);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    // Binary messages (not used in client receive, but handled for completeness)
    if (event.data instanceof ArrayBuffer) {
      console.warn('Received unexpected binary message from server');
      return;
    }

    // Text messages (JSON)
    try {
      const message = JSON.parse(event.data) as WebSocketMessage<any>;

      switch (message.type) {
        case 'session_started':
          this.sessionId = message.payload.sessionId;
          this.sessionStartedHandlers.forEach((handler) => handler(message.payload));
          break;

        case 'translation':
          this.translationHandlers.forEach((handler) => handler(message.payload));
          break;

        case 'error':
          this.errorHandlers.forEach((handler) => handler(message.payload));
          break;

        case 'pong':
          // Heartbeat response received
          break;

        case 'session_stopped':
          console.log('Session stopped:', message.payload);
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Send a JSON message
   */
  private async sendMessage(message: WebSocketMessage<any>): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    this.ws!.send(JSON.stringify(message));
  }

  /**
   * Start heartbeat ping every 10 seconds
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendMessage({
          type: 'ping',
          payload: { timestamp: Date.now() },
        }).catch((error) => {
          console.error('Failed to send heartbeat:', error);
        });
      }
    }, 10000); // 10 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnection(serverUrl: string): void {
    if (this.reconnectionAttempts >= this.reconnectionConfig.maxRetries) {
      this.maxRetriesHandlers.forEach((handler) => handler());
      return;
    }

    this.reconnectionAttempts++;
    this.reconnectingHandlers.forEach((handler) => handler());

    // Calculate backoff delay (exponential)
    const delay = Math.min(
      this.reconnectionConfig.initialDelayMs * Math.pow(2, this.reconnectionAttempts - 1),
      this.reconnectionConfig.maxDelayMs
    );

    console.log(`Reconnection attempt ${this.reconnectionAttempts} in ${delay}ms`);

    setTimeout(() => {
      this.connect(serverUrl).catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Register translation handler
   */
  onTranslation(handler: MessageHandler<TranslationResponse>): void {
    this.translationHandlers.push(handler);
  }

  /**
   * Register session started handler
   */
  onSessionStarted(handler: MessageHandler<any>): void {
    this.sessionStartedHandlers.push(handler);
  }

  /**
   * Register error handler
   */
  onError(handler: MessageHandler<ErrorPayload>): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Register reconnecting handler
   */
  onReconnecting(handler: () => void): void {
    this.reconnectingHandlers.push(handler);
  }

  /**
   * Register max retries reached handler
   */
  onMaxRetriesReached(handler: () => void): void {
    this.maxRetriesHandlers.push(handler);
  }

  /**
   * Set session ID (for testing)
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }
}

// Export singleton instance
export const websocketClient = new WebSocketClientService();
