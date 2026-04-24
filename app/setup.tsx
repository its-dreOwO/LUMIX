import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { loadModel, markModelReady } from '@/ai';
import { lumixLLMAvailable } from '../modules/lumix-llm';
import { colors } from '@/theme/colors';
import { fonts, fontSizes } from '@/theme/typography';
import { useLLMStore } from '@/state/llmStore';
import { requestNotificationPermission } from '@/services/ReminderService';
import { requestCalendarPermission } from '@/services/CalendarService';

/** Request permissions for tool connections silently after setup. */
async function bootstrapPermissions() {
  try {
    await requestNotificationPermission();
  } catch { /* non-fatal */ }
  try {
    await requestCalendarPermission();
  } catch { /* non-fatal */ }
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const MODEL_PATH_KEY = 'lumix_model_path';
const DOC_DIR = FileSystem.documentDirectory ?? '';
const DEST_DIR = (DOC_DIR.endsWith('/') ? DOC_DIR : DOC_DIR + '/') + 'models/';

/**
 * Filename patterns to accept, in priority order.
 * Any .litertlm file whose name contains one of these substrings counts.
 */
const MODEL_NAME_PATTERNS = [
  'gemma-4-E4B-it',
  'gemma-4-e4b-it',
  'gemma-4-E2B-it',
  'gemma-4-e2b-it',
  'gemma-4',  // catch-all for other gemma-4 variants
];

/**
 * Exact URIs to probe first (fast path — no directory listing).
 * Order: most likely locations first.
 */
const FAST_PATH_URIS: string[] = MODEL_NAME_PATTERNS.flatMap((pat) => [
  // Already in internal storage
  `${DEST_DIR}${pat}.litertlm`,
  // App-scoped external storage — always readable without special permissions
  `file:///sdcard/Android/data/com.lumix.app/files/models/${pat}.litertlm`,
  `file:///storage/emulated/0/Android/data/com.lumix.app/files/models/${pat}.litertlm`,
  // Shared Download folder (may be blocked by scoped storage on Android 13+)
  `file:///sdcard/Download/lumix/${pat}.litertlm`,
  `file:///sdcard/Download/LUMIX/${pat}.litertlm`,
  `file:///sdcard/Download/${pat}.litertlm`,
  `file:///storage/emulated/0/Download/lumix/${pat}.litertlm`,
  `file:///storage/emulated/0/Download/${pat}.litertlm`,
  `file:///sdcard/${pat}.litertlm`,
]);

/**
 * Directories to scan (listed for any .litertlm file) when fast paths miss.
 * Listed in order — first match wins.
 */
const SCAN_DIRS = [
  // App-scoped external storage — no permissions needed
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

/** Strip the file:// URI scheme — LlmInference.setModelPath() needs a raw FS path. */
function toFsPath(uri: string): string {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

/** Human-readable folder name for the scanning status line. */
function shortDir(uri: string): string {
  return uri.replace('file://', '').replace('/storage/emulated/0', '/sdcard');
}

function isGemmaModelFile(filename: string): boolean {
  if (!filename.endsWith('.litertlm')) return false;
  const lower = filename.toLowerCase();
  return lower.includes('gemma') || MODEL_NAME_PATTERNS.some((p) => filename.includes(p));
}

/**
 * Phase 1: probe a list of exact URIs without any directory listing.
 * Returns the first URI that exists, or null.
 */
async function fastProbe(): Promise<string | null> {
  for (const uri of FAST_PATH_URIS) {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      console.log(`Checking path ${uri} -> exists: ${info.exists}`);
      if (info.exists) return uri;
    } catch (err: any) {
      console.log(`Checking path ${uri} -> error: ${err.message}`);
      // permission denied or path doesn't exist — keep going
    }
  }
  return null;
}

/**
 * Phase 2: list each candidate directory and return the first .litertlm file
 * whose name matches a Gemma pattern. Calls onScanDir(dir) before each probe
 * so the UI can update.
 */
async function scanDirs(onScanDir: (dir: string) => void): Promise<string | null> {
  for (const dir of SCAN_DIRS) {
    onScanDir(dir);
    try {
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) continue;

      const entries = await FileSystem.readDirectoryAsync(dir);

      const tasks = entries.filter(isGemmaModelFile);
      if (tasks.length === 0) continue;

      // Sort so E2B comes before E4B (smaller model preferred if multiple exist)
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

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SetupScreen() {
  const [status, setStatus] = useState('Checking model…');
  const [subStatus, setSubStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    run();
  }, []);

  async function run() {
    const store = useLLMStore.getState();
    store.setStatus('searching');

    // Non-Android / no native module: skip setup entirely
    if (!lumixLLMAvailable) {
      store.setStatus('unavailable');
      markModelReady();
      bootstrapPermissions();
      router.replace('/');
      return;
    }

    try {
      // ── Step 1: use cached path from a previous launch ──────────────────
      const stored = await SecureStore.getItemAsync(MODEL_PATH_KEY);
      if (stored) {
        // Invalidate paths from the old MediaPipe .task format — LiteRT-LM needs .litertlm
        if (stored.endsWith('.task')) {
          await SecureStore.deleteItemAsync(MODEL_PATH_KEY);
        } else {
          const info = await FileSystem.getInfoAsync(stored);
          if (info.exists) {
            const storedName = stored.split('/').pop()?.replace('.litertlm', '') ?? 'model';
            store.setModelName(storedName);
            setStatus('Loading model…');
            setSubStatus(storedName);
            store.setStatus('loading');
            await loadModel(toFsPath(stored));
            markModelReady();
            store.setStatus('ready');
            router.replace('/');
            return;
          }
          // Cached path is stale — clear it and fall through to search
          await SecureStore.deleteItemAsync(MODEL_PATH_KEY);
        }
      }

      // ── Step 2: fast exact-path probes ──────────────────────────────────
      setStatus('Searching for model…');
      setSubStatus('checking known locations');
      let sourceUri = await fastProbe();

      // ── Step 3: directory scan ───────────────────────────────────────────
      if (!sourceUri) {
        sourceUri = await scanDirs((dir) => {
          setSubStatus(shortDir(dir));
        });
      }

      if (!sourceUri) {
        setError(
          'Model file not found.\n\n' +
          'LUMIX searched all common locations on your phone but could not find a Gemma 4 .litertlm file.\n\n' +
          'Place the file anywhere in:\n/sdcard/Download/\n\n' +
          'Expected filename:\ngemma-4-E2B-it.litertlm\n\nThen restart the app.'
        );
        store.setStatus('error');
        return;
      }

      // ── Step 4: copy to internal storage ────────────────────────────────
      await FileSystem.makeDirectoryAsync(DEST_DIR, { intermediates: true });
      const filenameWithExt = sourceUri.split('/').pop()!;
      const destPath = DEST_DIR + filenameWithExt;
      const modelName = filenameWithExt.replace('.litertlm', '');

      if (sourceUri !== destPath) {
        setStatus('Found: ' + filenameWithExt + '\nCopying to app storage…');
        setSubStatus('this takes about a minute');
        store.setStatus('copying');
        store.setModelName(modelName);
        await FileSystem.copyAsync({ from: sourceUri, to: destPath });
      } else {
        store.setModelName(modelName);
      }

      await SecureStore.setItemAsync(MODEL_PATH_KEY, destPath);

      // ── Step 5: load into LiteRT-LM ─────────────────────────────────────
      setStatus('Loading model…');
      setSubStatus(modelName);
      store.setStatus('loading');
      await loadModel(toFsPath(destPath));
      markModelReady();
      store.setStatus('ready');
      bootstrapPermissions();
      router.replace('/');
    } catch (e: any) {
      store.setStatus('error');
      setError(e?.message ?? 'Setup failed. Check storage permissions and try again.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LUMIX</Text>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <ActivityIndicator color={colors.cyan} size="large" style={styles.spinner} />
          <Text style={styles.status}>{status}</Text>
          {subStatus ? <Text style={styles.subStatus}>{subStatus}</Text> : null}
        </>
      )}
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
});
