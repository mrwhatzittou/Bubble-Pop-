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

export const LEVELS = [
  { target: 150, speedMod: 1.0, spawnMod: 1.0, bombChance: 0.1 },
  { target: 400, speedMod: 1.2, spawnMod: 0.9, bombChance: 0.15 },
  { target: 800, speedMod: 1.4, spawnMod: 0.8, bombChance: 0.2 },
  { target: 1500, speedMod: 1.7, spawnMod: 0.7, bombChance: 0.25 },
  { target: 3000, speedMod: 2.0, spawnMod: 0.6, bombChance: 0.3 },
  { target: 999999, speedMod: 2.5, spawnMod: 0.5, bombChance: 0.35 }, 
];