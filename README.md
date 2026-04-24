# LUMIX

A personal AI assistant for Android — **NEXUS** (on-device Gemma chat) + **DASHBOARD** (real weather, calendar, notes).

Built with React Native + Expo SDK 52. Runs entirely offline after first setup.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Expo SDK 52 + Expo Router v4 |
| UI | React Native, Reanimated 3, Skia, react-native-svg |
| AI | Gemma 4 E2B on-device via LiteRT-LM (custom native module) |
| Storage | expo-sqlite (chat, notes, events) + expo-secure-store |
| Weather | Open-Meteo (no API key) |
| State | Zustand |

---

## Prerequisites

- Node.js ≥ 20
- JDK 17 (`winget install Microsoft.OpenJDK.17`)
- Android Studio + SDK Platform 34 + Build-Tools
- EAS CLI: `npm i -g eas-cli`
- Expo account: `eas login`

Environment variables:
- `ANDROID_HOME` → `%LOCALAPPDATA%\Android\Sdk`
- `JAVA_HOME` → JDK 17 dir
- Add `%ANDROID_HOME%\platform-tools` to `PATH`

---

## Setup

```bash
npm install
```

### Model (one-time)

1. Accept licence at https://huggingface.co/google/gemma-4-E2B-it-litert-prebuilt
2. Download `gemma-4-E2B-it.litertlm` (~1.7 GB)
3. With phone connected via USB: `adb push gemma-4-E2B-it.litertlm /sdcard/Download/`
4. First app launch copies it to internal storage automatically

---

## Dev workflow

```bash
# First time — build the dev client APK and install on phone
eas build --profile development --platform android
# then: adb install <downloaded.apk>

# Daily dev
npx expo start --dev-client

# Installable preview build (no Metro needed)
eas build --profile preview --platform android
```

---

## Project structure

```
app/          Expo Router routes (_layout, index=NEXUS, dashboard)
src/
  ai/         LLM interface + Gemma + Mock providers
  features/   nexus/ and dashboard/ screen logic
  services/   weather, location
  storage/    SQLite repositories
  state/      Zustand stores
  theme/      Colors, typography, motion tokens
  components/ Shared UI: GlassCard, ParticleField, RaceBorder, LiveDot
modules/
  lumix-llm/  Custom native Expo module — Gemma via MediaPipe
memory/       Session logs, architecture overview, decisions, backlog
project/      Original design handoff (read-only reference)
```

---

## Memory system

Every session ends with an update to `memory/`. See [`CLAUDE.md`](CLAUDE.md) for the full ritual.
