import React, { useEffect, useRef, useState } from 'react';
import { audioService } from '../services/audioService';
import { VisionService } from '../services/visionService';
import { saveUnlockedLevelIfHigher } from '../services/storageService';
import { BubbleEntity, BubbleType, GameMode, GameStatus, Particle, Point } from '../types';
import { GAME_CONFIG, LEVELS, SCORING, CAMERA_MIRRORED } from '../constants';

// --- One Euro Filter Implementation ---
class OneEuroFilter {
  minCutoff: number;
  beta: number;
  dCutoff: number;
  x: number | null;
  y: number | null;
  dx: number;
  dy: number;
  t: number;

  constructor({ minCutoff = 1.5, beta = 0.05, dCutoff = 1.0 } = {}) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.x = null;
    this.y = null;
    this.dx = 0;
    this.dy = 0;
    this.t = performance.now();
  }

  alpha(cutoff: number, dt: number) {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  lowPass(alpha: number, prev: number, value: number) {
    return prev + alpha * (value - prev);
  }

  update(nx: number, ny: number): Point {
    const now = performance.now();
    const dt = Math.max(0.001, (now - this.t) / 1000);
    this.t = now;

    if (this.x === null || this.y === null) {
      this.x = nx; 
      this.y = ny;
      return { x: nx, y: ny };
    }

    const rawDx = (nx - this.x) / dt;
    const rawDy = (ny - this.y) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    this.dx = this.lowPass(aD, this.dx, rawDx);
    this.dy = this.lowPass(aD, this.dy, rawDy);

    const speed = Math.hypot(this.dx, this.dy);
    const cutoff = this.minCutoff + this.beta * speed;
    const a = this.alpha(cutoff, dt);
    this.x = this.lowPass(a, this.x, nx);
    this.y = this.lowPass(a, this.y, ny);

    return { x: this.x, y: this.y };
  }
}

interface GameCanvasProps {
  mode: GameMode;
  initialLevel?: number; // Added
  onGameOver: (score: number) => void;
  visionService: VisionService;
  videoRef: React.RefObject<HTMLVideoElement>;
  onExit: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ mode, initialLevel = 1, onGameOver, visionService, videoRef, onExit }) => {
  // DOM Refs
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Single Source of Truth for Logic Dimensions (CSS Pixels)
  const stageDimensions = useRef({ width: 0, height: 0 });

  // Adaptive Filter
  const oneEuroFilter = useRef(new OneEuroFilter({ minCutoff: 1.6, beta: 0.06, dCutoff: 1.0 }));

  // Helper to determine starting score based on level
  const getStartingScore = (lvlIndex: number) => {
      if (mode === GameMode.INFINITE || lvlIndex <= 0) return 0;
      // Initialize with the target score of the previous level to maintain progression continuity
      return LEVELS[lvlIndex - 1].target;
  };

  const startLvlIndex = Math.max(0, initialLevel - 1);

  // Game State Refs
  const gameState = useRef({
    status: GameStatus.PLAYING,
    score: getStartingScore(startLvlIndex),
    lives: mode === GameMode.LEVELS ? 3 : 1,
    levelIndex: startLvlIndex,
    levelScoreStart: getStartingScore(startLvlIndex), 
    lastSpawnTime: 0,
    bubbles: [] as BubbleEntity[],
    particles: [] as Particle[],
    
    // Input System
    inputType: 'MOUSE' as 'MOUSE' | 'CAMERA',
    fingerPos: { x: -100, y: -100 } as Point,
    lastStablePos: { x: -100, y: -100 } as Point,
    lastHandTime: 0,
    
    screenShake: 0,
    message: '',
    messageTimer: 0,
  });

  // UI State
  const [score, setScore] = useState(gameState.current.score);
  const [lives, setLives] = useState(mode === GameMode.LEVELS ? 3 : 1);
  const [level, setLevel] = useState(initialLevel);
  const [cameraActive, setCameraActive] = useState(visionService.isRunning);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [musicMuted, setMusicMuted] = useState(audioService.isMusicMuted);
  const [isPaused, setIsPaused] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- Resize & Layout Logic ---

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const observer = new ResizeObserver(() => {
      const rect = wrapper.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      stageDimensions.current.width = rect.width;
      stageDimensions.current.height = rect.height;

      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  // --- Input Mapping Logic ---

  const getCoverRect = (videoW: number, videoH: number, stageW: number, stageH: number) => {
    const videoAR = videoW / videoH;
    const stageAR = stageW / stageH;
    
    let drawW, drawH, offsetX, offsetY;

    if (videoAR > stageAR) {
        drawH = stageH;
        drawW = stageH * videoAR;
        offsetX = (stageW - drawW) / 2;
        offsetY = 0;
    } else {
        drawW = stageW;
        drawH = stageW / videoAR;
        offsetX = 0;
        offsetY = (stageH - drawH) / 2;
    }
    return { drawW, drawH, offsetX, offsetY };
  };

  const mapLandmarkToStage = (normX: number, normY: number): Point | null => {
    const video = videoRef.current;
    const { width: stageW, height: stageH } = stageDimensions.current;

    if (!video || !video.videoWidth || !video.videoHeight || stageW === 0 || stageH === 0) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const xN = CAMERA_MIRRORED ? 1 - normX : normX;
    const yN = normY;

    // Video pixel coordinates
    const xV = xN * vw;
    const yV = yN * vh;

    // Map video pixels to stage pixels using cover logic
    const { drawW, offsetX, offsetY } = getCoverRect(vw, vh, stageW, stageH);
    const scale = drawW / vw; 

    return {
        x: offsetX + xV * scale,
        y: offsetY + yV * scale
    };
  };

  const clampToStage = (p: Point, w: number, h: number, margin = 4): Point => {
    return {
      x: Math.max(margin, Math.min(w - margin, p.x)),
      y: Math.max(margin, Math.min(h - margin, p.y))
    };
  };

  const applyDeadzone = (newPos: Point): Point => {
    const state = gameState.current;
    if (state.lastStablePos.x === -100) {
      state.lastStablePos = newPos;
      return newPos;
    }
    const dx = newPos.x - state.lastStablePos.x;
    const dy = newPos.y - state.lastStablePos.y;
    if (Math.hypot(dx, dy) < 2.0) return state.lastStablePos;

    state.lastStablePos = newPos;
    return newPos;
  };

  // --- Rendering Helpers ---

  const drawSoapBubble = (ctx: CanvasRenderingContext2D, b: BubbleEntity, time: number) => {
    const { x, y, radius, type } = b;
    const wobbleX = x + Math.sin(time * 0.005 + b.wobbleOffset) * (radius * 0.05);
    const wobbleY = y + Math.cos(time * 0.003 + b.wobbleOffset) * (radius * 0.05);

    ctx.beginPath();
    ctx.arc(wobbleX, wobbleY, radius, 0, Math.PI * 2);
    
    const grad = ctx.createRadialGradient(wobbleX, wobbleY, radius * 0.7, wobbleX, wobbleY, radius);
    
    if (type === BubbleType.BOMB) {
      const pulse = Math.sin(time * 0.01) * 0.2 + 0.8;
      grad.addColorStop(0, 'rgba(50, 0, 0, 0.1)');
      grad.addColorStop(0.8, 'rgba(100, 0, 0, 0.3)');
      grad.addColorStop(1, `rgba(255, 50, 50, ${0.6 * pulse})`);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.fillStyle = `rgba(255, 200, 200, ${0.5 * pulse})`;
      ctx.font = `${radius}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', wobbleX, wobbleY);
    } else if (type === BubbleType.HEART) {
      grad.addColorStop(0, 'rgba(255, 200, 220, 0.05)');
      grad.addColorStop(0.8, 'rgba(255, 100, 150, 0.2)');
      grad.addColorStop(1, 'rgba(255, 180, 200, 0.5)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 150, 180, 0.6)';
      ctx.font = `${radius}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♥', wobbleX, wobbleY + radius * 0.1);
    } else if (type === BubbleType.RARE) {
      grad.addColorStop(0, 'rgba(255, 255, 200, 0.05)');
      grad.addColorStop(0.6, 'rgba(255, 215, 0, 0.1)'); 
      grad.addColorStop(1, 'rgba(255, 255, 200, 0.6)');
      ctx.fillStyle = grad;
      ctx.fill();
    } else {
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
      grad.addColorStop(0.85, 'rgba(100, 200, 255, 0.1)');
      grad.addColorStop(1, 'rgba(200, 230, 255, 0.4)');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(wobbleX, wobbleY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.translate(wobbleX - radius * 0.45, wobbleY - radius * 0.45);
    ctx.rotate(-Math.PI / 4);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.2, radius * 0.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();
    ctx.restore();
    
    ctx.beginPath();
    ctx.arc(wobbleX + radius * 0.5, wobbleY + radius * 0.5, radius * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
  };

  // --- Logic ---

  const spawnBubble = () => {
    const { width, height } = stageDimensions.current;
    if (width === 0 || height === 0) return;

    const currentLevel = LEVELS[Math.min(gameState.current.levelIndex, LEVELS.length - 1)];
    const difficultyMult = mode === GameMode.INFINITE 
      ? 1 + (gameState.current.score / 2000) 
      : 1;

    const baseRadius = width * 0.04; 
    const x = Math.random() * (width - baseRadius * 3) + baseRadius * 1.5;
    
    let type = BubbleType.NORMAL;
    const rand = Math.random();
    
    let bombChance = currentLevel.bombChance;
    if (mode === GameMode.INFINITE) {
      bombChance = Math.min(0.35, 0.05 + (gameState.current.score / 8000));
    }
    
    if (rand < bombChance) type = BubbleType.BOMB;
    else if (rand < bombChance + 0.15) type = BubbleType.RARE;
    else if (mode === GameMode.LEVELS && gameState.current.lives < 3 && rand > 0.97 && gameState.current.levelIndex > 1) {
       type = BubbleType.HEART;
    }

    const bubble: BubbleEntity = {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y: height + baseRadius,
      radius: baseRadius * (type === BubbleType.RARE ? 0.8 : 1) * (0.9 + Math.random() * 0.2),
      speed: (GAME_CONFIG.BASE_SPEED * currentLevel.speedMod * difficultyMult) * (Math.random() * 0.4 + 0.8),
      wobbleOffset: Math.random() * Math.PI * 2,
      type,
      opacity: 1,
      isPopped: false
    };

    gameState.current.bubbles.push(bubble);
  };

  const createParticles = (x: number, y: number, type: BubbleType, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      let color = 'rgba(200, 240, 255, 0.8)';
      if (type === BubbleType.BOMB) color = 'rgba(255, 50, 50, 0.8)';
      if (type === BubbleType.RARE) color = 'rgba(255, 215, 0, 0.8)';
      if (type === BubbleType.HEART) color = 'rgba(255, 180, 200, 0.8)';

      gameState.current.particles.push({
        id: Math.random().toString(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color,
        size: Math.random() * 3 + 1
      });
    }
  };

  const showMessage = (msg: string) => {
    gameState.current.message = msg;
    gameState.current.messageTimer = 120;
    setFeedbackMessage(msg);
  };

  const showToast = (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 1500);
  };

  const restartLevel = () => {
    showMessage("Level Failed! Restarting...");
    gameState.current.screenShake = 30;
    gameState.current.bubbles = [];
    gameState.current.particles = [];
    gameState.current.lives = 3;
    gameState.current.score = gameState.current.levelScoreStart;
    setLives(3);
    setScore(gameState.current.score);
  };

  const handlePop = (bubble: BubbleEntity) => {
    bubble.isPopped = true;
    
    if (bubble.type === BubbleType.BOMB) audioService.playBomb();
    else if (bubble.type === BubbleType.RARE) audioService.playRarePop();
    else if (bubble.type === BubbleType.HEART) audioService.playHeart();
    else audioService.playPop();

    if (bubble.type === BubbleType.BOMB) {
      gameState.current.screenShake = 25;
      createParticles(bubble.x, bubble.y, BubbleType.BOMB, 30);
      
      if (mode === GameMode.INFINITE) {
        endGame();
      } else {
        gameState.current.lives -= 1;
        setLives(gameState.current.lives);
        if (gameState.current.lives <= 0) {
          restartLevel();
        }
      }
    } else {
      let points = SCORING[bubble.type];
      gameState.current.score += points;
      createParticles(bubble.x, bubble.y, bubble.type, 15);
      
      if (bubble.type === BubbleType.HEART) {
        if (gameState.current.lives < 3) {
          gameState.current.lives += 1;
          setLives(gameState.current.lives);
        }
      }
    }

    setScore(gameState.current.score);

    if (mode === GameMode.LEVELS) {
      const currentLevelConfig = LEVELS[Math.min(gameState.current.levelIndex, LEVELS.length - 1)];
      if (gameState.current.score >= currentLevelConfig.target) {
        
        // Logic: Clear current level -> Unlock next level
        // levelIndex is 0-based. If I clear index 0 (Level 1), I just beat Level 1.
        // I want to save "Unlocked: Level 2".
        const completedLevel = gameState.current.levelIndex + 1;
        
        // This will save (completedLevel + 1) as the highest unlocked
        saveUnlockedLevelIfHigher(completedLevel);
        const unlockedLevel = completedLevel + 1;

        gameState.current.levelIndex++;
        gameState.current.levelScoreStart = gameState.current.score;
        const nextLevel = gameState.current.levelIndex + 1;
        
        setLevel(nextLevel);
        
        showToast(`Checkpoint: Level ${unlockedLevel} unlocked`);
        showMessage(`Level ${nextLevel}!`);
        audioService.playHeart();
        
        gameState.current.bubbles.forEach(b => {
             createParticles(b.x, b.y, b.type, 5);
        });
        gameState.current.bubbles = [];
      }
    } else {
       // Infinite mode logic
    }
  };

  const endGame = () => {
    gameState.current.status = GameStatus.GAME_OVER;
    onGameOver(gameState.current.score);
  };

  const gameLoop = (time: number) => {
    if (isPaused) {
       requestRef.current = requestAnimationFrame(gameLoop);
       return;
    }

    const state = gameState.current;
    if (state.status !== GameStatus.PLAYING) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = stageDimensions.current;
    if (width === 0 || height === 0) {
        requestRef.current = requestAnimationFrame(gameLoop);
        return;
    }

    // Handle High DPI & Transform Reset
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    if (state.screenShake > 0) {
      const dx = (Math.random() - 0.5) * state.screenShake;
      const dy = (Math.random() - 0.5) * state.screenShake;
      ctx.setTransform(dpr, 0, 0, dpr, dx * dpr, dy * dpr);
      
      if (state.screenShake > 10) {
        ctx.fillStyle = `rgba(255, 0, 0, ${state.screenShake / 100})`;
        ctx.fillRect(0, 0, width, height);
      }
      state.screenShake *= 0.9;
      if (state.screenShake < 0.5) state.screenShake = 0;
    } else {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    
    ctx.clearRect(0, 0, width, height);

    if (state.messageTimer > 0) {
        state.messageTimer--;
        if (state.messageTimer === 0) setFeedbackMessage('');
    }

    const currentLevel = LEVELS[Math.min(state.levelIndex, LEVELS.length - 1)];
    const spawnRate = GAME_CONFIG.SPAWN_RATE_MS * currentLevel.spawnMod;
    
    if (time - state.lastSpawnTime > spawnRate) {
      spawnBubble();
      state.lastSpawnTime = time;
    }

    state.bubbles.forEach((b) => {
      b.y -= b.speed;
      if (!b.isPopped) {
        const dist = Math.hypot(b.x - state.fingerPos.x, b.y - state.fingerPos.y);
        const hitRadius = b.radius * 1.3;
        
        if (dist < hitRadius) {
          handlePop(b);
        }
      }
    });

    state.bubbles = state.bubbles.filter(b => b.y + b.radius > -100 && !b.isPopped);

    state.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += GAME_CONFIG.GRAVITY; 
      p.life -= 0.02;
    });
    state.particles = state.particles.filter(p => p.life > 0);

    state.bubbles.forEach(b => drawSoapBubble(ctx, b, time));

    state.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    if (state.fingerPos.x !== -100) {
      ctx.beginPath();
      ctx.arc(state.fingerPos.x, state.fingerPos.y, 15, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(state.fingerPos.x, state.fingerPos.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
      ctx.fill();
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const handleMusicToggle = () => {
    const isMuted = audioService.toggleMusic();
    setMusicMuted(isMuted);
  };

  const handlePauseToggle = () => {
    if (isPaused) {
       setIsPaused(false);
       audioService.resumeMusic();
    } else {
       setIsPaused(true);
       audioService.pauseMusic();
    }
  };

  const handleRestartLevel = () => {
     setIsPaused(false);
     audioService.resumeMusic();
     restartLevel();
  };

  const handleExit = () => {
    audioService.stopMusic();
    onExit();
  };

  // --- Setup & Cleanup ---

  useEffect(() => {
    const onHandResults = (results: any) => {
      const now = performance.now();
      
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        if (!cameraActive) setCameraActive(true);
        gameState.current.inputType = 'CAMERA';
        gameState.current.lastHandTime = now;
        
        const landmarks = results.multiHandLandmarks[0];
        const tip = landmarks[8]; 
        const dip = landmarks[7];
        const normX = tip.x * 0.85 + dip.x * 0.15;
        const normY = tip.y * 0.85 + dip.y * 0.15;
        
        const mapped = mapLandmarkToStage(normX, normY);
        
        if (mapped) {
            const clamped = clampToStage(mapped, stageDimensions.current.width, stageDimensions.current.height, 4);
            const filtered = oneEuroFilter.current.update(clamped.x, clamped.y);
            const stable = applyDeadzone(filtered);
            gameState.current.fingerPos = stable;
        }
      } 
    };

    // Register callback with persistent Vision Service
    visionService.setCallback(onHandResults);

    const handleMouseMove = (e: MouseEvent) => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      
      const now = performance.now();
      
      if (now - gameState.current.lastHandTime > 500) {
          gameState.current.inputType = 'MOUSE';
          const rect = wrapper.getBoundingClientRect();
          gameState.current.fingerPos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          };
      }
    };
    
    // Key handler for pause
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            handlePauseToggle();
        }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      visionService.setCallback(null);
    };
  }, [mode, onGameOver, visionService]);

  return (
    <div ref={wrapperRef} className="absolute inset-0 z-10 cursor-none touch-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* HUD Layer */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none select-none">
        <div className="bg-slate-900/50 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-700/50 text-white">
          <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Score</p>
          <p className="text-4xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 shadow-cyan-500/50">
            {score.toLocaleString()}
          </p>
        </div>
        
        {mode === GameMode.LEVELS && (
          <div className="bg-slate-900/50 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-700/50 text-white flex items-center gap-3">
             <span className="text-2xl">❤️</span>
             <div className="flex gap-1">
               {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
                 <div key={i} className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
               ))}
             </div>
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 flex gap-4 pointer-events-auto">
         <div className="bg-slate-900/50 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/50 text-white pointer-events-none">
            <span className="text-slate-400 text-xs font-bold uppercase mr-2">Level</span>
            <span className="text-xl font-bold text-yellow-400">{level}</span>
         </div>
         
         <button 
           onClick={handleMusicToggle}
           className="bg-slate-900/50 hover:bg-slate-800/80 backdrop-blur-md p-3 rounded-xl border border-slate-700/50 text-white transition-colors"
         >
           {musicMuted ? '🔇' : '🔊'}
         </button>

         {/* Pause / Menu Button */}
         {mode === GameMode.LEVELS ? (
             <button 
               onClick={handlePauseToggle}
               className="bg-blue-500/20 hover:bg-blue-500/40 backdrop-blur-md px-4 py-2 rounded-xl border border-blue-500/30 text-blue-200 font-bold text-lg transition-colors w-12 flex items-center justify-center"
             >
               {isPaused ? '▶' : 'II'}
             </button>
         ) : (
            <button 
                onClick={handleExit}
                className="bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md px-4 py-2 rounded-xl border border-red-500/30 text-red-200 font-bold text-sm transition-colors"
            >
                EXIT
            </button>
         )}
      </div>

      {/* Center Messages */}
      {feedbackMessage && !isPaused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div className="animate-bounce bg-slate-900/80 backdrop-blur px-8 py-4 rounded-3xl border-2 border-white/20">
             <h2 className="text-4xl font-black text-white tracking-widest uppercase drop-shadow-lg">
               {feedbackMessage}
             </h2>
           </div>
        </div>
      )}

      {/* Checkpoint Toast */}
      {toastMessage && (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-green-600/90 text-white px-6 py-2 rounded-full shadow-lg pointer-events-none animate-float z-50">
              {toastMessage}
          </div>
      )}
      
      {/* Pause Menu Overlay */}
      {isPaused && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
             <div className="bg-slate-800 border border-slate-600 p-8 rounded-3xl w-80 text-center shadow-2xl">
                 <h2 className="text-3xl font-black text-white mb-8 tracking-widest">PAUSED</h2>
                 
                 <div className="flex flex-col gap-4">
                     <button 
                        onClick={handlePauseToggle}
                        className="w-full py-3 rounded-full bg-green-500 hover:bg-green-400 text-white font-bold text-lg shadow-lg"
                     >
                         RESUME
                     </button>
                     <button 
                        onClick={handleRestartLevel}
                        className="w-full py-3 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold shadow-lg"
                     >
                         RESTART LEVEL
                     </button>
                     <button 
                        onClick={handleExit}
                        className="w-full py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg"
                     >
                         EXIT TO MENU
                     </button>
                 </div>
                 <div className="mt-6 text-xs text-slate-500">
                    Checkpoint not saved during pause.
                 </div>
             </div>
        </div>
      )}
      
      {/* Loading/Camera Status */}
      {!cameraActive && (
         <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-lg border border-yellow-500/30 flex items-center gap-2 pointer-events-none">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping" />
            <span className="text-yellow-200 text-xs font-mono">WAITING FOR CAMERA...</span>
         </div>
      )}
    </div>
  );
};

export default GameCanvas;