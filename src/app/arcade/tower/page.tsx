'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Play, RotateCcw, Zap, Loader2, Target, AlignCenter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TowerLogo } from '@/components/ArcadeIcons';

// --- ENGINE CONSTANTS ---
const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 480;
const BLOCK_HEIGHT = 24;
const INITIAL_WIDTH = 140;
const BASE_Y = CANVAS_HEIGHT - 60;
const INITIAL_SPEED = 3.0;
const MAX_SPEED = 8.5;

type Block = { x: number, y: number, w: number, h: number, color: string };
type Debris = { x: number, y: number, w: number, h: number, color: string, dx: number, dy: number, angle: number, spin: number };

export default function NeonTower() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // UI State
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [combo, setCombo] = useState(0);

  // Engine Refs
  const isRunning = useRef(false);
  const gameStateRef = useRef<'idle' | 'playing' | 'gameover'>('idle');
  const requestRef = useRef<number>();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gameStartTime = useRef(0);

  // Game Logic Refs
  const blocks = useRef<Block[]>([]);
  const debris = useRef<Debris[]>([]);
  const currentBlock = useRef<Block | null>(null);
  const moveDir = useRef(1);
  const currentSpeed = useRef(INITIAL_SPEED);
  const cameraOffset = useRef(0);
  const targetCameraOffset = useRef(0);
  const hueRef = useRef(0);
  const shakeRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem('towerHS');
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
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duration);
  };

  const vibrate = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };

  // --- GAME LOGIC ---
  const handleGameOver = () => {
    gameStateRef.current = 'gameover';
    setGameState('gameover');
    playSound(100, 'sawtooth', 0.2, 0.8);
    vibrate([150, 50, 300]);
    shakeRef.current = 20;

    // EPIC TOWER COLLAPSE PHYSICS
    blocks.current.forEach(b => {
      debris.current.push({
        x: b.x, y: b.y, w: b.w, h: b.h, color: b.color,
        dx: (Math.random() - 0.5) * 8, dy: -(Math.random() * 6),
        angle: 0, spin: (Math.random() - 0.5) * 0.4
      });
    });
    blocks.current = []; // Instantly wipe the tower so it shatters

    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem('towerHS', scoreRef.current.toString());
    }

    // Fire-and-Forget Database Sync (Prevents the engine from halting)
    const studentId = localStorage.getItem('studentId');
    if (studentId && scoreRef.current > 0) {
      setIsSyncing(true);
      supabase.from('arcade_scores').select('*').eq('student_id', studentId).eq('game_name', 'tower').maybeSingle()
        .then(({ data: existing }) => {
          if (!existing) return supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'tower', score: scoreRef.current }]);
          else if (scoreRef.current > existing.score) return supabase.from('arcade_scores').update({ score: scoreRef.current }).eq('id', existing.id);
        })
        .finally(() => setIsSyncing(false));
    }
  };

  const spawnBlock = () => {
    if (blocks.current.length === 0) return;
    const lastBlock = blocks.current[blocks.current.length - 1];
    hueRef.current = (hueRef.current + 8) % 360;
    
    currentBlock.current = {
      x: moveDir.current === 1 ? -lastBlock.w : CANVAS_WIDTH,
      y: BASE_Y - (blocks.current.length * BLOCK_HEIGHT),
      w: lastBlock.w,
      h: BLOCK_HEIGHT,
      color: `hsl(${hueRef.current}, 80%, 60%)`
    };
    
    targetCameraOffset.current = Math.max(0, (blocks.current.length - 4) * BLOCK_HEIGHT);
  };

  const handleDrop = (e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    
    // Strict Debounce: Prevents the "Start" click from dropping the first block instantly
    if (gameStateRef.current !== 'playing' || !currentBlock.current || Date.now() - gameStartTime.current < 300) return;

    const cb = currentBlock.current;
    const lastBlock = blocks.current[blocks.current.length - 1];

    const overlapLeft = Math.max(cb.x, lastBlock.x);
    const overlapRight = Math.min(cb.x + cb.w, lastBlock.x + lastBlock.w);
    let overlapWidth = overlapRight - overlapLeft;

    if (overlapWidth > 0) {
      // 1. Check for Perfect Placement (Tolerance 6px for excellent game feel)
      const tolerance = 6;
      let isPerfect = false;
      if (Math.abs(cb.x - lastBlock.x) <= tolerance) {
        cb.x = lastBlock.x;
        cb.w = lastBlock.w;
        overlapWidth = lastBlock.w;
        isPerfect = true;
      }

      // 2. Handle Imperfect Placement (Slicing)
      if (!isPerfect) {
        const debrisW = cb.w - overlapWidth;
        const debrisX = cb.x < lastBlock.x ? cb.x : overlapRight;
        
        debris.current.push({
          x: debrisX, y: cb.y, w: debrisW, h: BLOCK_HEIGHT,
          color: cb.color, dx: cb.x < lastBlock.x ? -3 : 3, dy: 0,
          angle: 0, spin: cb.x < lastBlock.x ? -0.15 : 0.15
        });

        cb.x = overlapLeft;
        cb.w = overlapWidth;
        
        comboRef.current = 0;
        setCombo(0);
        playSound(300, 'square', 0.1, 0.1);
        vibrate(10);
      } else {
        // Perfect Placement Combo
        comboRef.current += 1;
        setCombo(comboRef.current);
        playSound(600 + (comboRef.current * 50), 'sine', 0.1, 0.15);
        vibrate(25);
        shakeRef.current = 4;
        
        cb.color = '#ffffff'; 
        setTimeout(() => { if(cb) cb.color = `hsl(${hueRef.current}, 80%, 60%)`; }, 100);

        if (comboRef.current >= 3 && cb.w < INITIAL_WIDTH) {
           const growth = Math.min(15, INITIAL_WIDTH - cb.w);
           cb.w += growth;
           cb.x -= growth / 2;
           playSound(900, 'triangle', 0.1, 0.3);
           comboRef.current = 0; 
           setCombo(0);
        }
      }

      // 3. Commit block and progress
      blocks.current.push({ ...cb });
      scoreRef.current += 1;
      setScore(scoreRef.current);
      
      currentSpeed.current = Math.min(MAX_SPEED, INITIAL_SPEED + (scoreRef.current * 0.12));
      moveDir.current *= -1; 
      
      spawnBlock();

    } else {
      // Complete Miss
      debris.current.push({
          x: cb.x, y: cb.y, w: cb.w, h: BLOCK_HEIGHT,
          color: cb.color, dx: 0, dy: 0,
          angle: 0, spin: moveDir.current * 0.1
      });
      currentBlock.current = null;
      handleGameOver();
    }
  };

  // --- CORE RENDER LOOP ---
  const update = useCallback(() => {
    if (!isRunning.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Logic
    if (gameStateRef.current === 'playing' && currentBlock.current) {
        currentBlock.current.x += currentSpeed.current * moveDir.current;
        if (currentBlock.current.x > CANVAS_WIDTH + 10 || currentBlock.current.x < -currentBlock.current.w - 10) {
            moveDir.current *= -1;
        }
    }

    cameraOffset.current += (targetCameraOffset.current - cameraOffset.current) * 0.1;

    debris.current.forEach(d => {
        d.dy += 0.6; // gravity
        d.x += d.dx;
        d.y += d.dy;
        d.angle += d.spin;
    });
    debris.current = debris.current.filter(d => d.y < CANVAS_HEIGHT + cameraOffset.current + 200);

    // Stop engine loop completely if game over and debris is fully cleared
    if (gameStateRef.current === 'gameover' && debris.current.length === 0) {
        isRunning.current = false;
    }

    // Render
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    if (shakeRef.current > 0) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
        shakeRef.current *= 0.85;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
    }

    ctx.save();
    ctx.translate(0, cameraOffset.current);

    // Background Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridY = -cameraOffset.current % 40;
    for(let i=-2; i<CANVAS_HEIGHT/40 + 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, gridY + i*40 - cameraOffset.current);
        ctx.lineTo(CANVAS_WIDTH, gridY + i*40 - cameraOffset.current);
        ctx.stroke();
    }

    // Tower Blocks
    blocks.current.forEach((b, i) => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(b.x, b.y, b.w, 3); 
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(b.x, b.y + b.h - 3, b.w, 3);
        
        if (i === blocks.current.length - 1 && gameStateRef.current === 'playing') {
            ctx.shadowBlur = 20;
            ctx.shadowColor = b.color;
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.shadowBlur = 0;
        }
    });

    // Moving Block
    if (gameStateRef.current === 'playing' && currentBlock.current && blocks.current.length > 0) {
        const cb = currentBlock.current;
        ctx.fillStyle = cb.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = cb.color;
        ctx.fillRect(cb.x, cb.y, cb.w, cb.h);
        ctx.shadowBlur = 0;
        
        const lastBlock = blocks.current[blocks.current.length - 1];
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(lastBlock.x, -cameraOffset.current); ctx.lineTo(lastBlock.x, CANVAS_HEIGHT - cameraOffset.current);
        ctx.moveTo(lastBlock.x + lastBlock.w, -cameraOffset.current); ctx.lineTo(lastBlock.x + lastBlock.w, CANVAS_HEIGHT - cameraOffset.current);
        ctx.stroke();
    }

    // Physics Debris
    debris.current.forEach(d => {
        ctx.save();
        ctx.translate(d.x + d.w/2, d.y + d.h/2);
        ctx.rotate(d.angle);
        ctx.fillStyle = d.color;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(-d.w/2, -d.h/2, d.w, d.h);
        ctx.restore();
    });

    ctx.restore();
    if (shakeRef.current > 0) ctx.restore();

    if (isRunning.current) requestRef.current = requestAnimationFrame(update);
  }, []);

  const initiateGame = (e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    requestFullscreen();
    initAudio();
    
    // Hard Engine Reset
    hueRef.current = 40; 
    blocks.current = [{ x: (CANVAS_WIDTH - INITIAL_WIDTH) / 2, y: BASE_Y, w: INITIAL_WIDTH, h: BLOCK_HEIGHT, color: `hsl(${hueRef.current}, 80%, 60%)` }];
    debris.current = [];
    currentSpeed.current = INITIAL_SPEED;
    cameraOffset.current = 0;
    targetCameraOffset.current = 0;
    scoreRef.current = 0;
    comboRef.current = 0;
    setScore(0);
    setCombo(0);
    
    gameStartTime.current = Date.now(); 
    
    spawnBlock();
    
    gameStateRef.current = 'playing';
    setGameState('playing');
    
    if (!isRunning.current) {
      isRunning.current = true;
      requestRef.current = requestAnimationFrame(update);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.code === 'Space') handleDrop(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleDrop]);

  return (
    <div className={`h-[100dvh] w-screen font-sans bg-[var(--background)] text-[var(--text)] flex flex-col items-center pt-8 relative overflow-hidden select-none touch-none overscroll-none transition-colors duration-200 ${gameState === 'gameover' ? 'bg-red-950/20' : ''}`}>
      
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none transition-colors duration-1000">
        <div className={`absolute top-[-10%] right-[-10%] w-[320px] h-[320px] rounded-full transition-colors ${gameState === 'gameover' ? 'bg-red-500/10' : 'bg-yellow-400/10'} blur-[80px]`} />
        <div className="absolute bottom-[20%] left-[-10%] w-[260px] h-[260px] rounded-full bg-orange-500/10 blur-[80px]" />
      </div>

      <div className="w-full max-w-md px-5 flex flex-col h-full relative z-10">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={handleBack} className="p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all text-zinc-500 z-50 shadow-sm cursor-pointer hover:text-yellow-400">
            <ChevronLeft size={20} />
          </button>
          <div className="text-right">
            <h1 className="text-xl font-black italic uppercase tracking-tighter text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]">Neon Tower</h1>
            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">Precision Stacking</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
            {combo > 0 && (
                <div className="absolute top-0 right-0 p-2 opacity-50 flex items-center gap-1">
                    <Zap size={10} className="text-yellow-400" />
                    <span className="text-[10px] font-black text-yellow-400">x{combo}</span>
                </div>
            )}
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Height</span>
            <span className="text-3xl font-black italic text-[var(--text)] leading-none">{score}</span>
          </div>
          <div className="flex-1 bg-yellow-400/5 border border-yellow-400/20 rounded-2xl p-3 flex flex-col items-center justify-center shadow-inner">
            <span className="text-[10px] font-black text-yellow-500/70 uppercase tracking-widest flex items-center gap-1 mb-1">
              <Trophy size={10}/> Record
            </span>
            <span className="text-3xl font-black italic text-yellow-500 leading-none">{highScore}</span>
          </div>
        </div>

        {/* --- GAME CANVAS WRAPPER --- */}
        <div 
          onPointerDown={handleDrop}
          className={`relative w-full aspect-[34/48] max-h-[500px] bg-[#050505] rounded-[32px] border-2 transition-all duration-300 overflow-hidden shadow-2xl cursor-pointer touch-none ${gameState === 'gameover' ? 'border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)]' : 'border-[var(--border)]'}`}
        >
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full block pointer-events-none" />

          {/* Overlays (Standard onClick, no blocking events) */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <TowerLogo className="w-20 h-20 text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-pulse" />
              <button onClick={initiateGame} className="px-10 py-4 bg-yellow-400 text-black font-black uppercase tracking-widest rounded-full flex items-center gap-3 shadow-[0_0_30px_rgba(250,204,21,0.5)] active:scale-95 transition-all">
                <Play size={18} fill="currentColor" /> Drop Block
              </button>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] mt-10">Tower Collapsed</h2>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-8">Final Height: {score}</p>
              
              <button onClick={initiateGame} className="px-10 py-4 bg-white text-red-600 font-black uppercase tracking-widest rounded-full flex items-center gap-3 shadow-2xl active:scale-95 transition-all">
                <RotateCcw size={18} /> Rebuild
              </button>
              {isSyncing && <p className="mt-4 text-[8px] font-black text-white/30 uppercase tracking-widest animate-pulse flex items-center gap-2"><Loader2 size={10} className="animate-spin" /> Syncing Data...</p>}
            </div>
          )}
        </div>
        
        <div className="mt-8 flex justify-center gap-6 opacity-50 w-full pointer-events-none">
            <div className="flex items-center gap-2">
                <Target size={14} className="text-zinc-500" />
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Tap anywhere to drop</span>
            </div>
            <div className="flex items-center gap-2">
                <AlignCenter size={14} className="text-zinc-500" />
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Perfect = Combo</span>
            </div>
        </div>

      </div>
    </div>
  );
}
