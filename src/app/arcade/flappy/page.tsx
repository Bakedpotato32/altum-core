'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Play, RotateCcw, Flame, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// NEW RECALIBRATED PHYSICS & SCALE
const GRAVITY = 0.4; // Was 0.5 (Floatier fall)
const JUMP_STRENGTH = -6.5; // Was -7.5 (Softer jump)
const PIPE_SPEED = 2.5; // Was 3.5 (More reaction time)
const PIPE_WIDTH = 45; // Was 60 (Thinner pipes)
const PIPE_GAP = 135; // Gap to squeeze through
const BIRD_SIZE = 24; // Was 30 (Smaller bird = relatively larger screen)
const GAME_WIDTH = 340; 
const GAME_HEIGHT = 500; // Taller screen for better vertical reaction

export default function FlappyAltu() {
  const router = useRouter();

  // UI State
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [renderTick, setRenderTick] = useState(0);

  // High-Performance Physics Refs
  const birdY = useRef(GAME_HEIGHT / 2);
  const velocity = useRef(0);
  const pipes = useRef<{x: number, topHeight: number, passed: boolean}[]>([]);
  const scoreRef = useRef(0);
  const frameCount = useRef(0);
  const requestRef = useRef<number>();
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('flappyHighScore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
  };

  const playSound = useCallback((type: 'flap' | 'score' | 'die') => {
    if (!audioCtxRef.current) return;
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
    } else if (type === 'die') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  }, []);

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

    // Gravity
    velocity.current += GRAVITY;
    birdY.current += velocity.current;

    const birdTop = birdY.current;
    const birdBottom = birdY.current + BIRD_SIZE;
    const birdLeft = 50; 
    const birdRight = 50 + BIRD_SIZE;

    // Floor / Ceiling
    if (birdBottom >= GAME_HEIGHT || birdTop <= 0) {
      handleGameOver();
      return;
    }

    // Spawning (More spaced out so you can see ahead)
    frameCount.current += 1;
    if (frameCount.current % 100 === 0) { 
      const topHeight = Math.random() * (GAME_HEIGHT - PIPE_GAP - 80) + 40;
      pipes.current.push({ x: GAME_WIDTH, topHeight, passed: false });
    }

    // Move pipes
    pipes.current.forEach(pipe => {
      pipe.x -= PIPE_SPEED;

      // Score
      if (!pipe.passed && pipe.x + PIPE_WIDTH < birdLeft) {
        pipe.passed = true;
        scoreRef.current += 1;
        setScore(scoreRef.current);
        playSound('score');
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(30);
        }
      }

      // Collision
      if (birdRight > pipe.x && birdLeft < pipe.x + PIPE_WIDTH) {
        if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + PIPE_GAP) {
          handleGameOver();
        }
      }
    });

    // Cleanup
    pipes.current = pipes.current.filter(p => p.x > -PIPE_WIDTH);

    setRenderTick(t => t + 1);
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
    
    if (gameState === 'idle' || gameState === 'gameover') {
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
  }, [gameState, playSound]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') jump(e);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  return (
    <div className="min-h-[100dvh] pb-40 font-sans bg-[var(--background)] text-[var(--text)] flex flex-col items-center pt-8 relative overflow-y-auto">
      
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[320px] h-[320px] rounded-full bg-violet-500/10 blur-[80px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[260px] h-[260px] rounded-full bg-orange-500/10 blur-[80px]" />
      </div>

      <div className="w-full max-w-md px-5 flex flex-col items-center relative z-10">
        
        <div className="w-full flex justify-between items-center mb-6">
          <button onClick={() => router.back()} className="p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all text-zinc-500 hover:text-violet-500 shadow-sm">
            <ChevronLeft size={20} />
          </button>
          <div className="text-right">
            <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-none text-violet-500 drop-shadow-[0_0_10px_rgba(139,92,246,0.4)]">
              Flappy Altu
            </h1>
          </div>
        </div>

        <div className="w-full flex gap-3 mb-6">
          <div className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Score</span>
            <span className="text-3xl font-black italic text-[var(--text)] leading-none">{score}</span>
          </div>
          <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <span className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest flex items-center gap-1 mb-1">
              <Trophy size={12}/> Best
            </span>
            <span className="text-3xl font-black italic text-amber-500 leading-none">{highScore}</span>
          </div>
        </div>

        {/* Taller Game Container for better view */}
        <div 
          onPointerDown={jump}
          className="relative w-full max-w-[340px] h-[500px] bg-[#050505] rounded-[30px] border-2 border-violet-500/30 overflow-hidden shadow-[0_0_40px_rgba(139,92,246,0.15)] cursor-pointer touch-none select-none group"
        >
          <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px', backgroundPosition: `-${frameCount.current * 0.5}px 0` }}></div>

          {pipes.current.map((pipe, i) => (
            <React.Fragment key={i}>
              <div 
                className="absolute top-0 bg-violet-600 border-x-2 border-b-4 border-violet-400 rounded-b-md shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                style={{ left: pipe.x, width: PIPE_WIDTH, height: pipe.topHeight }}
              />
              <div 
                className="absolute bottom-0 bg-violet-600 border-x-2 border-t-4 border-violet-400 rounded-t-md shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                style={{ left: pipe.x, width: PIPE_WIDTH, height: GAME_HEIGHT - pipe.topHeight - PIPE_GAP }}
              />
            </React.Fragment>
          ))}

          {/* Smaller, cuter Fox Bird */}
          {gameState !== 'idle' && (
            <div 
              className="absolute bg-orange-500 border-2 border-orange-300 rounded-md shadow-[0_0_20px_rgba(249,115,22,0.8)] transition-transform duration-75"
              style={{ 
                left: 50, 
                top: birdY.current, 
                width: BIRD_SIZE, 
                height: BIRD_SIZE,
                transform: `rotate(${Math.min(Math.max(velocity.current * 4, -25), 90)}deg)` 
              }}
            >
              <div className="absolute top-1 right-1 flex gap-0.5">
                <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
              </div>
              <div className="absolute -top-1 left-1 w-1.5 h-1.5 bg-orange-400 rotate-45" />
            </div>
          )}

          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <Flame size={56} className="text-orange-500 mb-4 animate-bounce drop-shadow-[0_0_20px_rgba(249,115,22,0.6)]" />
              <div className="px-8 py-4 bg-violet-500 text-white font-black uppercase tracking-widest rounded-full flex items-center gap-2 group-active:scale-95 transition-all shadow-[0_0_25px_rgba(139,92,246,0.5)]">
                <Play size={18} fill="currentColor" /> Tap to Start
              </div>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/80 backdrop-blur-md flex flex-col items-center justify-center z-20">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-1 drop-shadow-[0_0_20px_rgba(239,68,68,1)]">Core Crashed</h2>
              <p className="text-[10px] font-bold text-red-300 uppercase tracking-widest mb-3">Final Score: {score}</p>
              
              {isSyncing && <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-6 flex items-center gap-2"><Loader2 size={12} className="animate-spin"/> Syncing...</p>}
              {!isSyncing && <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-6">Score Saved</p>}

              <div className="px-6 py-3 bg-white text-red-600 font-black uppercase tracking-widest rounded-full flex items-center gap-2 group-active:scale-95 transition-all shadow-xl">
                <RotateCcw size={16} /> Tap to Retry
              </div>
            </div>
          )}

        </div>
        
        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-6 text-center">
          Tap anywhere on the game screen to fly
        </p>

      </div>
    </div>
  );
}
