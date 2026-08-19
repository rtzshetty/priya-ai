import React from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InteractiveMapProps {
  origin?: string;
  destination: string;
  onClose: () => void;
}

export default function InteractiveMap({ origin, destination, onClose }: InteractiveMapProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Construct Google Maps Embed URL for directions
  // If origin is not provided, it defaults to current location in Google Maps
  const embedUrl = origin 
    ? `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destination)}&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&output=embed`;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`fixed z-[100] transition-all duration-500 ease-in-out bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
        isExpanded 
          ? 'inset-4 md:inset-12' 
          : 'bottom-24 right-4 md:right-12 w-[320px] h-[400px] md:w-[400px] md:h-[500px]'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <h3 className="text-sm font-medium text-white/90">
            {origin ? `${origin} → ${destination}` : destination}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 relative bg-[#0a0a0a]">
        <iframe
          title="Route Map"
          width="100%"
          height="100%"
          frameBorder="0"
          src={embedUrl}
          allowFullScreen
          className="opacity-90 hover:opacity-100 transition-opacity"
        />
        
        {/* Guard for iframes that might not load - simple visual hint */}
        <div className="absolute inset-0 pointer-events-none border border-white/5 bg-gradient-to-t from-[#121212]/50 to-transparent" />
      </div>
      
      {!isExpanded && (
        <div className="px-4 py-3 bg-white/5 text-[10px] text-white/40 italic flex justify-center items-center">
          Interactive Routing Powered by Google Maps
        </div>
      )}
    </motion.div>
  );
}
