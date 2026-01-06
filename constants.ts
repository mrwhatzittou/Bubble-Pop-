import { BubbleType } from './types';

// Note: Main bubble rendering uses programmatic Gradients in GameCanvas, 
// these constants are primarily for Particles and UI fallbacks.
export const COLORS = {
  [BubbleType.NORMAL]: 'rgba(200, 240, 255, 0.9)', 
  [BubbleType.RARE]: 'rgba(255, 215, 0, 0.9)',   
  [BubbleType.BOMB]: 'rgba(255, 50, 50, 0.9)',   
  [BubbleType.HEART]: 'rgba(255, 180, 200, 0.9)', 
  TEXT_MAIN: '#f8fafc',
};

// MANDATORY: Single source of truth for mirroring
export const CAMERA_MIRRORED = true;

export const GAME_CONFIG = {
  FPS: 60,
  // FINGER_SMOOTHING removed in favor of dynamic velocity-aware interpolation
  BASE_SPEED: 2.0, 
  SPAWN_RATE_MS: 900,
  GRAVITY: 0.15,
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,
};

export const SCORING = {
  [BubbleType.NORMAL]: 10,
  [BubbleType.RARE]: 50,
  [BubbleType.BOMB]: 0,
  [BubbleType.HEART]: 0,
};

// Generate 20 challenging levels with significant score requirements
const generateLevels = () => {
  const levels = [];

  // Score targets - each level is a real achievement
  const scoreTargets = [
    150,     // Level 1: Tutorial
    500,     // Level 2: Getting started
    1200,    // Level 3
    2200,    // Level 4
    3500,    // Level 5
    5200,    // Level 6
    7500,    // Level 7
    10500,   // Level 8
    14000,   // Level 9
    18500,   // Level 10: Halfway milestone
    24000,   // Level 11
    30500,   // Level 12
    38000,   // Level 13
    47000,   // Level 14
    57500,   // Level 15
    69500,   // Level 16
    83000,   // Level 17
    98500,   // Level 18
    116000,  // Level 19
    150000,  // Level 20: Final boss level
  ];

  for (let i = 1; i <= 20; i++) {
    const target = scoreTargets[i - 1];

    // Speed multiplier - meaningful progression (1.0 → 2.5)
    const speedMod = 1.0 + (i - 1) * 0.075;

    // Spawn rate - steady increase (1.0 → 0.5, lower = more spawns)
    const spawnMod = Math.max(0.5, 1.0 - (i - 1) * 0.025);

    // Bomb chance - balanced scaling (5% → 30%)
    const bombChance = Math.min(0.30, 0.05 + (i - 1) * 0.0125);

    levels.push({
      target,
      speedMod: Math.round(speedMod * 100) / 100,
      spawnMod: Math.round(spawnMod * 100) / 100,
      bombChance: Math.round(bombChance * 1000) / 1000,
    });
  }

  return levels;
};

export const LEVELS = generateLevels();