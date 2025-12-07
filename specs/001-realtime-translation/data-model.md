# Data Model: Babel Fish Real-Time Audio Translation

**Date**: 2025-12-06

## Entities

### Translation Session

Represents an active real-time translation session.

**Fields**:
- `sessionId: string` - Unique identifier for the session
- `sourceLanguage: 'en' | 'ja' | 'zh'` - Selected source language
- `targetLanguage: 'en' | 'ja' | 'zh'` - Selected target language
- `status: 'idle' | 'connecting' | 'active' | 'error' | 'disconnected'` - Connection state
- `createdAt: Date` - Session start time
- `lastActivityAt: Date` - Last translation received

**Validation Rules**:
- `sourceLanguage` !== `targetLanguage`
- `sessionId` must be unique
- `status` transitions: idle → connecting → active → (error|disconnected) → idle

**State Transitions**:
```
idle → [user clicks start] → connecting
connecting → [WebSocket open] → active
connecting → [timeout/error] → error
active → [user stops/error] → disconnected
error/disconnected → [user retry] → connecting
```

### Language Preference

Stores user's language selection preferences.

**Fields**:
- `sourceLanguage: 'en' | 'ja' | 'zh'` - Last selected source language
- `targetLanguage: 'en' | 'ja' | 'zh'` - Last selected target language
- `updatedAt: Date` - Last update timestamp

**Storage**: Chrome Storage Sync (persists across devices)

**Validation Rules**:
- Both fields required
- Languages must be different

### Translation Display Area

UI state for the translation overlay.

**Fields**:
- `width: number` - Width in pixels (min: 200, max: 800)
- `height: number` - Height in pixels (min: 100, max: 600)
- `x: number` - X position (viewport coordinates)
- `y: number` - Y position (viewport coordinates)
- `isVisible: boolean` - Visibility state
- `currentText: string` - Currently displayed translation

**Storage**: Chrome Storage Local (session-scoped)

**Validation Rules**:
- Width: 200 ≤ width ≤ 800
- Height: 100 ≤ height ≤ 600
- Position must be within viewport bounds

### Advertisement Display Area

UI state for ad placement.

**Fields**:
- `width: number` - Width in pixels (fixed: 300)
- `height: number` - Height in pixels (fixed: 250)
- `position: 'top' | 'bottom' | 'side'` - Ad placement
- `isVisible: boolean` - Visibility state
- `adLoaded: boolean` - Ad load status

**Validation Rules**:
- Dimensions fixed by PropellerAds requirements
- Must not overlap with translation area

### Audio Chunk

Represents a single audio data segment for streaming.

**Fields**:
- `data: ArrayBuffer` - Audio data (WebM/Opus)
- `timestamp: number` - Capture timestamp (ms)
- `sequenceNumber: number` - Chunk order
- `duration: number` - Chunk duration (ms, typically 100ms)

**Validation Rules**:
- `sequenceNumber` must be monotonically increasing
- `duration` should be ~100ms (±10ms tolerance)

### Translation Response

Server response containing translated text.

**Fields**:
- `text: string` - Translated text
- `sourceLanguage: string` - Detected/confirmed source language
- `targetLanguage: string` - Target language
- `timestamp: number` - Server processing timestamp
- `confidence: number` - Translation confidence (0-1)
- `isFinal: boolean` - Is this a final result or interim?

**Validation Rules**:
- `text` can be empty for interim results
- `confidence` between 0.0 and 1.0
- `isFinal` true only when confidence > 0.8

## Relationships

```
Translation Session (1) ←→ (1) Language Preference
Translation Session (1) ←→ (1) Translation Display Area
Translation Session (1) ←→ (0..n) Audio Chunks (streaming)
Translation Session (1) ←→ (0..n) Translation Responses (streaming)
Translation Display Area (1) ←→ (1) Advertisement Display Area (layout constraint)
```

## Storage Strategy

| Entity | Storage Type | Lifetime | Key |
|--------|-------------|----------|-----|
| Language Preference | chrome.storage.sync | Persistent (cross-device) | `language_preferences` |
| Translation Display Area | chrome.storage.local | Session | `display_state` |
| Advertisement Display Area | chrome.storage.local | Session | `ad_state` |
| Translation Session | In-memory (React state) | Active session only | N/A |
| Audio Chunks | In-memory (stream buffer) | Sent immediately | N/A |
| Translation Responses | In-memory (display buffer) | Display duration only | N/A |
