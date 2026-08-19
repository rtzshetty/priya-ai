import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Keyboard, Send, Trash2, Video, Map, Save, LogOut, Activity, Monitor } from "lucide-react";
import { getPriyaResponse, getPriyaAudio, resetPriyaSession, analyzeUserMood } from "./services/geminiService";
import { processCommand } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import Visualizer from "./components/Visualizer";
import PermissionModal from "./components/PermissionModal";
import VideoGenerator from "./components/VideoGenerator";
import InteractiveMap from "./components/InteractiveMap";
import WelcomeScreen from "./components/WelcomeScreen";
import MoodTracker from "./components/MoodTracker";
import { playPCM } from "./utils/audioUtils";
import { motion, AnimatePresence } from "motion/react";
import { AssistantMode, AssistantLanguage } from "./utils/promptUtils";

type AppState = "idle" | "listening" | "processing" | "speaking";

interface ChatMessage {
  id: string;
  sender: "user" | "priya";
  text: string;
  sources?: { title: string; url: string; type?: "web" | "maps" }[];
}

interface MoodDataPoint {
  time: string;
  score: number;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("priya_user_name") || "";
  });

  const handleNameSubmit = (name: string) => {
    localStorage.setItem("priya_user_name", name);
    setUserName(name);
  };

  const [appState, setAppState] = useState<AppState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("priya_chat_local_cache");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const messagesRef = useRef(messages);

  const [moodData, setMoodData] = useState<MoodDataPoint[]>(() => {
    const saved = localStorage.getItem("priya_mood_data");
    return saved ? JSON.parse(saved) : [];
  });
  const [showMoodTracker, setShowMoodTracker] = useState(false);

  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("priya_chat_local_cache", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("priya_mood_data", JSON.stringify(moodData));
  }, [moodData]);

  useEffect(() => {
    if (messages.length === 0) {
      const initialMsg: ChatMessage = { id: "1", sender: "priya", text: "Namaste! I'm Priya. How can I entertain you today?" };
      setMessages([initialMsg]);
    }
  }, []);

  const addMessage = (msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
  };

  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.isMuted = isMuted;
    }
  }, [isMuted]);

  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [errorType, setErrorType] = useState<string>("PERMISSION_DENIED");
  const [showVideoGenerator, setShowVideoGenerator] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeMap, setActiveMap] = useState<{ origin?: string; destination: string } | null>(null);
  const [mode, setMode] = useState<AssistantMode>("personal");
  const [language, setLanguage] = useState<AssistantLanguage>("hinglish");
  const [isDictating, setIsDictating] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      liveSessionRef.current?.stopScreenShare();
      setIsScreenSharing(false);
    } else {
      if (!isSessionActive) {
        alert("Please start the Voice Session first before sharing your screen.");
        return;
      }
      if (liveSessionRef.current) {
        const success = await liveSessionRef.current.startScreenShare();
        if (success) {
          setIsScreenSharing(true);
        }
      }
    }
  };

  const startDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setIsDictating(true);
    recognition.onend = () => setIsDictating(false);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      setTextInput(transcript);
    };
    recognition.onerror = (event: any) => {
      console.warn("Speech recognition warning:", event.error);
      setIsDictating(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopDictation = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const liveSessionRef = useRef<LiveSessionManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleDownloadChat = () => {
    if (messages.length === 0) return;
    const conversation = messages
      .map(m => `${m.sender.toUpperCase()}: ${m.text}`)
      .join("\n\n");
    
    const blob = new Blob([conversation], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Priya_Chat_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, appState]);

  useEffect(() => {
    let watchId: number;
    
    const timer = setTimeout(() => {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.warn("Location access declined/failed:", error.message);
          },
          { enableHighAccuracy: false, timeout: 5000 }
        );
      }
    }, 2000);
    
    return () => {
      clearTimeout(timer);
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const handleTextCommand = useCallback(async (finalTranscript: string) => {
    if (!finalTranscript.trim()) {
      setAppState("idle");
      return;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), sender: "user", text: finalTranscript };
    addMessage(userMsg);
    
    if (isSessionActive && liveSessionRef.current) {
      liveSessionRef.current.sendText(finalTranscript);
      return;
    }

    setAppState("processing");
    const commandResult = await processCommand(finalTranscript);
    let responseText = "";

    if (commandResult.isBrowserAction) {
      responseText = commandResult.action;
      const priyaMsg: ChatMessage = { id: Date.now().toString() + "-z", sender: "priya", text: responseText };
      addMessage(priyaMsg);
      
      if (commandResult.mapData) {
        setActiveMap(commandResult.mapData);
      }

      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getPriyaAudio(responseText);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }

      setAppState("idle");

      if (commandResult.url) {
        if (commandResult.url.startsWith("tel:") || commandResult.url.startsWith("mailto:")) {
          window.location.href = commandResult.url;
        } else {
          // Open immediately without setTimeout to prevent popup blockers
          window.open(commandResult.url, "_blank");
        }
      }
    } else {
      try {
        // Run sentiment analysis in parallel with response generation
        const [priyaResponse, moodScore] = await Promise.all([
          getPriyaResponse(finalTranscript, messagesRef.current, userLocation || undefined, mode, language, userName),
          mode === "physiological" ? analyzeUserMood(finalTranscript) : Promise.resolve(null)
        ]);

        if (moodScore !== null) {
          const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setMoodData(prev => {
            const newData = [...prev, { time: timeString, score: moodScore, message: finalTranscript }];
            // Keep only the last 20 data points
            if (newData.length > 20) return newData.slice(newData.length - 20);
            return newData;
          });
        }

        responseText = priyaResponse.text;
        
        const priyaMsg: ChatMessage = { 
          id: Date.now().toString() + "-z", 
          sender: "priya", 
          text: responseText,
          sources: priyaResponse.sources
        };
        addMessage(priyaMsg);
        
        if (!isMuted) {
          if (priyaResponse.songAudio && priyaResponse.songMimeType) {
            setAppState("speaking");
            const audioObj = new Audio(`data:${priyaResponse.songMimeType};base64,${priyaResponse.songAudio}`);
            await new Promise((resolve) => {
              audioObj.onended = resolve;
              audioObj.onerror = resolve;
              audioObj.play().catch(e => {
                console.error("Error playing song:", e);
                resolve(null);
              });
            });
          } else {
            setAppState("speaking");
            const audioBase64 = await getPriyaAudio(responseText);
            if (audioBase64) {
              await playPCM(audioBase64);
            }
          }
        }
      } catch (err: any) {
        console.warn("Priya API Error:", err);
        const errMsg = err?.message || String(err);
        addMessage({
          id: Date.now().toString() + "-error",
          sender: "priya",
          text: "Oops! Something went wrong on my end. " + (errMsg.includes("API_KEY") ? "Please set your Gemini API Key." : "Try again later.")
        });
      } finally {
        setAppState("idle");
      }
    }
  }, [isMuted, isSessionActive]);

  useEffect(() => {
    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = async () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      setIsScreenSharing(false);
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setAppState("idle");
      resetPriyaSession();
    } else {
      try {
        setIsSessionActive(true);
        resetPriyaSession();
        
        const session = new LiveSessionManager();
        session.isMuted = isMuted;
        liveSessionRef.current = session;
        
        session.onStateChange = (state) => {
          setAppState(state);
        };
        
        session.onMessage = (sender, text) => {
          const newMsg: ChatMessage = { id: Date.now().toString() + "-" + sender, sender, text };
          addMessage(newMsg);
        };
        
        session.onCommand = (url) => {
          if (url.includes('google.com/maps/dir')) {
            try {
              const urlObj = new URL(url);
              const origin = urlObj.searchParams.get('origin');
              const destination = urlObj.searchParams.get('destination');
              if (destination) {
                setActiveMap({ origin: origin || undefined, destination });
              }
            } catch (e) {
              console.warn("Failed to parse directions URL", e);
            }
          } else {
            // DO NOT use setTimeout here as it will trigger browser popup blockers.
            window.open(url, "_blank");
          }
        };

        session.onError = (type) => {
          setErrorType(type);
          setShowPermissionModal(true);
        };

        await session.start(userLocation || undefined, mode, language, userName);
      } catch (e: any) {
        console.warn("Failed to start session", e);
        const msg = e?.message || "";
        if (msg === "Permission denied") {
          setErrorType("PERMISSION_DENIED");
        } else if (msg === "Microphone error") {
          setErrorType("MIC_ERROR");
        } else {
          setErrorType("ERROR");
        }
        setShowPermissionModal(true);
        setIsSessionActive(false);
        setAppState("idle");
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    handleTextCommand(textInput);
    setTextInput("");
    setShowTextInput(false);
  };

  if (!userName) {
    return <WelcomeScreen onNameSubmit={handleNameSubmit} />;
  }

  return (
    <div className="h-[100dvh] w-screen bg-[#050505] text-white flex flex-col items-center justify-between font-sans relative overflow-hidden m-0 p-0">
      {showPermissionModal && (
        <PermissionModal 
          onClose={() => setShowPermissionModal(false)} 
          errorType={errorType}
        />
      )}

      {showVideoGenerator && (
        <VideoGenerator 
          onClose={() => setShowVideoGenerator(false)} 
        />
      )}

      {showMoodTracker && (
        <MoodTracker 
          data={moodData} 
          onClose={() => setShowMoodTracker(false)} 
        />
      )}

      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-violet-900/10 blur-[60px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-pink-900/10 blur-[60px] rounded-full" />
      </div>

      <AnimatePresence>
        {activeMap && (
          <InteractiveMap 
            origin={activeMap.origin} 
            destination={activeMap.destination} 
            onClose={() => setActiveMap(null)} 
          />
        )}
      </AnimatePresence>

      <header className="absolute top-0 left-0 w-full flex justify-between items-center z-20 shrink-0 px-6 py-4 md:px-12 md:py-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-sm">
            P
          </div>
          <h1 className="text-xl font-serif font-medium tracking-wide opacity-90 hidden sm:block">Priya</h1>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center ml-2 lg:ml-6 gap-2 sm:gap-4 text-[10px] sm:text-xs font-mono">
            <div className="flex bg-white/5 p-0.5 sm:p-1 rounded-full border border-white/10">
              <button
                onClick={() => setMode("personal")}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors ${mode === "personal" ? "bg-violet-500/30 text-violet-300" : "text-white/50 hover:text-white/80"}`}
              >
                Personal
              </button>
              <button
                onClick={() => setMode("physiological")}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors ${mode === "physiological" ? "bg-teal-500/30 text-teal-300" : "text-white/50 hover:text-white/80"}`}
              >
                Physiological
              </button>
            </div>

            <div className="flex bg-white/5 p-0.5 sm:p-1 rounded-full border border-white/10">
              <button
                onClick={() => setLanguage("english")}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors ${language === "english" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"}`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage("hinglish")}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors ${language === "hinglish" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"}`}
              >
                Hinglish
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {mode === "physiological" && (
            <button
              onClick={() => setShowMoodTracker(true)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
              title="Emotional Trend Tracker"
            >
              <Activity size={18} className="opacity-70 text-violet-300" />
            </button>
          )}
          
          {messages.length > 0 && (
            <>
              <button
                onClick={handleDownloadChat}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                title="Download Chat Locally"
              >
                <Save size={18} className="opacity-70" />
              </button>
              <button
                onClick={() => {
                  if (confirm("Clear local chat history?")) {
                    const initialMsg: ChatMessage = { id: "1", sender: "priya", text: "Namaste! I'm Priya. How can I entertain you today?" };
                    setMessages([initialMsg]);
                    localStorage.removeItem("priya_chat_local_cache");
                    resetPriyaSession();
                  }
                }}
                className="p-2 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors border border-white/10"
                title="Clear History"
              >
                <Trash2 size={18} className="opacity-70" />
              </button>
            </>
          )}

          <button
            onClick={() => {
              setUserName("");
              localStorage.removeItem("priya_user_name");
              localStorage.removeItem("priya_chat_local_cache");
              setMessages([]);
              resetPriyaSession();
            }}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
            title="Sign Out / Change Name"
          >
            <LogOut size={18} className="opacity-70" />
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX size={18} className="opacity-70" />
            ) : (
              <Volume2 size={18} className="opacity-70" />
            )}
          </button>
        </div>
      </header>

      <div className="absolute inset-x-0 top-24 bottom-32 overflow-y-auto px-6 md:px-12 pointer-events-none z-10 custom-scrollbar">
        <div className="max-w-2xl mx-auto flex flex-col gap-4 pointer-events-auto pb-4">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm backdrop-blur-md border ${
                  msg.sender === "user" 
                    ? "bg-violet-500/10 border-violet-500/30 text-violet-100" 
                    : "bg-white/5 border-white/10 text-white/90"
                }`}
              >
                {msg.text}
                
                {msg.sources && (
                  <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap gap-2">
                    {msg.sources.map((source, idx) => (
                      <a 
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-[10px] px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 ${
                          source.type === "maps" 
                            ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30" 
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        }`}
                      >
                        {source.type === "maps" ? <Map size={8} /> : <Send size={8} />}
                        {source.title || (source.type === "maps" ? "Directions" : "Source")}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <main className="absolute inset-0 flex flex-row items-center justify-between w-full h-full z-10 overflow-hidden pt-20 pb-24 px-4 md:px-12 pointer-events-none">
        <div className="flex w-[30%] lg:w-[25%] h-full flex-col justify-center gap-4 z-10">
          <div className="h-6">
            <AnimatePresence>
              {appState === "processing" && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-2 text-cyan-300/80 text-sm md:text-base italic font-serif"
                >
                  <Loader2 size={16} className="animate-spin" />
                  Replying...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <Visualizer state={appState} />
        </div>

        <div className="flex w-[30%] lg:w-[25%] h-full flex-col justify-center gap-4 z-10">
          <div className="h-6 flex justify-end">
            <AnimatePresence>
              {appState === "listening" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2 text-violet-300/80 text-sm md:text-base italic"
                >
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  Listening...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="absolute bottom-0 left-0 w-full flex flex-col items-center justify-center pb-6 md:pb-8 z-20 shrink-0 gap-4">
        <AnimatePresence>
          {showTextInput && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-md flex flex-col gap-2 px-4"
            >
              <form 
                onSubmit={handleTextSubmit}
                className="w-full flex items-center gap-2 bg-white/5 border border-white/10 rounded-full p-1 pl-4 backdrop-blur-md shadow-2xl"
              >
                <input 
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type a message to Priya..."
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/30 text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={isDictating ? stopDictation : startDictation}
                  className={`p-2 rounded-full transition-colors ${isDictating ? 'bg-red-500 animate-pulse' : 'hover:bg-white/10 text-white/60'}`}
                  title={isDictating ? "Stop Voice Typing" : "Voice Typing"}
                >
                  <Mic size={16} />
                </button>
                <button 
                  type="submit"
                  disabled={!textInput.trim()}
                  className="p-2 rounded-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:hover:bg-violet-500 transition-colors"
                >
                  <Send size={16} />
                </button>
              </form>
              <div className="flex justify-center">
                <button 
                  onClick={() => {
                    setShowVideoGenerator(true);
                    setShowTextInput(false);
                  }}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] uppercase tracking-widest text-violet-300/60 hover:text-violet-300 hover:bg-white/10 transition-all font-mono"
                >
                  <Video size={12} />
                  Priya Studio
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleListening}
            className={`
              group relative flex items-center gap-3 px-8 py-4 rounded-full font-medium tracking-wide transition-all duration-300 shadow-2xl
              ${
                isSessionActive
                  ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
                  : "bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:scale-105"
              }
            `}
          >
            {isSessionActive ? (
              <>
                <MicOff size={20} />
                <span>End Session</span>
              </>
            ) : (
              <>
                <Mic size={20} className="group-hover:animate-bounce" />
                <span>Start Session</span>
              </>
            )}
          </button>
          
          {!isSessionActive && (
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              className="p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors shadow-2xl"
              title="Type instead"
            >
              <Keyboard size={20} className="opacity-70" />
            </button>
          )}

          {isSessionActive && (
            <button
              onClick={toggleScreenShare}
              className={`p-4 rounded-full transition-colors shadow-2xl ${
                isScreenSharing 
                  ? "bg-blue-500/20 border border-blue-500/50 text-blue-400 hover:bg-blue-500/30 animate-pulse" 
                  : "bg-white/5 border border-white/10 hover:bg-white/10"
              }`}
              title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
            >
              <Monitor size={20} className={!isScreenSharing ? "opacity-70" : ""} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
