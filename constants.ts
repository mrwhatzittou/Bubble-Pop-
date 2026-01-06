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

// Generate 100 levels with smooth difficulty progression
const generateLevels = () => {
  const levels = [];

  for (let i = 1; i <= 100; i++) {
    // Score targets - exponential growth
    let target;
    if (i === 1) target = 150;
    else if (i === 2) target = 350;
    else if (i === 3) target = 600;
    else if (i === 4) target = 900;
    else if (i === 5) target = 1250;
    else if (i <= 20) target = 1250 + (i - 5) * 200;  // Levels 6-20: +200 each
    else if (i <= 50) target = 4250 + (i - 20) * 300; // Levels 21-50: +300 each
    else target = 13250 + (i - 50) * 400;             // Levels 51-100: +400 each

    // Speed multiplier - gradual increase (1.0 → 2.5 over 100 levels)
    const speedMod = 1.0 + (i - 1) * 0.015;

    // Spawn rate - gradual increase (1.0 → 0.5, lower = more spawns)
    const spawnMod = Math.max(0.5, 1.0 - (i - 1) * 0.005);

    // Bomb chance - gradual increase (5% → 30%)
    const bombChance = Math.min(0.30, 0.05 + (i - 1) * 0.0025);

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