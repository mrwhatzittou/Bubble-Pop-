import React, { useState, useEffect } from 'react';
import { GameMode } from '../types';
import { getHighScore, getResumeLevel, clearCheckpoint, loadCheckpoint } from '../services/storageService';
import { audioService } from '../services/audioService';

interface MainMenuProps {
  onStart: (mode: GameMode, level?: number) => void;
  onStartCamera: () => Promise<void>;
  isCameraRunning: boolean;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart, onStartCamera, isCameraRunning }) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.LEVELS);
  const [loading, setLoading] = useState(false);
  const [continueLevel, setContinueLevel] = useState<number>(1);
  const [hasCheckpoint, setHasCheckpoint] = useState(false);
  const [showConfirmRestart, setShowConfirmRestart] = useState(false);

  useEffect(() => {
    // Check for saved progress on mount
    const cp = loadCheckpoint();
    // In V2 logic, checkpoint defaults to 1 if empty.
    // We only consider it "hasCheckpoint" if unlocked level > 1.
    if (cp && cp.highestUnlockedLevel > 1) {
        setContinueLevel(cp.highestUnlockedLevel);
        setHasCheckpoint(true);
    } else {
        setContinueLevel(1);
        setHasCheckpoint(false);
    }
  }, []);

  const initGame = async (mode: GameMode, level: number) => {
    setLoading(true);
    // Initialize audio context
    audioService.init();

    // Load and Start Music
    // Points to public/audio/bgm.mp3 (served as /audio/bgm.mp3)
    try {
        const musicPath = "/audio/bgm.mp3";
        await audioService.loadMusic(musicPath);
        audioService.startMusic();
    } catch (e) {
        console.error("Music load error", e);
    }

    // Always try to start camera (priority), will fall back to mouse automatically
    try {
        if (!isCameraRunning) {
            await onStartCamera();
        }
    } catch (e) {
        console.error("Failed to start camera", e);
        alert("⚠️ Camera failed to start. Using mouse cursor instead.");
    }

    // Give audio context time to unlock and camera to init
    setTimeout(() => {
      onStart(mode, level);
    }, 100);
  };

  const handleContinue = () => {
    initGame(GameMode.LEVELS, continueLevel);
  };

  const handleNewGameRequest = () => {
    if (hasCheckpoint) {
      setShowConfirmRestart(true);
    } else {
      initGame(GameMode.LEVELS, 1);
    }
  };

  const confirmRestart = () => {
    clearCheckpoint();
    setContinueLevel(1);
    setHasCheckpoint(false);
    setShowConfirmRestart(false);
    initGame(GameMode.LEVELS, 1);
  };

  const handleInfiniteStart = () => {
    initGame(GameMode.INFINITE, 1);
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-start bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 z-50 text-white p-4 pt-12 sm:pt-16 overflow-y-auto">
      {/* Enhanced Background decoration with more floating bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         {/* Animated gradient orbs */}
         <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
         <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
         <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>

         {/* Floating bubbles */}
         <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full border-2 border-cyan-400/30 blur-sm animate-float" style={{animationDuration: '3s'}}></div>
         <div className="absolute bottom-1/3 right-1/4 w-24 h-24 rounded-full border border-purple-400/20 blur-sm animate-float" style={{animationDuration: '4s', animationDelay: '0.5s'}}></div>
         <div className="absolute top-1/2 right-1/3 w-16 h-16 rounded-full border-2 border-pink-400/25 blur-sm animate-float" style={{animationDuration: '5s', animationDelay: '1s'}}></div>
         <div className="absolute bottom-1/4 left-1/3 w-20 h-20 rounded-full border border-blue-400/20 blur-sm animate-float" style={{animationDuration: '6s', animationDelay: '1.5s'}}></div>
         <div className="absolute top-1/3 right-1/4 w-28 h-28 rounded-full border-2 border-cyan-300/15 blur-sm animate-float" style={{animationDuration: '7s', animationDelay: '2s'}}></div>

         {/* Sparkle effects */}
         <div className="absolute top-20 left-1/3 w-2 h-2 bg-white rounded-full animate-ping" style={{animationDuration: '2s'}}></div>
         <div className="absolute top-40 right-1/4 w-1 h-1 bg-cyan-300 rounded-full animate-ping" style={{animationDuration: '3s', animationDelay: '1s'}}></div>
         <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-purple-300 rounded-full animate-ping" style={{animationDuration: '2.5s', animationDelay: '0.5s'}}></div>
      </div>

      <div className="w-full max-w-4xl flex flex-col items-center mt-4">
        {/* Title with enhanced effects */}
        <div className="animate-float mb-6 z-10 text-center">
          <div className="relative">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-400 drop-shadow-[0_0_30px_rgba(103,232,249,0.5)] mb-1 animate-pulse" style={{animationDuration: '3s'}}>
              BUBBLE POP
            </h1>
            <div className="absolute inset-0 text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter text-cyan-400/20 blur-xl -z-10">
              BUBBLE POP
            </div>
          </div>
          <p className="text-center text-lg sm:text-xl font-bold tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300 mt-2 animate-pulse" style={{animationDuration: '2s', animationDelay: '0.5s'}}>
            FINGER FRENZY
          </p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
            <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
          </div>
        </div>

        {/* Game Mode Selection with enhanced styling */}
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 mb-6 z-10">
          <div
             onClick={() => setSelectedMode(GameMode.LEVELS)}
             className={`group relative p-5 sm:p-6 rounded-2xl border-2 transition-all duration-300 w-full sm:w-64 backdrop-blur-md cursor-pointer overflow-hidden ${
              selectedMode === GameMode.LEVELS
                ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 scale-105 shadow-[0_0_30px_rgba(34,211,238,0.5)]'
                : 'border-slate-700 bg-slate-800/40 hover:border-cyan-500/50 hover:bg-slate-800/60 hover:scale-102'
            }`}
          >
            {/* Animated background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

            <div className="relative z-10">
              <div className="text-4xl mb-2 transform group-hover:scale-110 transition-transform">🏆</div>
              <h2 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">Level Mode</h2>
              <p className="text-sm text-slate-300 font-medium">Beat levels • 3 Hearts</p>
            </div>

            {hasCheckpoint && (
              <div className="absolute top-3 right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]">
                LVL {continueLevel} UNLOCKED
              </div>
            )}

            {selectedMode === GameMode.LEVELS && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 animate-pulse"></div>
            )}
          </div>

          <div
            onClick={() => setSelectedMode(GameMode.INFINITE)}
            className={`group relative p-5 sm:p-6 rounded-2xl border-2 transition-all duration-300 w-full sm:w-64 backdrop-blur-md cursor-pointer overflow-hidden ${
              selectedMode === GameMode.INFINITE
                ? 'border-purple-500 bg-gradient-to-br from-purple-500/20 to-pink-600/20 scale-105 shadow-[0_0_30px_rgba(168,85,247,0.5)]'
                : 'border-slate-700 bg-slate-800/40 hover:border-purple-500/50 hover:bg-slate-800/60 hover:scale-102'
            }`}
          >
            {/* Animated background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br from-purple-400/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

            <div className="relative z-10">
              <div className="text-4xl mb-2 transform group-hover:scale-110 transition-transform">♾️</div>
              <h2 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-400">Infinite Run</h2>
              <p className="text-sm text-slate-300 font-medium">One life • No limits</p>
              <div className="flex items-center gap-2 mt-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-600"></div>
                <p className="text-xs text-slate-500 font-bold">HIGH SCORE</p>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-600"></div>
              </div>
              <p className="text-lg font-black text-purple-400 text-center mt-1">{getHighScore(GameMode.INFINITE).toLocaleString()}</p>
            </div>

            {selectedMode === GameMode.INFINITE && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 animate-pulse"></div>
            )}
          </div>
        </div>

        <div className="z-10 flex flex-col items-center gap-4">
          {selectedMode === GameMode.LEVELS ? (
            <>
              {hasCheckpoint && (
                <button
                  onClick={handleContinue}
                  disabled={loading}
                  className="w-64 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-full text-xl font-bold shadow-lg transform transition-transform active:scale-95"
                >
                  {loading ? 'Starting...' : `CONTINUE (LEVEL ${continueLevel})`}
                </button>
              )}

              <button
                onClick={handleNewGameRequest}
                disabled={loading}
                className={`w-64 py-3 rounded-full font-bold shadow-lg transform transition-transform active:scale-95 border-2 ${
                  hasCheckpoint
                   ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                   : 'bg-gradient-to-r from-cyan-500 to-blue-600 border-transparent hover:from-cyan-400 hover:to-blue-500 text-white text-xl py-4'
                }`}
              >
                {loading ? 'Starting...' : (hasCheckpoint ? 'RESTART (LVL 1)' : 'START GAME')}
              </button>

              {hasCheckpoint && (
                 <p className="text-xs text-slate-500 font-mono">
                    Resume from highest unlocked level ({continueLevel})
                 </p>
              )}
            </>
          ) : (
            <button
              onClick={handleInfiniteStart}
              disabled={loading}
              className="w-64 py-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 rounded-full text-xl font-bold shadow-lg transform transition-transform active:scale-95"
            >
              {loading ? 'Starting...' : 'START INFINITE'}
            </button>
          )}
        </div>

        {/* Enhanced How to Play section */}
        <div className="max-w-lg text-center mt-6 z-10 bg-gradient-to-br from-slate-800/70 to-slate-900/70 p-5 sm:p-6 rounded-2xl backdrop-blur-md border border-slate-700/50 shadow-xl">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-cyan-500"></div>
            <h3 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase tracking-wider">How to Play</h3>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-purple-500"></div>
          </div>

          <div className="space-y-2 text-xs sm:text-sm text-slate-300">
            <p className="flex items-center justify-center gap-2">
              <span className="text-xl">📷</span>
              <span><strong className="text-cyan-400">Camera tracking</strong> with your finger (auto-enabled)</span>
            </p>
            <p className="flex items-center justify-center gap-2">
              <span className="text-xl">🖱️</span>
              <span><strong className="text-purple-400">Mouse cursor</strong> fallback if camera unavailable</span>
            </p>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-600 to-transparent my-3"></div>
            <p className="flex items-center justify-center gap-2">
              <span className="text-xl">💥</span>
              <span>Avoid <strong className="text-red-400">Bombs</strong> or lose a heart</span>
            </p>
            <p className="flex items-center justify-center gap-2">
              <span className="text-xl">⭐</span>
              <span><strong className="text-yellow-400">Golden bubbles</strong> give bonus points</span>
            </p>
            <p className="flex items-center justify-center gap-2">
              <span className="text-xl">❤️</span>
              <span><strong className="text-pink-400">Heart bubbles</strong> restore health</span>
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 font-mono">
              Grant camera permission for best experience • Best played fullscreen
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmRestart && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border-2 border-red-500/50 p-8 rounded-3xl max-w-sm text-center shadow-2xl animate-bounce-short">
             <h3 className="text-2xl font-bold text-red-400 mb-4">Restart from Level 1?</h3>
             <p className="text-slate-300 mb-6">
               This will clear your progress. You are currently at <strong>Level {continueLevel}</strong>.
             </p>
             <div className="flex gap-4 justify-center">
               <button
                 onClick={() => setShowConfirmRestart(false)}
                 className="px-6 py-2 rounded-full bg-slate-700 hover:bg-slate-600 font-bold"
               >
                 Cancel
               </button>
               <button
                 onClick={confirmRestart}
                 className="px-6 py-2 rounded-full bg-red-600 hover:bg-red-500 font-bold shadow-lg"
               >
                 Restart
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainMenu;
