# Tasks: Babel Fish Real-Time Browser Audio Translation

**Input**: Design documents from `/specs/001-realtime-translation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/websocket-protocol.md

**Tests**: Tests are included as this is a constitutional requirement (browser automation + real device testing mandatory)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- **Extension root**: `extension/`
- **Source code**: `extension/src/`
- **Tests**: `extension/tests/`
- **Public assets**: `extension/public/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Chrome extension structure

- [x] T001 Create extension directory structure per plan.md (extension/src/, extension/public/, extension/tests/)
- [x] T002 Initialize Node.js project with package.json (React 18, TypeScript 5.0, Tailwind CSS dependencies)
- [x] T003 [P] Create TypeScript configuration in extension/tsconfig.json (ES2020+ target, React JSX)
- [x] T004 [P] Create Tailwind CSS configuration in extension/tailwind.config.js with purge settings for <500KB target
- [x] T005 [P] Create Webpack configuration in extension/webpack.config.js (tree-shaking, code splitting, <500KB bundle target)
- [x] T006 [P] Create Chrome extension manifest v3 in extension/public/manifest.json (tabCapture, storage, activeTab permissions)
- [x] T007 [P] Create extension icons in extension/public/icons/ (16x16, 48x48, 128x128)
- [x] T008 [P] Configure Jest for unit tests in extension/jest.config.js
- [x] T009 [P] Configure Playwright for e2e tests in extension/playwright.config.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T010 Create TypeScript type definitions for Translation Session in extension/src/types/translation.types.ts
- [x] T011 [P] Create TypeScript type definitions for WebSocket messages in extension/src/types/websocket.types.ts (based on contracts/websocket-protocol.md)
- [x] T012 [P] Create TypeScript type definitions for Chrome Storage in extension/src/types/storage.types.ts (Language Preference, Display Area state)
- [x] T013 Implement error handler utility in extension/src/utils/errorHandler.ts (user-friendly error messages, CSP-compliant)
- [x] T014 [P] Implement latency tracker utility in extension/src/utils/latencyTracker.ts (P50, P95, P99 metrics for <500ms target)
- [x] T015 [P] Create base Tailwind CSS styles in extension/src/styles/tailwind.css
- [x] T016 Create background service worker in extension/src/background.ts (manifest v3 boilerplate)
- [x] T017 Create content script entry in extension/src/content.ts (inject UI into web pages)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 2 - Language Selection (Priority: P1) 🎯 MVP PREREQUISITE

**Goal**: Enable users to select source and target languages with persistent storage

**Independent Test**: Install extension → open popup → select English→Japanese → close popup → reopen → verify selections persisted

**Why First**: US1 and US5 depend on language selection being functional. This is the true starting point for the MVP.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T018 [P] [US2] Unit test for useLanguagePreferences hook in extension/tests/unit/useLanguagePreferences.test.ts
- [X] T019 [P] [US2] E2E test for language selection persistence in extension/tests/e2e/language-selection.spec.ts (Playwright)

### Implementation for User Story 2

- [X] T020 [P] [US2] Create LanguageSelector component in extension/src/components/LanguageSelector.tsx (dropdown for EN/JA/ZH)
- [X] T021 [US2] Create useLanguagePreferences hook in extension/src/hooks/useLanguagePreferences.ts (chrome.storage.sync integration)
- [X] T022 [US2] Create popup UI in extension/src/popup.tsx (React entry point with LanguageSelector)
- [X] T023 [US2] Add validation to prevent same source/target language selection in LanguageSelector component
- [X] T024 [US2] Add error handling for storage failures in useLanguagePreferences hook

**Checkpoint**: Language selection functional and persisted. Can now build translation features.

---

## Phase 4: User Story 1 - Launch Translation Overlay (Priority: P1) 🎯 MVP CORE

**Goal**: Capture browser audio, stream to translation server, display real-time translated text in overlay

**Independent Test**: Install extension → select languages → click "Start Translation" → play YouTube video → verify translated text appears in overlay within 2 seconds

**Dependencies**: US2 (language selection) must be complete

### Tests for User Story 1

- [X] T025 [P] [US1] Unit test for audioCapture service in extension/tests/unit/audioCapture.test.ts (mock Tab Capture API)
- [X] T026 [P] [US1] Unit test for websocketClient in extension/tests/unit/websocketClient.test.ts (mock WebSocket, test reconnection)
- [X] T027 [P] [US1] Unit test for translationService in extension/tests/unit/translationService.test.ts
- [X] T028 [P] [US1] Integration test for audio-to-translation pipeline in extension/tests/integration/audio-to-translation.test.ts
- [X] T029 [P] [US1] E2E latency benchmark test in extension/tests/e2e/latency-benchmark.spec.ts (<500ms P50 target)
- [X] T030 [P] [US1] E2E connection timeout test in extension/tests/e2e/connection-timeout.spec.ts (5 second timeout)

### Implementation for User Story 1

- [X] T031 [P] [US1] Implement audioCapture service in extension/src/services/audioCapture.ts (Tab Capture API + MediaRecorder, 100ms chunks)
- [X] T032 [P] [US1] Implement audioChunker utility in extension/src/utils/audioChunker.ts (WebM/Opus encoding, binary header with sequence number)
- [X] T033 [US1] Implement WebSocket client in extension/src/services/websocketClient.ts (connect, send audio chunks, receive translations, heartbeat, exponential backoff reconnection)
- [X] T034 [US1] Implement translation service in extension/src/services/translationService.ts (session state management, interim/final result handling)
- [X] T035 [P] [US1] Create TranslationOverlay component in extension/src/components/TranslationOverlay.tsx (display translated text, initially fixed size/position)
- [X] T036 [P] [US1] Create NotificationBanner component in extension/src/components/NotificationBanner.tsx (connection timeout, language prompt, errors)
- [X] T037 [US1] Create useAudioCapture hook in extension/src/hooks/useAudioCapture.ts (integrate audioCapture service, handle permissions)
- [X] T038 [US1] Create useTranslation hook in extension/src/hooks/useTranslation.ts (integrate websocketClient + translationService)
- [X] T039 [US1] Integrate TranslationOverlay into content script in extension/src/content.ts (inject overlay into DOM)
- [X] T040 [US1] Update popup.tsx with "Start/Stop Translation" button (trigger useAudioCapture + useTranslation)
- [X] T041 [US1] Implement connection timeout logic (5 seconds) with notification display in websocketClient
- [X] T042 [US1] Implement "no language selected" validation with notification in popup.tsx
- [X] T043 [US1] Add latency tracking integration in translationService (track audio→translation pipeline)
- [X] T044 [US1] Add CSP-compliant error handling throughout (no eval, no inline scripts)

**Checkpoint**: Core translation functionality working. User can translate browser audio in real-time.

---

## Phase 5: User Story 5 - Advertisement Display for Revenue (Priority: P1) 🎯 MVP MONETIZATION

**Goal**: Display PropellerAds advertisements without blocking translation functionality

**Independent Test**: Start translation → verify ads appear within 3 seconds → verify translation still works smoothly → verify ad doesn't overlap translation area

**Dependencies**: US1 (translation overlay) must be complete (for layout constraints)

### Tests for User Story 5

- [X] T045 [P] [US5] Unit test for adService in extension/tests/unit/adService.test.ts (mock PropellerAds SDK, test graceful failure)
- [X] T046 [P] [US5] E2E test for ad loading performance in extension/tests/e2e/ad-loading.spec.ts (<3 second target, no translation lag)

### Implementation for User Story 5

- [X] T047 [P] [US5] Create AdDisplay component in extension/src/components/AdDisplay.tsx (300x250 fixed size container)
- [X] T048 [US5] Implement adService in extension/src/services/adService.ts (PropellerAds SDK integration, async loading, error handling)
- [X] T049 [US5] Integrate AdDisplay into content script in extension/src/content.tsx (position to not overlap TranslationOverlay)
- [X] T050 [US5] Add ad load failure handling in adService (graceful degradation, don't block translation)
- [X] T051 [US5] Add ad blocker detection in adService (optional: notify user, but allow translation to continue)
- [X] T052 [US5] Add layout constraint logic to prevent ad/translation overlap in content.tsx

**Checkpoint**: MVP complete! Translation + ads working. Revenue model active.

---

## Phase 6: User Story 3 - Resize Translation Display Area (Priority: P2)

**Goal**: Allow users to resize translation overlay by dragging edges/corners

**Independent Test**: Start translation → drag overlay corner → verify smooth resize → verify size persists across page navigation

**Dependencies**: US1 (translation overlay) must be complete

### Tests for User Story 3

- [ ] T053 [P] [US3] E2E test for resize functionality in extension/tests/e2e/resize-overlay.spec.ts (drag corners, verify bounds 200-800w, 100-600h)

### Implementation for User Story 3

- [ ] T054 [US3] Add resize handles to TranslationOverlay component (corners + edges, CSS for resize cursors)
- [ ] T055 [US3] Implement resize drag logic in TranslationOverlay (mouse/touch events, constrain to min/max bounds)
- [ ] T056 [US3] Add display area state persistence in useTranslation hook (chrome.storage.local for session)
- [ ] T057 [US3] Load persisted size on overlay mount in TranslationOverlay
- [ ] T058 [US3] Add smooth resize animation (no lag/flickering, CSS transitions)

**Checkpoint**: Users can customize translation overlay size.

---

## Phase 7: User Story 4 - Position Translation Display Area (Priority: P3)

**Goal**: Allow users to drag translation overlay to different screen positions

**Independent Test**: Start translation → drag overlay header to new position → scroll webpage → verify overlay stays in fixed screen position

**Dependencies**: US1 (translation overlay) must be complete

### Tests for User Story 4

- [ ] T059 [P] [US4] E2E test for positioning functionality in extension/tests/e2e/position-overlay.spec.ts (drag to corners, verify fixed positioning on scroll)

### Implementation for User Story 4

- [ ] T060 [US4] Add draggable header to TranslationOverlay component (visual drag handle)
- [ ] T061 [US4] Implement drag logic for repositioning in TranslationOverlay (mouse/touch events, constrain to viewport)
- [ ] T062 [US4] Add position persistence in useTranslation hook (chrome.storage.local, save x/y coordinates)
- [ ] T063 [US4] Load persisted position on overlay mount in TranslationOverlay
- [ ] T064 [US4] Ensure fixed positioning CSS (overlay doesn't scroll with page)

**Checkpoint**: Users can fully customize translation overlay position and size.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Performance optimization, error handling hardening, production readiness

- [ ] T065 [P] Run Webpack bundle analysis, ensure <500KB total bundle size (optimize React/Tailwind if needed)
- [ ] T066 [P] Run latency benchmarks, ensure <500ms P50 latency (optimize audio chunking/WebSocket if needed)
- [ ] T067 [P] Test on low-end devices (4GB RAM minimum target), optimize memory footprint <50MB
- [ ] T068 [P] Cross-browser testing (Chrome 90+, potential Firefox/Edge compatibility)
- [ ] T069 [P] Manual QA on various websites (YouTube, news sites, social media) - verify 95% compatibility
- [ ] T070 [P] Add comprehensive error logging (non-PII, track error rates for <5% ad failure target)
- [ ] T071 [P] Create user documentation (README with setup instructions, troubleshooting guide)
- [ ] T072 [P] Add development mode latency display (window.__babelFishLatency for debugging)
- [ ] T073 Prepare Chrome Web Store submission materials (screenshots, description, privacy policy)

---

## Dependencies & Execution Strategy

### User Story Completion Order

```
Phase 1 (Setup)
   ↓
Phase 2 (Foundational)
   ↓
Phase 3 (US2: Language Selection) ← MUST complete first (prerequisite for all)
   ↓
   ├─→ Phase 4 (US1: Translation Overlay) ← MVP CORE
   │      ↓
   │      ├─→ Phase 5 (US5: Ads) ← Can start after US1 complete
   │      ├─→ Phase 6 (US3: Resize) ← Can start after US1 complete
   │      └─→ Phase 7 (US4: Position) ← Can start after US1 complete
   ↓
Phase 8 (Polish) ← After all user stories complete
```

### Parallel Execution Opportunities

**After Phase 2 complete**:
- Phase 3 (US2) must complete first (blocking)

**After Phase 3 complete**:
- Phase 4 (US1) must complete before others (provides overlay)

**After Phase 4 complete** (MAXIMUM PARALLELISM):
- Phase 5 (US5: Ads) - independent team
- Phase 6 (US3: Resize) - independent team
- Phase 7 (US4: Position) - independent team

### MVP Scope (Minimum Shippable Product)

**MVP = Phases 1 + 2 + 3 + 4 + 5**
- Phase 1: Setup
- Phase 2: Foundational infrastructure
- Phase 3: Language selection (US2)
- Phase 4: Translation overlay (US1)
- Phase 5: Advertisements (US5)

**Rationale**: This is the minimum viable product that delivers core value (real-time translation) AND enables revenue generation (ads). Resize/position are UX enhancements that can be added post-launch.

**MVP Deliverables**:
- Chrome extension installable via Web Store
- Real-time audio translation (EN/JA/ZH)
- Persistent language preferences
- Ad display with 95% uptime
- <500ms P50 latency
- <500KB bundle size

**Post-MVP** (Phases 6 + 7):
- Resizable overlay (US3)
- Repositionable overlay (US4)

---

## Task Summary

**Total Tasks**: 73
**Setup**: 9 tasks
**Foundational**: 8 tasks
**US2 (Language Selection)**: 7 tasks
**US1 (Translation Overlay)**: 20 tasks
**US5 (Advertisements)**: 8 tasks
**US3 (Resize)**: 6 tasks
**US4 (Position)**: 5 tasks
**Polish**: 9 tasks

**Test Tasks**: 11 (unit tests: 5, integration tests: 2, e2e tests: 6)

**Parallelizable Tasks**: 35 marked with [P]

**Critical Path** (blocking sequence):
Setup (9) → Foundational (8) → US2 (7) → US1 (20) → MVP Complete (44 tasks)

**Estimated MVP Completion**: 44 tasks (60% of total)
