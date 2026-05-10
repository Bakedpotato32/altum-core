'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Play, RotateCcw, Footprints, Zap, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// --- CALIBRATED CONSTANTS ---
const GRAVITY = 0.55;
const JUMP_FORCE = -11.5;
const GROUND_Y = 300;
const INITIAL_SPEED = 5.5;
const MAX_SPEED = 14;
const SPAWN_INTERVAL = 1500; // ms

export default function AltuDash() {
  const router = useRouter();
  
  // UI States
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [render, setRender] = useState(0);

  // Engine Refs (The "Brain")
  const altyY = useRef(GROUND_Y);
  const velocity = useRef(0);
  const isCrouching = useRef(false);
  const obstacles = useRef<any[]>([]);
  const particles = useRef<any[]>([]);
  const gameSpeed = useRef(INITIAL_SPEED);
  const distance = useRef(0);
  const frameCount = useRef(0);
  const lastSpawnTime = useRef(0);
  const requestRef = useRef<number>();
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Background Parallax Refs
  const bgPos1 = useRef(0);
  const bgPos2 = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem('altyDashHS');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
  };

  const playSound = (freq: number, type: OscillatorType = 'sine', vol = 0.1, duration = 0.1) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duration);
  };

  const resetEngine = () => {
    altyY.current = GROUND_Y;
    velocity.current = 0;
    obstacles.current = [];
    particles.current = [];
    gameSpeed.current = INITIAL_SPEED;
    distance.current = 0;
    frameCount.current = 0;
    lastSpawnTime.current = Date.now();
    setScore(0);
  };

  const spawnObstacle = () => {
    const type = Math.random() > 0.75 && distance.current > 1000 ? 'air' : 'ground';
    obstacles.current.push({
      id: Date.now(),
      x: 400,
      width: 25 + Math.random() * 25,
      height: type === 'air' ? 25 : 35 + Math.random() * 45,
      type
    });
  };

  const handleGameOver = async () => {
    setGameState('gameover');
    playSound(100, 'sawtooth', 0.2, 0.5);
    if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);

    const finalScore = Math.floor(distance.current / 10);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('altyDashHS', finalScore.toString());
    }

    const studentId = localStorage.getItem('studentId');
    if (studentId && finalScore > 5) {
      setIsSyncing(true);
      try {
        const { data: existing } = await supabase.from('arcade_scores').select('*').eq('student_id', studentId).eq('game_name', 'dino').maybeSingle();
        if (!existing) {
          await supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'dino', score: finalScore }]);
        } else if (finalScore > existing.score) {
          await supabase.from('arcade_scores').update({ score: finalScore }).eq('id', existing.id);
        }
      } catch (e) {}
      setIsSyncing(false);
    }
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  const update = useCallback(() => {
    if (gameState !== 'playing') return;

    frameCount.current++;
    
    // 1. Parallax Movement
    bgPos1.current = (bgPos1.current - (gameSpeed.current * 0.2)) % 400;
    bgPos2.current = (bgPos2.current - (gameSpeed.current * 0.5)) % 400;

    // 2. Physics & Jump Smoothness
    velocity.current += GRAVITY;
    altyY.current += velocity.current;

    if (altyY.current > GROUND_Y) {
      altyY.current = GROUND_Y;
      velocity.current = 0;
    }

    // 3. Spawning System
    const now = Date.now();
    if (now - lastSpawnTime.current > Math.max(700, SPAWN_INTERVAL - (gameSpeed.current * 100))) {
      spawnObstacle();
      lastSpawnTime.current = now;
    }

    // 4. Particle Trail
    if (altyY.current === GROUND_Y && frameCount.current % 5 === 0) {
        particles.current.push({ x: 75, y: GROUND_Y + 35, life: 1 });
    }

    // 5. World Update
    distance.current += gameSpeed.current;
    setScore(Math.floor(distance.current / 10));

    // Increase difficulty
    if (frameCount.current % 1000 === 0) {
        gameSpeed.current = Math.min(MAX_SPEED, gameSpeed.current + 0.4);
        playSound(600, 'sine', 0.05, 0.1);
    }

    obstacles.current.forEach(obs => {
      obs.x -= gameSpeed.current;

      // Tight Hitbox Detection
      const altyHitbox = {
        left: 75,
        right: 100,
        top: isCrouching.current ? altyY.current + 22 : altyY.current + 5,
        bottom: altyY.current + 38
      };

      const obsHitbox = {
        left: obs.x,
        right: obs.x + obs.width,
        top: obs.type === 'air' ? GROUND_Y - 45 : GROUND_Y + 40 - obs.height,
        bottom: obs.type === 'air' ? GROUND_Y - 15 : GROUND_Y + 40
      };

      if (
        altyHitbox.right > obsHitbox.left &&
        altyHitbox.left < obsHitbox.right &&
        altyHitbox.bottom > obsHitbox.top &&
        altyHitbox.top < obsHitbox.bottom
      ) {
        handleGameOver();
      }
    });

    particles.current.forEach(p => {
        p.x -= gameSpeed.current;
        p.life -= 0.02;
    });

    obstacles.current = obstacles.current.filter(o => o.x > -100);
    particles.current = particles.current.filter(p => p.life > 0);

    setRender(f => f + 1);
    requestRef.current = requestAnimationFrame(update);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'playing') requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState, update]);

  const handleAction = () => {
    if (gameState === 'idle' || gameState === 'gameover') {
      initAudio();
      resetEngine();
      setGameState('playing');
      return;
    }
    // Jump
    if (altyY.current === GROUND_Y && !isCrouching.current) {
      velocity.current = JUMP_FORCE;
      playSound(400, 'triangle', 0.1, 0.1);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') handleAction();
      if (e.code === 'ArrowDown') isCrouching.current = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown') isCrouching.current = false;
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKey); window.removeEventListener('keyup', handleKeyUp); };
  }, [gameState]);

  return (
    <div className="min-h-[100dvh] pb-40 font-sans bg-[var(--background)] text-[var(--text)] flex flex-col items-center pt-8 relative overflow-hidden touch-none select-none">
      
      {/* Dynamic Ambient Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none transition-colors duration-1000">
        <div className={`absolute top-[-10%] right-[-10%] w-[320px] h-[320px] rounded-full transition-colors ${gameState === 'gameover' ? 'bg-red-500/10' : 'bg-amber-500/10'} blur-[80px]`} />
        <div className="absolute bottom-[20%] left-[-10%] w-[260px] h-[260px] rounded-full bg-orange-500/10 blur-[80px]" />
      </div>

      <div className="w-full max-w-md px-5 flex flex-col items-center relative z-10">
        
        {/* Header */}
        <div className="w-full flex justify-between items-center mb-6">
          <button onClick={() => router.back()} className="p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all text-zinc-500">
            <ChevronLeft size={20} />
          </button>
          <div className="text-right">
            <h1 className="text-xl font-black italic uppercase tracking-tighter text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">Altu Dash</h1>
            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">Velocity Node</p>
          </div>
        </div>

        {/* Stats */}
        <div className="w-full flex gap-3 mb-6">
          <div className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Distance</span>
            <span className="text-3xl font-black italic text-[var(--text)] leading-none">{score}<span className="text-sm ml-1 text-zinc-500 font-bold">m</span></span>
          </div>
          <div className="flex-1 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3 flex flex-col items-center justify-center shadow-inner">
            <span className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest flex items-center gap-1 mb-1">
              <Trophy size={10}/> Personal Best
            </span>
            <span className="text-3xl font-black italic text-amber-500 leading-none">{highScore}</span>
          </div>
        </div>

        {/* --- THE GAME WORLD --- */}
        <div 
          onClick={handleAction}
          className="relative w-full h-[380px] bg-[#020202] rounded-[32px] border-2 border-[var(--border)] overflow-hidden shadow-2xl cursor-pointer group"
        >
          {/* Layer 1: Stars (Slow) */}
          <div className="absolute inset-0 opacity-[0.2]" style={{ 
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', 
              backgroundSize: '100px 100px',
              backgroundPosition: `${bgPos1.current}px 0px`
          }} />

          {/* Layer 2: Distant Grid (Medium) */}
          <div className="absolute inset-0 opacity-[0.05]" style={{ 
              backgroundImage: 'linear-gradient(90deg, #fff 1px, transparent 1px)', 
              backgroundSize: '40px 100%',
              backgroundPosition: `${bgPos2.current}px 0px`
          }} />

          {/* Ground Surface */}
          <div className="absolute bottom-0 w-full h-[40px] bg-gradient-to-t from-amber-500/10 to-transparent border-t border-amber-500/20" />

          {/* Particles Trail */}
          {particles.current.map((p, i) => (
              <div key={i} className="absolute bg-orange-500/40 rounded-full" 
                   style={{ left: p.x, top: p.y, width: 4 * p.life, height: 4 * p.life, opacity: p.life }} />
          ))}

          {/* ALTU (The Fox) */}
          <div 
            className={`absolute transition-transform duration-75 ${altyY.current < GROUND_Y ? 'rotate-12' : ''}`}
            style={{ 
              left: 70, 
              top: isCrouching.current ? altyY.current + 20 : altyY.current, 
              width: 35, 
              height: isCrouching.current ? 20 : 40 
            }}
          >
            {/* Main Body */}
            <div className={`w-full h-full bg-orange-500 rounded-lg border-2 border-orange-300 shadow-[0_0_20px_rgba(249,115,22,0.7)] relative ${altyY.current === GROUND_Y ? 'animate-bounce' : ''}`} style={{ animationDuration: '0.4s' }}>
                {/* Eyes */}
                <div className="absolute top-2 right-2 flex gap-0.5">
                    <div className="w-1 h-1 bg-white rounded-full" />
                    <div className="w-1 h-1 bg-white rounded-full" />
                </div>
                {/* Ear */}
                <div className="absolute -top-1 left-1 w-2 h-2 bg-orange-400 rotate-45" />
            </div>
          </div>

          {/* Obstacles */}
          {obstacles.current.map((obs) => (
            <div 
              key={obs.id}
              className={`absolute transition-shadow duration-300 ${obs.type === 'air' ? 'bg-cyan-400 border-cyan-200 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.8)]' : 'bg-red-500 border-red-300 rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.4)]'}`}
              style={{ 
                left: obs.x, 
                width: obs.width, 
                height: obs.height, 
                top: obs.type === 'air' ? GROUND_Y - 35 : GROUND_Y + 40 - obs.height,
                borderWidth: '2px'
              }}
            >
                {obs.type === 'air' && <Zap size={10} className="text-white absolute inset-0 m-auto animate-pulse" />}
            </div>
          ))}

          {/* Overlays */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-4 border border-amber-500/40 animate-pulse">
                <Footprints size={40} className="text-amber-500" />
              </div>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-6">Altu Dash Protocol</p>
              <button className="px-10 py-4 bg-amber-500 text-black font-black uppercase tracking-widest rounded-full flex items-center gap-3 active:scale-95 transition-all shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                <Play size={18} fill="currentColor" /> Initiate Dash
              </button>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center z-20">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4 border border-red-500/40">
                <Zap size={32} className="text-red-500" />
              </div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-1">Core Impact</h2>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-8">System offline at {score}m</p>
              
              <button onClick={(e) => { e.stopPropagation(); handleAction(); }} className="px-10 py-4 bg-white text-red-600 font-black uppercase tracking-widest rounded-full flex items-center gap-3 active:scale-95 transition-all shadow-2xl">
                <RotateCcw size={18} /> Reboot
              </button>
              {isSyncing && <p className="mt-4 text-[8px] font-black text-white/30 uppercase tracking-widest animate-pulse flex items-center gap-2"><Loader2 size={10} className="animate-spin" /> Syncing Cloud Data...</p>}
            </div>
          )}
        </div>
        
        {/* --- HIGH-POLISH CONTROLS --- */}
        <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-[280px]">
             <button 
                onPointerDown={(e) => { e.preventDefault(); handleAction(); }}
                className="aspect-square bg-[var(--card)] border-2 border-[var(--border)] rounded-[32px] flex flex-col items-center justify-center active:scale-90 active:bg-amber-500/20 active:border-amber-500/40 transition-all shadow-lg group"
             >
                <ArrowUp size={40} className="text-zinc-500 group-active:text-amber-500 mb-1" />
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Jump</span>
             </button>
             <button 
                onPointerDown={(e) => { e.preventDefault(); isCrouching.current = true; playSound(200, 'sine', 0.05, 0.05); }}
                onPointerUp={(e) => { e.preventDefault(); isCrouching.current = false; }}
                onPointerLeave={(e) => { e.preventDefault(); isCrouching.current = false; }}
                className="aspect-square bg-[var(--card)] border-2 border-[var(--border)] rounded-[32px] flex flex-col items-center justify-center active:scale-90 active:bg-cyan-500/20 active:border-cyan-500/40 transition-all shadow-lg group"
             >
                <ArrowDown size={40} className="text-zinc-500 group-active:text-cyan-500 mb-1" />
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Duck</span>
             </button>
        </div>

        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mt-8 opacity-40">
          Avoid Red Cores • Duck under Cyan Orbs
        </p>

      </div>
    </div>
  );
}

// Minimal Arrow Icons
const ArrowUp = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 19V5M5 12l7-7 7 7"/>
  </svg>
);

const ArrowDown = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 5v14M5 12l7 7 7-7"/>
  </svg>
);
