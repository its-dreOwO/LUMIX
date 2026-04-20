import { useEffect } from 'react';
import { router } from 'expo-router';
import { modelReady } from '@/ai';
import { NexusScreen } from '@/features/nexus/NexusScreen';

export default function Index() {
  useEffect(() => {
    if (!modelReady) {
      router.replace('/setup');
    }
  }, []);

  if (!modelReady) {
    return null;
  }

  return <NexusScreen />;
}
