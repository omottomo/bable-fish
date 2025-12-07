# Research: Babel Fish Real-Time Audio Translation

**Date**: 2025-12-06
**Status**: Quick defaults (research skipped per time constraint)

## Technical Decisions

### 1. WebSocket Protocol Design

**Decision**: Binary WebSocket messages for audio, JSON for control messages

**Rationale**: Binary format reduces bandwidth for audio chunks. Separate control channel for language selection, status updates.

**Configuration**:
- Audio chunks: Binary ArrayBuffer
- Control messages: JSON text frames
- Chunk size: 100-200ms audio segments
- Reconnection: Exponential backoff (1s, 2s, 4s, max 10s)

### 2. MediaRecorder API Configuration

**Decision**: WebM container with Opus codec

**Rationale**: Opus provides best compression for speech. WebM widely supported in Chrome.

**Configuration**:
```javascript
{
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 16000, // 16kbps sufficient for speech
  timeslice: 100 // 100ms chunks for low latency
}
```

### 3. Tab Capture API

**Decision**: chrome.tabCapture.capture() with audio-only constraint

**Configuration**:
```javascript
{
  audio: true,
  video: false,
  audioConstraints: {
    mandatory: {
      echoCancellation: true,
      noiseSuppression: true
    }
  }
}
```

### 4. PropellerAds Integration

**Decision**: Script tag injection in content script (manifest v3 compatible)

**Implementation**: Load ad script asynchronously, render in designated div, use CSP-compliant approach.

### 5. Bundle Size Optimization

**Decision**: Webpack with tree-shaking + code splitting

**Target**: <500KB achieved via:
- React production build
- Dynamic imports for ad SDK
- Tailwind CSS purging
- No source maps in production
