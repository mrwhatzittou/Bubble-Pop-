export enum GameMode {
  LEVELS = 'LEVELS',
  INFINITE = 'INFINITE',
}

export enum InputMode {
  CAMERA = 'CAMERA',
  CURSOR = 'CURSOR',
}

export enum BubbleType {
  NORMAL = 'NORMAL',
  RARE = 'RARE',
  BOMB = 'BOMB',
  HEART = 'HEART',
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  PAUSED = 'PAUSED',
}

export interface Point {
  x: number;
  y: number;
}

export interface BubbleEntity {
  id: string;
  x: number;
  y: number;
  radius: number;
  speed: number;
  wobbleOffset: number;
  type: BubbleType;
  opacity: number;
  isPopped: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface LeaderboardEntry {
  username: string;
  score: number;
  mode: GameMode;
  date: number;
}

// MediaPipe Global Types (since we load via script tag)
declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}