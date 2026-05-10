'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Play, RotateCcw, Footprints, Zap, Loader2, FastForward, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// --- CALIBRATED ENGINE CONSTANTS ---
const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 400;
const GRAVITY = 0.6;
const JUMP_FORCE = -11.5;
const GROUND_Y = 310;
const INITIAL_SPEED = 5.5;
const MAX_SPEED = 15;
const SPAWN_INTERVAL = 1400; // ms

export default function AltuDash() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // React UI States
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- HARDCORE ENGINE REFS (Bypasses React for 60fps smoothness) ---
  const isRunning = useRef(false);
  const gameStateRef = useRef<'idle' | 'playing' | 'gameover'>('idle');
  const altyY = useRef(GROUND_Y);
  const velocity = useRef(0);
  const isCrouching = useRef(false);
  const obstacles = useRef<any[]>([]);
  const particles = useRef<any[]>([]);
  const gameSpeed = useRef(INITIAL_SPEED);
  const distance = useRef(0);
  const frameCount = useRef(0);
  const lastSpawnTime = useRef(0);
  const scoreRef = useRef(0);
  const requestRef = useRef<number>();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const canvasFlashAlpha = useRef(0); // Canvas-native flash (Zero lag)

  useEffect(() => {
    const saved = localStorage.getItem('altyDashHS');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // --- FULLSCREEN LOGIC ---
  const requestFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(err => console.log(err));
    else if ((elem as any).webkitRequestFullscreen) (elem as any).webkitRequestFullscreen();
    else if ((elem as any).msRequestFullscreen) (elem as any).msRequestFullscreen();
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
    }
  };

  const handleBack = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    exitFullscreen();
    router.back();
  };

  // --- AUDIO & HAPTICS ---
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

  const vibrate = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };

  // --- CORE GAME LOOP ---
  const handleGameOver = async () => {
    isRunning.current = false;
    gameStateRef.current = 'gameover';
    setGameState('gameover');
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    playSound(100, 'sawtooth', 0.2, 0.5);
    vibrate([150, 50, 200, 100, 300]); 

    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem('altyDashHS', scoreRef.current.toString());
    }

    const studentId = localStorage.getItem('studentId');
    if (studentId && scoreRef.current > 5) {
      setIsSyncing(true);
      try {
        const { data: existing } = await supabase.from('arcade_scores').select('*').eq('student_id', studentId).eq('game_name', 'dino').maybeSingle();
        if (!existing) {
          await supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'dino', score: scoreRef.current }]);
        } else if (scoreRef.current > existing.score) {
          await supabase.from('arcade_scores').update({ score: scoreRef.current }).eq('id', existing.id);
        }
      } catch (e) {}
      setIsSyncing(false);
    }
  };

  const update = useCallback(() => {
    if (!isRunning.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    frameCount.current++;
    distance.current += gameSpeed.current;

    // --- STATE UPDATES (Throttled for React) ---
    const currentScore = Math.floor(distance.current / 10);
    if (currentScore !== scoreRef.current) {
        scoreRef.current = currentScore;
        setScore(currentScore);
        
        // Milestone Speed Up - Using Canvas Flash to prevent DOM Repaint lag
        if (currentScore > 0 && currentScore % 100 === 0) {
           playSound(800, 'sine', 0.1, 0.2);
           setTimeout(() => playSound(1200, 'sine', 0.1, 0.2), 100);
           vibrate([50, 50, 50]);
           canvasFlashAlpha.current = 0.6; // Triggers high-perf canvas flash
        }
    }

    if (frameCount.current % 600 === 0) {
        gameSpeed.current = Math.min(MAX_SPEED, gameSpeed.current + 0.4);
    }

    // --- PHYSICS ---
    velocity.current += GRAVITY;
    if (isCrouching.current && altyY.current < GROUND_Y) {
      velocity.current += GRAVITY * 1.5; // Fast fall
    }
    
    altyY.current += velocity.current;
    if (altyY.current >= GROUND_Y) {
      altyY.current = GROUND_Y;
      velocity.current = 0;
    }

    // --- RENDERING ---
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Parallax Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 20; i++) {
        let sx = CANVAS_WIDTH - ((i * 87 + (distance.current * 0.1)) % CANVAS_WIDTH);
        ctx.globalAlpha = 0.3;
        ctx.fillRect(sx, (i * 43) % CANVAS_HEIGHT, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Ground
    ctx.fillStyle = '#f59e0b';
    ctx.globalAlpha = 0.2;
    ctx.fillRect(0, GROUND_Y + 40, CANVAS_WIDTH, CANVAS_HEIGHT - (GROUND_Y + 40));
    ctx.globalAlpha = 1;
    ctx.fillRect(0, GROUND_Y + 40, CANVAS_WIDTH, 2);

    // Particles Trail
    if (altyY.current === GROUND_Y && frameCount.current % 4 === 0) {
      particles.current.push({ x: 60, y: GROUND_Y + 35, life: 1, speedX: gameSpeed.current * 0.8 });
    }
    ctx.fillStyle = '#f97316';
    particles.current.forEach(p => {
        p.x -= p.speedX;
        p.life -= 0.05;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillRect(p.x, p.y, 8 * p.life, 3);
    });
    particles.current = particles.current.filter(p => p.life > 0);
    ctx.globalAlpha = 1;

    // Spawning Obstacles
    const now = Date.now();
    if (now - lastSpawnTime.current > Math.max(600, SPAWN_INTERVAL - (gameSpeed.current * 70))) {
      const type = Math.random() > 0.65 && distance.current > 800 ? 'air' : 'ground';
      obstacles.current.push({
        id: now,
        x: CANVAS_WIDTH,
        width: type === 'air' ? 24 : 20 + Math.random() * 15,
        height: type === 'air' ? 24 : 35 + Math.random() * 45,
        type
      });
      lastSpawnTime.current = now;
    }

    // --- ALTU (THE FOX) VECTOR DRAWING ---
    const foxY = isCrouching.current ? altyY.current + 20 : altyY.current;
    
    ctx.fillStyle = '#f97316';
    ctx.shadowBlur = 15; ctx.shadowColor = '#f97316';
    ctx.beginPath();
    
    if (isCrouching.current) {
        // Aerodynamic Ducking Shape
        ctx.moveTo(70, foxY + 20); // tail bottom
        ctx.lineTo(75, foxY + 10); // tail top
        ctx.lineTo(90, foxY + 10); // back
        ctx.lineTo(105, foxY); // head top
        ctx.lineTo(115, foxY + 10); // nose
        ctx.lineTo(100, foxY + 20); // belly
        ctx.fill();
        
        // Ear
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.moveTo(95, foxY + 5); ctx.lineTo(100, foxY - 5); ctx.lineTo(105, foxY + 5);
        ctx.fill();

        // Eye
        ctx.fillStyle = 'white';
        ctx.fillRect(102, foxY + 8, 3, 3);
    } else {
        // Full Running Fox Shape
        ctx.moveTo(65, foxY + 20); // tail out back
        ctx.lineTo(75, foxY + 15); // tail base
        ctx.lineTo(80, foxY + 5); // back
        ctx.lineTo(95, foxY); // head top
        ctx.lineTo(105, foxY + 10); // nose
        ctx.lineTo(95, foxY + 20); // chest
        ctx.lineTo(95, foxY + 40); // front leg
        ctx.lineTo(88, foxY + 40);
        ctx.lineTo(88, foxY + 30); // belly
        ctx.lineTo(82, foxY + 40); // back leg
        ctx.lineTo(75, foxY + 40);
        ctx.lineTo(75, foxY + 25); // butt
        ctx.fill();

        // Ear
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.moveTo(85, foxY + 5); ctx.lineTo(90, foxY - 8); ctx.lineTo(95, foxY + 2);
        ctx.fill();

        // Eye
        ctx.fillStyle = 'white';
        ctx.fillRect(95, foxY + 8, 3, 3);
    }
    ctx.shadowBlur = 0;

    // Precise Fox Hitbox
    const altyHitbox = isCrouching.current 
        ? { left: 70, right: 115, top: foxY, bottom: foxY + 20 }
        : { left: 75, right: 105, top: foxY, bottom: foxY + 40 };

    // Draw & Detect Obstacles
    obstacles.current.forEach(obs => {
        obs.x -= gameSpeed.current;

        if (obs.type === 'air') {
            ctx.fillStyle = '#22d3ee';
            ctx.shadowBlur = 15; ctx.shadowColor = '#22d3ee';
            ctx.beginPath();
            ctx.arc(obs.x + obs.width/2, GROUND_Y - 25, obs.width/2, 0, Math.PI*2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#ef4444';
            ctx.shadowBlur = 15; ctx.shadowColor = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(obs.x, GROUND_Y + 40);
            ctx.lineTo(obs.x + obs.width/2, GROUND_Y + 40 - obs.height);
            ctx.lineTo(obs.x + obs.width, GROUND_Y + 40);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        const obsHitbox = {
            left: obs.x + 4,
            right: obs.x + obs.width - 4,
            top: obs.type === 'air' ? GROUND_Y - 25 - obs.width/2 : GROUND_Y + 40 - obs.height + 4,
            bottom: obs.type === 'air' ? GROUND_Y - 25 + obs.width/2 : GROUND_Y + 40
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
    obstacles.current = obstacles.current.filter(o => o.x > -50);

    // Canvas Native Flash (No DOM lag)
    if (canvasFlashAlpha.current > 0) {
        ctx.fillStyle = `rgba(250, 204, 21, ${canvasFlashAlpha.current})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        canvasFlashAlpha.current -= 0.03;
    }

    if (isRunning.current) requestRef.current = requestAnimationFrame(update);
  }, []);

  const initiateGame = (e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    requestFullscreen();
    initAudio();
    
    // Hard Reset Engine
    altyY.current = GROUND_Y;
    velocity.current = 0;
    isCrouching.current = false;
    obstacles.current = [];
    particles.current = [];
    gameSpeed.current = INITIAL_SPEED;
    distance.current = 0;
    frameCount.current = 0;
    lastSpawnTime.current = Date.now() - SPAWN_INTERVAL; // Force instant spawn
    scoreRef.current = 0;
    canvasFlashAlpha.current = 0;
    setScore(0);
    
    gameStateRef.current = 'playing';
    setGameState('playing');
    isRunning.current = true;
    requestRef.current = requestAnimationFrame(update);
  };

  const handleJump = (e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (gameStateRef.current === 'playing' && altyY.current >= GROUND_Y - 5) { 
      velocity.current = JUMP_FORCE;
      playSound(400, 'triangle', 0.1, 0.1);
      vibrate(15);
    }
  };

  const handleDuckStart = (e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (gameStateRef.current === 'playing') {
      isCrouching.current = true;
      playSound(250, 'sine', 0.05, 0.05);
      vibrate(10);
    }
  };

  const handleDuckEnd = (e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    isCrouching.current = false;
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') handleJump(e as any);
      if (e.code === 'ArrowDown') handleDuckStart(e as any);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown') handleDuckEnd(e as any);
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKey); window.removeEventListener('keyup', handleKeyUp); };
  }, [handleJump, handleDuckStart, handleDuckEnd]);

  return (
    <div className={`h-[100dvh] w-screen font-sans bg-[var(--background)] text-[var(--text)] flex flex-col items-center pt-8 relative overflow-hidden select-none touch-none overscroll-none transition-colors duration-200 ${gameState === 'gameover' ? 'bg-red-950/20' : ''}`}>
      
      {/* Dynamic Ambient Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none transition-colors duration-1000">
        <div className={`absolute top-[-10%] right-[-10%] w-[320px] h-[320px] rounded-full transition-colors ${gameState === 'gameover' ? 'bg-red-500/10' : 'bg-amber-500/10'} blur-[80px]`} />
        <div className="absolute bottom-[20%] left-[-10%] w-[260px] h-[260px] rounded-full bg-orange-500/10 blur-[80px]" />
      </div>

      <div className="w-full max-w-md px-5 flex flex-col h-full relative z-10">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button onPointerDown={handleBack} className="p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all text-zinc-500 z-50 shadow-sm cursor-pointer hover:text-amber-500">
            <ChevronLeft size={20} />
          </button>
          <div className="text-right">
            <h1 className="text-xl font-black italic uppercase tracking-tighter text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">Altu Dash</h1>
            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">Velocity Node</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm relative">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Distance</span>
            <span className="text-3xl font-black italic text-[var(--text)] leading-none flex items-center">
              {score}<span className="text-sm ml-1 text-zinc-500 font-bold">m</span>
            </span>
          </div>
          <div className="flex-1 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3 flex flex-col items-center justify-center shadow-inner">
            <span className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest flex items-center gap-1 mb-1">
              <Trophy size={10}/> Personal Best
            </span>
            <span className="text-3xl font-black italic text-amber-500 leading-none">{highScore}</span>
          </div>
        </div>

        {/* --- THE GAME CANVAS --- */}
        <div className={`relative w-full aspect-[4/5] max-h-[380px] bg-[#020202] rounded-[32px] border-2 transition-all duration-300 overflow-hidden shadow-2xl ${gameState === 'gameover' ? 'border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)]' : 'border-[var(--border)]'}`}>
          
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full block" />

          {/* Overlays */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20 pointer-events-none">
              <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-4 border border-amber-500/40 animate-pulse">
                <Footprints size={40} className="text-amber-500" />
              </div>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-6">Altu Dash Protocol</p>
              <button onPointerDown={initiateGame} className="px-10 py-4 bg-amber-500 text-black font-black uppercase tracking-widest rounded-full flex items-center gap-3 shadow-[0_0_30px_rgba(245,158,11,0.5)] pointer-events-auto active:scale-95 transition-all">
                <Play size={18} fill="currentColor" /> Initiate Dash
              </button>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center z-20 pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4 border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                <Zap size={32} className="text-red-500" />
              </div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">Core Impact</h2>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-8">System offline at {score}m</p>
              
              <button onPointerDown={initiateGame} className="px-10 py-4 bg-white text-red-600 font-black uppercase tracking-widest rounded-full flex items-center gap-3 shadow-2xl pointer-events-auto active:scale-95 transition-all">
                <RotateCcw size={18} /> Reboot
              </button>
              {isSyncing && <p className="mt-4 text-[8px] font-black text-white/30 uppercase tracking-widest animate-pulse flex items-center gap-2"><Loader2 size={10} className="animate-spin" /> Syncing Data...</p>}
            </div>
          )}
        </div>
        
        {/* --- HIGH-POLISH ERGONOMIC CONTROLS --- */}
        <div className="mt-6 mb-auto flex justify-center gap-6 w-full touch-none select-none">
             <button 
                onPointerDown={handleJump}
                className="w-[130px] h-[100px] bg-[var(--card)] border-2 border-[var(--border)] rounded-[32px] flex flex-col items-center justify-center active:scale-95 active:bg-amber-500/20 active:border-amber-500/50 transition-all shadow-lg group cursor-pointer"
             >
                <ArrowUp size={44} className="text-zinc-500 group-active:text-amber-500 mb-1 drop-shadow-sm" />
                <span className="text-[10px] font-black text-zinc-500 group-active:text-amber-500 uppercase tracking-widest">Jump</span>
             </button>
             <button 
                onPointerDown={handleDuckStart}
                onPointerUp={handleDuckEnd}
                onPointerLeave={handleDuckEnd}
                className="w-[130px] h-[100px] bg-[var(--card)] border-2 border-[var(--border)] rounded-[32px] flex flex-col items-center justify-center active:scale-95 active:bg-cyan-500/20 active:border-cyan-500/50 transition-all shadow-lg group cursor-pointer"
             >
                <ArrowDown size={44} className="text-zinc-500 group-active:text-cyan-500 mb-1 drop-shadow-sm" />
                <span className="text-[10px] font-black text-zinc-500 group-active:text-cyan-500 uppercase tracking-widest">Duck</span>
             </button>
        </div>

      </div>
    </div>
  );
}
