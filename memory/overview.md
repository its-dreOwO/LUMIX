# LUMIX — Architecture Overview

_Last updated: 2026-04-18 (bootstrap session)_

## What this app is

A personal Android AI assistant for Samsung (Android 16). Two screens:

- **NEXUS** — animated orb + streaming chat, powered by Gemma 3n E4B on-device
- **DASHBOARD** — real weather (Open-Meteo GPS), manual calendar events, local notes, telemetry (battery/network)

No cloud services. No account required after setup. Everything runs locally.

---

## Runtime

| Concern | Choice | Notes |
|---|---|---|
| Framework | Expo SDK 52, Expo Router v4 | Dev client required (native modules) |
| Target | Android only (Samsung, Android 16) | iOS deferred indefinitely |
| RN architecture | New Architecture (Fabric) | Enabled in app.json |

---

## AI layer (`src/ai/`)

All LLM access goes through the `LLMProvider` interface:

```ts
interface LLMProvider {
  isReady(): boolean;
  generate(prompt: string, opts?: GenerateOpts): AsyncIterable<string>;
}
```

Two implementations:
- `MockProvider` — instant canned replies, used during UI dev and on non-Android
- `GemmaLocalProvider` — wraps the `modules/lumix-llm` native module

Active provider is selected in `src/ai/index.ts` based on `EXPO_PUBLIC_USE_MOCK_LLM` env var and platform.

The native module (`modules/lumix-llm/`) wraps `com.google.mediapipe:tasks-genai` (`LlmInference`). It emits `LumixLLMToken` events for each token and `LumixLLMDone` when complete.

### Model file

`gemma-3n-e4b-it-gpu-int8.task` (~2 GB). Not bundled in APK. Side-loaded to `/sdcard/Download/lumix/` via USB, then copied to `FileSystem.documentDirectory + 'models/'` on first launch.

---

## Storage layer (`src/storage/`)

SQLite via `expo-sqlite`. Migrations in `src/storage/migrations/` (numbered SQL files, run in order on db open).

Repositories:
- `ChatRepository` — message history per session
- `NotesRepository` — user notes (title, body, created/updated timestamps)
- `EventsRepository` — calendar events (title, date, time, color)

Nothing outside `src/storage/` calls SQLite directly.

---

## Services (`src/services/`)

- `OpenMeteoService` — fetches current weather from `api.open-meteo.com` (no key). Maps WMO codes to condition strings.
- `LocationService` — `expo-location` wrapper, coarse accuracy, caches last known coord in SecureStore.

---

## UI

| Token source | File |
|---|---|
| Colors | `src/theme/colors.ts` |
| Typography | `src/theme/typography.ts` |
| Motion | `src/theme/motion.ts` |

Key shared components: `GlassCard`, `ParticleField` (Skia), `RaceBorder` (SVG), `LiveDot`.

Particle field is a Skia canvas matching the prototype's `#particles` canvas — grid of orbs with fluid drift, spring-return, and pulse shockwaves.

---

## State (`src/state/`)

Zustand. Two stores:
- `nexusStore` — chat messages, orb active state, input text
- `uiStore` — active tab, tweaks panel open, color palette

Persistent data (messages, notes, events) lives in repositories, not in stores.

---

## Feature folders (`src/features/`)

One folder per product area. Current:
- `nexus/` — orb, transcript, input dock, quick-suggest chips
- `dashboard/` — weather, calendar, notes, briefing, telemetry cards
- `tweaks/` — settings panel (palette, particle density)

New features get their own folder here.

---

## Folder tree (abbreviated)

```
LUMIX/
├── app/              Expo Router routes
├── src/
│   ├── ai/           LLM abstraction
│   ├── features/     Screen logic + components
│   ├── services/     External data (weather, location)
│   ├── storage/      SQLite repositories
│   ├── state/        Zustand stores
│   ├── theme/        Design tokens
│   └── components/   Shared UI primitives
├── modules/
│   └── lumix-llm/    Native MediaPipe bridge (Kotlin)
├── assets/           Fonts, icons (no model files)
├── memory/           Session logs, decisions, backlog
└── project/          Original design handoff (read-only)
```
