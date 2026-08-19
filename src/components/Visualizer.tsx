import { motion } from "motion/react";

type VisualizerState = "idle" | "listening" | "processing" | "speaking";

interface VisualizerProps {
  state: VisualizerState;
}

export default function Visualizer({ state }: VisualizerProps) {
  const getAnimationDuration = (index: number) => {
    const baseSpeed = state === "listening" ? 3 : state === "processing" ? 1.5 : state === "speaking" ? 2 : 15;
    return `${baseSpeed + index * 2}s`;
  };

  const getPulseStyle = () => {
    if (state === "speaking") return { animationDuration: "0.5s" };
    if (state === "listening") return { animationDuration: "1s" };
    if (state === "processing") return { animationDuration: "0.8s" };
    return { animationDuration: "4s" };
  };

  // JARVIS color palette (Cyan/Blue) with Priya's personality (Violet/Pink hints)
  const getTheme = () => {
    switch (state) {
      case "listening": return { color: "rgba(139, 92, 246, 1)", glow: "shadow-violet-500/60", border: "border-violet-400" };
      case "processing": return { color: "rgba(56, 189, 248, 1)", glow: "shadow-sky-400/80", border: "border-sky-400" };
      case "speaking": return { color: "rgba(236, 72, 153, 1)", glow: "shadow-pink-500/80", border: "border-pink-400" };
      default: return { color: "rgba(6, 182, 212, 0.8)", glow: "shadow-cyan-500/40", border: "border-cyan-500/50" }; // Cyan for idle
    }
  };

  const theme = getTheme();

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
      {/* Ambient Glow */}
      <div
        className={`absolute w-[60%] h-[60%] rounded-full blur-[60px] ${theme.glow} animate-pulse-optimized`}
        style={{ ...getPulseStyle(), backgroundColor: theme.color, opacity: 0.15 }}
      />

      {/* Ring 1: Massive Outer Dashed */}
      <div
        style={{ animationDuration: getAnimationDuration(4) }}
        className={`absolute w-[100%] h-[100%] rounded-full border-[1px] border-dashed ${theme.border} opacity-20 animate-rotate-cw`}
      />

      {/* Ring 2: Segmented Thick Ring */}
      <div
        style={{ animationDuration: getAnimationDuration(3) }}
        className={`absolute w-[85%] h-[85%] rounded-full border-[2px] border-dotted ${theme.border} opacity-30 animate-rotate-ccw`}
      />

      {/* Ring 3: Scanner Ring (Solid with gaps) */}
      <div
        style={{ animationDuration: getAnimationDuration(2) }}
        className={`absolute w-[70%] h-[70%] rounded-full border-[1px] ${theme.border} border-t-transparent border-b-transparent opacity-40 animate-rotate-cw`}
      />

      {/* Ring 4: Inner Dashed */}
      <div
        style={{ animationDuration: getAnimationDuration(1) }}
        className={`absolute w-[55%] h-[55%] rounded-full border-[2px] border-dashed ${theme.border} opacity-50 animate-rotate-ccw`}
      />
      
      {/* Ring 5: Core HUD Ring */}
      <div
        style={{ animationDuration: getAnimationDuration(0) }}
        className={`absolute w-[40%] h-[40%] rounded-full border-[4px] border-dotted ${theme.border} opacity-70 animate-rotate-cw`}
      />

      {/* Core Circle */}
      <div
        className={`absolute w-[25%] h-[25%] rounded-full border-[1px] ${theme.border} bg-black/40 backdrop-blur-md flex items-center justify-center animate-pulse-optimized`}
        style={{ ...getPulseStyle(), boxShadow: `0 0 30px ${theme.color}, inset 0 0 20px ${theme.color}` }}
      >
        {/* Center Text */}
        <div 
          className="font-bold tracking-[0.3em] text-xl md:text-3xl lg:text-4xl text-white"
          style={{ textShadow: `0 0 10px ${theme.color}, 0 0 20px ${theme.color}` }}
        >
          PRIYA
        </div>
      </div>
    </div>
  );
}
