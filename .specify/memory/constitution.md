<!--
============================================================================
SYNC IMPACT REPORT
============================================================================
Version Change: (new constitution) → 1.0.0
Modified Principles: N/A (initial version)
Added Sections:
  - Core Principles (3 principles)
  - Technology Stack
  - Governance
Removed Sections: N/A
Templates Status:
  - ✅ plan-template.md: Constitution Check section aligns with new principles
  - ✅ spec-template.md: Requirements and user story structure supports principles
  - ✅ tasks-template.md: Task organization supports testing and incremental delivery
Follow-up TODOs:
  - Define specific translation API/service in Technology Stack when selected
  - Establish baseline performance benchmarks for latency targets
============================================================================
-->

# Bable Fish Constitution

## Core Principles

### I. Simplicity & Readability

Code MUST be simple, clear, and easy to understand:

- Prefer vanilla JavaScript over complex frameworks
- Use descriptive variable and function names that explain intent
- Avoid clever one-liners; favor explicit, readable code
- Keep functions small and focused on a single responsibility
- Minimize dependencies; only add libraries when significantly beneficial
- Comment complex audio processing or translation logic, but keep code self-documenting
- YAGNI principle: implement only what is needed now, not what might be needed later

**Rationale**: Real-time audio translation is inherently complex. Simple, readable code enables faster debugging, easier maintenance, and quicker onboarding of contributors. When audio glitches or translation fails, clear code allows rapid diagnosis.

### II. Speed Over Accuracy (Response Latency Priority)

Translation results MUST be delivered quickly, even if initial accuracy is lower:

- Target latency: Display translation result within 500ms of speech detection
- Use streaming translation APIs that provide partial results
- Prioritize fast language detection (even if confidence is lower initially)
- Show progressive translation refinements rather than waiting for perfect results
- Never block UI rendering waiting for perfect translation
- Implement optimistic UI updates with correction mechanism
- Cache common phrases and vocabulary for instant response

**Rationale**: In real-time conversation, a fast approximate translation maintains conversation flow better than a slow perfect one. Users can self-correct based on context, but delays break communication rhythm and user experience.

### III. Testing Strategy (Non-Negotiable)

Browser automation and real device testing MUST be mandatory:

- **Browser Automation**: Every audio pipeline component must have automated tests
  - Use Playwright or Selenium for cross-browser testing
  - Mock Web Audio API for unit tests
  - Test audio input/output flow end-to-end
- **Real Device Testing**: Test on actual devices before release
  - Test on low-end devices (4GB RAM minimum target)
  - Verify microphone permissions and audio capture on real hardware
  - Test network degradation scenarios (offline, slow connection)
- **Performance Benchmarks**: All changes must pass performance tests
  - Latency measurements in CI pipeline
  - Memory footprint monitoring
  - Audio quality metrics (no artifacts, clear output)
- **Manual QA**: Human verification of translation quality required for major releases

**Rationale**: Audio and real-time systems cannot be fully validated through unit tests alone. Browser differences, device microphones, and actual network conditions significantly impact behavior. Real device testing catches issues that emulators miss.

## Technology Stack

The following technologies define the technical foundation for Bable Fish:

**Core Requirements**:
- **Browser APIs**: Web Audio API, MediaStream API for real-time audio capture and processing
- **Translation**: Real-time translation API/service (specific provider to be determined based on requirements)
- **Language**: JavaScript (ES2020+) for maximum browser compatibility
- **Build**: Minimal build tooling; prefer native ES modules where possible

**Approved Libraries** (minimal dependencies):
- Audio processing utilities (only if native Web Audio API insufficient)
- Translation SDK (for chosen provider integration)

**Constraints**:
- No server-side processing for audio data (privacy concern)
- Must work in modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Total bundle size target: <500KB (excluding translation API SDK)
- No eval(), no inline scripts (CSP compliance)

**Performance Targets**:
- Cold start to first translation: <2 seconds
- Audio capture to translation display: <500ms (P50), <800ms (P95)
- Memory footprint: <50MB for core application
- Works on devices with 4GB RAM minimum

## Governance

**Amendment Procedure**:
- All constitution amendments MUST be approved by the project owner/maintainer
- Proposed amendments require:
  1. Written rationale explaining the change necessity
  2. Impact analysis on existing code and principles
  3. Migration plan if changes affect existing features
- Version bump follows semantic versioning (see below)

**Versioning Policy**:
- **MAJOR** version increment: Backward-incompatible principle removals or fundamental redefinitions
- **MINOR** version increment: New principle added or material expansion of existing principle
- **PATCH** version increment: Clarifications, wording improvements, typo fixes

**Compliance Review**:
- All feature specifications MUST reference applicable constitutional principles
- All pull requests MUST verify compliance with constitution in review checklist
- Constitution violations require explicit justification and approval
- Complexity that violates Principle I (Simplicity) must be documented with "why needed" explanation

**Version**: 1.0.0 | **Ratified**: 2025-12-03 | **Last Amended**: 2025-12-03
