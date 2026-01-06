class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false; // SFX Mute

  // Music State
  private musicMasterGain: GainNode | null = null;
  public isMusicMuted: boolean = false;
  
  // HTML Audio Playback State (Replaces AudioBuffer)
  private musicElement: HTMLAudioElement | null = null;
  private musicSourceNode: MediaElementAudioSourceNode | null = null;

  constructor() {
    try {
        const saved = localStorage.getItem('bubble_pop_music_muted');
        this.isMusicMuted = saved === 'true';
    } catch (e) {
        this.isMusicMuted = false;
    }
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.5;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Music System (HTML Audio Source) ---

  async loadMusic(url: string) {
    if (!this.ctx) this.init();
    if (!this.ctx || this.musicElement) return;

    // Use standard HTML Audio element for robust MP3 decoding
    const audio = new Audio(url);
    audio.loop = true;
    audio.preload = "auto";
    audio.crossOrigin = "anonymous"; // Important for Web Audio API connection
    audio.volume = 1.0; // Volume is controlled via the GainNode
    
    this.musicElement = audio;
  }

  async startMusic() {
    if (!this.ctx) this.init();
    if (!this.ctx || !this.musicElement) return;
    
    // Prevent duplicate source creation if already connected
    if (this.musicSourceNode) return;

    if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
    }

    if (!this.musicMasterGain) {
        this.musicMasterGain = this.ctx.createGain();
        this.musicMasterGain.connect(this.ctx.destination);
    }
    
    this.musicMasterGain.gain.value = this.isMusicMuted ? 0 : 0.35;
    
    // Connect <audio> to Web Audio Graph
    this.musicSourceNode = this.ctx.createMediaElementSource(this.musicElement);
    this.musicSourceNode.connect(this.musicMasterGain);
    
    try {
        await this.musicElement.play();
    } catch (e) {
        console.warn("Music play blocked until user interaction", e);
    }
  }

  stopMusic() {
      if (this.musicElement) {
          this.musicElement.pause();
          this.musicElement.currentTime = 0;
          // Clean up element to ensure fresh creation on next load
          this.musicElement = null; 
      }
      
      if (this.musicSourceNode) {
          this.musicSourceNode.disconnect();
          this.musicSourceNode = null;
      }
  }

  duckMusic(duration = 400) {
      if (!this.musicMasterGain || !this.ctx || this.isMusicMuted) return;
      const t = this.ctx.currentTime;
      const baseVol = 0.35;
      
      this.musicMasterGain.gain.cancelScheduledValues(t);
      this.musicMasterGain.gain.setValueAtTime(this.musicMasterGain.gain.value, t);
      this.musicMasterGain.gain.linearRampToValueAtTime(0.1, t + 0.05);
      this.musicMasterGain.gain.linearRampToValueAtTime(baseVol, t + (duration / 1000));
  }

  pauseMusic() {
      // "Duck" to 0 but stay there
      if (!this.musicMasterGain || !this.ctx || this.isMusicMuted) return;
      const t = this.ctx.currentTime;
      this.musicMasterGain.gain.cancelScheduledValues(t);
      this.musicMasterGain.gain.setValueAtTime(this.musicMasterGain.gain.value, t);
      this.musicMasterGain.gain.linearRampToValueAtTime(0, t + 0.1);
  }

  resumeMusic() {
      if (!this.musicMasterGain || !this.ctx || this.isMusicMuted) return;
      const t = this.ctx.currentTime;
      this.musicMasterGain.gain.cancelScheduledValues(t);
      this.musicMasterGain.gain.setValueAtTime(this.musicMasterGain.gain.value, t);
      this.musicMasterGain.gain.linearRampToValueAtTime(0.35, t + 0.1);
  }

  toggleMusic() {
      this.isMusicMuted = !this.isMusicMuted;
      localStorage.setItem('bubble_pop_music_muted', String(this.isMusicMuted));
      
      if (this.musicMasterGain && this.ctx) {
          const target = this.isMusicMuted ? 0 : 0.35;
          this.musicMasterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
      }
      return this.isMusicMuted;
  }

  // --- SFX ---

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.5;
    }
    return this.isMuted;
  }

  playPop() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400 + Math.random() * 200, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1); // Upward chirp
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playRarePop() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    // Classic coin sound: B5 -> E6
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(this.masterGain!);
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(987.77, t); // B5
    osc1.frequency.setValueAtTime(1318.51, t + 0.08); // E6
    gain1.gain.setValueAtTime(0.2, t);
    gain1.gain.linearRampToValueAtTime(0.2, t + 0.4);
    gain1.gain.linearRampToValueAtTime(0, t + 0.45);
    osc1.start(t);
    osc1.stop(t + 0.45);
  }

  playBomb() {
    this.duckMusic();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 0.3);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playHeart() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.type = 'square';
    // Arpeggio C Major
    osc.frequency.setValueAtTime(523.25, t); 
    osc.frequency.setValueAtTime(659.25, t + 0.1); 
    osc.frequency.setValueAtTime(783.99, t + 0.2); 
    osc.frequency.setValueAtTime(1046.50, t + 0.3); 
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
    osc.start(t);
    osc.stop(t + 0.6);
  }
}

export const audioService = new AudioService();