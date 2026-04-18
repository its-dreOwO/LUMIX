# Architecture Decisions

Format: `YYYY-MM-DD | Decision | Context | Why`

---

## 2026-04-18 | Use Expo SDK 52 + expo-router v4 over bare React Native

**Context:** Starting the project fresh from a web prototype.
**Choice:** Expo managed workflow with dev client (not bare).
**Why:** EAS builds give us a cloud-built APK without maintaining Android Studio build chains locally. Dev client unlocks native modules while keeping the Expo DX. expo-router gives file-based navigation — easy to add screens without touching a navigator config.

---

## 2026-04-18 | Gemma 3n E4B via MediaPipe, not llama.rn

**Context:** Need an on-device LLM for Android.
**Choice:** `com.google.mediapipe:tasks-genai` (`LlmInference`) wrapped in a custom Expo native module.
**Why:** MediaPipe is Google's official path for Gemma on Android and has first-party GPU acceleration (`.task` format). `llama.rn` (rnllama) does not support Gemma 3n's tokenizer as of April 2026. `react-native-executorch` is promising but immature for Gemma 3n specifically.

---

## 2026-04-18 | Side-load model file, don't bundle in APK

**Context:** Gemma 3n E4B `.task` file is ~2 GB.
**Choice:** Ship APK without model. First-launch screen copies from `/sdcard/Download/lumix/` to app's documentDirectory.
**Why:** Bundling would make EAS builds slow and APK huge. Side-loading keeps the APK small and lets us swap model versions without a rebuild. Path stored in SecureStore so subsequent launches skip the copy step.

---

## 2026-04-18 | Open-Meteo for weather (no API key)

**Context:** Need real weather data for the dashboard.
**Choice:** `api.open-meteo.com` — free, no key, WMO weather codes.
**Why:** Zero setup. No rate-limit concerns for a single-device personal app. Can swap to a richer provider (OpenWeatherMap, WeatherAPI) later by implementing a new `WeatherService` and updating `src/services/weather/index.ts`.

---

## 2026-04-18 | Zustand for UI state, SQLite repos for persistent state

**Context:** Need both transient UI state (orb animation mode, active tab) and durable data (chat history, notes, events).
**Choice:** Zustand stores hold only ephemeral UI state. All persistent data goes through repository classes backed by SQLite.
**Why:** Keeps the state boundary clear. SQLite data survives app restarts and is easy to migrate. Zustand is trivially swappable. Avoids the anti-pattern of storing server/DB data in a client store.

---

## 2026-04-18 | @shopify/react-native-skia for particle field

**Context:** The prototype uses an HTML5 canvas for the particle field (fluid grid + pulse shockwaves).
**Choice:** Reimplement with Skia (`@shopify/react-native-skia`).
**Why:** Skia is the only cross-platform canvas-equivalent in React Native with GPU acceleration. The particle algorithm is a straight port — same grid math, same physics, but drawn with Skia `Path` + `RadialGradient` instead of `CanvasRenderingContext2D`.
