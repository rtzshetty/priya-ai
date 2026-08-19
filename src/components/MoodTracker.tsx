import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { X, Activity } from 'lucide-react';

interface MoodDataPoint {
  time: string;
  score: number;
  message: string;
}

interface MoodTrackerProps {
  data: MoodDataPoint[];
  onClose: () => void;
}

export default function MoodTracker({ data, onClose }: MoodTrackerProps) {
  // Fill missing data to make chart look better if there are less than 2 points
  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    if (data.length === 1) {
      return [
        { time: 'Start', score: 5, message: 'Baseline' },
        ...data
      ];
    }
    return data;
  }, [data]);

  const currentMood = data.length > 0 ? data[data.length - 1].score : 5;
  
  let moodStatus = "Neutral";
  let moodColor = "text-gray-300";
  let gradientStops = {
    stop1: "#8b5cf6", // Violet
    stop2: "#020617"  // Dark background
  };

  if (currentMood >= 8) {
    moodStatus = "Excellent / Happy";
    moodColor = "text-green-400";
    gradientStops = { stop1: "#4ade80", stop2: "#020617" };
  } else if (currentMood >= 6) {
    moodStatus = "Good / Positive";
    moodColor = "text-teal-400";
    gradientStops = { stop1: "#2dd4bf", stop2: "#020617" };
  } else if (currentMood <= 3) {
    moodStatus = "Stressed / Sad";
    moodColor = "text-red-400";
    gradientStops = { stop1: "#f87171", stop2: "#020617" };
  } else if (currentMood < 5) {
    moodStatus = "Low / Anxious";
    moodColor = "text-orange-400";
    gradientStops = { stop1: "#fb923c", stop2: "#020617" };
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f0f0f]/90 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md max-w-[200px]">
          <p className="text-white/50 text-xs mb-1">{label}</p>
          <p className="text-white font-medium text-sm mb-2">Score: {payload[0].value}/10</p>
          <p className="text-white/80 text-xs italic">"{payload[0].payload.message}"</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.15)] flex flex-col"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-xl font-serif font-medium">Emotional Trend</h2>
              <p className="text-white/40 text-xs">Based on conversation sentiment</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {data.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-white/30 italic text-sm">
              <Activity size={32} className="mb-4 opacity-50" />
              Start talking to Priya to track your mood!
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4">
                <span className="text-white/60 text-sm">Current State</span>
                <span className={`font-mono text-sm tracking-wide ${moodColor}`}>{moodStatus} ({currentMood}/10)</span>
              </div>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={gradientStops.stop1} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={gradientStops.stop2} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      stroke="#ffffff33" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      domain={[1, 10]} 
                      stroke="#ffffff33" 
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickCount={10}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={5} stroke="#ffffff22" strokeDasharray="3 3" />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke={gradientStops.stop1} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorScore)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
