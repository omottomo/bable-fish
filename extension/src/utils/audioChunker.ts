/**
 * Audio Chunker Utility
 *
 * Converts audio Blobs to ArrayBuffers with binary headers
 * Header format: [sequenceNumber (4 bytes) | timestamp (4 bytes) | audio data]
 */

export interface AudioChunk {
  data: ArrayBuffer;
  sequenceNumber: number;
  timestamp: number;
}

/**
 * Convert Blob to ArrayBuffer with binary header
 *
 * @param blob Audio blob from MediaRecorder
 * @param sequenceNumber Monotonically increasing sequence number
 * @param timestamp Capture timestamp in milliseconds
 * @returns Promise<ArrayBuffer> with header prepended
 */
export async function createAudioChunk(
  blob: Blob,
  sequenceNumber: number,
  timestamp: number
): Promise<ArrayBuffer> {
  // Convert blob to ArrayBuffer
  const audioData = await blob.arrayBuffer();

  // Create buffer with 8-byte header + audio data
  const headerSize = 8;
  const totalSize = headerSize + audioData.byteLength;
  const chunkBuffer = new ArrayBuffer(totalSize);

  // Create DataView for header
  const headerView = new DataView(chunkBuffer);

  // Write sequence number (bytes 0-3, little-endian uint32)
  headerView.setUint32(0, sequenceNumber, true);

  // Write timestamp (bytes 4-7, little-endian uint32)
  headerView.setUint32(4, timestamp, true);

  // Copy audio data after header
  const audioView = new Uint8Array(chunkBuffer, headerSize);
  const sourceView = new Uint8Array(audioData);
  audioView.set(sourceView);

  return chunkBuffer;
}

/**
 * Parse audio chunk from ArrayBuffer
 *
 * @param buffer ArrayBuffer with header and audio data
 * @returns Parsed audio chunk
 */
export function parseAudioChunk(buffer: ArrayBuffer): AudioChunk {
  if (buffer.byteLength < 8) {
    throw new Error('Invalid audio chunk: buffer too small');
  }

  const headerView = new DataView(buffer);

  const sequenceNumber = headerView.getUint32(0, true);
  const timestamp = headerView.getUint32(4, true);

  // Extract audio data (everything after 8-byte header)
  const audioData = buffer.slice(8);

  return {
    data: audioData,
    sequenceNumber,
    timestamp,
  };
}

/**
 * Validate chunk sequence
 *
 * @param chunks Array of chunks to validate
 * @returns true if sequence is valid (monotonically increasing)
 */
export function validateChunkSequence(chunks: AudioChunk[]): boolean {
  if (chunks.length === 0) return true;

  for (let i = 1; i < chunks.length; i++) {
    if (chunks[i].sequenceNumber <= chunks[i - 1].sequenceNumber) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate total audio duration from chunks
 *
 * @param chunks Array of audio chunks
 * @param chunkDuration Duration of each chunk in ms (default: 100ms)
 * @returns Total duration in milliseconds
 */
export function calculateDuration(chunks: AudioChunk[], chunkDuration: number = 100): number {
  return chunks.length * chunkDuration;
}
