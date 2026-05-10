'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Trophy, Play, RotateCcw, Flame, 
  Loader2, Pause, Volume2, VolumeX, Sparkles 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// RECALIBRATED & CAPPED PHYSICS
const GRAVITY = 0.35; // Floaty feel
const JUMP_STRENGTH = -6.0; // Softer jump
const MAX_FALL_SPEED = 7.5; // TERMINAL VELOCITY
const PIPE_SPEED = 2.2; 
const PIPE_WIDTH = 45; 
const PIPE_GAP = 150; // Forgiving gap
const BIRD_SIZE = 24; 
const GAME_WIDTH = 340; 
const GAME_HEIGHT = 500; 

export default function FlappyAltu() {
  const router = useRouter();

  // UI State
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // App State
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [flash, setFlash] = useState(false);
  const [renderTick, setRenderTick] = useState(0);

  // High-Performance Physics Refs
  const birdY = useRef(GAME_HEIGHT / 2);
  const velocity = useRef(0);
  const pipes = useRef<{x: number, topHeight: number, passed: boolean}[]>([]);
  const scoreRef = useRef(0);
  const frameCount = useRef(0);
  const requestRef = useRef<number>();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isPausedRef = useRef(false); 

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const saved = localStorage.getItem('flappyHighScore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // --- FULLSCREEN LOGIC ---
  const requestFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => console.log(err));
    } else if ((elem as any).webkitRequestFullscreen) { /* Safari */
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) { /* IE11 */
      (elem as any).msRequestFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  const handleBack = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    exitFullscreen();
    router.back();
  };

  // --- AUDIO ENGINE ---
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
  };

  const playSound = useCallback((type: 'flap' | 'score' | 'milestone' | 'die') => {
    if (isMuted || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'flap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'score') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'milestone') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.1);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'die') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  }, [isMuted]);

  const syncScore = async (finalScore: number) => {
    const studentId = localStorage.getItem('studentId');
    if (studentId && finalScore > 0) {
      setIsSyncing(true);
      try {
        const { data: existingScore } = await supabase
          .from('arcade_scores')
          .select('id, score')
          .eq('student_id', studentId)
          .eq('game_name', 'flappy')
          .maybeSingle();

        if (!existingScore) {
          await supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'flappy', score: finalScore }]);
        } else if (finalScore > existingScore.score) {
          await supabase.from('arcade_scores').update({ score: finalScore }).eq('id', existingScore.id);
        }
      } catch (err) {
        console.error("Failed to sync flappy score", err);
      }
      setIsSyncing(false);
    }
  };

  const handleGameOver = useCallback(() => {
    setGameState('gameover');
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    playSound('die');
    
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([200, 100, 200]);
    }
    
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem('flappyHighScore', scoreRef.current.toString());
    }
    
    syncScore(scoreRef.current);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  }, [highScore, playSound]);

  const updatePhysics = useCallback(() => {
    if (gameState !== 'playing') return;

    if (!isPausedRef.current) {
      velocity.current = Math.min(velocity.current + GRAVITY, MAX_FALL_SPEED);
      birdY.current += velocity.current;

      const birdTop = birdY.current;
      const birdBottom = birdY.current + BIRD_SIZE;
      const birdLeft = 50; 
      const birdRight = 50 + BIRD_SIZE;
      const hitboxTolerance = 4; // Slightly more forgiving so tight squeezes feel fair

      // Floor / Ceiling Collision
      if (birdBottom >= GAME_HEIGHT || birdTop <= 0) {
        handleGameOver();
        return;
      }

      // Spawning Pipes
      frameCount.current += 1;
      if (frameCount.current % 110 === 0) { 
        const topHeight = Math.random() * (GAME_HEIGHT - PIPE_GAP - 80) + 40;
        pipes.current.push({ x: GAME_WIDTH, topHeight, passed: false });
      }

      // Move pipes & check collisions
      pipes.current.forEach(pipe => {
        pipe.x -= PIPE_SPEED;

        // Score Update
        if (!pipe.passed && pipe.x + PIPE_WIDTH < birdLeft) {
          pipe.passed = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
          
          if (scoreRef.current > 0 && scoreRef.current % 10 === 0) {
            playSound('milestone');
          } else {
            playSound('score');
          }

          if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(30);
          }
        }

        // Pipe Collision 
        if (birdRight - hitboxTolerance > pipe.x && birdLeft + hitboxTolerance < pipe.x + PIPE_WIDTH) {
          if (birdTop + hitboxTolerance < pipe.topHeight || birdBottom - hitboxTolerance > pipe.topHeight + PIPE_GAP) {
            handleGameOver();
          }
        }
      });

      // Cleanup
      pipes.current = pipes.current.filter(p => p.x > -PIPE_WIDTH);
      setRenderTick(t => t + 1);
    }

    requestRef.current = requestAnimationFrame(updatePhysics);
  }, [gameState, handleGameOver, playSound]);

  useEffect(() => {
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(updatePhysics);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState, updatePhysics]);

  const jump = useCallback((e?: React.SyntheticEvent | KeyboardEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    if (isPaused) return; 
    
    if (gameState === 'idle' || gameState === 'gameover') {
      requestFullscreen(); // Engage Immersive Mode
      initAudio();
      birdY.current = GAME_HEIGHT / 2;
      velocity.current = 0;
      pipes.current = [];
      scoreRef.current = 0;
      frameCount.current = 0;
      setScore(0);
      setGameState('playing');
    }

    if (gameState === 'playing') {
      velocity.current = JUMP_STRENGTH;
      playSound('flap');
    }
  }, [gameState, isPaused, playSound]);

  const togglePause = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (gameState !== 'playing') return;
    setIsPaused(p => !p);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') jump(e);
      if (e.code === 'Escape') setIsPaused(p => !p);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  const hueShift = score > 0 ? Math.min(score * 8, 360) : 0;
  const isMilestone = score > 0 && score % 10 === 0;

  return (
    // FULLSCREEN ROOT: Tap anywhere in this div to jump
    <div 
      onPointerDown={jump}
      className={`h-[100dvh] w-screen font-sans bg-[var(--background)] text-[var(--text)] flex flex-col items-center pt-8 relative overflow-hidden touch-none overscroll-none cursor-pointer transition-colors duration-200 ${flash ? 'bg-red-950/30' : ''}`}
    >
      
      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10 pointer-events-none transition-all duration-1000" style={{ filter: `hue-rotate(${hueShift}deg)` }}>
        <div className="absolute top-[-10%] left-[-10%] w-[320px] h-[320px] rounded-full bg-violet-500/10 blur-[80px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[260px] h-[260px] rounded-full bg-orange-500/10 blur-[80px]" />
      </div>

      <div className="w-full max-w-md px-5 flex flex-col items-center relative z-10">
        
        {/* Header Area */}
        <div className="w-full flex justify-between items-center mb-6">
          <div className="flex gap-2 z-50">
            <button onPointerDown={handleBack} className="p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all text-zinc-500 hover:text-violet-500 shadow-sm cursor-pointer">
              <ChevronLeft size={20} />
            </button>
            {gameState === 'playing' && (
              <button onPointerDown={togglePause} className={`p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all shadow-sm cursor-pointer ${isPaused ? 'text-amber-500 border-amber-500/30' : 'text-zinc-500 hover:text-violet-500'}`}>
                {isPaused ? <Play size={20} /> : <Pause size={20} />}
              </button>
            )}
            <button onPointerDown={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all text-zinc-500 hover:text-violet-500 shadow-sm cursor-pointer">
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
          <div className="text-right transition-all duration-1000" style={{ filter: `hue-rotate(${hueShift}deg)` }}>
            <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-none text-violet-500 drop-shadow-[0_0_10px_rgba(139,92,246,0.4)]">
              Flappy Altu
            </h1>
          </div>
        </div>

        {/* Score Board */}
        <div className="w-full flex gap-3 mb-6">
          <div className={`flex-1 bg-[var(--card)] border rounded-2xl p-3 flex flex-col items-center justify-center transition-all duration-300 ${isMilestone ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)] scale-105 z-10' : 'border-[var(--border)] shadow-sm'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isMilestone ? 'text-yellow-500' : 'text-zinc-500'}`}>Score</span>
            <span className={`text-3xl font-black italic leading-none flex items-center gap-2 ${isMilestone ? 'text-yellow-400' : 'text-[var(--text)]'}`}>
              {score} {isMilestone && <Sparkles size={16} className="animate-spin-slow"/>}
            </span>
          </div>
          <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <span className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest flex items-center gap-1 mb-1">
              <Trophy size={12}/> Best
            </span>
            <span className="text-3xl font-black italic text-amber-500 leading-none">{highScore}</span>
          </div>
        </div>

        {/* The Game Box */}
        <div 
          className={`relative w-full max-w-[340px] h-[500px] bg-[#050505] rounded-[30px] border-2 ${flash ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)]' : 'border-violet-500/30 shadow-[0_0_40px_rgba(139,92,246,0.15)]'} overflow-hidden pointer-events-none transition-all duration-1000`}
          style={!flash ? { filter: `hue-rotate(${hueShift}deg)` } : {}}
        >
          {/* Base Grid Parallax */}
          <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px', backgroundPosition: `-${frameCount.current * 0.5}px 0` }}></div>
          
          {/* Fast Moving Parallax "Dust" */}
          <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2px)', backgroundSize: '60px 80px', backgroundPosition: `-${frameCount.current * 1.5}px ${frameCount.current * 0.2}px` }}></div>

          {/* Render Pipes */}
          {pipes.current.map((pipe, i) => (
            <React.Fragment key={i}>
              <div 
                className="absolute top-0 bg-violet-600 border-x-2 border-b-4 border-violet-400 rounded-b-md shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                style={{ left: pipe.x, width: PIPE_WIDTH, height: pipe.topHeight }}
              >
                <div className="absolute top-0 left-0 bottom-0 w-2 bg-white/10" />
              </div>
              <div 
                className="absolute bottom-0 bg-violet-600 border-x-2 border-t-4 border-violet-400 rounded-t-md shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                style={{ left: pipe.x, width: PIPE_WIDTH, height: GAME_HEIGHT - pipe.topHeight - PIPE_GAP }}
              >
                <div className="absolute top-0 left-0 bottom-0 w-2 bg-white/10" />
              </div>
            </React.Fragment>
          ))}

          {/* Fox Bird */}
          {gameState !== 'idle' && (
            <div 
              className="absolute bg-orange-500 border-2 border-orange-300 rounded-md shadow-[0_0_20px_rgba(249,115,22,0.8)] transition-transform duration-75"
              style={{ 
                left: 50, 
                top: birdY.current, 
                width: BIRD_SIZE, 
                height: BIRD_SIZE,
                transform: `rotate(${Math.min(Math.max(velocity.current * 4, -25), 90)}deg)`,
                filter: `hue-rotate(-${hueShift}deg)` // Cancels out container shift
              }}
            >
              {/* Fox Details */}
              <div className="absolute top-1 right-1 flex gap-0.5 z-10">
                <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
              </div>
              <div className="absolute -top-1 left-1 w-1.5 h-1.5 bg-orange-400 rotate-45 z-0" />
              
              {/* Rocket Boost Trail */}
              <div 
                className="absolute top-1/2 -left-3 h-1 bg-gradient-to-r from-transparent to-yellow-300 rounded-full blur-[1px] transition-all duration-100" 
                style={{ width: velocity.current < 0 ? '12px' : '0px', opacity: velocity.current < 0 ? 1 : 0 }} 
              />
            </div>
          )}

          {/* Overlays */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-20 pointer-events-none" style={{ filter: `hue-rotate(-${hueShift}deg)` }}>
              <Flame size={56} className="text-orange-500 mb-4 animate-bounce drop-shadow-[0_0_20px_rgba(249,115,22,0.6)]" />
              <div className="px-8 py-4 bg-violet-500 text-white font-black uppercase tracking-widest rounded-full flex items-center gap-2 shadow-[0_0_25px_rgba(139,92,246,0.5)]">
                <Play size={18} fill="currentColor" /> Tap to Start
              </div>
              <p className="text-[8px] font-black text-violet-300/60 uppercase tracking-[0.2em] mt-6">Engages Fullscreen</p>
            </div>
          )}

          {isPaused && gameState === 'playing' && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-20 pointer-events-none" style={{ filter: `hue-rotate(-${hueShift}deg)` }}>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-amber-500 mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">Paused</h2>
              <div className="px-8 py-4 bg-amber-500 text-black font-black uppercase tracking-widest rounded-full flex items-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                <Play size={18} fill="currentColor" /> Tap to Resume
              </div>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/80 backdrop-blur-md flex flex-col items-center justify-center z-20 pointer-events-none" style={{ filter: `hue-rotate(-${hueShift}deg)` }}>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-1 drop-shadow-[0_0_20px_rgba(239,68,68,1)]">Core Crashed</h2>
              <p className="text-[10px] font-bold text-red-300 uppercase tracking-widest mb-3">Final Score: {score}</p>
              
              <div className="h-4 mb-6">
                {isSyncing && <p className="text-[9px] font-black text-white/50 uppercase tracking-widest flex items-center gap-2"><Loader2 size={12} className="animate-spin"/> Syncing...</p>}
                {!isSyncing && score > 0 && <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest">Score Saved</p>}
              </div>

              <div className="px-6 py-3 bg-white text-red-600 font-black uppercase tracking-widest rounded-full flex items-center gap-2 shadow-xl">
                <RotateCcw size={16} /> Tap to Retry
              </div>
            </div>
          )}
        </div>
        
        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-8 text-center pointer-events-none">
          Tap anywhere on screen to fly
        </p>

      </div>
    </div>
  );
}
