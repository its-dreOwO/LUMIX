/**
 * ParticleField — Skia port of the particle canvas in project/LUMIX.html
 *
 * Architecture:
 *  - Particle state stored in a Reanimated SharedValue (flat parallel arrays)
 *  - useFrameCallback drives physics entirely on the UI thread (60 fps, no JS bridge)
 *  - useDerivedValue renders the scene via Skia PictureRecorder (Immediate Mode)
 *  - pulse() is exposed via ref for external trigger (send/receive events)
 */

import React, {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useCallback,
} from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, Picture, Skia } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  useFrameCallback,
  runOnUI,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParticleState {
  // Position & velocity
  x: number[];
  y: number[];
  vx: number[];
  vy: number[];
  // Home grid position (spring target)
  hx: number[];
  hy: number[];
  // Visual
  r: number[];       // radius
  alpha: number[];   // base opacity
  hue: number[];     // 0 = cyan, 1 = violet
  // Phase noise
  phase: number[];
  phaseSpeed: number[];
  // Per-orb drift
  driftAngle: number[];
  driftStrength: number[];
  count: number;
}

interface PulseState {
  x: number[];
  y: number[];
  r: number[];       // current radius
  life: number[];    // 0→1
  count: number;
}

export interface ParticleFieldRef {
  pulse: (x: number, y: number) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GRID_SPACING = 28;   // px between particle home positions
const MAX_PULSES = 8;
const PULSE_MAX_RADIUS = 400;
const CYAN = colors.cyan;     // '#00F0FF'
const VIOLET = colors.violet; // '#8A2BE2'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand() { 'worklet'; return Math.random(); }

function createParticles(W: number, H: number, DPR: number): ParticleState {
  'worklet';
  const spacing = GRID_SPACING * DPR;
  const cols = Math.ceil(W / spacing) + 2;
  const rows = Math.ceil(H / spacing) + 2;
  const count = cols * rows;

  const x: number[] = [];
  const y: number[] = [];
  const vx: number[] = [];
  const vy: number[] = [];
  const hx: number[] = [];
  const hy: number[] = [];
  const r: number[] = [];
  const alpha: number[] = [];
  const hue: number[] = [];
  const phase: number[] = [];
  const phaseSpeed: number[] = [];
  const driftAngle: number[] = [];
  const driftStrength: number[] = [];

  for (let i = -1; i < cols - 1; i++) {
    for (let j = -1; j < rows - 1; j++) {
      const hxVal = i * spacing + spacing / 2;
      const hyVal = j * spacing + spacing / 2;
      hx.push(hxVal);
      hy.push(hyVal);
      x.push(hxVal + (Math.random() - 0.5) * spacing * 0.4);
      y.push(hyVal + (Math.random() - 0.5) * spacing * 0.4);
      vx.push(0);
      vy.push(0);
      r.push((Math.random() * 0.7 + 0.45) * DPR);
      alpha.push(Math.random() * 0.25 + 0.25);
      hue.push((i + j) % 2 === 0 ? 0 : 1);
      phase.push(Math.random() * Math.PI * 2);
      phaseSpeed.push(0.003 + Math.random() * 0.004);
      driftAngle.push(Math.random() * Math.PI * 2);
      driftStrength.push(0.3 + Math.random() * 0.5);
    }
  }

  return { x, y, vx, vy, hx, hy, r, alpha, hue, phase, phaseSpeed, driftAngle, driftStrength, count };
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ParticleField = forwardRef<ParticleFieldRef>(function ParticleField(_, ref) {
  const { width, height } = useWindowDimensions();
  const DPR = 1; // keep at 1 for perf; particles are already dense

  const W = width;
  const H = height;

  // Particle state on UI thread
  const particles = useSharedValue<ParticleState | null>(null);
  const pulses = useSharedValue<PulseState>({
    x: [], y: [], r: [], life: [], count: 0,
  });
  const t = useSharedValue(0);

  // Init particles when dimensions are known
  useEffect(() => {
    if (W > 0 && H > 0) {
      runOnUI(() => {
        'worklet';
        particles.value = createParticles(W, H, DPR);
      })();
    }
  }, [W, H]);

  // Expose pulse() to parent
  useImperativeHandle(ref, () => ({
    pulse: (px: number, py: number) => {
      runOnUI(() => {
        'worklet';
        const p = pulses.value;
        if (p.count >= MAX_PULSES) return;
        p.x.push(px * DPR);
        p.y.push(py * DPR);
        p.r.push(20 * DPR);
        p.life.push(0);
        pulses.value = { ...p, count: p.count + 1 };
      })();
    },
  }));

  // Physics loop — runs entirely on UI thread at display frame rate
  useFrameCallback(() => {
    'worklet';
    const ps = particles.value;
    if (!ps) return;

    t.value += 0.006;
    const tv = t.value;

    // Global fluid current
    const currentAngle = Math.sin(tv * 0.2) * Math.PI + tv * 0.15;
    const currentMag = (0.25 + Math.sin(tv * 0.1) * 0.1) * DPR;
    const flowX = Math.cos(currentAngle) * currentMag;
    const flowY = Math.sin(currentAngle) * currentMag;

    // Update pulses
    const pu = pulses.value;
    const aliveIdxs: number[] = [];
    for (let i = 0; i < pu.count; i++) {
      pu.life[i] += 0.012;
      pu.r[i] = 20 * DPR + (PULSE_MAX_RADIUS * DPR - 20 * DPR) * pu.life[i];
      if (pu.life[i] < 1) aliveIdxs.push(i);
    }
    if (aliveIdxs.length !== pu.count) {
      pulses.value = {
        x: aliveIdxs.map((i) => pu.x[i]),
        y: aliveIdxs.map((i) => pu.y[i]),
        r: aliveIdxs.map((i) => pu.r[i]),
        life: aliveIdxs.map((i) => pu.life[i]),
        count: aliveIdxs.length,
      };
    }

    const n = ps.count;
    for (let i = 0; i < n; i++) {
      ps.phase[i] += ps.phaseSpeed[i];
      ps.driftAngle[i] += Math.sin(tv * 0.3 + ps.phase[i]) * 0.006;

      const driftX = Math.cos(ps.driftAngle[i]) * ps.driftStrength[i] * 0.25 * DPR;
      const driftY = Math.sin(ps.driftAngle[i]) * ps.driftStrength[i] * 0.25 * DPR;

      // Spring toward home
      const dx = ps.hx[i] - ps.x[i];
      const dy = ps.hy[i] - ps.y[i];
      ps.vx[i] += dx * 0.0025;
      ps.vy[i] += dy * 0.0025;

      // Fluid forces
      ps.vx[i] += (driftX + flowX) * 0.05;
      ps.vy[i] += (driftY + flowY) * 0.05;

      // Pulse dispersal
      const puv = pulses.value;
      for (let pi = 0; pi < puv.count; pi++) {
        const pdx = ps.x[i] - puv.x[pi];
        const pdy = ps.y[i] - puv.y[pi];
        const dist = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
        const ringDist = Math.abs(dist - puv.r[pi]);
        if (ringDist < 80 * DPR) {
          const strength = (1 - puv.life[pi]) * (1 - ringDist / (80 * DPR)) * 4;
          ps.vx[i] += (pdx / dist) * strength;
          ps.vy[i] += (pdy / dist) * strength;
        }
      }

      // Damping
      ps.vx[i] *= 0.92;
      ps.vy[i] *= 0.92;
      ps.x[i] += ps.vx[i];
      ps.y[i] += ps.vy[i];
    }

    // Trigger re-render by writing a new reference
    particles.value = { ...ps };
  });

  // ─── Draw ────────────────────────────────────────────────────────────────

  const recorder = Skia.PictureRecorder();
  const dotPaint = Skia.Paint();
  const glowPaint = Skia.Paint();

  const picture = useDerivedValue(() => {
    'worklet';
    const ps = particles.value;
    if (!ps) return recorder.finishRecordingAsPicture?.() ?? null;

    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, W, H));

    for (let i = 0; i < ps.count; i++) {
      const px = ps.x[i];
      const py = ps.y[i];
      const pr = ps.r[i];
      const breath = 0.75 + 0.25 * Math.sin(ps.phase[i] * 2);
      const a = ps.alpha[i] * breath;
      const glowR = pr * 5;

      const hexColor = ps.hue[i] === 0 ? CYAN : VIOLET;

      // Glow halo
      const alphaHex = Math.floor(Math.min(a * 140, 255)).toString(16).padStart(2, '0');
      glowPaint.setColor(Skia.Color(hexColor + alphaHex));
      glowPaint.setAlphaf(a * 0.55);
      canvas.drawCircle(px, py, glowR, glowPaint);

      // Core dot
      dotPaint.setColor(Skia.Color(hexColor));
      dotPaint.setAlphaf(Math.min(a * 1.8, 1));
      canvas.drawCircle(px, py, pr, dotPaint);
    }

    return recorder.finishRecordingAsPicture();
  });

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Picture picture={picture} />
    </Canvas>
  );
});
