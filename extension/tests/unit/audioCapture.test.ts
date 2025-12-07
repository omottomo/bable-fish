/**
 * Unit tests for audioCapture service
 *
 * Tests Tab Capture API integration and MediaRecorder functionality
 */

import { audioCapture } from '../../src/services/audioCapture';

// Mock chrome.tabCapture API
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

describe('audioCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should capture audio stream using chrome.tabCapture.capture', async () => {
    const mockStream = new MediaStream();
    mockCaptureStream.mockImplementation((constraints, callback) => {
      callback(mockStream);
    });

    const stream = await audioCapture.start();

    expect(mockCaptureStream).toHaveBeenCalledWith(
      {
        audio: true,
        video: false,
        audioConstraints: {
          mandatory: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        },
      },
      expect.any(Function)
    );

    expect(stream).toBe(mockStream);
  });

  it('should create MediaRecorder with WebM/Opus configuration', async () => {
    const mockStream = new MediaStream();
    mockCaptureStream.mockImplementation((constraints, callback) => {
      callback(mockStream);
    });

    await audioCapture.start();
    const recorder = await audioCapture.getRecorder();

    expect(recorder).toBeInstanceOf(MockMediaRecorder);
    expect(recorder.options).toEqual({
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 16000,
    });
  });

  it('should start MediaRecorder with 100ms timeslice for low latency', async () => {
    const mockStream = new MediaStream();
    mockCaptureStream.mockImplementation((constraints, callback) => {
      callback(mockStream);
    });

    const startSpy = jest.spyOn(MockMediaRecorder.prototype, 'start');

    await audioCapture.start();
    await audioCapture.startRecording();

    expect(startSpy).toHaveBeenCalledWith(100);
  });

  it('should emit audio chunks via ondataavailable callback', async () => {
    const mockStream = new MediaStream();
    mockCaptureStream.mockImplementation((constraints, callback) => {
      callback(mockStream);
    });

    const chunkHandler = jest.fn();
    await audioCapture.start();
    await audioCapture.onChunk(chunkHandler);
    await audioCapture.startRecording();

    const recorder = await audioCapture.getRecorder();

    // Simulate MediaRecorder emitting data
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
    const mockEvent = { data: mockBlob } as BlobEvent;

    if (recorder.ondataavailable) {
      recorder.ondataavailable(mockEvent);
    }

    expect(chunkHandler).toHaveBeenCalledWith(mockBlob);
  });

  it('should stop recording and release stream', async () => {
    const mockStream = new MediaStream();
    const mockTrack = { stop: jest.fn() };
    mockStream.getTracks = jest.fn(() => [mockTrack as any]);

    mockCaptureStream.mockImplementation((constraints, callback) => {
      callback(mockStream);
    });

    await audioCapture.start();
    await audioCapture.startRecording();
    await audioCapture.stop();

    const recorder = await audioCapture.getRecorder();
    expect(recorder.state).toBe('inactive');
    expect(mockTrack.stop).toHaveBeenCalled();
  });

  it('should handle tabCapture.capture failures', async () => {
    mockCaptureStream.mockImplementation((constraints, callback) => {
      callback(null);
    });

    await expect(audioCapture.start()).rejects.toThrow('Failed to capture audio stream');
  });

  it('should handle MediaRecorder errors', async () => {
    const mockStream = new MediaStream();
    mockCaptureStream.mockImplementation((constraints, callback) => {
      callback(mockStream);
    });

    const errorHandler = jest.fn();
    await audioCapture.start();
    await audioCapture.onError(errorHandler);
    await audioCapture.startRecording();

    const recorder = await audioCapture.getRecorder();

    // Simulate MediaRecorder error
    const mockError = new Event('error');
    if (recorder.onerror) {
      recorder.onerror(mockError);
    }

    expect(errorHandler).toHaveBeenCalledWith(mockError);
  });

  it('should verify WebM/Opus support before initialization', () => {
    expect(MockMediaRecorder.isTypeSupported('audio/webm;codecs=opus')).toBe(true);
  });

  it('should not start recording if stream not captured', async () => {
    await expect(audioCapture.startRecording()).rejects.toThrow('No audio stream captured');
  });
});
