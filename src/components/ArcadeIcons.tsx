import React from 'react';

// 1. NEON SNAKE - Geometric Pixel-Art Style (Fixed for real)
export const SnakeLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Body segments as sharp blocks */}
    <rect x="20" y="60" width="15" height="15" rx="2" fill="currentColor" opacity="0.4" />
    <rect x="35" y="60" width="15" height="15" rx="2" fill="currentColor" opacity="0.6" />
    <rect x="35" y="45" width="15" height="15" rx="2" fill="currentColor" opacity="0.8" />
    <rect x="50" y="45" width="15" height="15" rx="2" fill="currentColor" />
    <rect x="65" y="45" width="15" height="15" rx="2" fill="currentColor" />
    {/* The Head with a distinct eye */}
    <rect x="65" y="30" width="18" height="18" rx="4" fill="currentColor" />
    <rect x="75" y="35" width="4" height="4" rx="1" fill="white" />
  </svg>
);

// 2. FLAPPY ALTU - Aerodynamic Winged Altu
export const FlappyLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 30H70C80 30 90 40 90 55C90 70 80 80 70 80H40L40 30Z" fill="currentColor" />
    <path d="M40 45L10 30M40 55L15 70M40 50L5 50" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
    <circle cx="65" cy="45" r="4" fill="white" />
  </svg>
);

// 3. TETRIS CORE - Interlocking blocks
export const TetrisLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="15" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="8"/>
    <rect x="53" y="15" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="8"/>
    <rect x="53" y="53" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="8"/>
    <rect x="15" y="53" width="32" height="32" rx="4" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="8"/>
  </svg>
);

// 4. ALTU DASH - The Pro Fox Head (Keep this, it's the winner)
export const DashLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 40L15 10L45 30" fill="currentColor" />
    <path d="M70 40L85 10L55 30" fill="currentColor" />
    <path d="M50 85L20 40H80L50 85Z" fill="currentColor" />
    <circle cx="40" cy="50" r="4" fill="white" />
    <circle cx="60" cy="50" r="4" fill="white" />
    <path d="M5 50H15M10 60H20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
  </svg>
);

// 5. NEON BREAKOUT - Paddle and ball hitting bricks
export const BreakoutLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="20" width="22" height="12" rx="4" fill="currentColor" />
    <rect x="39" y="20" width="22" height="12" rx="4" fill="currentColor" opacity="0.5" />
    <rect x="68" y="20" width="22" height="12" rx="4" fill="currentColor" />
    <rect x="25" y="80" width="50" height="8" rx="4" stroke="currentColor" strokeWidth="8" />
    <circle cx="50" cy="55" r="8" fill="currentColor" />
  </svg>
);

// FUTURE GAMES PRE-BUILT
export const SpaceLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 10L85 85L50 70L15 85L50 10Z" stroke="currentColor" strokeWidth="8" strokeLinejoin="round"/>
    <circle cx="50" cy="45" r="6" fill="currentColor" />
  </svg>
);

export const RacingLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="30" width="60" height="35" rx="8" stroke="currentColor" strokeWidth="8"/>
    <circle cx="35" cy="70" r="10" fill="currentColor" />
    <circle cx="65" cy="70" r="10" fill="currentColor" />
  </svg>
);

export const BubbleLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="35" cy="35" r="15" stroke="currentColor" strokeWidth="6"/>
    <circle cx="65" cy="35" r="15" stroke="currentColor" strokeWidth="6"/>
    <circle cx="50" cy="70" r="20" fill="currentColor" stroke="currentColor" strokeWidth="6"/>
  </svg>
);

export const CandyLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="25" width="50" height="50" rx="10" transform="rotate(45 50 50)" stroke="currentColor" strokeWidth="8"/>
    <circle cx="50" cy="50" r="12" fill="currentColor" />
  </svg>
);
// --- PHASE 2 GAMES ---

// NEON TOWER - Stacking Blocks & Crane Hook
export const TowerLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 5V20" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
    <path d="M40 20H60L60 30" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="35" y="45" width="30" height="15" rx="2" stroke="currentColor" strokeWidth="6"/>
    <rect x="25" y="65" width="50" height="15" rx="2" fill="currentColor"/>
    <rect x="15" y="85" width="70" height="15" rx="2" fill="currentColor"/>
  </svg>
);

// CROSSY ALTU - Isometric Perspective Road
export const CrossyLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 50L50 30L90 50L50 70L10 50Z" stroke="currentColor" strokeWidth="6" strokeLinejoin="round"/>
    <path d="M30 60L50 80L70 60" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" opacity="0.5"/>
    <path d="M50 15V25M50 35V45" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
  </svg>
);

// CORE DEFENDER - Turret & Energy Shield
export const DefenderLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 10L90 30V60L50 90L10 60V30L50 10Z" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" opacity="0.4"/>
    <circle cx="50" cy="50" r="15" fill="currentColor"/>
    <path d="M50 50L80 20M50 50L20 20" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
  </svg>
);

// VECTOR COMBAT - Top-Down Tank
export const CombatLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="20" width="15" height="60" rx="4" stroke="currentColor" strokeWidth="6"/>
    <rect x="60" y="20" width="15" height="60" rx="4" stroke="currentColor" strokeWidth="6"/>
    <rect x="40" y="40" width="20" height="25" rx="2" fill="currentColor"/>
    <path d="M50 40V10" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
  </svg>
);

// SYNTH WAVE RUNNER - 3D Grid Perspective
export const RunnerLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 40L10 90M50 40L90 90M50 40V90" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
    <path d="M20 75H80M35 55H65" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
    <circle cx="50" cy="35" r="15" fill="currentColor"/>
  </svg>
);

// FRUIT SLICER - Slashed Core
export const SlicerLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M25 50C25 36.1929 36.1929 25 50 25C63.8071 25 75 36.1929 75 50" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
    <path d="M75 60C75 73.8071 63.8071 85 50 85C36.1929 85 25 73.8071 25 60" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
    <path d="M10 90L90 10" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
    <circle cx="70" cy="30" r="4" fill="currentColor"/>
  </svg>
);
