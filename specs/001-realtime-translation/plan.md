# Implementation Plan: Babel Fish Real-Time Browser Audio Translation

**Branch**: `001-realtime-translation` | **Date**: 2025-12-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-realtime-translation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Babel Fish is a Chrome browser extension that captures browser audio in real-time, streams it to a translation server via WebSocket, and displays translated text in a resizable overlay. The extension supports English, Japanese, and Chinese translation with manual language selection. Built with React and TypeScript, it uses the Tab Capture API for audio acquisition and MediaRecorder API for audio chunking. Revenue is generated through PropellerAds integration.

## Technical Context

**Language/Version**: TypeScript 5.0+, React 18+, JavaScript ES2020+
**Primary Dependencies**:
- React 18+ (UI framework)
- TypeScript 5.0+ (type safety)
- Tailwind CSS (styling)
- Tab Capture API (browser audio capture)
- MediaRecorder API (audio chunking and streaming)
- WebSocket API (real-time server communication)
- PropellerAds SDK (advertisement integration)
- Chrome Extension APIs (manifest v3)

**Storage**: Chrome Storage API (chrome.storage.sync for language preferences, chrome.storage.local for session state)
**Testing**: Jest (unit tests), Playwright (browser automation tests), manual latency testing for audio-to-translation pipeline
**Target Platform**: Chrome Browser 90+ (Manifest V3 extension)
**Project Type**: Chrome browser extension with React frontend
**Performance Goals**:
- <500ms P50 latency from audio detection to translation display (per constitution)
- <800ms P95 latency (per constitution)
- <3 seconds extension activation (SC-001)
- <3 seconds ad loading (SC-008)

**Constraints**:
- <500KB bundle size (per constitution, excluding translation server)
- <50MB memory footprint (per constitution)
- CSP compliant (no eval, no inline scripts)
- Must handle network failures gracefully
- Must notify user on connection timeout
- Must prompt user if no language selected before translation

**Scale/Scope**:
- Single-user extension
- 3 supported languages (English, Japanese, Chinese)
- Real-time audio streaming architecture
- WebSocket-based server communication
- Core components: audio capture, translation overlay, language selector, ad display

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with [Bable Fish Constitution](../../.specify/memory/constitution.md):

- [⚠️] **Simplicity & Readability**: **PARTIAL VIOLATION** - Using React + TypeScript + Tailwind CSS introduces framework complexity. Constitution prefers vanilla JavaScript.
  - **Justification**: React provides component reusability for complex UI (overlay, language selector, ad display). TypeScript adds type safety for WebSocket message handling and API contracts. Tailwind provides rapid UI development without CSS bloat. Trade-off: Framework complexity vs development velocity and maintainability for UI-heavy extension.

- [x] **Speed Over Accuracy**: Design prioritizes <500ms P50 latency (constitutional target). Using streaming WebSocket for progressive results. Audio chunks sent immediately via MediaRecorder for minimal buffering delay.

- [x] **Testing Strategy**: Planned browser automation (Playwright), manual device testing, latency benchmarking (audio-to-translation pipeline), connection timeout tests, language selection validation.

- [x] **Technology Stack**: Using Web Audio API (via Tab Capture + MediaRecorder), ES2020+ JavaScript/TypeScript. Constitutional compliance.

- [x] **Performance Targets**: <500ms P50 latency target ✓, <50MB memory ✓, <500KB bundle size target (may need tree-shaking for React).

*If any check fails, document justification in Complexity Tracking section below.*

## Project Structure

### Documentation (this feature)

```text
specs/001-realtime-translation/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── websocket-protocol.md  # WebSocket message contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
extension/
├── src/
│   ├── components/          # React UI components
│   │   ├── TranslationOverlay.tsx
│   │   ├── LanguageSelector.tsx
│   │   ├── AdDisplay.tsx
│   │   └── NotificationBanner.tsx
│   ├── services/           # Core business logic
│   │   ├── audioCapture.ts      # Tab Capture + MediaRecorder
│   │   ├── websocketClient.ts   # WebSocket connection management
│   │   ├── translationService.ts # Translation state management
│   │   └── adService.ts         # PropellerAds integration
│   ├── hooks/              # React custom hooks
│   │   ├── useAudioCapture.ts
│   │   ├── useTranslation.ts
│   │   └── useLanguagePreferences.ts
│   ├── types/              # TypeScript type definitions
│   │   ├── translation.types.ts
│   │   ├── websocket.types.ts
│   │   └── storage.types.ts
│   ├── utils/              # Utility functions
│   │   ├── audioChunker.ts
│   │   ├── latencyTracker.ts
│   │   └── errorHandler.ts
│   ├── background.ts       # Service worker (manifest v3)
│   ├── content.ts          # Content script
│   ├── popup.tsx           # Extension popup UI
│   └── styles/
│       └── tailwind.css
├── public/
│   ├── manifest.json       # Chrome extension manifest v3
│   └── icons/
├── tests/
│   ├── unit/               # Jest unit tests
│   │   ├── audioCapture.test.ts
│   │   ├── websocketClient.test.ts
│   │   └── translationService.test.ts
│   ├── integration/        # Integration tests
│   │   ├── audio-to-translation.test.ts
│   │   └── connection-timeout.test.ts
│   └── e2e/                # Playwright browser automation
│       ├── extension-activation.spec.ts
│       ├── language-selection.spec.ts
│       └── latency-benchmark.spec.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── webpack.config.js       # Bundle for <500KB target
```

**Structure Decision**: Chrome extension with React/TypeScript frontend. Source code organized by feature domains (components, services, hooks). Testing pyramid: unit tests (services/utils), integration tests (audio pipeline), e2e tests (full user flows + latency benchmarks).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| React + TypeScript frameworks | Complex UI with state management (translation overlay, language selector, ad display, notifications). WebSocket message type safety critical. | Vanilla JS would require manual DOM manipulation, custom state management, and no type safety for WebSocket messages. React provides component reusability and declarative UI. TypeScript catches WebSocket protocol errors at compile-time. |
| Tailwind CSS framework | Rapid UI styling without bloat. Utility-first approach keeps bundle small. | Custom CSS would increase development time and potentially increase bundle size with unused styles. Tailwind's tree-shaking removes unused utilities. |
