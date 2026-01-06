// This service abstracts the MediaPipe complexity
import { Hands } from '@mediapipe/hands';

export class VisionService {
  private hands: any;
  public videoElement: HTMLVideoElement | null = null;
  private onResultsCallback: ((results: any) => void) | null = null;
  public isRunning: boolean = false;
  
  // Watchdog & Recovery State
  private lastResultTime: number = 0;
  private isRestarting: boolean = false;
  private watchdogTimer: any = null;

  constructor() {
    this.startWatchdog();

    // Handle visibility changes to recover from background throttling
    document.addEventListener("visibilitychange", async () => {
      if (!document.hidden && this.isRunning) {
         console.log("Tab visible — resuming tracking");
         // Force a check/restart to ensure we are live
         this.lastResultTime = performance.now(); 
         await this.restartPipeline();
      }
    });
  }

  setCallback(callback: ((results: any) => void) | null) {
      this.onResultsCallback = callback;
  }

  private handleResults = (results: any) => {
      // Update heartbeat - pipeline is alive
      this.lastResultTime = performance.now();
      
      if (this.onResultsCallback) {
          this.onResultsCallback(results);
      }
  }

  private startWatchdog() {
      if (this.watchdogTimer) clearInterval(this.watchdogTimer);
      
      this.watchdogTimer = setInterval(() => {
          // Only monitor if we expect to be running
          if (!this.isRunning || this.isRestarting || !this.videoElement) return;

          const now = performance.now();
          const STALL_THRESHOLD_MS = 2000; 

          // 1. Check for Pipeline Stall (no results callback firing for > 2s)
          // Note: onResults fires even with empty hands, so this detects internal freeze.
          if (now - this.lastResultTime > STALL_THRESHOLD_MS) {
              console.warn("Tracking stalled (no results) — restarting MediaPipe");
              this.restartPipeline();
              return;
          }

          // 2. Check for Dead Camera Stream
          if (this.videoElement.srcObject) {
              const stream = this.videoElement.srcObject as MediaStream;
              const isAlive = stream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled);
              if (!isAlive) {
                  console.warn("Camera stream died — restarting camera");
                  this.start(this.videoElement); // Re-run start to acquire new stream
              }
          }
      }, 1000);
  }

  private async initMediaPipe() {
      // Cleanup existing instance if any
      if (this.hands) {
          try { await this.hands.close(); } catch(e) { /* ignore */ }
          this.hands = null;
      }

      console.log("🔧 Initializing MediaPipe Hands from npm package...");

      try {
          // Initialize MediaPipe Hands from the npm package
          this.hands = new Hands({
            locateFile: (file: string) => {
              // Use local files from public directory served by Vite
              console.log(`Loading MediaPipe file: ${file}`);
              return `/mediapipe/${file}`;
            },
          });

          this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 0, // Fastest
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });

          this.hands.onResults(this.handleResults);
          console.log("✅ MediaPipe Hands initialized successfully");
      } catch (e) {
          console.error("❌ Failed to initialize MediaPipe Hands:", e);
          alert("⚠️ Camera tracking unavailable: Failed to initialize hand tracking.\n\nYou can still play with your mouse!");
          throw e;
      }
  }

  async restartPipeline() {
      if (this.isRestarting) return;
      this.isRestarting = true;
      
      try {
          await this.initMediaPipe();
          this.lastResultTime = performance.now(); // Reset watchdog timer
          
          // Ensure video is playing (sometimes pauses on tab switch)
          if (this.videoElement && this.videoElement.paused) {
              try { await this.videoElement.play(); } catch(e) {}
          }
      } catch (e) {
          console.error("Pipeline restart failed", e);
      } finally {
          this.isRestarting = false;
      }
  }

  async start(videoElement: HTMLVideoElement) {
    // If we are already running with this element, do nothing.
    if (this.isRunning && this.videoElement === videoElement) return;

    this.videoElement = videoElement;

    // 1. Init MediaPipe if needed
    if (!this.hands) {
        await this.initMediaPipe();
    }

    // 2. Init Camera Stream if needed
    if (!this.videoElement.srcObject) {
        try {
            console.log("🎥 Requesting camera access...");
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user",
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 60, max: 60 },
                },
                audio: false,
            });

            console.log("✅ Camera access granted");
            this.videoElement.srcObject = stream;
            this.videoElement.playsInline = true;
            this.videoElement.muted = true;
            this.videoElement.autoplay = true;
            this.videoElement.setAttribute("playsinline", "true");

            // Wait for data to ensure dimensions are ready
            await new Promise<void>((resolve) => {
                if (!this.videoElement) return resolve();
                if (this.videoElement.readyState >= 2) return resolve();
                this.videoElement.onloadeddata = () => resolve();
            });

            await this.videoElement.play();
            console.log("✅ Camera stream started successfully");
        } catch (e: any) {
            console.error("❌ Camera start error:", e);
            let errorMsg = "Failed to access camera. ";

            if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
                errorMsg += "Permission denied. Please allow camera access and refresh the page.";
            } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
                errorMsg += "No camera found on this device.";
            } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
                errorMsg += "Camera is already in use by another application.";
            } else if (e.name === 'OverconstrainedError') {
                errorMsg += "Camera doesn't support the requested configuration.";
            } else if (e.name === 'SecurityError') {
                errorMsg += "Camera access requires HTTPS or localhost.";
            } else {
                errorMsg += e.message || "Unknown error.";
            }

            errorMsg += "\n\nYou can still play with your mouse!";
            console.error(errorMsg);
            alert("⚠️ " + errorMsg);
            return;
        }
    }

    // 3. Start Frame Loop
    if (!this.isRunning) {
        this.isRunning = true;
        this.lastResultTime = performance.now();
        this.processFrame();
    }
  }

  processFrame = async () => {
    // Robust Loop: Always request next frame unless explicitly stopped.
    // We do this before processing to maintain loop continuity even if errors occur.
    if (!this.isRunning) return;
    
    requestAnimationFrame(this.processFrame);

    if (this.isRestarting || !this.videoElement || !this.hands) return;

    if (this.videoElement.readyState >= 2) {
      try {
        await this.hands.send({ image: this.videoElement });
      } catch (e: any) {
        // Suppress expected errors during restart/shutdown/race conditions
        if (!e?.toString().includes('deleted object')) {
             console.warn("MediaPipe send error (will retry)", e);
        }
      }
    }
  }

  stop() {
    this.isRunning = false;
    
    if (this.watchdogTimer) {
        clearInterval(this.watchdogTimer);
        this.watchdogTimer = null;
    }

    if (this.videoElement && this.videoElement.srcObject) {
         const stream = this.videoElement.srcObject as MediaStream;
         stream.getTracks().forEach(track => track.stop());
         this.videoElement.srcObject = null;
    }

    if (this.hands) {
        try { this.hands.close(); } catch (e) {}
        this.hands = null; 
    }
  }
}