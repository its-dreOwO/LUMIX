# LUMIX — Claude Code Context

Always read these two files at the start of each session before doing anything:
- [`memory/overview.md`](memory/overview.md) — current architecture snapshot
- [`memory/todo.md`](memory/todo.md) — what's pending and what's done

At the **end of every session**, update:
1. `memory/overview.md` if architecture changed
2. `memory/sessions/YYYY-MM-DD-<slug>.md` — new session log
3. `memory/decisions.md` — any non-obvious technical choices made
4. `memory/todo.md` — check off completed items, add new ones
5. `memory/known-issues.md` — bugs noticed but not fixed

---

## Project summary

LUMIX is a personal Android AI assistant app (Samsung, Android 16) built with **React Native + Expo SDK 52**.

Two screens: **NEXUS** (orb-based AI chat) and **DASHBOARD** (weather, calendar, notes).

AI is powered by **Gemma 3n E4B** running fully on-device via a custom native Expo module wrapping MediaPipe `LlmInference`. No cloud LLM calls.

---

## Key architectural rules

- The AI backend is always accessed through `src/ai/LLMProvider.ts` interface — never call native modules directly from UI.
- Storage is always accessed through repository classes in `src/storage/` — never call `expo-sqlite` directly from components.
- Feature folders live in `src/features/<name>/` — one per screen or major area. New features get their own folder.
- `src/theme/` holds all design tokens. No raw hex strings in components — always import from theme.
- The `modules/lumix-llm/` native module is Android-only. Guard all calls with `Platform.OS === 'android'`.

---

## Design reference

The original prototype lives in [`project/LUMIX.html`](project/LUMIX.html) and [`project/app.jsx`](project/app.jsx). It is **read-only** — never modify it. When implementing UI, match the visual output pixel-perfectly. All dimensions, colors, and animations are in that file.

---

## Running the app

```bash
# Install deps (first time)
npm install

# Start dev server (requires dev client APK on phone)
npx expo start --dev-client

# Build development APK for phone
eas build --profile development --platform android

# Build installable preview APK
eas build --profile preview --platform android
```

## Model side-loading (first run on phone)

1. Download `gemma-3n-e4b-it-gpu-int8.task` from HuggingFace (see `memory/decisions.md`).
2. Copy to `/sdcard/Download/lumix/` on the phone via USB.
3. On first launch, the app's model-loader screen will copy it to internal storage.
