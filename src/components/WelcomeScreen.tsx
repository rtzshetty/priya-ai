import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onNameSubmit: (name: string) => void;
}

export default function WelcomeScreen({ onNameSubmit }: WelcomeScreenProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName) {
      const normalizedName = trimmedName.toLowerCase();
      
      // Read the 'file' containing all saved names
      const savedNamesFile = localStorage.getItem('priya_saved_names_file');
      const savedNames: string[] = savedNamesFile ? JSON.parse(savedNamesFile) : [];
      
      // Check for returning user
      if (savedNames.includes(normalizedName)) {
        // Log them in as a returning user
        setError('');
        onNameSubmit(trimmedName);
        return;
      }
      
      // Save the new name to the 'file'
      savedNames.push(normalizedName);
      localStorage.setItem('priya_saved_names_file', JSON.stringify(savedNames));
      
      setError('');
      onNameSubmit(trimmedName);
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#050505] text-white flex flex-col items-center justify-center font-sans relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-violet-900/20 blur-[80px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-pink-900/20 blur-[80px] rounded-full" />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-xl max-w-sm w-full mx-4 flex flex-col items-center shadow-2xl"
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-2xl mb-6 shadow-lg shadow-violet-500/20">
          P
        </div>
        
        <h1 className="text-2xl font-serif font-medium tracking-wide mb-2 text-center">Hello there.</h1>
        <p className="text-white/50 text-sm text-center mb-8">Before we begin, what should I call you?</p>
        
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 items-center">
          <div className="relative w-full">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
              <User size={18} />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter your name"
              className={`w-full bg-white/5 border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/30 outline-none focus:border-violet-500/50 transition-colors text-sm`}
              autoFocus
              required
            />
          </div>
          
          {error && (
            <p className="w-full text-red-400 text-xs text-center bg-red-500/10 py-2 px-3 rounded-lg border border-red-500/20">{error}</p>
          )}

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-all rounded-2xl flex items-center justify-center gap-2 font-medium text-sm"
          >
            Start Conversation
            <ArrowRight size={16} />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
