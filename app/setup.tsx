import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { loadModel, markModelReady } from '@/ai';
import { lumixLLMAvailable } from '../modules/lumix-llm';
import { colors } from '@/theme/colors';
import { fonts, fontSizes } from '@/theme/typography';
import { useLLMStore } from '@/state/llmStore';

export const MODEL_PATH_KEY = 'lumix_model_path';
const SOURCE_DIR = 'file:///sdcard/Download/lumix/';
const DEST_DIR = (FileSystem.documentDirectory ?? '') + 'models/';
const MODEL_FILENAMES = [
  'gemma-3n-E4B-it-int4.task',
  'gemma-3n-e4b-it-gpu-int8.task',
];

export default function SetupScreen() {
  const [status, setStatus] = useState('Checking model…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    run();
  }, []);

  async function run() {
    const store = useLLMStore.getState();

    // Before the lumixLLMAvailable check: setStatus('searching')
    store.setStatus('searching');

    // Mock / non-Android: skip setup
    if (!lumixLLMAvailable) {
      store.setStatus('unavailable');
      markModelReady();
      router.replace('/');
      return;
    }

    try {
      // Already copied in a previous launch?
      const stored = await SecureStore.getItemAsync(MODEL_PATH_KEY);
      if (stored) {
        const info = await FileSystem.getInfoAsync(stored);
        if (info.exists) {
          const storedName = stored.split('/').pop()?.replace('.task', '') ?? 'model';
          store.setModelName(storedName);
          setStatus('Loading model…');
          store.setStatus('loading');
          await loadModel(stored);
          markModelReady();
          store.setStatus('ready');
          router.replace('/');
          return;
        }
      }

      // Find model file in Download folder
      // When searching Download folder: status already 'searching'
      setStatus('Looking for model file…');
      let sourceUri: string | null = null;
      for (const name of MODEL_FILENAMES) {
        const uri = SOURCE_DIR + name;
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists) {
          sourceUri = uri;
          break;
        }
      }

      if (!sourceUri) {
        setError(
          'Model file not found.\n\nDownload a Gemma 3n E4B .task file and copy it to your phone at:\n\n/sdcard/Download/lumix/\n\nThen restart the app.'
        );
        return;
      }

      // Copy to internal app storage
      await FileSystem.makeDirectoryAsync(DEST_DIR, { intermediates: true });
      const filenameWithExt = sourceUri.split('/').pop()!;
      const destPath = DEST_DIR + filenameWithExt;

      // When copying: setStatus('copying'), and setModelName with the filename (strip path and .task extension)
      setStatus('Copying model to app storage…\nThis takes about a minute.');
      store.setStatus('copying');
      store.setModelName(filenameWithExt.replace('.task', ''));

      await FileSystem.copyAsync({ from: sourceUri, to: destPath });

      // Persist the path so next launch skips the copy
      await SecureStore.setItemAsync(MODEL_PATH_KEY, destPath);

      // After copy before load: setStatus('loading')
      setStatus('Loading model…');
      store.setStatus('loading');
      await loadModel(destPath);
      markModelReady();
      // On success: setStatus('ready')
      store.setStatus('ready');
      router.replace('/');
    } catch (e: any) {
      // On error: setStatus('error')
      store.setStatus('error');
      setError(e?.message ?? 'Setup failed. Check that the model file is accessible and try again.');
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
        </>
      )}
    </View>
  );
}

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
  error: {
    fontFamily: fonts.body,
    fontSize: fontSizes.lg,
    color: '#FF6B6B',
    textAlign: 'center',
    lineHeight: 22,
  },
});
