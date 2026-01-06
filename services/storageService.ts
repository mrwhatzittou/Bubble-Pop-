import { GameMode } from '../types';

const SCORE_STORAGE_KEY = 'bubble_pop_scores_v1';
const LEVEL_CHECKPOINT_KEY = 'bpf_level_checkpoint_v2';

// --- High Score Logic ---

export const getHighScore = (mode: GameMode): number => {
  try {
    const data = localStorage.getItem(SCORE_STORAGE_KEY);
    if (!data) return 0;
    const scores = JSON.parse(data);
    return scores[mode] || 0;
  } catch (e) {
    console.error("Error reading high score", e);
    return 0;
  }
};

export const saveHighScore = (mode: GameMode, score: number): boolean => {
  try {
    const currentHigh = getHighScore(mode);
    if (score > currentHigh) {
      const data = localStorage.getItem(SCORE_STORAGE_KEY);
      const scores = data ? JSON.parse(data) : {};
      scores[mode] = score;
      localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(scores));
      return true; // New record
    }
  } catch (e) {
    console.error("Error saving high score", e);
  }
  return false;
};

// --- Level Checkpoint Logic (V2: Highest Unlocked Level) ---

interface CheckpointPayload {
  version: number;
  highestUnlockedLevel: number;
  savedAt: number;
}

function makeCheckpointPayload(highestUnlockedLevel: number): CheckpointPayload {
  return {
    version: 2,
    highestUnlockedLevel: Math.max(1, Math.floor(highestUnlockedLevel)),
    savedAt: Date.now()
  };
}

export const loadCheckpoint = (): CheckpointPayload => {
  try {
    const raw = localStorage.getItem(LEVEL_CHECKPOINT_KEY);
    // Default to Level 1 if no save exists
    if (!raw) return { version: 2, highestUnlockedLevel: 1, savedAt: 0 };
    
    const data = JSON.parse(raw);
    const lvl = Math.floor(data.highestUnlockedLevel);

    // Safety: prevent -1 or invalid levels
    if (!Number.isFinite(lvl) || lvl < 1) {
      localStorage.removeItem(LEVEL_CHECKPOINT_KEY);
      return { version: 2, highestUnlockedLevel: 1, savedAt: 0 };
    }
    return data;
  } catch {
    localStorage.removeItem(LEVEL_CHECKPOINT_KEY);
    return { version: 2, highestUnlockedLevel: 1, savedAt: 0 };
  }
};

// Call this when a level is CLEARED. It unlocks the NEXT level.
export const saveUnlockedLevelIfHigher = (levelJustCleared: number) => {
  try {
    const nextUnlocked = Math.max(1, Math.floor(levelJustCleared) + 1);

    const cp = loadCheckpoint();
    const prev = cp.highestUnlockedLevel || 1;

    // Only update if we are progressing further
    if (nextUnlocked <= prev) return;

    localStorage.setItem(
      LEVEL_CHECKPOINT_KEY,
      JSON.stringify(makeCheckpointPayload(nextUnlocked))
    );
  } catch (e) {
    console.error("Error saving checkpoint", e);
  }
};

export const getResumeLevel = (): number => {
  const cp = loadCheckpoint();
  return Math.max(1, cp.highestUnlockedLevel || 1);
};

export const clearCheckpoint = () => {
  localStorage.removeItem(LEVEL_CHECKPOINT_KEY);
};