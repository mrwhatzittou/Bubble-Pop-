import React, { useState, useRef, useEffect } from 'react';
import { GameMode, GameStatus } from './types';
import MainMenu from './components/MainMenu';
import GameCanvas from './components/GameCanvas';
import GameOver from './components/GameOver';
import { VisionService } from './services/visionService';
import { Analytics } from '@vercel/analytics/react';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.LEVELS);
  const [startLevel, setStartLevel] = useState(1);
  const [finalScore, setFinalScore] = useState(0);

  // Global Vision State
  const videoRef = useRef<HTMLVideoElement>(null);
  // Singleton instance of VisionService for the app lifecycle
  const visionService = useRef(new VisionService());

  const startGame = (mode: GameMode, level: number = 1) => {
    setGameMode(mode);
    setStartLevel(level);
    setStatus(GameStatus.PLAYING);
  };

  const handleGameOver = (score: number) => {
    setFinalScore(score);
    setStatus(GameStatus.GAME_OVER);
  };

  const restartGame = () => {
    // Basic restart repeats the current mode configuration
    // If we want to restart from current checkpoint, we use restartGame.
    // However, GameOver usually offers "Play Again" which might imply restarting the specific session?
    // The previous implementation just set PLAYING.
    // For level mode, usually "Play Again" means try the failed level again? 
    // Or if GAME OVER, maybe start from checkpoint?
    // Let's adhere to "Restart explicitly clears" for "Restart Level 1" in menu.
    // But here, if I die at level 5, "Play Again" should probably let me retry level 5?
    // Or return to menu. 
    // The previous code just set PLAYING, which defaults to level 1 in GameCanvas if not handled.
    // But now GameCanvas takes an 'initialLevel'.
    // We'll keep the startLevel state for retries if appropriate, or just rely on Menu.
    setStatus(GameStatus.PLAYING);
  };

  const goHome = () => {
    setStatus(GameStatus.MENU);
  };

  const startCamera = async () => {
    if (videoRef.current) {
        await visionService.current.start(videoRef.current);
    }
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden font-sans">
      {/* Global Persistent Camera Layer */}
      <video 
        ref={videoRef} 
        className="absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100 z-0" 
        playsInline 
        muted
      />

      {status === GameStatus.MENU && (
        <MainMenu onStart={startGame} onStartCamera={startCamera} isCameraRunning={visionService.current.isRunning} />
      )}

      {status === GameStatus.PLAYING && (
        <GameCanvas 
          mode={gameMode} 
          initialLevel={startLevel}
          onGameOver={handleGameOver} 
          visionService={visionService.current}
          videoRef={videoRef}
          onExit={goHome}
        />
      )}

      {status === GameStatus.GAME_OVER && (
        <>
          <div className="absolute inset-0 bg-slate-900/50 blur-sm z-40" />
          <GameOver 
            score={finalScore} 
            mode={gameMode} 
            onRestart={restartGame} 
            onHome={goHome} 
          />
        </>
      )}

      <Analytics />
    </div>
  );
};

export default App;