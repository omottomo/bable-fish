/**
 * Audio Capture Service
 *
 * Handles browser audio capture using Chrome Tab Capture API and MediaRecorder
 * Streams audio in 100ms chunks for low-latency real-time translation
 */

type ChunkHandler = (blob: Blob) => void;
type ErrorHandler = (error: Event) => void;

class AudioCaptureService {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunkHandlers: ChunkHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];

  /**
   * Start capturing audio from the current tab
   */
  async start(): Promise<MediaStream> {
    return new Promise((resolve, reject) => {
      chrome.tabCapture.capture(
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
        (capturedStream) => {
          if (!capturedStream) {
            reject(new Error('Failed to capture audio stream'));
            return;
          }

          this.stream = capturedStream;
          this.initializeRecorder();
          resolve(capturedStream);
        }
      );
    });
  }

  /**
   * Initialize MediaRecorder with WebM/Opus configuration
   */
  private initializeRecorder(): void {
    if (!this.stream) {
      throw new Error('No audio stream available');
    }

    const options: MediaRecorderOptions = {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 16000, // 16kbps sufficient for speech
    };

    // Verify codec support
    if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
      throw new Error('WebM/Opus codec not supported');
    }

    this.recorder = new MediaRecorder(this.stream, options);

    // Setup event handlers
    this.recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.chunkHandlers.forEach((handler) => handler(event.data));
      }
    };

    this.recorder.onerror = (event: Event) => {
      this.errorHandlers.forEach((handler) => handler(event));
    };
  }

  /**
   * Start recording with 100ms chunks for low latency
   */
  async startRecording(): Promise<void> {
    if (!this.recorder) {
      throw new Error('No audio stream captured');
    }

    if (this.recorder.state === 'recording') {
      return; // Already recording
    }

    // Start with 100ms timeslice for low latency
    this.recorder.start(100);
  }

  /**
   * Stop recording and release resources
   */
  async stop(): Promise<void> {
    if (this.recorder && this.recorder.state === 'recording') {
      this.recorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.recorder = null;
    this.chunkHandlers = [];
    this.errorHandlers = [];
  }

  /**
   * Register callback for audio chunks
   */
  async onChunk(handler: ChunkHandler): Promise<void> {
    this.chunkHandlers.push(handler);
  }

  /**
   * Register callback for errors
   */
  async onError(handler: ErrorHandler): Promise<void> {
    this.errorHandlers.push(handler);
  }

  /**
   * Get the MediaRecorder instance (for testing)
   */
  async getRecorder(): Promise<MediaRecorder | null> {
    return this.recorder;
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.recorder?.state === 'recording';
  }
}

// Export singleton instance
export const audioCapture = new AudioCaptureService();
