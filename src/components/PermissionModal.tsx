import React from 'react';
import { motion } from 'motion/react';
import { MicOff, AlertCircle, Clock } from 'lucide-react';

interface Props {
  onClose: () => void;
  errorType?: 'PERMISSION_DENIED' | 'QUOTA_EXCEEDED' | 'MIC_ERROR' | string;
}

export default function PermissionModal({ onClose, errorType = 'PERMISSION_DENIED' }: Props) {
  const isQuota = errorType === 'QUOTA_EXCEEDED';
  const isMicError = errorType === 'MIC_ERROR';
  const isPermission = errorType === 'PERMISSION_DENIED';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
      >
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${isQuota ? 'from-amber-500 to-orange-500' : (isMicError ? 'from-violet-500 to-blue-500' : 'from-red-500 to-orange-500')}`} />
        
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${(isQuota || isMicError) ? 'bg-amber-500/20' : 'bg-red-500/20'}`}>
          {isQuota ? (
            <Clock size={32} className="text-amber-400" />
          ) : isMicError ? (
            <AlertCircle size={32} className="text-violet-400" />
          ) : (
            <MicOff size={32} className="text-red-400" />
          )}
        </div>
        
        <h2 className="text-2xl font-serif font-medium text-white mb-3">
          {isQuota ? 'Quota Exceeded' : isMicError ? 'Microphone Issue' : 'Access Denied'}
        </h2>
        <p className="text-white/60 text-sm mb-6 leading-relaxed">
          {isQuota 
            ? "Priya has been talking too much today! You've reached the Gemini API usage limit. Please wait a while or try again later."
            : isMicError 
              ? "Something went wrong with your microphone. Priya is listening, but she only hears static! Maybe check if another app is using it?"
              : "Priya cannot hear you because microphone access is blocked. She's sassy, but she's not a psychic!"}
        </p>
        
        {!isQuota ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left w-full mb-8">
            <p className="text-sm text-white/80 font-medium mb-2">How to fix this:</p>
            <ol className="text-xs text-white/60 list-decimal pl-4 space-y-2">
              {isMicError ? (
                <>
                  <li>Close other tabs or apps that might be using the mic.</li>
                  <li>Check your system audio settings for the primary input device.</li>
                  <li>Try refreshing the page.</li>
                </>
              ) : (
                <>
                  <li>Click the <strong>lock icon (🔒)</strong> next to the URL bar.</li>
                  <li>Toggle <strong>Microphone</strong> to <strong>Allow</strong>.</li>
                  <li>Refresh this page.</li>
                  <li className="text-amber-400 font-medium">Or try opening in a new tab if you're in a preview.</li>
                </>
              )}
            </ol>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left w-full mb-8">
            <p className="text-sm text-white/80 font-medium mb-2">Wait a bit:</p>
            <p className="text-xs text-white/60 leading-relaxed">
              API quotas usually reset after a short period. Grab a chai and come back in a few minutes!
            </p>
          </div>
        )}
        
        <div className="flex flex-col w-full gap-3">
          <button 
            onClick={() => window.open(window.location.href, '_blank')}
            className="w-full py-3 px-4 bg-violet-500 text-white font-medium rounded-xl hover:bg-violet-600 transition-colors flex items-center justify-center gap-2"
          >
            Open in New Tab
          </button>
          {!isQuota && (
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 bg-white text-black font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Refresh Page
            </button>
          )}
          <button 
            onClick={onClose}
            className="w-full py-3 px-4 bg-white/5 text-white/70 font-medium rounded-xl hover:bg-white/10 transition-colors"
          >
            Got it, Priya
          </button>
        </div>
      </motion.div>
    </div>
  );
}
