import React, { useEffect, useState } from 'react';
import { GameMode } from '../types';
import { saveHighScore, getHighScore } from '../services/storageService';

interface GameOverProps {
  score: number;
  mode: GameMode;
  onRestart: () => void;
  onHome: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ score, mode, onRestart, onHome }) => {
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [bestScore, setBestScore] = useState(0);

  useEffect(() => {
    const isNew = saveHighScore(mode, score);
    setIsNewRecord(isNew);
    setBestScore(getHighScore(mode));
  }, [mode, score]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-red-950/30 z-50 text-white p-4 overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Game Over Title */}
      <div className="text-center mb-8 animate-bounce-short z-10">
        <div className="relative">
          <h2 className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)] animate-pulse">
            GAME OVER
          </h2>
          <div className="absolute inset-0 text-7xl md:text-8xl font-black text-red-500/20 blur-2xl -z-10">
            GAME OVER
          </div>
        </div>
      </div>

      {/* Score Card */}
      <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-8 rounded-3xl border-2 border-slate-700/50 shadow-2xl w-full max-w-md text-center mb-8 backdrop-blur-xl z-10 overflow-hidden">
        {/* Shimmer effect for high scores */}
        {isNewRecord && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent animate-shimmer"></div>
        )}

        <div className="relative z-10 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-600"></div>
            <p className="text-slate-400 text-sm font-black uppercase tracking-[0.3em]">Final Score</p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-600"></div>
          </div>
          <p className="text-7xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 animate-pulse">
            {score.toLocaleString()}
          </p>
        </div>

        {isNewRecord && (
          <div className="relative bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-2 border-yellow-400/50 rounded-2xl p-4 mb-6 shadow-[0_0_30px_rgba(234,179,8,0.4)]">
            <div className="absolute inset-0 bg-yellow-400/5 animate-pulse"></div>
            <p className="relative text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300 animate-bounce-short">
              🏆 NEW HIGH SCORE! 🏆
            </p>
          </div>
        )}

        <div className="flex justify-between items-center text-sm border-t-2 border-slate-700/50 pt-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Mode</span>
            <span className={`font-black px-3 py-1 rounded-full text-xs ${
              mode === GameMode.LEVELS
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
            }`}>
              {mode === GameMode.LEVELS ? '🏆 Levels' : '♾️ Infinite'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Best</span>
            <span className="font-black text-white">{bestScore.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 z-10">
        <button
          onClick={onHome}
          className="group relative px-8 py-4 bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 rounded-2xl font-bold border-2 border-slate-600 shadow-lg transform transition-all hover:scale-105 active:scale-95 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="relative flex items-center gap-2">
            <span>🏠</span>
            <span>Main Menu</span>
          </span>
        </button>
        <button
          onClick={onRestart}
          className="group relative px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-2xl font-bold shadow-[0_0_30px_rgba(34,197,94,0.4)] border-2 border-green-400/50 transform transition-all hover:scale-105 active:scale-95 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity animate-shimmer"></div>
          <span className="relative flex items-center gap-2">
            <span>🔄</span>
            <span>Play Again</span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default GameOver;