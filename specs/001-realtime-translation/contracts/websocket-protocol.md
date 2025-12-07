# WebSocket Protocol: Babel Fish Translation Server

**Version**: 1.0.0
**Date**: 2025-12-06

## Connection

**Endpoint**: `wss://[translation-server]/translate`

**Subprotocol**: `babel-fish-v1`

## Message Types

### Client → Server

#### 1. Start Session

**Type**: Text (JSON)

```json
{
  "type": "start_session",
  "payload": {
    "sourceLanguage": "en" | "ja" | "zh",
    "targetLanguage": "en" | "ja" | "zh",
    "clientId": "string (UUID)"
  }
}
```

**Response**: `session_started` or `error`

#### 2. Audio Chunk

**Type**: Binary (ArrayBuffer)

**Format**: Raw WebM/Opus audio data (100ms chunks)

**Metadata**: Included in binary header (first 8 bytes):
- Bytes 0-3: Sequence number (uint32, little-endian)
- Bytes 4-7: Timestamp (uint32, milliseconds since session start)
- Bytes 8+: Audio data

#### 3. Stop Session

**Type**: Text (JSON)

```json
{
  "type": "stop_session",
  "payload": {
    "sessionId": "string"
  }
}
```

**Response**: `session_stopped`

#### 4. Heartbeat (Ping)

**Type**: Text (JSON)

```json
{
  "type": "ping",
  "payload": {
    "timestamp": number
  }
}
```

**Response**: `pong`

### Server → Client

#### 1. Session Started

```json
{
  "type": "session_started",
  "payload": {
    "sessionId": "string (UUID)",
    "timestamp": number
  }
}
```

#### 2. Translation Response

```json
{
  "type": "translation",
  "payload": {
    "text": "string",
    "isFinal": boolean,
    "confidence": number (0-1),
    "timestamp": number,
    "latency": number (ms from audio received to translation sent)
  }
}
```

**Notes**:
- `isFinal: false` indicates interim/partial result
- `isFinal: true` indicates confident final translation
- Client should display interim results immediately, replace with final

#### 3. Session Stopped

```json
{
  "type": "session_stopped",
  "payload": {
    "sessionId": "string",
    "reason": "client_requested" | "error" | "timeout"
  }
}
```

#### 4. Error

```json
{
  "type": "error",
  "payload": {
    "code": "CONNECTION_TIMEOUT" | "INVALID_LANGUAGE" | "SERVER_ERROR" | "AUDIO_DECODE_ERROR",
    "message": "string (user-friendly error message)",
    "timestamp": number
  }
}
```

#### 5. Heartbeat (Pong)

```json
{
  "type": "pong",
  "payload": {
    "timestamp": number,
    "serverTimestamp": number
  }
}
```

## Connection Lifecycle

```
1. Client opens WebSocket connection
2. Client sends "start_session" with language selection
3. Server responds with "session_started" + sessionId
4. Client streams audio chunks (binary messages)
5. Server streams translation responses (JSON messages)
6. Client sends heartbeat every 10 seconds
7. Either:
   a. Client sends "stop_session" → Server sends "session_stopped" → Close
   b. Server error → Server sends "error" → Close
   c. Network timeout → Connection closes
```

## Error Handling

### Connection Timeout

**Trigger**: No "session_started" within 5 seconds of connection

**Client Action**: Display error notification, retry with exponential backoff

### No Language Selected

**Trigger**: Client attempts "start_session" without valid language pair

**Server Response**: `error` with code `INVALID_LANGUAGE`

**Client Action**: Prompt user to select language before retrying

### Network Failure During Session

**Trigger**: WebSocket connection drops during active session

**Client Action**:
1. Display "Reconnecting..." notification
2. Retry connection with exponential backoff (1s, 2s, 4s, max 10s)
3. After 3 failed attempts, display "Connection lost" error

## Performance Requirements

**Latency SLA**: <500ms P50, <800ms P95 from audio chunk sent to translation received

**Heartbeat**: Every 10 seconds (client → server)

**Timeout**:
- Connection establishment: 5 seconds
- Heartbeat response: 15 seconds
- Idle session: 5 minutes (no audio)

## Security

**Authentication**: Optional bearer token in URL query parameter (future enhancement)

**Encryption**: TLS 1.2+ required (wss://)

**Rate Limiting**: Server may enforce per-client rate limits (not defined in v1.0.0)
