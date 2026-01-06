# 🫧 Bubble Pop: Finger Frenzy

An interactive bubble-popping game featuring **real-time hand tracking** using MediaPipe or classic mouse controls!

## ✨ Features

- 🎮 **Smart Controls**
  - 📷 **Camera Tracking** (Priority): Use your real finger tracked via MediaPipe Hands
  - 🖱️ **Mouse Cursor** (Automatic Fallback): Works if camera is unavailable

- 🎯 **Two Game Modes**
  - 🏆 **Level Mode**: Progress through increasingly difficult levels with 3 hearts
  - ♾️ **Infinite Mode**: Endless gameplay with one life - how high can you score?

- 💫 **Special Bubbles**
  - ⭐ Golden bubbles for bonus points
  - ❤️ Heart bubbles to restore health
  - 💣 Bombs to avoid (or lose a heart!)

- 🎨 **Beautiful UI**
  - Gradient backgrounds and glowing effects
  - Smooth animations and transitions
  - Particle effects on bubble pops

- 💾 **Progress Tracking**
  - Automatic checkpoint saves
  - High score tracking per mode
  - Resume from your highest unlocked level

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)

### Run Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   - Navigate to `http://localhost:3000`
   - Grant camera permission if using finger tracking
   - Start playing!

## 📦 Deploy to Vercel

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Follow the prompts** and your app will be live!

### Option 2: Deploy via Vercel Dashboard

1. **Push to GitHub** (or GitLab/Bitbucket)
2. **Go to [vercel.com](https://vercel.com)**
3. **Click "Import Project"**
4. **Select your repository**
5. **Vercel will auto-detect Vite** and deploy!

## 🎮 How to Play

1. **Grant camera permission** when prompted (camera tracking is automatic priority)
   - Game will fall back to mouse cursor if camera unavailable

2. **Select game mode:**
   - 🏆 Level Mode: Beat levels and unlock new ones
   - ♾️ Infinite Mode: Survive as long as possible

3. **Pop bubbles by touching/clicking them**

4. **Avoid bombs!** They'll cost you a heart

5. **Collect special bubbles:**
   - ⭐ Golden = Bonus points
   - ❤️ Hearts = Restore health (Level Mode only)

## 🛠️ Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling (via CDN)
- **MediaPipe Hands** - Real-time hand tracking
- **Web Audio API** - Sound effects and music

## 📝 Notes

- **Camera mode requires HTTPS** or localhost for browser security
- **MediaPipe assets** (~23MB) are bundled for reliable offline usage
- **Best played in fullscreen** for immersive experience
- **Works on desktop and mobile** browsers

## 🎯 Game Tips

- In Level Mode, you keep your score when advancing to new levels
- Golden bubbles are worth 5x regular bubbles
- Heart bubbles only appear when you're below 3 hearts
- The game gets progressively harder with more bombs and faster bubbles
- Pause the game anytime by pressing ESC (Level Mode)

## 📄 License

MIT

---

Made with ❤️ using React + Vite + MediaPipe
