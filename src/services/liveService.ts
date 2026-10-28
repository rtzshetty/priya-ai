import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { processCommand } from "./commandService";
import { AssistantMode, AssistantLanguage, getSystemInstruction, saveUserMemory } from "../utils/promptUtils";

// Use VITE_ prefix for production builds (standard Vite behavior)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

export class LiveSessionManager {
  private ai!: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private liveSession: any = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isConnected: boolean = false;
  
  // Screen Sharing
  private screenStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private screenCaptureTimeout: any = null;
  private isProcessingFrame: boolean = false;

  // Audio playback state
  private playbackContext: AudioContext | null = null;
  private activeAudioSources: AudioBufferSourceNode[] = [];
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  public isMuted: boolean = false;
  
  public onStateChange: (state: "idle" | "listening" | "processing" | "speaking") => void = () => {};
  public onMessage: (sender: "user" | "priya", text: string) => void = () => {};
  public onCommand: (url: string) => void = () => {};
  public onError: (message: string) => void = () => {};

  constructor() {
    // No-op, will initialize in start()
  }

  async start(
    location?: { lat: number; lng: number },
    mode: AssistantMode = "personal",
    language: AssistantLanguage = "hinglish",
    userName: string = "Guest"
  ) {
    try {
      if (!API_KEY) {
        throw new Error("GEMINI_API_KEY is not defined.");
      }
      this.ai = new GoogleGenAI({ apiKey: API_KEY });
      this.onStateChange("processing");
      this.startTime = Date.now();
      
      const locStr = location ? `\n\nUser current location: Latitude ${location.lat}, Longitude ${location.lng}. Use this for navigation/directions help.` : "";
      
      const screenInstruction = "\n\nThe user may share their screen with you at any time. When they do, you will receive real-time video frames of their screen. Use this visual context to help them, guide them on what to do, troubleshoot, or analyze what they are looking at.";
      
      const dynamicInstruction = getSystemInstruction(mode, language, userName) + locStr + screenInstruction;
      
      // 1. Get Microphone FIRST - Use more robust constraints
      try {
        const constraints: any = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            // Advanced non-standard properties for maximum noise reduction
            googNoiseSuppression: true,
            googHighpassFilter: true,
            googAutoGainControl: true,
            voiceIsolation: true, // For newer browsers that support hardware voice isolation
          }
        };
        
        console.log("Requesting microphone with constraints:", constraints);
        this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (micError: any) {
        console.warn("Microphone access warning details:", micError);
        
        // Try fallback with simplest constraints
        if (micError.name === 'OverconstrainedError' || micError.name === 'ConstraintNotSatisfiedError') {
          console.log("Retrying with simple audio constraints...");
          try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (retryError: any) {
            console.warn("Fallback microphone access warning:", retryError);
            throw new Error(retryError.name === 'NotAllowedError' ? "Permission denied" : "Microphone error: " + retryError.message);
          }
        } else {
          // If already blocked or other error
          throw new Error(micError.name === 'NotAllowedError' ? "Permission denied" : "Microphone error: " + micError.message);
        }
      }

      // 2. Initialize Audio Contexts ONLY after microphone is granted
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio API is not supported in this browser.");
      }
      
      // Reuse context if it exists and is not closed
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContextClass({ sampleRate: 16000 });
      }
      if (!this.playbackContext || this.playbackContext.state === 'closed') {
        this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
      }
      
      this.nextPlayTime = this.playbackContext.currentTime;

      // Resume contexts on user interaction (we are in a click handler context here)
      await Promise.all([
        this.audioContext.resume(),
        this.playbackContext.resume()
      ]);

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.sessionPromise || !this.isConnected) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Convert to base64
        const buffer = new ArrayBuffer(pcm16.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < pcm16.length; i++) {
          view.setInt16(i * 2, pcm16[i], true);
        }
        
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);

        if (this.liveSession) {
          try {
            this.liveSession.sendRealtimeInput({
              audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
            });
          } catch(err) { console.warn("Error sending audio", err); }
        }
      };

      // Create Voice Isolation Filters (Bandpass-like effect for human voice range ~300Hz to 3400Hz)
      const highpassFilter = this.audioContext.createBiquadFilter();
      highpassFilter.type = 'highpass';
      highpassFilter.frequency.value = 300; // Cut off low background rumbles/hums

      const lowpassFilter = this.audioContext.createBiquadFilter();
      lowpassFilter.type = 'lowpass';
      lowpassFilter.frequency.value = 3400; // Cut off high background hisses/noise

      // Chain: source -> highpass -> lowpass -> processor
      this.source.connect(highpassFilter);
      highpassFilter.connect(lowpassFilter);
      lowpassFilter.connect(this.processor);

      this.processor.connect(this.audioContext.destination);

      // Connect to Live API
      this.sessionPromise = this.ai.live.connect({

        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          systemInstruction: dynamicInstruction,
          tools: [{
            functionDeclarations: [
              {
                name: "executeBrowserAction",
                description: "Open a website, perform a Google search, or perform a browser action (like YouTube or Spotify). STRICT RULE: Do NOT use the 'search' actionType unless the user explicitly and strictly tells you to 'search on google' or 'search in google'. Do not use it just because they ask a general question.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    actionType: { type: Type.STRING, description: "Type: 'open', 'search', 'youtube', 'spotify', 'whatsapp', 'directions'" },
                    query: { type: Type.STRING, description: "Search query, website name, or destination for directions." },
                    target: { type: Type.STRING, description: "Phone number or origin for directions (optional)." }
                  },
                  required: ["actionType", "query"]
                }
              },
              {
                name: "saveUserMemory",
                description: "Save an important fact about the user (e.g., likes, dislikes, pets, job) to their permanent profile.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    fact: { type: Type.STRING, description: "A concise fact to remember about the user." }
                  },
                  required: ["fact"]
                }
              },
              {
                name: "singSong",
                description: "Call this tool when the user wants to hear a song, or when they want you to sing. You must provide the lyrics. It will play the song.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    lyrics: { type: Type.STRING, description: "The lyrics of the song to sing." }
                  },
                  required: ["lyrics"]
                }
              }
            ]
          }]
        },
        callbacks: {
          onopen: () => {
            console.log("Live API Connected");
            // Handshake buffer: wait a tiny bit for backend to settle
            setTimeout(async () => {
              this.isConnected = true;
              this.liveSession = this.sessionPromise ? await this.sessionPromise : null;
              this.onStateChange("listening");
            }, 500);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Check for session duration and log
            const elapsed = Date.now() - this.startTime;
            if (elapsed > 45 * 60 * 1000) {
              console.warn("Session has been open for > 45 mins. Stability may decrease.");
            }

            // Handle Model Turn (Audio and Text)
            if (message.serverContent?.modelTurn) {
              const parts = message.serverContent.modelTurn.parts || [];
              for (const part of parts) {
                if (part.inlineData?.data) {
                  this.onStateChange("speaking");
                  this.playAudioChunk(part.inlineData.data);
                }
                if (part.text) {
                  this.onMessage("priya", part.text);
                }
              }
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              this.stopPlayback();
              this.onStateChange("listening");
            }

            // Handle Transcriptions
            // Note: Transcription data can arrive in serverContent before the full model turn is finished
            // We focus on text parts in the model turn for Priya's messages.
            
            // Handle Function Calls
            const functionCalls = message.toolCall?.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
              for (const call of functionCalls) {
                if (call.name === "saveUserMemory") {
                  const args = call.args as any;
                  if (args.fact) {
                    saveUserMemory(userName, args.fact);
                    // Send tool response
                    if (this.liveSession) {
                       this.liveSession.sendToolResponse({
                         functionResponses: [{
                           name: call.name,
                           id: call.id,
                           response: { success: true, message: "Fact saved successfully." }
                         }]
                       });
                    }
                  }
                } else if (call.name === "singSong") {
                  const args = call.args as any;
                  this.onMessage("priya", "Got it! Generating the song and warming up my vocals...");
                  
                  import("./geminiService").then(({ generateSong }) => {
                    generateSong(`Sing this: ${args.lyrics}`)
                    .then(data => {
                      if (data.audio) {
                        this.onMessage("priya", "Here is your song! 🎵");
                        const audio = new Audio(`data:${data.mimeType};base64,${data.audio}`);
                        audio.play().catch(e => console.error("Error playing song:", e));
                        
                        if (this.liveSession) {
                          this.liveSession.sendToolResponse({
                            functionResponses: [{
                              name: call.name,
                              id: call.id,
                              response: { success: true, message: "Song played successfully." }
                            }]
                          });
                        }
                      }
                    })
                    .catch(err => {
                      if (this.liveSession) {
                        this.liveSession.sendToolResponse({
                          functionResponses: [{
                            name: call.name,
                            id: call.id,
                            response: { success: false, error: err.message }
                          }]
                        });
                      }
                    });
                  });
                } else if (call.name === "executeBrowserAction") {
                  const args = call.args as any;
                  let url = "";
                  if (args.actionType === "youtube") {
                    url = `https://www.youtube.com/results?search_query=${encodeURIComponent(args.query)}`;
                  } else if (args.actionType === "spotify") {
                    url = `https://open.spotify.com/search/${encodeURIComponent(args.query)}`;
                  } else if (args.actionType === "whatsapp") {
                    url = `https://web.whatsapp.com/send?phone=${args.target || ''}&text=${encodeURIComponent(args.query)}`;
                  } else if (args.actionType === "directions") {
                    const origin = args.target ? encodeURIComponent(args.target) : "";
                    const destination = encodeURIComponent(args.query);
                    url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
                  } else if (args.actionType === "search") {
                    url = `https://www.google.com/search?q=${encodeURIComponent(args.query)}`;
                  } else {
                    let website = args.query.replace(/\s+/g, "");
                    if (!website.includes(".")) website += ".com";
                    url = `https://www.${website}`;
                    
                    // Fallback to Google Search if URL is totally invalid (e.g. contains spaces, colons incorrectly)
                    try {
                      new URL(url);
                    } catch (e) {
                      url = `https://www.google.com/search?q=${encodeURIComponent(args.query)}`;
                    }
                  }
                  
                  this.onCommand(url);
                  
                  // Send tool response
                  if (this.liveSession) {
                     this.liveSession.sendToolResponse({
                       functionResponses: [{
                         name: call.name,
                         id: call.id,
                         response: { result: "Action executed successfully in the browser." }
                       }]
                     });
                  }
                }
              }
            }
          },
          onclose: () => {
            console.log("Live API Closed");
            this.stop();
          },
          onerror: (err: any) => {
            console.warn("Live API Error:", err);
            const errMsg = err?.message || String(err);
            if (errMsg.includes("Resource has been exhausted") || errMsg.includes("quota")) {
                this.onError("QUOTA_EXCEEDED");
            } else if (errMsg.includes("deadline") || errMsg.includes("timeout")) {
                this.onError("SESSION_TIMEOUT");
            } else {
                this.onError(errMsg);
            }
            this.stop();
          }
        }
      });

    } catch (error) {
      console.warn("Failed to start Live Session:", error);
      this.stop();
      throw error;
    }
  }

  private playAudioChunk(base64Data: string) {
    if (!this.playbackContext || this.isMuted) return;
    
    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const buffer = new Int16Array(bytes.buffer);
      const audioBuffer = this.playbackContext.createBuffer(1, buffer.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        channelData[i] = buffer[i] / 32768.0;
      }
      
      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.playbackContext.destination);
      
      const currentTime = this.playbackContext.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }
      
      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
      this.isPlaying = true;

      // Track active sources so we can stop them if interrupted
      this.activeAudioSources.push(source);
      
      source.onended = () => {
        this.activeAudioSources = this.activeAudioSources.filter(s => s !== source);
        if (this.activeAudioSources.length === 0) {
          this.isPlaying = false;
          this.onStateChange("listening");
        }
      };
    } catch (e) {
      console.warn("Error playing chunk", e);
    }
  }

  private stopPlayback() {
    // Stop all currently playing and queued sources
    this.activeAudioSources.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
    this.activeAudioSources = [];
    
    if (this.playbackContext) {
      // Reset next play time to current wall clock
      this.nextPlayTime = this.playbackContext.currentTime;
    }
    this.isPlaying = false;
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    
    this.stopPlayback();
    this.stopScreenShare();
    
    if (this.liveSession) {
      try { this.liveSession.close(); } catch (e) {}
      this.liveSession = null;
    }
    if (this.sessionPromise) {
      this.sessionPromise.then(session => session.close()).catch(() => {});
      this.sessionPromise = null;
    }
    this.isConnected = false;
    this.startTime = 0;
    
    this.onStateChange("idle");
  }

  sendText(text: string) {
    if (this.liveSession) {
      try {
        this.liveSession.sendRealtimeInput({ text });
      } catch (err) {}
    }
  }

  async startScreenShare() {
    this.stopScreenShare(); // Clear any existing screen share session
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      console.warn("Screen sharing is not supported on this device/browser.");
      return false;
    }

    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { max: 800 }, // Reduced max resolution for stability
          height: { max: 600 },
          frameRate: { max: 2 } // Lower frame rate for less overhead
        },
        audio: false
      });

      this.videoElement = document.createElement("video");
      this.videoElement.srcObject = this.screenStream;
      this.videoElement.muted = true;
      this.videoElement.setAttribute("playsinline", "");
      await this.videoElement.play();

      this.canvasElement = document.createElement("canvas");
      
      this.screenStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

      // Use a self-scheduling loop instead of setInterval to ensure atomic frame processing
      this.isProcessingFrame = false;
      this.captureLoop();

      return true;
    } catch (error) {
      console.warn("Screen share error:", error);
      this.stopScreenShare();
      return false;
    }
  }

  private captureLoop = () => {
    if (!this.screenStream || !this.isConnected) return;
    
    this.captureAndSendFrame();
    
    // Schedule next frame capture in 2 seconds (0.5 FPS)
    // This allows plenty of time for processing and prevents buildup
    this.screenCaptureTimeout = setTimeout(this.captureLoop, 2000);
  };

  private captureAndSendFrame() {
    if (this.isProcessingFrame || !this.isConnected || !this.liveSession || !this.videoElement || !this.canvasElement) return;

    if (this.videoElement.videoWidth === 0 || this.videoElement.videoHeight === 0) return;

    this.isProcessingFrame = true;
    try {
      // Scale down aggressively: Max width 480px for stability on mobile/slow connections
      const MAX_WIDTH = 480;
      const scale = Math.min(1, MAX_WIDTH / this.videoElement.videoWidth);
      this.canvasElement.width = this.videoElement.videoWidth * scale;
      this.canvasElement.height = this.videoElement.videoHeight * scale;
      
      const ctx = this.canvasElement.getContext("2d", { alpha: false }); // Disable alpha for perf
      if (!ctx) return;

      ctx.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
      
      // Use very aggressive JPEG compression (0.1) to minimize payload size
      const dataUrl = this.canvasElement.toDataURL("image/jpeg", 0.1);
      const base64Data = dataUrl.split(",")[1];

      if (this.liveSession) {
        this.liveSession.sendRealtimeInput({
          video: { data: base64Data, mimeType: "image/jpeg" }
        });
      }
    } catch (err) { 
      console.warn("Error sending video frame", err); 
    } finally {
      this.isProcessingFrame = false;
    }
  }

  stopScreenShare() {
    if (this.screenCaptureTimeout !== null) {
      clearTimeout(this.screenCaptureTimeout);
      this.screenCaptureTimeout = null;
    }
    this.isProcessingFrame = false;
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    this.canvasElement = null;
  }
}
