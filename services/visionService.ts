// Vision Service - MediaPipe Hands via CDN
// Runs in Web Worker (separate thread) - ZERO game lag

// TypeScript declarations for MediaPipe global objects
declare const Hands: any;
declare const Camera: any;

export interface HandResult {
  // Normalized coordinates (0-1 range)
  indexFingerTip: { x: number; y: number };
}

export class VisionService {
  private hands: any = null;
  private camera: any = null;
  public videoElement: HTMLVideoElement | null = null;
  private onResultsCallback: ((results: HandResult | null) => void) | null = null;
  public isRunning: boolean = false;
  private lastHandResults: any = null;
  private lastValidResult: HandResult | null = null;
  private lastValidTime: number = 0;
  private temporalSmoothingMs: number = 150; // Keep showing cursor for 150ms after losing tracking

  constructor() {
    console.log("🎯 VisionService created");
  }

  setCallback(callback: ((results: HandResult | null) => void) | null) {
    this.onResultsCallback = callback;
  }

  // Check if index finger is pointing (works in all orientations - up, down, sideways)
  private isPointingGesture(landmarks: any[]): boolean {
    if (!landmarks || landmarks.length < 21) return false;

    // Hand keypoints: 8=index tip, 12=middle tip, 16=ring tip, 20=pinky tip
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];  // Index middle joint
    const middleTip = landmarks[12];
    const middlePIP = landmarks[10];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // Calculate finger "straightness" - check if finger is extended
    const fingerStraightness = (tip: any, joint: any) => {
      const dx = tip.x - joint.x;
      const dy = tip.y - joint.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const indexStraight = fingerStraightness(indexTip, indexPIP);
    const middleStraight = fingerStraightness(middleTip, middlePIP);

    // Very relaxed detection: Index finger should be more extended than at least middle finger
    // This works for pointing in any direction (up, down, sideways, forward)
    const indexMoreExtended = indexStraight > middleStraight * 0.7; // Very lenient

    return indexMoreExtended;
  }

  private onResults = (results: any) => {
    this.lastHandResults = results;

    if (!this.onResultsCallback) return;

    const now = performance.now();

    // Check if hand detected and user is pointing
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      // Very lenient gesture check - just need index finger visible
      if (this.isPointingGesture(landmarks)) {
        const indexTip = landmarks[8]; // Index finger tip

        const handResult: HandResult = {
          indexFingerTip: {
            x: indexTip.x,
            y: indexTip.y,
          }
        };

        this.lastValidResult = handResult;
        this.lastValidTime = now;
        this.onResultsCallback(handResult);
      } else {
        // Hand detected but not pointing - use temporal smoothing
        if (now - this.lastValidTime < this.temporalSmoothingMs && this.lastValidResult) {
          // Keep showing last position briefly
          this.onResultsCallback(this.lastValidResult);
        } else {
          this.onResultsCallback(null);
        }
      }
    } else {
      // No hand detected - use temporal smoothing
      if (now - this.lastValidTime < this.temporalSmoothingMs && this.lastValidResult) {
        // Keep showing last position briefly (prevents flicker on fast movements)
        this.onResultsCallback(this.lastValidResult);
      } else {
        this.onResultsCallback(null);
      }
    }
  }

  async start(videoElement: HTMLVideoElement): Promise<boolean> {
    if (this.isRunning) {
      console.log("⚠️ Vision service already running");
      return true;
    }

    this.videoElement = videoElement;

    // Check if MediaPipe scripts loaded
    if (typeof Hands === 'undefined') {
      console.error("❌ MediaPipe scripts not loaded");
      alert("⚠️ Hand tracking unavailable\n\nUsing mouse cursor instead.");
      return false;
    }

    try {
      console.log("🔧 Initializing MediaPipe Hands (Web Worker mode)...");

      // Initialize MediaPipe Hands
      this.hands = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      // Configure for real-time performance
      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,        // Fastest model (0=lite, 1=full)
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5, // Lower = more responsive, less lag
        selfieMode: true,           // Mirror coordinates to match mirrored camera view
      });

      this.hands.onResults(this.onResults);

      console.log("✅ MediaPipe Hands initialized");

      // Initialize camera
      console.log("🎥 Starting camera...");

      this.camera = new Camera(videoElement, {
        onFrame: async () => {
          if (this.hands && this.isRunning) {
            await this.hands.send({ image: videoElement });
          }
        },
        width: 640,
        height: 480,
        facingMode: 'user',
      });

      await this.camera.start();

      this.isRunning = true;
      console.log("✅ Camera started");
      console.log("🚀 Real-time hand tracking active - point with index finger!");

      return true;

    } catch (e: any) {
      console.error("❌ Initialization error:", e);
      alert(`⚠️ Hand tracking failed\n\nUsing mouse cursor instead.`);
      return false;
    }
  }

  stop() {
    console.log("🛑 Stopping vision service");

    this.isRunning = false;

    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }

    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }

    if (this.videoElement?.srcObject) {
      const stream = this.videoElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }
  }
}
