# VibeCoder IDE — Flutter Integration: Full Plan

## Table of Contents
- [Research & Ecosystem Analysis](#research--ecosystem-analysis)
- [Phase Roadmap (A → B → C)](#phase-roadmap)
- [Phase A Implementation: Project Wizard Changes](#phase-a-implementation-project-wizard-changes) ← **DONE**

---

# Research & Ecosystem Analysis

## 1. Local Preview / Hot Reload in Browser

### Flutter Web Dev Server

Flutter can run as a web application, which makes it viable as a preview mechanism in a web-based IDE. There are two relevant device targets:

- **`flutter run -d chrome`** — Opens Chrome directly with DevTools integration and full debugging support.
- **`flutter run -d web-server --web-port=XXXX --web-hostname=0.0.0.0`** — Starts a headless web server without opening a browser. This is the one relevant for our IDE since we need to embed the output in an iframe.

The dev server serves the Flutter app over HTTP on the specified port (or a random port if unspecified). The terminal output includes a line like:

```
Launching lib/main.dart on Web Server in debug mode...
```

followed by the serving URL. We can scan stdout for this URL pattern, similar to how we currently scan for Expo URLs.

### Hot Reload on Web (Flutter 3.35+, August 2025)

This is a major recent development. As of Flutter 3.35 (August 2025), stateful hot reload is enabled by default on the web — no experimental flags required. Previously, you had to pass `--web-experimental-hot-reload`. Now it works out of the box.

Interactive stdin commands during `flutter run`:
- `r` — Hot reload (preserves state, rebuilds widget tree)
- `R` — Hot restart (full restart, loses state)
- `h` — List all available commands
- `d` — Detach (keep app running, terminate CLI)
- `c` — Clear screen
- `q` — Quit

This means we can spawn `flutter run -d web-server --web-port=XXXX` as a subprocess, pipe stdin to send `r` or `R` for reload/restart, and pipe stdout to scan for the serving URL. This is directly analogous to the current Expo setup.

### iframe Embedding

Flutter's official documentation explicitly supports iframe embedding. Simple iframe embedding:
```html
<iframe src="http://localhost:XXXX/index.html"></iframe>
```

There is also an "embedded mode" (multi-view) where Flutter renders into specific `<div>` elements on a host page, but iframe is the simpler approach for our use case.

### CORS Considerations

When proxying the Flutter dev server through the backend (like we do with Metro for Expo), we may need to handle CORS headers. Flutter's CLI supports `flutter run --web-header "Access-Control-Allow-Origin=*"` for development.

### Key Takeaway for IDE Integration

The Flutter web dev server story is very similar to Expo's Metro dev server:
1. Spawn `flutter run -d web-server --web-port=8082` as a child process
2. Scan stdout for the serving URL
3. Embed that URL in an iframe with our device frame
4. Send `r`/`R` to stdin for hot reload/restart
5. Hot reload is stateful by default since Flutter 3.35

## 2. Cloud / Remote Build Services

### Codemagic (The Closest to EAS Build for Flutter)

Codemagic is the de facto standard CI/CD platform for Flutter.

**Pricing (2025-2026):**
- Free: $0 — 500 free build minutes/month on Apple Silicon M2
- Pay-as-you-go: Per-minute ($0.015–$0.095/min depending on machine)
- Professional: $299/month — unlimited premium minutes, 3 concurrent builds
- Annual M2: $3,990/year
- Annual M4: $5,400/year
- Enterprise: Custom

**REST API** — Yes, Codemagic has a full API at `https://api.codemagic.io`:
- Applications API — `POST /apps` to add repositories
- Builds API — `POST /builds` to trigger builds programmatically
- Artifacts API — Download build artifacts (APK, IPA, etc.)
- Caches API — Manage build caches

### Bitrise
- Credits-based pricing, free "Hobby" tier: 300 monthly credits
- Strong Flutter support but limited to Android and iOS only
- Has REST API for triggering builds

### Appcircle
- Self-hosted and cloud options
- Free starter plan available
- Enterprise-focused

### GitHub Actions
- 2,000 free minutes/month for private repos
- macOS runners available
- Requires manual workflow YAML configuration

### Shorebird CI (Beta, launched September 2025)
- Zero-config CI specifically for Flutter/Dart
- Free for public repos, $20/month Pro
- GA release expected in 2026

## 3. OTA / Hot Updates (Shorebird)

Shorebird is the only real OTA/code push solution for Flutter. Created by Flutter's co-founder (Eric Seidel).

**How it works:**
1. `shorebird release` — Creates a base release
2. `shorebird patch` — Creates a patch delivered OTA
3. Updates Dart code and assets only (not native code)

**Pricing (2025-2026):**
- Free: 5,000 patch installs/month
- Pro: $20/month — 50,000/month
- Business: $400/month — 1,000,000/month
- Enterprise: Custom

**API Access:** API at `https://api.shorebird.dev/` but not well-documented for external use. For IDE integration, shell out to the `shorebird` CLI.

**Competitors:** Essentially none. Shorebird is a monopoly in the Flutter OTA space.

## 4. Is There an "Expo Equivalent" for Flutter?

Short answer: **No.** Flutter's ecosystem is fundamentally more fragmented.

**Relevant Tools (But Not "Expo Equivalents"):**
- **FlutterFlow** — No-code/low-code visual builder (competitor to our IDE concept)
- **Very Good CLI** — Project scaffolding tool, uses Mason templates
- **Mason** — Template engine for Dart/Flutter
- **Zapp** — Online Flutter sandbox
- **FlutLab** — Online Flutter IDE (closest existing product to what we'd build)
- **Project IDX (Google)** — Cloud-based IDE supporting Flutter

## 5. Key Differences from Expo Workflow

| | Expo | Flutter |
|---|---|---|
| Phone preview without build | Yes (Expo Go) | No |
| QR code to phone testing | Built-in | Not possible without full build |
| Web preview fidelity | Low (RN Web != RN Mobile) | **HIGH** (same renderer) |
| Unified CLI | Yes (`npx expo` / `eas`) | No (3 separate CLIs) |

**Expo Workflow:** `npx expo start` → QR code → Expo Go on phone → live preview → `eas build` → `eas update`
One tool, one vendor, one subscription.

**Flutter Workflow:** `flutter run -d web-server` → URL → browser iframe → live preview (web only)
`Codemagic API` → APK/IPA
`shorebird patch` → OTA patch
Three tools, three vendors, three billing relationships.

---

# Phase Roadmap

## Phase A: Local Preview (Achievable — parallels Expo setup) ← **STARTED**

1. **Scaffolder:** Generate a Flutter project (use `flutter create` or Very Good CLI / Mason templates)
2. **Dev Server:** Spawn `flutter run -d web-server --web-port=8082` as a PTY subprocess
3. **Preview Panel:** Embed Flutter web output in existing iframe/device-frame preview (high-fidelity!)
4. **Hot Reload:** Send `r` to stdin on file save
5. **File Watching:** Existing chokidar watcher detects changes, triggers stdin `r`

**Sub-steps completed:**
- Project Wizard: framework selection UI (Expo vs Flutter) ✅

**Sub-steps remaining:**
- Backend scaffolder: Flutter project templates (`flutter create` wrapper or Mason)
- PTY service: Flutter dev server subprocess management
- Expo scanner equivalent: scan Flutter stdout for web server URL
- Preview panel: route to Flutter dev server when framework is Flutter
- Hot reload integration: send `r` to Flutter stdin on file changes

## Phase B: Cloud Build (Requires external service integration)

1. **Codemagic Integration:** Use REST API to trigger builds
   - User connects Codemagic account (API token)
   - Backend pushes code to git repo
   - Triggers build via `POST https://api.codemagic.io/builds`
   - Polls for completion, downloads artifact
   - Presents download link or QR code for installation
2. **Alternative:** GitHub Actions with pre-built workflow templates

## Phase C: OTA Updates (Requires Shorebird)

1. Shell out to `shorebird patch` CLI command from backend
2. No REST API available — must use CLI subprocess
3. Requires user to have a Shorebird account

### Prerequisites
- Flutter SDK installed (2–3 GB)
- Dart SDK (bundled with Flutter)
- For Android builds locally: Android SDK
- For iOS builds: macOS + Xcode (impossible on Windows/Linux — use cloud build)

### Biggest Gaps vs Expo
1. No phone preview via QR code
2. Heavier SDK (2–3 GB vs Node.js)
3. No unified billing
4. Slower initial compilation (15–30s, hot reloads <2s)

### Recommended Strategy
Minimum viable integration:
1. Flutter Web preview in iframe (same preview panel, different subprocess)
2. Hot reload via stdin commands
3. Codemagic integration for cloud builds (API-driven)
4. Shorebird integration for OTA (CLI-driven)

This gives Flutter users roughly **80% of the Expo experience**.

---

# Phase A Implementation: Project Wizard Changes

**Status: COMPLETE** ✅

## Context
Added framework selection to the project wizard — no backend scaffolder changes yet (Flutter templates come later).

The wizard previously had 5 static steps: Name → API → Design → HTML/CSS → Review. Now has a "Framework" step after Name with conditional step flows per framework.

## Step Flows

- **Expo:** Name → Framework → API → Design → HTML/CSS → Review (6 steps)
- **Flutter:** Name → Framework → API → Design → Review (5 steps, no HTML/CSS)

## Files Modified (7 files, 1 new)

### 1. Shared types — `vibecoder/packages/shared/src/types/project.ts`
- Added `ProjectFramework = 'expo' | 'flutter'` type
- Added optional `framework?: ProjectFramework` field to `ScaffoldConfig`
- Added `'framework'` to `WizardStep` union

### 2. Wizard store — `vibecoder/packages/frontend/src/store/wizardStore.ts`
- Added `framework: ProjectFramework` to state (defaults to `'expo'`)
- Added `setFramework` action

### 3. Framework card CSS — `vibecoder/packages/frontend/src/components/wizard/ProjectWizard.css`
- `.wizard__fw-cards` — 2-column grid
- `.wizard__fw-card` — selectable cards with `--fw-accent` CSS variable per card
- `.wizard__fw-card-badge` — "Coming soon" pill for Flutter

### 4. New component — `vibecoder/packages/frontend/src/components/wizard/StepFramework.tsx`
- Two cards: Expo (⚛️, `#61dafb`) and Flutter (🐦, `#02569b`)
- Flutter card has "Coming soon" badge

### 5. Wizard orchestrator — `vibecoder/packages/frontend/src/components/wizard/ProjectWizard.tsx`
- Conditional `EXPO_STEPS` (6) vs `FLUTTER_STEPS` (5) — HTML/CSS step only in Expo
- Passes `framework` to `projectApi.create()`

### 6. Name step — `vibecoder/packages/frontend/src/components/wizard/StepName.tsx`
- Description changed from "Expo (React Native) project" to "mobile app project"

### 7. Review step — `vibecoder/packages/frontend/src/components/wizard/StepReview.tsx`
- Added "Framework" review row showing "Expo (React Native)" or "Flutter (Dart)"

## What This Does NOT Change
- No backend scaffolder changes (Flutter templates are a separate future task)
- No new npm dependencies
- No changes to preview, terminal, or AI systems
- Existing Expo project creation continues to work identically
- `ScaffoldConfig.framework` is optional — backend ignores it for now

## Edge Cases
- **Framework switch mid-wizard:** `getSteps()` recomputes on every render. The `design` step exists in both paths. The `html-import` step only appears in Expo path.
- **designFiles when Flutter selected:** Array stays empty (user never sees the upload step). Harmless.
- **Backward compat:** Backend receives `ScaffoldConfig` with optional `framework` field. Existing code continues to work. Future Flutter scaffolder uses `config.framework ?? 'expo'`.

## Verification
1. `cd vibecoder && npx tsc -b packages/frontend --noEmit` — clean compile ✅
2. `cd vibecoder && npm run dev` — starts without errors
3. Step 1 (Name): Description says "mobile app project" (not "Expo")
4. Step 2 (Framework): Two cards visible — Expo (React blue) and Flutter (Flutter blue, "Coming soon" badge)
5. Select Expo: Step indicator shows 6 steps including "HTML/CSS"
6. Go back, select Flutter: Step indicator shows 5 steps, "HTML/CSS" disappears
7. Navigate to Review: Framework row shows "Expo (React Native)" or "Flutter (Dart)"
8. Create project with Expo: Works exactly as before (backward compat)
