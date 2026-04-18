import React, { createContext, useContext, type RefObject } from 'react';
import type { ParticleFieldRef } from '@/components/ParticleField';

const ParticleContext = createContext<RefObject<ParticleFieldRef> | null>(null);

export const ParticleProvider = ParticleContext.Provider;

export function useParticleRef() {
  return useContext(ParticleContext);
}
