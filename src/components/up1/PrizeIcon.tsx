import React from "react";

interface PrizeIconProps {
  value: string;
  label: string;
  color: string;
  size?: number;
}

const PrizeIcon: React.FC<PrizeIconProps> = ({ value, label, color, size = 64 }) => {
  const colorSchemes: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    red: { bg: "#DC2626", border: "#7F1D1D", text: "#FFFFFF", glow: "#EF4444" },
    purple: { bg: "#9333EA", border: "#581C87", text: "#FFFFFF", glow: "#A855F7" },
    blue: { bg: "#2563EB", border: "#1E3A8A", text: "#FFFFFF", glow: "#3B82F6" },
    green: { bg: "#16A34A", border: "#14532D", text: "#FFFFFF", glow: "#22C55E" },
    gold: { bg: "#EAB308", border: "#854D0E", text: "#1F2937", glow: "#FACC15" },
    pink: { bg: "#EC4899", border: "#831843", text: "#FFFFFF", glow: "#F472B6" },
    cyan: { bg: "#06B6D4", border: "#164E63", text: "#FFFFFF", glow: "#22D3EE" },
    orange: { bg: "#EA580C", border: "#7C2D12", text: "#FFFFFF", glow: "#F97316" },
  };

  const scheme = colorSchemes[color] || colorSchemes.gold;

  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className="drop-shadow-lg">
      <defs>
        <linearGradient id={`metal-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E5E7EB" />
          <stop offset="25%" stopColor="#9CA3AF" />
          <stop offset="50%" stopColor="#D1D5DB" />
          <stop offset="75%" stopColor="#6B7280" />
          <stop offset="100%" stopColor="#9CA3AF" />
        </linearGradient>
        <linearGradient id={`inner-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={scheme.glow} />
          <stop offset="50%" stopColor={scheme.bg} />
          <stop offset="100%" stopColor={scheme.border} />
        </linearGradient>
        <filter id={`glow-${color}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <circle cx="40" cy="40" r="38" fill={`url(#metal-${color})`} />
      
      {[...Array(16)].map((_, i) => {
        const angle = (i * 22.5 * Math.PI) / 180;
        const x1 = 40 + 33 * Math.cos(angle);
        const y1 = 40 + 33 * Math.sin(angle);
        const x2 = 40 + 38 * Math.cos(angle);
        const y2 = 40 + 38 * Math.sin(angle);
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4B5563" strokeWidth="2" strokeLinecap="round" />
        );
      })}
      
      <circle cx="40" cy="40" r="30" fill={`url(#inner-${color})`} filter={`url(#glow-${color})`} />
      <circle cx="40" cy="40" r="26" fill="none" stroke={scheme.glow} strokeWidth="1.5" opacity="0.6" />
      
      <text x="40" y={value.length > 2 ? "40" : "36"} textAnchor="middle" dominantBaseline="middle" fill={scheme.text} fontSize={value.length > 2 ? "22" : "18"} fontWeight="900" fontFamily="Arial Black, sans-serif" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>
        {value}
      </text>
      
      {value.length <= 2 && (
        <text x="40" y="52" textAnchor="middle" dominantBaseline="middle" fill={scheme.text} fontSize="10" fontWeight="bold" fontFamily="Arial, sans-serif" style={{ textShadow: "1px 1px 1px rgba(0,0,0,0.5)" }}>
          {label}
        </text>
      )}
    </svg>
  );
};

export default PrizeIcon;
