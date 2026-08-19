import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Video, Loader2, X, Download, Wand2, Info } from 'lucide-react';
import { generatePriyaVideo } from '../services/geminiService';

interface VideoGeneratorProps {
  onClose: () => void;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function VideoGenerator({ onClose }: VideoGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setError(null);
    setVideoUrl(null);
    
    try {
      // Check for API Key selection as per skill
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        // Skill says assume success after openSelectKey and proceed
      }

      setIsGenerating(true);
      const url = await generatePriyaVideo(prompt, (msg) => setProgress(msg));
      setVideoUrl(url);
    } catch (err: any) {
      if (err.message === "API_KEY_RESET") {
        setError("API Key issue. Please re-select your key.");
        await window.aistudio.openSelectKey();
      } else {
        setError(err.message || "Something went wrong. Priya is cranky.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.3)] flex flex-col md:flex-row h-[80vh] md:h-auto"
      >
        {/* Left Column: Input */}
        <div className="w-full md:w-2/5 p-8 border-b md:border-b-0 md:border-r border-white/10 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
                <Video size={24} />
              </div>
              <h2 className="text-2xl font-serif font-medium">Priya Studio</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <p className="text-white/60 text-sm leading-relaxed">
            manifest your wildest imaginations. Priya will do the heavy lifting, as usual.
          </p>

          <div className="space-y-4">
             <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your masterpiece... (e.g., 'A cyberpunk market in Mumbai with neon rain')"
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-violet-500/50 transition-colors resize-none placeholder:text-white/20"
                />
                <div className="absolute bottom-3 right-3 text-[10px] uppercase tracking-widest text-white/20 font-mono">
                  Veo V3.1 Lite
                </div>
             </div>

             <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-all rounded-2xl flex items-center justify-center gap-2 font-medium group"
             >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{progress}</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={18} className="group-hover:rotate-12 transition-transform" />
                    <span>Generate Vision</span>
                  </>
                )}
             </button>
          </div>

          <div className="mt-auto bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
            <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-blue-300/80 leading-relaxed italic">
              Note: Video generation requires a paid Google Cloud API Key. 
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline ml-1">
                More info
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="flex-1 bg-black/40 p-8 flex flex-col items-center justify-center relative min-h-[300px]">
          <AnimatePresence mode="wait">
            {videoUrl ? (
              <motion.div 
                key="video"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full flex flex-col items-center justify-center gap-6"
              >
                <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                  <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                </div>
                <a 
                  href={videoUrl} 
                  download="priya-manifestation.mp4"
                  className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-full text-sm font-medium transition-colors border border-white/10 text-white/80"
                >
                  <Download size={16} />
                  Download Masterpiece
                </a>
              </motion.div>
            ) : isGenerating ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4 text-center px-12"
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-violet-500/30 animate-[spin_10s_linear_infinite]" />
                  <div className="absolute inset-4 rounded-full border-2 border-violet-500/50 animate-[spin_4s_linear_infinite_reverse]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video size={32} className="text-violet-400 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-1">
                    <p className="text-lg font-serif italic text-white/80">{progress}</p>
                    <p className="text-xs text-white/40 uppercase tracking-tighter">Manifesting pixels...</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4 text-white/20"
              >
                <div className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center">
                  <Video size={32} />
                </div>
                <p className="text-sm font-serif italic">Your vision goes here...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-8 left-8 right-8 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center"
            >
              {error}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
