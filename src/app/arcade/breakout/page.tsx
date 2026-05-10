'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Play, RotateCcw, Target, Zap, Loader2, Sparkles, Shield, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// --- CONSTANTS ---
const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 480;
const INITIAL_PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 12;
const BALL_RADIUS = 6;
const BRICK_ROWS = 7;
const BRICK_COLS = 5;
const BRICK_HEIGHT = 18;
const BRICK_PADDING = 8;
const INITIAL_BALL_SPEED = 3.2;

type Ball = { x: number, y: number, dx: number, dy: number };
type PowerUp = { x: number, y: number, type: 'wide' | 'multi', status: number };
type Particle = { x: number, y: number, dx: number, dy: number, life: number, color: string };

export default function NeonBreakout() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'leveling' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [level, setLevel] = useState(1);

  const paddleX = useRef((CANVAS_WIDTH - INITIAL_PADDLE_WIDTH) / 2);
  const paddleWidth = useRef(INITIAL_PADDLE_WIDTH);
  const balls = useRef<Ball[]>([]);
  const bricks = useRef<any[]>([]);
  const powerUps = useRef<PowerUp[]>([]);
  const particles = useRef<Particle[]>([]);
  const requestRef = useRef<number>();
  const scoreRef = useRef(0);
  const currentLevel = useRef(1);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('breakoutHS');
    if (saved) setHighScore(parseInt(saved, 10));
    initBricks(1);
  }, []);

  const initBricks = (lvl: number) => {
    const b: any[] = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      // Logic to prevent solid walls of indestructible blocks
      const rowGap1 = Math.floor(Math.random() * BRICK_COLS);
      const rowGap2 = (rowGap1 + 2) % BRICK_COLS;

      for (let c = 0; c < BRICK_COLS; c++) {
        const brickW = (CANVAS_WIDTH - (BRICK_PADDING * (BRICK_COLS + 1))) / BRICK_COLS;
        let durability = 1;
        let color = '#2dd4bf'; // Cyan
        let indestructible = false;

        // Level Design Logic
        if (r === 0) { 
          color = '#f43f5e'; durability = 3; // Top row: Obsidian (3 hits)
        } else if (r === 1) { 
          color = '#fb923c'; durability = 2; // Second row: Reinforced (2 hits)
        } else if (r === 3 && lvl >= 3) { 
          // Mid row wall but WITH GAPS
          if (c !== rowGap1 && c !== rowGap2) {
            color = '#444444'; indestructible = true;
          } else {
            color = '#2dd4bf'; durability = 1;
          }
        } else if (r === 4) { 
          color = '#facc15'; durability = 1; 
        }

        b.push({
          x: c * (brickW + BRICK_PADDING) + BRICK_PADDING,
          y: r * (BRICK_HEIGHT + BRICK_PADDING) + 70,
          w: brickW, h: BRICK_HEIGHT,
          status: 1, durability, maxDurability: durability,
          color, indestructible, shake: 0
        });
      }
    }
    bricks.current = b;
  };

  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 10; i++) {
      particles.current.push({
        x, y, dx: (Math.random() - 0.5) * 8, dy: (Math.random() - 0.5) * 8,
        life: 1.0, color
      });
    }
  };

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

  const handleGameOver = async () => {
    setGameState('gameover');
    playSound(100, 'sawtooth', 0.2, 0.5);
    if (window.navigator.vibrate) window.navigator.vibrate([150, 50, 150]);

    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem('breakoutHS', scoreRef.current.toString());
    }

    const studentId = localStorage.getItem('studentId');
    if (studentId && scoreRef.current > 0) {
      setIsSyncing(true);
      try {
        await supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'breakout', score: scoreRef.current }]);
      } catch (e) {}
      setIsSyncing(false);
    }
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  const startNextLevel = () => {
    currentLevel.current++;
    setLevel(currentLevel.current);
    initBricks(currentLevel.current);
    const speed = INITIAL_BALL_SPEED + (currentLevel.current * 0.3);
    balls.current = [{ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 70, dx: speed, dy: -speed }];
    powerUps.current = [];
    setGameState('playing');
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || gameState !== 'playing') return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Particles
    particles.current.forEach(p => {
      p.x += p.dx; p.y += p.dy; p.life -= 0.04;
      if (p.life > 0) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 2, 2);
      }
    });
    ctx.globalAlpha = 1;
    particles.current = particles.current.filter(p => p.life > 0);

    // Bricks
    let breakableCount = 0;
    bricks.current.forEach(b => {
      if (b.status === 1) {
        if (!b.indestructible) breakableCount++;
        ctx.beginPath();
        const offsetX = Math.sin(b.shake) * 2;
        ctx.roundRect(b.x + offsetX, b.y, b.w, b.h, 4);
        ctx.fillStyle = b.color;
        ctx.shadowBlur = b.indestructible ? 0 : 12;
        ctx.shadowColor = b.color;
        ctx.fill();

        // Visual damage indicator
        if (b.durability > 1) {
          ctx.strokeStyle = "rgba(255,255,255,0.6)";
          ctx.lineWidth = b.durability;
          ctx.stroke();
          // "Crack" effect for 3-hit blocks
          if (b.durability === 2 && b.maxDurability === 3) {
            ctx.moveTo(b.x + 5, b.y + 5);
            ctx.lineTo(b.x + b.w - 5, b.y + b.h - 5);
            ctx.stroke();
          }
        }
        ctx.closePath();
        if (b.shake > 0) b.shake -= 0.5;
      }
    });

    if (breakableCount === 0) {
      setGameState('leveling');
      playSound(800, 'sine', 0.2, 0.4);
      return;
    }

    // Powerups
    powerUps.current.forEach(p => {
      if (p.status === 1) {
        p.y += 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = p.type === 'wide' ? '#a855f7' : '#22d3ee';
        ctx.fill(); ctx.closePath();

        if (p.y > canvas.height - 40 && p.x > paddleX.current && p.x < paddleX.current + paddleWidth.current) {
          p.status = 0;
          playSound(1000, 'sine', 0.2);
          if (p.type === 'wide') {
            paddleWidth.current = 130;
            setTimeout(() => paddleWidth.current = INITIAL_PADDLE_WIDTH, 7000);
          } else {
            balls.current.push({ x: p.x, y: p.y, dx: 3, dy: -4 });
          }
        }
      }
    });

    // Paddle
    ctx.beginPath();
    ctx.roundRect(paddleX.current, canvas.height - 30, paddleWidth.current, PADDLE_HEIGHT, 6);
    ctx.fillStyle = 'white';
    ctx.shadowBlur = 15; ctx.shadowColor = 'white';
    ctx.fill(); ctx.closePath();

    // Balls
    balls.current.forEach((bl, i) => {
      if (bl.x + bl.dx > CANVAS_WIDTH - BALL_RADIUS || bl.x + bl.dx < BALL_RADIUS) {
        bl.dx = -bl.dx; playSound(300, 'sine', 0.05);
      }
      if (bl.y + bl.dy < BALL_RADIUS) {
        bl.dy = -bl.dy; playSound(300, 'sine', 0.05);
      }

      if (bl.y + bl.dy > canvas.height - 30 - BALL_RADIUS) {
        if (bl.x > paddleX.current && bl.x < paddleX.current + paddleWidth.current) {
          let hitPoint = (bl.x - (paddleX.current + paddleWidth.current / 2)) / (paddleWidth.current / 2);
          bl.dy = -bl.dy;
          bl.dx = hitPoint * 5;
          playSound(450, 'sine', 0.08);
        } else if (bl.y > canvas.height) {
          balls.current.splice(i, 1);
        }
      }

      bricks.current.forEach(brick => {
        if (brick.status === 1 && bl.x > brick.x && bl.x < brick.x + brick.w && bl.y > brick.y && bl.y < brick.y + brick.h) {
          bl.dy = -bl.dy;
          if (!brick.indestructible) {
            brick.durability--;
            brick.shake = 5;
            if (brick.durability <= 0) {
              brick.status = 0;
              scoreRef.current += 10 * brick.maxDurability;
              setScore(scoreRef.current);
              createParticles(brick.x + brick.w/2, brick.y + brick.h/2, brick.color);
              playSound(600, 'triangle', 0.15);
              if (Math.random() < 0.18) powerUps.current.push({ x: brick.x + brick.w/2, y: brick.y, type: Math.random() > 0.5 ? 'wide' : 'multi', status: 1 });
            } else {
              playSound(400, 'triangle', 0.1);
            }
          } else {
            playSound(200, 'square', 0.05);
          }
        }
      });

      bl.x += bl.dx; bl.y += bl.dy;
      ctx.beginPath();
      ctx.arc(bl.x, bl.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill(); ctx.closePath();
    });

    if (balls.current.length === 0) handleGameOver();
    else requestRef.current = requestAnimationFrame(draw);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'playing') requestRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [gameState, draw]);

  const handleTouch = (e: any) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = (clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    paddleX.current = Math.max(0, Math.min(CANVAS_WIDTH - paddleWidth.current, x - paddleWidth.current / 2));
  };

  const startNewGame = () => {
    initAudio();
    currentLevel.current = 1; setLevel(1);
    scoreRef.current = 0; setScore(0);
    paddleWidth.current = INITIAL_PADDLE_WIDTH;
    initBricks(1);
    balls.current = [{ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 70, dx: INITIAL_BALL_SPEED, dy: -INITIAL_BALL_SPEED }];
    setGameState('playing');
  };

  return (
    <div className="min-h-[100dvh] pb-40 font-sans bg-[var(--background)] text-[var(--text)] flex flex-col items-center pt-8 relative overflow-hidden touch-none select-none">
      <div className="fixed inset-0 -z-10 pointer-events-none transition-all duration-1000">
        <div className={`absolute top-[-10%] right-[-10%] w-[320px] h-[320px] rounded-full ${gameState === 'gameover' ? 'bg-red-500/10' : 'bg-rose-500/10'} blur-[80px]`} />
        <div className="absolute bottom-[20%] left-[-10%] w-[260px] h-[260px] rounded-full bg-pink-500/10 blur-[80px]" />
      </div>

      <div className="w-full max-w-md px-5 flex flex-col items-center relative z-10">
        <div className="w-full flex justify-between items-center mb-6">
          <button onClick={() => router.back()} className="p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all text-zinc-500">
            <ChevronLeft size={20} />
          </button>
          <div className="text-right">
            <h1 className="text-xl font-black italic uppercase tracking-tighter text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]">Neon Breakout</h1>
            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Node {level}</p>
          </div>
        </div>

        <div className="w-full flex gap-3 mb-6">
          <div className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Score</span>
            <span className="text-3xl font-black italic text-[var(--text)] leading-none">{score}</span>
          </div>
          <div className="flex-1 bg-rose-500/5 border border-rose-500/20 rounded-2xl p-3 flex flex-col items-center justify-center shadow-inner">
            <span className="text-[10px] font-black text-rose-500/70 uppercase tracking-widest flex items-center gap-1 mb-1"><Trophy size={10}/> Best</span>
            <span className="text-3xl font-black italic text-rose-500 leading-none">{highScore}</span>
          </div>
        </div>

        <div 
          onMouseMove={handleTouch} onTouchMove={handleTouch}
          className="relative w-full aspect-[34/48] bg-[#020202] rounded-[32px] border-2 border-[var(--border)] overflow-hidden shadow-2xl"
        >
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full" />

          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <button onClick={startNewGame} className="px-10 py-4 bg-rose-500 text-white font-black uppercase tracking-widest rounded-full flex items-center gap-3 active:scale-95 shadow-[0_0_30px_rgba(244,63,94,0.4)]">
                <Play size={18} fill="currentColor" /> Initialize
              </button>
            </div>
          )}

          {gameState === 'leveling' && (
            <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-md flex flex-col items-center justify-center z-20">
              <Sparkles size={48} className="text-emerald-500 mb-4 animate-bounce" />
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Node Cleared</h2>
              <button onClick={startNextLevel} className="mt-6 px-10 py-4 bg-white text-emerald-600 font-black uppercase tracking-widest rounded-full flex items-center gap-3 active:scale-95 shadow-xl">
                Next Node <ChevronRight size={18} />
              </button>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center z-20 p-6 text-center">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-1">Core Fracture</h2>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-8">System offline at Node {level}</p>
              <button onClick={startNewGame} className="px-10 py-4 bg-white text-red-600 font-black uppercase tracking-widest rounded-full flex items-center gap-3 active:scale-95 shadow-2xl">
                <RotateCcw size={18} /> Reboot
              </button>
              {isSyncing && <p className="mt-4 text-[8px] font-black text-white/30 uppercase tracking-widest animate-pulse flex items-center gap-2"><Loader2 size={10} className="animate-spin" /> Syncing Cloud...</p>}
            </div>
          )}
        </div>
        
        <div className="flex gap-4 mt-8 opacity-60">
           <div className="flex items-center gap-2 bg-[var(--card)] px-3 py-1.5 rounded-full border border-[var(--border)] shadow-sm">
             <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
             <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Wide</span>
           </div>
           <div className="flex items-center gap-2 bg-[var(--card)] px-3 py-1.5 rounded-full border border-[var(--border)] shadow-sm">
             <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
             <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Multi</span>
           </div>
           <div className="flex items-center gap-2 bg-[var(--card)] px-3 py-1.5 rounded-full border border-[var(--border)] shadow-sm">
             <Shield size={8} className="text-zinc-500" />
             <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Wall</span>
           </div>
        </div>
      </div>
    </div>
  );
}
