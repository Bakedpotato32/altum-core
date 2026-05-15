'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Zap, Gamepad2, ChevronRight, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SnakeLogo, FlappyLogo, TetrisLogo, DashLogo, BreakoutLogo, SpaceLogo,
  TowerLogo, CrossyLogo, DefenderLogo, CombatLogo, RunnerLogo, SlicerLogo 
} from '@/components/ArcadeIcons';

export default function ArcadeLobby() {
  const router = useRouter();

  const GAMES = [
    // Phase 1 Games
    { id: 'snake', name: 'Neon Snake', sub: 'Classic Retro Action', gradient: 'linear-gradient(135deg, #10b981, #047857)', watermark: '🐍', Icon: SnakeLogo },
    { id: 'flappy', name: 'Flappy Altu', sub: 'Gravity Protocol', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', watermark: '🦅', Icon: FlappyLogo },
    { id: 'tetris', name: 'Tetris Core', sub: 'Geometric Alignment', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', watermark: '🧱', Icon: TetrisLogo },
    { id: 'dino', name: 'Altu Dash', sub: 'Infinite Runner', gradient: 'linear-gradient(135deg, #f59e0b, #b45309)', watermark: '🦖', Icon: DashLogo },
    { id: 'breakout', name: 'Neon Breakout', sub: 'Reflex Protocol', gradient: 'linear-gradient(135deg, #f43f5e, #be123c)', watermark: '💥', Icon: BreakoutLogo },
    { id: 'space', name: 'Starship Altu', sub: 'Bullet Hell Protocol', gradient: 'linear-gradient(135deg, #06b6d4, #0369a1)', watermark: '🚀', Icon: SpaceLogo },
    
    // Phase 2 Games
    { id: 'tower', name: 'Neon Tower', sub: 'Precision Stacking', gradient: 'linear-gradient(135deg, #eab308, #a16207)', watermark: '🏢', Icon: TowerLogo },
    { id: 'crossy', name: 'Crossy Altu', sub: 'Isometric Survival', gradient: 'linear-gradient(135deg, #14b8a6, #0f766e)', watermark: '🛣️', Icon: CrossyLogo },
    { id: 'defender', name: 'Core Defender', sub: 'Tactical Defense', gradient: 'linear-gradient(135deg, #6366f1, #4338ca)', watermark: '🛡️', Icon: DefenderLogo },
    { id: 'combat', name: 'Vector Combat', sub: 'Top-Down Shooter', gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)', watermark: '⚔️', Icon: CombatLogo },
    { id: 'runner', name: 'Synth Runner', sub: '3D Speed Protocol', gradient: 'linear-gradient(135deg, #d946ef, #a21caf)', watermark: '🏃', Icon: RunnerLogo },
    { id: 'slicer', name: 'Fruit Slicer', sub: 'Kinetic Slashing', gradient: 'linear-gradient(135deg, #f97316, #c2410c)', watermark: '🍉', Icon: SlicerLogo },
  ];

  return (
    <div style={{ 
      minHeight: '100svh', 
      background: '#fff', 
      padding: '40px 20px 120px', 
      maxWidth: '500px', 
      margin: '0 auto',
      overflowX: 'hidden'
    }}>
      
      {/* Header matching Dashboard style */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
        <button 
          onClick={() => router.push('/dashboard')}
          style={{ 
            width: '45px', height: '45px', borderRadius: '15px', 
            background: '#f8fafc', border: '2px solid #f1f5f9', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <ChevronLeft size={24} color="#334155" strokeWidth={2.5} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Gamepad2 size={14} color="#8b5cf6" strokeWidth={3} />
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, color: '#8b5cf6', letterSpacing: '1px', textTransform: 'uppercase' }}>MINI GAMES</p>
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 900, fontStyle: 'italic', color: '#0f172a', textTransform: 'uppercase', lineHeight: 1 }}>
            Altum Arcade
          </h1>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Hall of Fame Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/arcade/leaderboard')}
          style={{ 
            background: 'linear-gradient(135deg, #f09819, #edde5d)', 
            borderRadius: '28px', padding: '18px 20px', 
            position: 'relative', overflow: 'hidden', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 10px 25px rgba(240, 152, 25, 0.3)',
            marginBottom: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', zIndex: 1 }}>
            <div style={{ 
              width: '50px', height: '50px', background: 'rgba(255,255,255,0.3)', 
              borderRadius: '16px', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', backdropFilter: 'blur(5px)', flexShrink: 0
            }}>
              <Trophy color="#fff" size={26} fill="rgba(255,255,255,0.4)" />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1, textTransform: 'uppercase' }}>Hall of Fame</h3>
              <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.9)', fontSize: '10px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>Global Rankings</p>
            </div>
          </div>
          <ChevronRight color="white" size={24} style={{ opacity: 0.8, flexShrink: 0 }} />
          
          <span style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', fontSize: '80px', opacity: 0.15, pointerEvents: 'none' }}>
            👑
          </span>
        </motion.div>

        {/* Dynamic Game List with Staggered Entrance */}
        <AnimatePresence>
          {GAMES.map((game, index) => (
            <motion.div 
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push(`/arcade/${game.id}`)}
              style={{ 
                background: game.gradient, 
                borderRadius: '24px', 
                padding: '16px 20px', 
                position: 'relative', overflow: 'hidden', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', zIndex: 1 }}>
                {/* Frosted Icon Box */}
                <div style={{ 
                  width: '50px', height: '50px', background: 'rgba(255,255,255,0.25)', 
                  borderRadius: '16px', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', backdropFilter: 'blur(5px)', flexShrink: 0,
                  color: '#fff' // Ensures inner SVGs using 'currentColor' turn white
                }}>
                  <game.Icon className="w-8 h-8" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{game.name}</h3>
                  <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '9px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>{game.sub}</p>
                </div>
              </div>
              <ChevronRight color="white" size={20} style={{ opacity: 0.6, flexShrink: 0 }} />
              
              {/* Background Watermark Illustration */}
              <span style={{ 
                position: 'absolute', right: '15px', top: '50%', 
                transform: 'translateY(-50%)', fontSize: '80px', 
                opacity: 0.12, pointerEvents: 'none' 
              }}>
                {game.watermark}
              </span>
              
              {/* Detail Star Decoration */}
              <Star size={14} color="rgba(255,255,255,0.2)" fill="rgba(255,255,255,0.2)" style={{ position: 'absolute', right: '12px', bottom: '12px' }} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
