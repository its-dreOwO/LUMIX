# LUMIX — Backlog

Checked = shipped. Unchecked = pending.

---

## Phase 0 — Scaffolding
- [x] Config files (package.json, app.json, tsconfig, babel, eas)
- [x] CLAUDE.md, README.md
- [x] memory/ system
- [x] Full folder structure + skeleton files
- [ ] npm install + verify no dep conflicts
- [ ] Init git, push to https://github.com/its-dreOwO/LUMIX

---

## Phase 1 — Theme + shared visuals
- [ ] Port `:root` tokens → `src/theme/colors.ts` (done at scaffold, verify against prototype)
- [ ] Load Space Grotesk, Inter, JetBrains Mono via `expo-font`
- [ ] `GlassCard` component (BlurView + border + shadow)
- [ ] `RaceBorder` component (SVG animated stroke-dash)
- [ ] `LiveDot` component (pulsing cyan dot)
- [ ] `ParticleField` — Skia port of prototype canvas particle system
- [ ] Status bar styling (dark content, transparent)

---

## Phase 2 — NEXUS screen
- [ ] Orb component (breathe + swirl animations via Reanimated)
- [ ] Greeting block with live clock (JetBrains Mono)
- [ ] Transcript FlatList (inverted, fade-mask top/bottom)
- [ ] MessageBubble (user + ai variants matching prototype)
- [ ] InputDock (text input + mic + send buttons)
- [ ] QuickSuggest chips (scrollable row)
- [ ] Wire `MockProvider` → test full UI flow without model
- [ ] Trigger `ParticleField.pulse()` on send + receive

---

## Phase 3 — Local LLM (Gemma 3n E4B)
- [ ] Create `modules/lumix-llm/` Expo native module skeleton
- [ ] Write `LumixLlmModule.kt` (load, generate, token events)
- [ ] Gradle: add `com.google.mediapipe:tasks-genai` dep
- [ ] `GemmaLocalProvider.ts` — AsyncIterable adapter over event stream
- [ ] Model loader screen (first-launch copy from /sdcard/)
- [ ] Build first dev APK with EAS, install on Samsung
- [ ] End-to-end: side-load model → chat response streams ✅
- [ ] Swap provider flag from Mock → Gemma via env var

---

## Phase 4 — Dashboard
- [ ] `OpenMeteoService` — fetch + parse WMO codes → condition string
- [ ] `LocationService` — coarse GPS, cached
- [ ] `WeatherCard` with sun/smog/cold variants
- [ ] `NotesRepository` + `NotesCard` (list + add/edit/delete)
- [ ] `EventsRepository` + `CalendarCard` (list + add/delete)
- [ ] `BriefingCard` — Gemma one-liners seeded by time + weather
- [ ] `TelemetryCard` — real battery (expo-battery) + network (expo-network) values

---

## Phase 5 — Polish + ship
- [ ] App icon + splash screen (orb design)
- [ ] EAS preview build → install via adb
- [ ] Smoke-test: cold start, no Metro, all features work standalone

---

## V2 backlog (deferred)
- [ ] Voice input (Whisper on-device / expo-speech)
- [ ] TTS (text-to-speech responses)
- [ ] Google Calendar sync
- [ ] Cloud sync for notes (Supabase drop-in via StorageProvider interface)
- [ ] iOS build
- [ ] Swap Gemma for larger model (LLMProvider interface already supports this)
- [ ] Multi-turn tool use from Gemma (weather lookup, note creation by voice)
- [ ] Notification support (daily briefing push)
