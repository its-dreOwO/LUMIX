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
} from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, Picture, Skia } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  useFrameCallback,
  runOnUI,
} from 'react-native-reanimated';

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
  setActive: (active: boolean) => void;
  setOrbOffset: (dy: number) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GRID_SPACING = 28;
const MAX_PULSES = 8;
const PULSE_MAX_RADIUS = 400;
const DOT_COLOR = '#E8F4FF'; // near-white with a faint cool tint

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
      x.push(hxVal + (Math.random() - 0.5) * spacing * 0.15);
      y.push(hyVal + (Math.random() - 0.5) * spacing * 0.15);
      vx.push(0);
      vy.push(0);
      r.push((Math.random() * 0.4 + 0.8) * DPR); // 0.8–1.2 px, uniform
      alpha.push(Math.random() * 0.3 + 0.55); // 0.55–0.85, brighter
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
  const activeMode = useSharedValue(0); // 0 = idle, 1 = active (faster waves)
  const prevActive = useSharedValue(0); 
  const orbYOffset = useSharedValue(0); // keyboard-driven orb translate (negative = up)

  const waves = useSharedValue<{
    // Linear mode — directional
    dirX: number[];
    dirY: number[];
    offset: number[];  // distance traveled along direction from screen center
    speed: number[];
    // Radial mode
    radius: number[];
    radialSpeed: number[];
  }>({
    dirX: [],
    dirY: [],
    offset: [],
    speed: [],
    radius: [],
    radialSpeed: [],
  });

  // Init particles when dimensions are known
  useEffect(() => {
    if (W > 0 && H > 0) {
      runOnUI(() => {
        'worklet';
        particles.value = createParticles(W, H, DPR);
        const baseAngles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6]; // 12, 4, 8 o'clock
        const maxOffset = Math.sqrt(W * W + H * H);
        // Stagger start offsets so waves arrive evenly spaced, all originating from orb (offset=0)
        const third = maxOffset * 0.8 / 3;
        waves.value = {
          dirX: baseAngles.map((a) => Math.cos(a + (Math.random() - 0.5) * 0.7)),
          dirY: baseAngles.map((a) => Math.sin(a + (Math.random() - 0.5) * 0.7)),
          offset: [maxOffset * 0.8, maxOffset * 0.8 + third, maxOffset * 0.8 + third * 2], // waves start outside, move inward
          speed: [
            1.5 + Math.random() * 0.7,
            1.5 + Math.random() * 0.7,
            1.5 + Math.random() * 0.7,
          ],
          radius: [20, 120, 220],
          radialSpeed: [3.5, 4.0, 3.2],
        };
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
    setActive: (a: boolean) => {
      runOnUI(() => {
        'worklet';
        const next = a ? 1 : 0;
        if (next === 1 && activeMode.value === 0) {
          // Switch to Active (Thinking): clear directional waves, stage radial waves
          const wv = waves.value;
          const maxOffset = Math.sqrt(W * W + H * H);
          wv.offset = [maxOffset * 0.8, maxOffset * 0.8, maxOffset * 0.8];
          
          // Start 2 radial waves with a delay between them.
          wv.radius = [0, -maxOffset * 0.35, 0];
          wv.radialSpeed = [4.5, 4.5, 4.5];
          
          // Clear targeted token pulses
          pulses.value = { x: [], y: [], r: [], life: [], count: 0 };
        } else if (next === 0 && activeMode.value === 1) {
          // Switch to Idle
          const wv = waves.value;
          const maxOffset = Math.sqrt(W * W + H * H);
          const third = maxOffset * 0.8 / 3;
          wv.offset = [maxOffset * 0.8, maxOffset * 0.8 + third, maxOffset * 0.8 + third * 2];
        }
        activeMode.value = next;
      })();
    },
    setOrbOffset: (dy: number) => {
      runOnUI(() => {
        'worklet';
        orbYOffset.value = dy;
      })();
    },
  }));

  const lastFrameTime = useSharedValue(0);

  // Physics loop — fixed timestep at 30fps target (33ms budget per tick).
  // This skips redundant vsync ticks so we don't compete with the LLM CPU thread.
  useFrameCallback((frameInfo) => {
    'worklet';
    const now = frameInfo.timestamp; // ms from reanimated
    const TARGET_MS = 33.3; // 30fps

    if (now - lastFrameTime.value < TARGET_MS) return; // skip this vsync
    lastFrameTime.value = now;

    const ps = particles.value;
    if (!ps) return;

    t.value += 0.006;
    const tv = t.value;

    // Global fluid current
    const currentAngle = Math.sin(tv * 0.2) * Math.PI + tv * 0.15;
    const currentMag = (0.25 + Math.sin(tv * 0.1) * 0.1) * DPR;
    const flowX = Math.cos(currentAngle) * currentMag;
    const flowY = Math.sin(currentAngle) * currentMag;

    const wv = waves.value;
    const isActive = activeMode.value === 1;

    const maxOffset = Math.sqrt(W * W + H * H);

    if (!isActive) {
      // Idle Mode: Linear waves moving inward from outside the screen
      for (let wi = 0; wi < 3; wi++) {
        wv.offset[wi] -= wv.speed[wi] * 1.0;
        if (wv.offset[wi] < -maxOffset * 0.8) {
          wv.offset[wi] = maxOffset * 0.8;
          const baseAngle = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6][wi];
          const jittered = baseAngle + (Math.random() - 0.5) * 0.7;
          wv.dirX[wi] = Math.cos(jittered);
          wv.dirY[wi] = Math.sin(jittered);
          wv.speed[wi] = 1.5 + Math.random() * 0.7;
        }
      }
    } else {
      // Active Mode: Two radial waves spawning from orb and speeding outwards
      // Uses the first two indices of the radial array.
      for (let wi = 0; wi < 2; wi++) {
        if (wv.radius[wi] >= 0) {
          wv.radius[wi] += wv.radialSpeed[wi];
        } else {
          // If radius is negative, it's in a delay state.
          // Add to it until it reaches 0 (spawning point).
          wv.radius[wi] += wv.radialSpeed[wi]; 
        }

        // When it fully exits the screen (corners distance)
        if (wv.radius[wi] > maxOffset * 0.8) {
          // Delay the respawn based on index so they are staggered
          wv.radius[wi] = wi === 0 ? 0 : -maxOffset * 0.4; // 2nd wave spawns when 1st is halfway
          wv.radialSpeed[wi] = 4.5;
        }
      }
    }

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
  });

  // ─── Draw ────────────────────────────────────────────────────────────────

  const recorder = React.useMemo(() => Skia.PictureRecorder(), []);
  const dotPaint = React.useMemo(() => Skia.Paint(), []);
  const glowPaint = React.useMemo(() => Skia.Paint(), []);

  const picture = useDerivedValue(() => {
    'worklet';
    // Subscribe to frame ticks so the picture re-records every frame
    const _tick = t.value;
    const ps = particles.value;
    
    // Always begin recording so we have a valid canvas and can safely finish
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, W, H));
    
    if (ps) {
      const WAVE_WIDTH = 88;
      const wv2 = waves.value;
      // Orb center tracks keyboard — waves radiate from the orb's actual position
      const orbCx = W / 2;
      const orbCy = H / 2 + orbYOffset.value;

      for (let i = 0; i < ps.count; i++) {
        const px = ps.x[i];
        const py = ps.y[i];
        const pr = ps.r[i];

        let brightness = 0;
        const isActive = activeMode.value === 1;

        if (!isActive) {
          // Idle: 3 Linear waves moving inward
          for (let wi = 0; wi < 3; wi++) {
            const rx = px - orbCx;
            const ry = py - orbCy;
            const signedDist = rx * wv2.dirX[wi] + ry * wv2.dirY[wi] - wv2.offset[wi];
            const d = Math.abs(signedDist);
            if (d < WAVE_WIDTH) {
              const f = 0.5 + 0.5 * Math.cos((d / WAVE_WIDTH) * Math.PI);
              if (f > brightness) brightness = f;
            }
          }
        } else {
          // Active: 2 Radial rings expanding outward from the orb center
          const dx = px - orbCx;
          const dy = py - orbCy;
          const distFromOrb = Math.sqrt(dx * dx + dy * dy);

          for (let wi = 0; wi < 2; wi++) {
            const waveRadius = wv2.radius[wi];
            if (waveRadius > 0) {
              const d = Math.abs(distFromOrb - waveRadius);
              if (d < WAVE_WIDTH) {
                const f = 0.5 + 0.5 * Math.cos((d / WAVE_WIDTH) * Math.PI);
                if (f > brightness) brightness = f;
              }
            }
          }
        }

        const baseAlpha = 0.08; // dim when no wave nearby
        const a = baseAlpha + (ps.alpha[i] - baseAlpha) * brightness;

        // Glow halo — only draw when particle is lit by a wave
        if (brightness > 0.05) {
          glowPaint.setColor(Skia.Color(DOT_COLOR));
          glowPaint.setAlphaf(brightness * 0.5);
          canvas.drawCircle(px, py, pr * 2.2, glowPaint);
        }

        // Core dot — always visible but dim by default
        dotPaint.setColor(Skia.Color(DOT_COLOR));
        dotPaint.setAlphaf(Math.min(a * 1.5, 1));
        canvas.drawCircle(px, py, pr, dotPaint);
      }
    }

    return recorder.finishRecordingAsPicture();
  });

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Picture picture={picture} />
    </Canvas>
  );
});
