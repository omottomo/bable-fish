/**
 * Integration test for audio-to-translation pipeline
 *
 * Tests the complete flow from audio capture → chunking → WebSocket → translation display
 */

import { audioCapture } from '../../src/services/audioCapture';
import { websocketClient } from '../../src/services/websocketClient';
import { translationService } from '../../src/services/translationService';
import type { TranslationResponse } from '../../src/types/websocket.types';

// Mock chrome.tabCapture
const mockCaptureStream = jest.fn();
global.chrome = {
  ...((global as any).chrome || {}),
  tabCapture: {
    capture: mockCaptureStream,
  },
} as any;

// Mock MediaRecorder
class MockMediaRecorder {
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onstop: (() => void) | null = null;
  state: 'inactive' | 'recording' | 'paused' = 'inactive';

  constructor(public stream: MediaStream, public options?: MediaRecorderOptions) {}

  start(timeslice?: number) {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  }

  static isTypeSupported(mimeType: string): boolean {
    return mimeType === 'audio/webm;codecs=opus';
  }
}

(global as any).MediaRecorder = MockMediaRecorder;

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  sentMessages: (string | ArrayBuffer)[] = [];

  constructor(public url: string, public protocols?: string | string[]) {
    setTimeout(() => {
      if (this.onopen) this.onopen(new Event('open'));
    }, 10);
  }

  send(data: string | ArrayBuffer) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  simulateMessage(data: string | ArrayBuffer) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }
}

(global as any).WebSocket = MockWebSocket;

describe('Audio-to-Translation Pipeline Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    translationService.reset();
    websocketClient.disconnect();
  });

  it('should complete full pipeline: audio capture → WebSocket → translation', async () => {
    // Step 1: Setup mock audio stream
    const mockStream = new MediaStream();
    mockCaptureStream.mockImplementation((constraints, callback) => {
      callback(mockStream);
    });

    // Step 2: Connect WebSocket
    const serverUrl = 'wss://localhost:8080/translate';
    await websocketClient.connect(serverUrl);

    // Step 3: Start translation session
    const sessionData = {
      sourceLanguage: 'en' as const,
      targetLanguage: 'ja' as const,
      clientId: 'integration-test-client',
    };
    await websocketClient.startSession(sessionData);

    // Step 4: Initialize translation service
    translationService.initSession('session-123', 'en', 'ja');

    // Step 5: Setup translation result handler
    const translationResults: any[] = [];
    translationService.onTranslationResult((result) => {
      translationResults.push(result);
    });

    // Step 6: Connect WebSocket translation handler to service
    websocketClient.onTranslation((response: TranslationResponse) => {
      translationService.handleTranslationResponse(response);
    });

    // Step 7: Start audio capture
    await audioCapture.start();
    await audioCapture.startRecording();

    // Step 8: Simulate audio chunk from MediaRecorder
    const recorder = await audioCapture.getRecorder();
    const mockAudioBlob = new Blob(['audio data chunk'], { type: 'audio/webm' });
    const mockEvent = { data: mockAudioBlob } as BlobEvent;

    const chunkHandler = jest.fn();
    await audioCapture.onChunk(chunkHandler);

    if (recorder.ondataavailable) {
      recorder.ondataavailable(mockEvent);
    }

    // Verify audio chunk was captured
    expect(chunkHandler).toHaveBeenCalledWith(mockAudioBlob);

    // Step 9: Simulate sending audio chunk via WebSocket
    const audioArrayBuffer = await mockAudioBlob.arrayBuffer();
    await websocketClient.sendAudioChunk(audioArrayBuffer, 1, Date.now());

    const ws = (websocketClient as any).ws as MockWebSocket;

    // Verify binary audio chunk was sent
    const binaryMessages = ws.sentMessages.filter((msg) => msg instanceof ArrayBuffer);
    expect(binaryMessages.length).toBeGreaterThan(0);

    // Step 10: Simulate server translation response
    const translationResponse = {
      type: 'translation',
      payload: {
        text: 'こんにちは',
        isFinal: true,
        confidence: 0.95,
        timestamp: Date.now(),
        latency: 250,
      },
    };

    ws.simulateMessage(JSON.stringify(translationResponse));

    // Step 11: Verify translation was received and processed
    expect(translationResults).toHaveLength(1);
    expect(translationResults[0]).toEqual({
      text: 'こんにちは',
      isFinal: true,
      confidence: 0.95,
    });

    // Step 12: Cleanup
    await audioCapture.stop();
    websocketClient.disconnect();
  });

  it('should handle multiple audio chunks in sequence', async () => {
    const mockStream = new MediaStream();
    mockCaptureStream.mockImplementation((constraints, callback) => {
      callback(mockStream);
    });

    await websocketClient.connect('wss://localhost:8080/translate');
    await websocketClient.startSession({
      sourceLanguage: 'en',
      targetLanguage: 'zh',
      clientId: 'test-client',
    });

    translationService.initSession('session-456', 'en', 'zh');

    const translationResults: any[] = [];
    translationService.onTranslationResult((result) => {
      translationResults.push(result);
    });

    websocketClient.onTranslation((response: TranslationResponse) => {
      translationService.handleTranslationResponse(response);
    });

    await audioCapture.start();
    await audioCapture.startRecording();

    const recorder = await audioCapture.getRecorder();
    const chunkHandler = jest.fn();
    await audioCapture.onChunk(chunkHandler);

    // Simulate 3 audio chunks
    for (let i = 0; i < 3; i++) {
      const mockBlob = new Blob([`audio chunk ${i}`], { type: 'audio/webm' });
      const mockEvent = { data: mockBlob } as BlobEvent;

      if (recorder.ondataavailable) {
        recorder.ondataavailable(mockEvent);
      }

      const audioBuffer = await mockBlob.arrayBuffer();
      await websocketClient.sendAudioChunk(audioBuffer, i + 1, Date.now());
    }

    // Verify all chunks were captured
    expect(chunkHandler).toHaveBeenCalledTimes(3);

    // Simulate server responses for each chunk
    const ws = (websocketClient as any).ws as MockWebSocket;

    const responses = [
      { text: '你', isFinal: false, confidence: 0.6, timestamp: Date.now(), latency: 150 },
      { text: '你好', isFinal: false, confidence: 0.8, timestamp: Date.now(), latency: 200 },
      { text: '你好世界', isFinal: true, confidence: 0.95, timestamp: Date.now(), latency: 250 },
    ];

    responses.forEach((payload) => {
      ws.simulateMessage(JSON.stringify({ type: 'translation', payload }));
    });

    // Verify all translations received (filtering out low confidence)
    expect(translationResults.length).toBeGreaterThan(0);
    expect(translationResults[translationResults.length - 1].text).toBe('你好世界');
    expect(translationResults[translationResults.length - 1].isFinal).toBe(true);

    await audioCapture.stop();
    websocketClient.disconnect();
  });

  it('should handle connection errors during active translation', async () => {
    const mockStream = new MediaStream();
    mockCaptureStream.mockImplementation((constraints, callback) => {
      callback(mockStream);
    });

    await websocketClient.connect('wss://localhost:8080/translate');
    translationService.initSession('session-789', 'ja', 'en');

    const errorHandler = jest.fn();
    websocketClient.onError(errorHandler);

    await audioCapture.start();
    await audioCapture.startRecording();

    const recorder = await audioCapture.getRecorder();

    // Simulate audio chunk
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
    const mockEvent = { data: mockBlob } as BlobEvent;

    const chunkHandler = jest.fn();
    await audioCapture.onChunk(chunkHandler);

    if (recorder.ondataavailable) {
      recorder.ondataavailable(mockEvent);
    }

    // Simulate WebSocket error from server
    const ws = (websocketClient as any).ws as MockWebSocket;
    const errorMessage = {
      type: 'error',
      payload: {
        code: 'AUDIO_DECODE_ERROR',
        message: 'Failed to decode audio chunk',
        timestamp: Date.now(),
      },
    };

    ws.simulateMessage(JSON.stringify(errorMessage));

    // Verify error was handled
    expect(errorHandler).toHaveBeenCalledWith(errorMessage.payload);

    await audioCapture.stop();
    websocketClient.disconnect();
  });

  it('should maintain latency tracking across pipeline', async () => {
    const mockStream = new MediaStream();
    mockCaptureStream.mockImplementation((constraints, callback) => {
      callback(mockStream);
    });

    await websocketClient.connect('wss://localhost:8080/translate');
    translationService.initSession('session-latency', 'en', 'ja');

    websocketClient.onTranslation((response: TranslationResponse) => {
      translationService.handleTranslationResponse(response);
    });

    await audioCapture.start();
    await audioCapture.startRecording();

    // Simulate multiple translations with known latencies
    const ws = (websocketClient as any).ws as MockWebSocket;

    const latencies = [200, 300, 450, 250, 350];
    latencies.forEach((latency, index) => {
      ws.simulateMessage(
        JSON.stringify({
          type: 'translation',
          payload: {
            text: `Translation ${index}`,
            isFinal: true,
            confidence: 0.9,
            timestamp: Date.now(),
            latency,
          },
        })
      );
    });

    // Verify latency metrics
    const metrics = translationService.getLatencyMetrics();
    expect(metrics.count).toBe(5);
    expect(metrics.p50).toBe(300); // Median of [200, 250, 300, 350, 450]

    await audioCapture.stop();
    websocketClient.disconnect();
  });

  it('should cleanup resources on stop', async () => {
    const mockStream = new MediaStream();
    const mockTrack = { stop: jest.fn() };
    mockStream.getTracks = jest.fn(() => [mockTrack as any]);

    mockCaptureStream.mockImplementation((constraints, callback) => {
      callback(mockStream);
    });

    await websocketClient.connect('wss://localhost:8080/translate');
    translationService.initSession('session-cleanup', 'en', 'ja');

    await audioCapture.start();
    await audioCapture.startRecording();

    // Verify everything is running
    expect(websocketClient.isConnected()).toBe(true);
    expect(translationService.getSession()).toBeDefined();

    // Stop everything
    await audioCapture.stop();
    websocketClient.disconnect();
    translationService.reset();

    // Verify cleanup
    expect(mockTrack.stop).toHaveBeenCalled();
    expect(websocketClient.isConnected()).toBe(false);
    expect(translationService.getSession()).toBeNull();
  });
});
