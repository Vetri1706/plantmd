import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

const PlantMDLogo: React.FC<LogoProps> = ({ size = 64, className = "" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* DIRECTLY EMBEDDED SVG to ensure visual update appears immediately */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-md transition-transform hover:scale-105"
      >
        <defs>
          <linearGradient id="mainGradient" x1="256" y1="0" x2="256" y2="512" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="tabletGradient" x1="196" y1="280" x2="316" y2="380" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Shield Outline */}
        <path d="M256 40C160 40 60 70 60 70V240C60 360 150 460 256 500C362 460 452 360 452 240V70C452 70 352 40 256 40Z" 
              stroke="url(#mainGradient)" strokeWidth="12" fill="#022c22" />

        {/* Farmer Silhouette */}
        {/* Hat */}
        <path d="M140 140 C140 140 180 110 256 110 C332 110 372 140 372 140" stroke="url(#mainGradient)" strokeWidth="8" fill="none"/>
        <ellipse cx="256" cy="135" rx="70" ry="30" fill="url(#mainGradient)" />
        
        {/* Face (Shadowed) */}
        <path d="M220 150 L220 190 Q256 210 292 190 L292 150" fill="#047857" />

        {/* Body / Shoulders */}
        <path d="M180 200 Q140 220 120 300 V400 H392 V300 Q372 220 332 200" fill="url(#mainGradient)" opacity="0.9" />

        {/* Tablet */}
        <rect x="186" y="260" width="140" height="110" rx="12" fill="url(#tabletGradient)" stroke="#4ade80" strokeWidth="4" />
        
        {/* Leaf on Tablet Screen */}
        <path d="M256 340 C256 340 245 300 225 290 C245 290 256 280 256 280 C256 280 267 300 287 310 C267 310 256 340 256 340" fill="#4ade80" />
        
        {/* Wheat / Crops on Side */}
        <path d="M100 350 Q80 250 120 150" stroke="#4ade80" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M100 350 Q90 300 110 280" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M120 180 L110 170 M125 200 L110 190 M128 220 L110 210" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" />

        {/* Hands Holding Tablet */}
        <circle cx="176" cy="315" r="16" fill="#059669" />
        <circle cx="336" cy="315" r="16" fill="#059669" />

      </svg>

      {/* TEXT */}
      <div className="leading-tight hidden sm:block select-none">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-1">
          Plant<span className="text-emerald-600">MD</span>
        </h1>
        <p className="text-[10px] tracking-[0.3em] text-slate-500 font-bold uppercase ml-0.5">
          AI Diagnosis
        </p>
      </div>
    </div>
  );
};

export default PlantMDLogo;