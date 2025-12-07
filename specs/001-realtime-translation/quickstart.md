# Quickstart: Babel Fish Chrome Extension

**Feature**: Real-Time Browser Audio Translation
**Date**: 2025-12-06

## Prerequisites

- Node.js 18+ and npm
- Chrome Browser 90+
- TypeScript 5.0+
- Translation server running (WebSocket endpoint)

## Development Setup

### 1. Install Dependencies

```bash
cd extension
npm install
```

**Key dependencies**:
- react@18
- typescript@5
- tailwindcss@3
- webpack@5
- @types/chrome

### 2. Configure Translation Server

Create `.env` file in `extension/` directory:

```env
TRANSLATION_SERVER_URL=wss://localhost:8080/translate
PROPELLERADS_ZONE_ID=your_zone_id_here
```

### 3. Build Extension

```bash
# Development build with hot reload
npm run dev

# Production build (optimized, <500KB target)
npm run build
```

### 4. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select `extension/dist/` directory
5. Extension should appear in toolbar

## Usage Flow

### First-Time Setup

1. Click Babel Fish extension icon in Chrome toolbar
2. Grant tab audio capture permission when prompted
3. Select source language (English, Japanese, or Chinese)
4. Select target language (different from source)
5. Language preferences are saved automatically

### Active Translation

1. Navigate to any webpage with audio (e.g., YouTube video)
2. Click Babel Fish icon → "Start Translation"
3. Translation overlay appears on page
4. Translated text appears in real-time as audio plays
5. Resize overlay by dragging corners
6. Reposition overlay by dragging header
7. Advertisements display in designated area

### Stopping Translation

1. Click Babel Fish icon → "Stop Translation"
2. Or close the translation overlay using the X button

## Testing

### Unit Tests

```bash
npm run test:unit
```

**Coverage targets**:
- Audio capture service: 80%+
- WebSocket client: 90%+
- Translation service: 85%+

### Integration Tests

```bash
npm run test:integration
```

**Test scenarios**:
- Audio capture → translation pipeline
- Connection timeout handling
- Language selection validation

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

**Test scenarios**:
- Extension activation flow
- Language selection persistence
- Latency benchmarking (<500ms target)

### Manual Testing Checklist

- [ ] Connection timeout notification appears after 5s
- [ ] Language prompt appears if user attempts translation without selection
- [ ] Translation latency measured (use built-in latency tracker)
- [ ] Ad display doesn't block translation overlay
- [ ] Extension works on various websites (YouTube, news sites, etc.)

## Project Structure

```
extension/
├── src/
│   ├── components/       # React UI components
│   ├── services/         # Core business logic
│   ├── hooks/            # React custom hooks
│   ├── types/            # TypeScript definitions
│   └── utils/            # Utilities (latency tracker, etc.)
├── public/
│   └── manifest.json     # Chrome extension manifest
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── dist/                 # Build output (load this in Chrome)
```

## Configuration Files

### `manifest.json`

**Key permissions**:
```json
{
  "permissions": [
    "tabCapture",
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

### `webpack.config.js`

**Bundle optimization**:
- Tree-shaking enabled
- React production mode
- Tailwind CSS purging
- Target: <500KB

## Troubleshooting

### "No audio detected" error

**Solution**: Ensure webpage is playing audio, grant tab capture permission

### "Connection timeout" notification

**Solution**: Verify translation server is running at configured URL

### "Please select language" prompt

**Solution**: Click extension icon, select both source and target languages

### High latency (>500ms)

**Solution**:
1. Check network connection
2. Verify server performance
3. Use latency tracker in dev tools: `window.__babelFishLatency`

## Performance Monitoring

### Built-in Latency Tracker

Access latency metrics in browser console:

```javascript
// Get current session latency stats
window.__babelFishLatency.getStats()
// Returns: { p50: 245, p95: 412, p99: 587 } (ms)
```

### Bundle Size Check

```bash
npm run build:analyze
# Opens webpack bundle analyzer
```

**Target**: <500KB total bundle size

## Next Steps

- Implement translation server (see `contracts/websocket-protocol.md`)
- Configure PropellerAds account for ad revenue
- Set up CI/CD for automated testing
- Prepare Chrome Web Store submission

## Resources

- [Chrome Extension Manifest V3 Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Tab Capture API Reference](https://developer.chrome.com/docs/extensions/reference/tabCapture/)
- [MediaRecorder API Guide](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- WebSocket Protocol: See `contracts/websocket-protocol.md`
