# NEXU RouteRunner

NEXU RouteRunner is a React Native and Expo demo for managing a delivery
agent's route. It demonstrates a rule-driven stop workflow, optimistic local
updates, persisted offline actions, and deterministic synchronization behavior.

## Prerequisites

- Node.js LTS and npm
- Android Studio and an Android emulator or device for Android development
- Xcode and an iOS simulator or device for iOS development
- Expo-compatible development tooling

The project uses Expo SDK 53 (`expo ~53.0.0`), React Native 0.79
(`react-native 0.79.6`), React 19, TypeScript, and Jest with `jest-expo`.

## Setup

```bash
npm install
```

For Android, ensure an emulator is running or a USB-debuggable device is
connected. For iOS, use a macOS machine with Xcode installed.

## Run

```bash
npm start
```

Then use the Expo development menu to open Android, iOS, or web.

Platform-specific commands:

```bash
npm run android
npm run ios
npm run web
```

### Install an Android APK

Build and install a debug APK directly on a connected device or emulator:

```powershell
npx expo run:android
```

Alternatively, build first and install the generated APK:

```powershell
cd android
.\gradlew.bat assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

Run the automated tests:

```bash
npm test -- --runInBand
```

## Demo credentials

- Agent: `Asha`
- PIN: `1234`

## Demo walkthrough

1. Sign in with the demo credentials.
2. Use **Settings > Demo clock** to set a time or adjust it by 15 minutes.
   The clock controls at-risk/late alerts and on-time calculations.
3. Use **Settings > Offline mode** to keep actions local and force sync
   failures. Perform a stop action, then switch Offline mode off to observe
   automatic queue recovery.
4. Open **Summary** to see route metrics and queued actions. Actions that need
   attention can be retried manually.

## Architecture

The app is divided into four layers:

1. **UI (`app/`, `src/components/`)**: Expo Router screens and reusable
   presentation components.
2. **Domain (`src/domain/`)**: Pure route rules, validation, time-window
   alerts, and summary calculations. These functions do not use React,
   storage, or timers.
3. **Store (`src/store/`)**: Zustand state, persisted route/auth/settings
   state, and the bridge between UI actions and domain rules.
4. **Sync (`src/sync/`)**: A local mock server and `SyncEngine` for action
   queuing, persistence, ordering, retry backoff, offline behavior, and
   request deduplication.

### Why Zustand

Zustand provides a small state model with direct selectors, which suits this
demo's route-wide state without introducing reducers and action boilerplate.
Its persist middleware integrates with AsyncStorage so auth, route progress,
settings, and the queue can survive an app restart. Business rules remain
outside the store, so they can be tested independently from React Native.

## Folder map

```text
app/
  index.tsx             Hydration-aware entry redirect
  login.tsx             Demo agent sign-in
  (tabs)/route.tsx      Searchable and filterable route
  (tabs)/summary.tsx    Metrics and unsynchronized actions
  (tabs)/settings.tsx   Demo clock, offline mode, reset, sign-out
  (tabs)/about.tsx      App metadata and AI disclosure
  stop/[id].tsx         Stop details and workflow actions
src/
  components/           Stop cards, status chips, sync badges, offline banner
  data/                 Seed route and route loading/validation
  domain/               Types, workflow rules, time windows, summaries
  store/                Zustand state and AsyncStorage adapter
  sync/                 Mock server and synchronization engine
  utils/                Request ID generation
__tests__/
  *.test.ts             Domain, route-data, summary, mock-server, and sync tests
```

## Known limitations

- Authentication is demo-only; there is no real identity provider, token
  handling, authorization model, or server-side session.
- The backend is a local mock server. There is no real API, database,
  multi-agent coordination, server-side conflict resolution, or telemetry.
- Offline mode is a controlled simulation, not operating-system connectivity
  detection.
- Route data is a static 12-stop fixture; there is no live dispatch, GPS,
  maps, navigation, geocoding, barcode scanning, or push notification support.
- Sync runs while the app process is alive. Persisted actions resume on the
  next launch, but there is no native background transfer service.
- AsyncStorage is appropriate for this demo but not a production-scale
  action ledger.
- The current mock-server timing and failure behavior is intended for testing,
  not as a production service-level guarantee.
- The success rate is
  `Delivered / (Delivered + Failed + Returned) * 100`; it is zero when there
  are no outcome stops.
- The on-time rate is on-time Delivered stops divided by all Delivered stops;
  a delivery is on time when its demo-clock time is at or before the window
  end. It is zero when there are no delivered stops.
- The delivery undo boundary is strict: exactly 60,000 milliseconds elapsed is
  rejected.
- The optimistic stop and queue update is written as one Zustand snapshot,
  reducing the crash window. AsyncStorage still writes asynchronously, so a
  process crash or storage failure during the write window cannot be eliminated
  completely.

## AI usage disclosure

I took help from an AI coding assistant for: scaffolding, the domain rules, the sync engine, the store, the UI and the tests, plus review and documentation drafts. I made the product decisions (status model, undo exception, offline auto-resume and others in DECISIONS.md), reviewed the output, ran the automated tests, and fixed issues. Device-only checks are documented separately and are not claimed here unless observed.
