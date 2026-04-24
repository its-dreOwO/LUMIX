import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { loadModel, markModelReady } from '@/ai';
import { lumixLLMAvailable } from '../modules/lumix-llm';
import { colors } from '@/theme/colors';
import { fonts, fontSizes } from '@/theme/typography';
import { useLLMStore } from '@/state/llmStore';
import { requestNotificationPermission } from '@/services/ReminderService';
import { requestCalendarPermission } from '@/services/CalendarService';

/** Request permissions for tool connections silently after setup. */
async function bootstrapPermissions() {
  try { await requestNotificationPermission(); } catch { /* non-fatal */ }
  try { await requestCalendarPermission(); } catch { /* non-fatal */ }
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const MODEL_PATH_KEY = 'lumix_model_path';
const DOC_DIR = FileSystem.documentDirectory ?? '';
const DEST_DIR = (DOC_DIR.endsWith('/') ? DOC_DIR : DOC_DIR + '/') + 'models/';

/** Auto-download source — public Apache-2.0 repo, no token needed. */
const MODEL_FILENAME = 'gemma-4-E2B-it.litertlm';
const MODEL_DEST = DEST_DIR + MODEL_FILENAME;
const MODEL_SIZE_BYTES = 2_583_085_056; // 2.58 GB confirmed from HF API
const MODEL_DOWNLOAD_URL =
  'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it.litertlm';

const DOWNLOAD_RESUME_KEY = 'lumix_download_resume';

/**
 * Filename patterns to accept when scanning, in priority order.
 * Any .litertlm file whose name contains one of these substrings counts.
 */
const MODEL_NAME_PATTERNS = [
  'gemma-4-E2B-it',
  'gemma-4-e2b-it',
  'gemma-4-E4B-it',
  'gemma-4-e4b-it',
  'gemma-4',  // catch-all for other gemma-4 variants
];

/**
 * Exact URIs to probe first (fast path — no directory listing).
 * Order: most likely locations first.
 */
const FAST_PATH_URIS: string[] = MODEL_NAME_PATTERNS.flatMap((pat) => [
  `${DEST_DIR}${pat}.litertlm`,
  `file:///sdcard/Android/data/com.lumix.app/files/models/${pat}.litertlm`,
  `file:///storage/emulated/0/Android/data/com.lumix.app/files/models/${pat}.litertlm`,
  `file:///sdcard/Download/lumix/${pat}.litertlm`,
  `file:///sdcard/Download/LUMIX/${pat}.litertlm`,
  `file:///sdcard/Download/${pat}.litertlm`,
  `file:///storage/emulated/0/Download/lumix/${pat}.litertlm`,
  `file:///storage/emulated/0/Download/${pat}.litertlm`,
  `file:///sdcard/${pat}.litertlm`,
]);

/**
 * Directories to scan (listed for any .litertlm file) when fast paths miss.
 */
const SCAN_DIRS = [
  'file:///sdcard/Android/data/com.lumix.app/files/models/',
  'file:///sdcard/Android/data/com.lumix.app/files/',
  'file:///sdcard/Download/',
  'file:///sdcard/Download/lumix/',
  'file:///sdcard/Download/LUMIX/',
  'file:///storage/emulated/0/Download/',
  'file:///storage/emulated/0/Download/lumix/',
  'file:///sdcard/Documents/',
  'file:///sdcard/',
  'file:///storage/emulated/0/',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toFsPath(uri: string): string {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

function shortDir(uri: string): string {
  return uri.replace('file://', '').replace('/storage/emulated/0', '/sdcard');
}

function isGemmaModelFile(filename: string): boolean {
  if (!filename.endsWith('.litertlm')) return false;
  const lower = filename.toLowerCase();
  return lower.includes('gemma') || MODEL_NAME_PATTERNS.some((p) => filename.includes(p));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(0) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function formatSpeed(mbps: number): string {
  if (mbps <= 0) return '';
  if (mbps < 1) return (mbps * 1024).toFixed(0) + ' KB/s';
  return mbps.toFixed(1) + ' MB/s';
}

async function fastProbe(): Promise<string | null> {
  for (const uri of FAST_PATH_URIS) {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) return uri;
    } catch {
      // permission denied or path doesn't exist — keep going
    }
  }
  return null;
}

async function scanDirs(onScanDir: (dir: string) => void): Promise<string | null> {
  for (const dir of SCAN_DIRS) {
    onScanDir(dir);
    try {
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) continue;
      const entries = await FileSystem.readDirectoryAsync(dir);
      const tasks = entries.filter(isGemmaModelFile);
      if (tasks.length === 0) continue;
      // Sort so E2B comes before E4B (smaller model preferred)
      tasks.sort((a, b) => {
        const aE2b = a.toLowerCase().includes('e2b') ? 0 : 1;
        const bE2b = b.toLowerCase().includes('e2b') ? 0 : 1;
        return aE2b - bE2b;
      });
      return dir + tasks[0];
    } catch {
      // no read permission for this dir — skip
    }
  }
  return null;
}

// ─── Phase type ──────────────────────────────────────────────────────────────

type Phase =
  | 'checking'      // initial search
  | 'needs-download'// model not found, show download button
  | 'downloading'   // actively downloading
  | 'paused'        // download paused, can resume
  | 'copying'       // copying from external storage
  | 'loading'       // loading model into LiteRT-LM
  | 'error';        // terminal error

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SetupScreen() {
  const [phase, setPhase] = useState<Phase>('checking');
  const [statusText, setStatusText] = useState('Checking model…');
  const [subText, setSubText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Download progress
  const [dlWritten, setDlWritten] = useState(0);
  const [dlTotal, setDlTotal] = useState(MODEL_SIZE_BYTES);
  const [dlSpeed, setDlSpeed] = useState(0);

  const downloadRef = useRef<FileSystem.DownloadResumable | null>(null);
  const isPausingRef = useRef(false);
  const lastProgressRef = useRef({ bytes: 0, time: Date.now() });

  useEffect(() => { run(); }, []);

  // ── Initial search ────────────────────────────────────────────────────────

  async function run() {
    const store = useLLMStore.getState();
    store.setStatus('searching');

    if (!lumixLLMAvailable) {
      store.setStatus('unavailable');
      markModelReady();
      bootstrapPermissions();
      router.replace('/');
      return;
    }

    try {
      // Step 1: use cached path from a previous launch
      const stored = await SecureStore.getItemAsync(MODEL_PATH_KEY);
      if (stored) {
        if (stored.endsWith('.task')) {
          await SecureStore.deleteItemAsync(MODEL_PATH_KEY);
        } else {
          const info = await FileSystem.getInfoAsync(stored);
          if (info.exists) {
            const storedName = stored.split('/').pop()?.replace('.litertlm', '') ?? 'model';
            store.setModelName(storedName);
            setStatusText('Loading model…');
            setSubText(storedName);
            setPhase('loading');
            store.setStatus('loading');
            await loadModel(toFsPath(stored));
            markModelReady();
            store.setStatus('ready');
            router.replace('/');
            return;
          }
          await SecureStore.deleteItemAsync(MODEL_PATH_KEY);
        }
      }

      // Step 2: fast exact-path probes
      setStatusText('Searching for model…');
      setSubText('checking known locations');
      let sourceUri = await fastProbe();

      // Step 3: directory scan
      if (!sourceUri) {
        sourceUri = await scanDirs((dir) => setSubText(shortDir(dir)));
      }

      // Step 4: found locally — copy if needed, then load
      if (sourceUri) {
        await continueFromUri(sourceUri);
        return;
      }

      // Step 5: not found — check for a paused download to resume
      const savedResume = await SecureStore.getItemAsync(DOWNLOAD_RESUME_KEY);
      if (savedResume) {
        const partialInfo = await FileSystem.getInfoAsync(MODEL_DEST).catch(() => null);
        if (partialInfo?.exists && 'size' in partialInfo) {
          setDlWritten(partialInfo.size as number);
        }
        setPhase('paused');
      } else {
        setPhase('needs-download');
      }
    } catch (e: any) {
      store.setStatus('error');
      setError(e?.message ?? 'Setup failed. Check storage permissions and try again.');
      setPhase('error');
    }
  }

  // ── Copy + load a locally-found file ─────────────────────────────────────

  async function continueFromUri(sourceUri: string) {
    const store = useLLMStore.getState();
    await FileSystem.makeDirectoryAsync(DEST_DIR, { intermediates: true });
    const filenameWithExt = sourceUri.split('/').pop()!;
    const destPath = DEST_DIR + filenameWithExt;
    const modelName = filenameWithExt.replace('.litertlm', '');

    if (sourceUri !== destPath) {
      setStatusText('Found: ' + filenameWithExt + '\nCopying to app storage…');
      setSubText('this takes about a minute');
      setPhase('copying');
      store.setStatus('copying');
      store.setModelName(modelName);
      await FileSystem.copyAsync({ from: sourceUri, to: destPath });
    } else {
      store.setModelName(modelName);
    }

    await SecureStore.setItemAsync(MODEL_PATH_KEY, destPath);
    setStatusText('Loading model…');
    setSubText(modelName);
    setPhase('loading');
    store.setStatus('loading');
    await loadModel(toFsPath(destPath));
    markModelReady();
    store.setStatus('ready');
    bootstrapPermissions();
    router.replace('/');
  }

  // ── Download ──────────────────────────────────────────────────────────────

  const progressCallback = (data: FileSystem.DownloadProgressData) => {
    const written = data.totalBytesWritten;
    const total = data.totalBytesExpectedToWrite > 0
      ? data.totalBytesExpectedToWrite
      : MODEL_SIZE_BYTES;
    setDlWritten(written);
    setDlTotal(total);

    const now = Date.now();
    const elapsed = (now - lastProgressRef.current.time) / 1000;
    if (elapsed >= 1.5) {
      const delta = written - lastProgressRef.current.bytes;
      setDlSpeed(delta / elapsed / (1024 * 1024));
      lastProgressRef.current = { bytes: written, time: now };
    }
  };

  async function startDownload() {
    setError(null);

    // Free space check
    try {
      const free = await FileSystem.getFreeDiskStorageAsync();
      if (free < MODEL_SIZE_BYTES * 1.05) {
        setError(
          `Not enough storage.\nNeed ~2.6 GB free, found ${formatBytes(free)} available.\n` +
          'Free up space and try again.'
        );
        return;
      }
    } catch { /* non-fatal — proceed anyway */ }

    isPausingRef.current = false;
    setPhase('downloading');
    setDlWritten(0);
    setDlTotal(MODEL_SIZE_BYTES);
    setDlSpeed(0);
    lastProgressRef.current = { bytes: 0, time: Date.now() };

    await FileSystem.makeDirectoryAsync(DEST_DIR, { intermediates: true });

    // Remove any stale partial file so we start clean
    await FileSystem.deleteAsync(MODEL_DEST, { idempotent: true }).catch(() => {});

    await activateKeepAwakeAsync();

    const dl = FileSystem.createDownloadResumable(
      MODEL_DOWNLOAD_URL,
      MODEL_DEST,
      {},
      progressCallback,
    );
    downloadRef.current = dl;

    try {
      const result = await dl.downloadAsync();
      await deactivateKeepAwake();

      if (!result) {
        // Returned undefined → task was cancelled (pause path handles this)
        if (!isPausingRef.current) setPhase('needs-download');
        return;
      }

      if (result.status !== 200) {
        setError(`Download failed (HTTP ${result.status}). Check your connection and try again.`);
        setPhase('needs-download');
        await FileSystem.deleteAsync(MODEL_DEST, { idempotent: true }).catch(() => {});
        return;
      }

      await onDownloadComplete();
    } catch (e: any) {
      await deactivateKeepAwake();
      if (!isPausingRef.current) {
        setError(e?.message ?? 'Download failed. Check your connection and try again.');
        setPhase('needs-download');
      }
    }
  }

  async function pauseDownload() {
    const dl = downloadRef.current;
    if (!dl) return;
    isPausingRef.current = true;
    try {
      const state = await dl.pauseAsync();
      await SecureStore.setItemAsync(DOWNLOAD_RESUME_KEY, JSON.stringify(state));
      await deactivateKeepAwake();
      setPhase('paused');
    } catch (e: any) {
      console.warn('[setup] pause failed:', e.message);
      isPausingRef.current = false;
    }
  }

  async function resumeDownload() {
    const savedJson = await SecureStore.getItemAsync(DOWNLOAD_RESUME_KEY);
    if (!savedJson) { setPhase('needs-download'); return; }

    setError(null);
    isPausingRef.current = false;
    setPhase('downloading');
    lastProgressRef.current = { bytes: dlWritten, time: Date.now() };

    await activateKeepAwakeAsync();

    try {
      const saved = JSON.parse(savedJson);
      const dl = FileSystem.createDownloadResumable(
        saved.url,
        saved.fileUri,
        saved.options ?? {},
        progressCallback,
        saved.resumeData,
      );
      downloadRef.current = dl;

      const result = await dl.downloadAsync();
      await deactivateKeepAwake();
      await SecureStore.deleteItemAsync(DOWNLOAD_RESUME_KEY);

      if (!result) {
        if (!isPausingRef.current) setPhase('paused');
        return;
      }

      if (result.status !== 200) {
        // Likely expired LFS URL — wipe state and let user restart
        await FileSystem.deleteAsync(MODEL_DEST, { idempotent: true }).catch(() => {});
        setDlWritten(0);
        setError(`Resume failed (HTTP ${result.status}). Tap Download to start over.`);
        setPhase('needs-download');
        return;
      }

      await onDownloadComplete();
    } catch (e: any) {
      await deactivateKeepAwake();
      if (!isPausingRef.current) {
        await SecureStore.deleteItemAsync(DOWNLOAD_RESUME_KEY);
        await FileSystem.deleteAsync(MODEL_DEST, { idempotent: true }).catch(() => {});
        setDlWritten(0);
        setError('Resume failed. Tap Download to start over.');
        setPhase('needs-download');
      }
    }
  }

  async function cancelDownload() {
    isPausingRef.current = true;
    downloadRef.current = null;
    await deactivateKeepAwake();
    await SecureStore.deleteItemAsync(DOWNLOAD_RESUME_KEY);
    await FileSystem.deleteAsync(MODEL_DEST, { idempotent: true }).catch(() => {});
    setDlWritten(0);
    setDlSpeed(0);
    setPhase('needs-download');
  }

  async function onDownloadComplete() {
    const store = useLLMStore.getState();
    await SecureStore.setItemAsync(MODEL_PATH_KEY, MODEL_DEST);
    store.setModelName(MODEL_FILENAME.replace('.litertlm', ''));
    setPhase('loading');
    setStatusText('Loading model…');
    store.setStatus('loading');
    await loadModel(toFsPath(MODEL_DEST));
    markModelReady();
    store.setStatus('ready');
    bootstrapPermissions();
    router.replace('/');
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const pct = dlTotal > 0 ? Math.min(dlWritten / dlTotal, 1) : 0;
  const speedStr = formatSpeed(dlSpeed);

  // Download card — needs-download or paused
  if (phase === 'needs-download' || phase === 'paused') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>LUMIX</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {phase === 'paused' ? 'Download paused' : 'AI model required'}
          </Text>
          <Text style={styles.cardBody}>
            {phase === 'paused'
              ? `${formatBytes(dlWritten)} of ${formatBytes(dlTotal)} downloaded`
              : `gemma-4-E2B-it (~2.6 GB) will be downloaded\nto your device once.`}
          </Text>

          {error ? <Text style={styles.inlineError}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.btnPressed]}
            onPress={phase === 'paused' ? resumeDownload : startDownload}
          >
            <Text style={styles.btnText}>
              {phase === 'paused' ? '▶  Resume' : '↓  Download'}
            </Text>
          </Pressable>

          {phase === 'paused' && (
            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && styles.btnPressed]}
              onPress={cancelDownload}
            >
              <Text style={[styles.btnText, styles.btnTextMuted]}>✕  Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // Active download — progress bar
  if (phase === 'downloading') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>LUMIX</Text>

        <Text style={styles.status}>Downloading model</Text>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(pct * 100).toFixed(1)}%` as any }]} />
        </View>

        <Text style={styles.progressPct}>{(pct * 100).toFixed(0)}%</Text>

        <Text style={styles.subStatus}>
          {formatBytes(dlWritten)} / {formatBytes(dlTotal)}
          {speedStr ? `  ·  ${speedStr}` : ''}
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.btn, styles.btnSecondary, styles.btnNarrow, pressed && styles.btnPressed,
          ]}
          onPress={pauseDownload}
        >
          <Text style={[styles.btnText, styles.btnTextMuted]}>⏸  Pause</Text>
        </Pressable>
      </View>
    );
  }

  // Terminal error
  if (phase === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>LUMIX</Text>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  // Default — spinner (checking / copying / loading)
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LUMIX</Text>
      <ActivityIndicator color={colors.cyan} size="large" style={styles.spinner} />
      <Text style={styles.status}>{statusText}</Text>
      {subText ? <Text style={styles.subStatus}>{subText}</Text> : null}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes['3xl'],
    letterSpacing: 10,
    color: colors.textPrimary,
    marginBottom: 48,
  },
  spinner: {
    marginBottom: 24,
  },
  status: {
    fontFamily: fonts.body,
    fontSize: fontSizes.lg,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  subStatus: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.sm,
    color: colors.cyan,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: '#FF6B6B',
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Download card ──────────────────────────────────────────────────────────
  card: {
    width: '100%',
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  inlineError: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: '#FF6B6B',
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Buttons ────────────────────────────────────────────────────────────────
  btn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  btnNarrow: {
    width: 140,
    marginTop: 20,
  },
  btnPrimary: {
    backgroundColor: colors.cyan,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.glassBorderStrong,
  },
  btnPressed: {
    opacity: 0.7,
  },
  btnText: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.base,
    color: colors.bg0,
    letterSpacing: 1,
  },
  btnTextMuted: {
    color: colors.textMuted,
  },

  // ── Progress ───────────────────────────────────────────────────────────────
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.glassBorder,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.cyan,
    borderRadius: 2,
  },
  progressPct: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes['2xl'],
    color: colors.textPrimary,
    marginTop: 12,
  },
});
