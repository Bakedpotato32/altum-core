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
const INITIAL_BALL_SPEED = 4.0;
const MAX_BALL_SPEED = 8.0;

type Ball = { x: number, y: number, dx: number, dy: number, trail: {x: number, y: number}[] };
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
  const [flash, setFlash] = useState(false);

  const paddleX = useRef((CANVAS_WIDTH - INITIAL_PADDLE_WIDTH) / 2);
  const paddleWidth = useRef(INITIAL_PADDLE_WIDTH);
  const balls = useRef<Ball[]>([]);
  const bricks = useRef<any[]>([]);
  const powerUps = useRef<PowerUp[]>([]);
  const particles = useRef<Particle[]>([]);
  
  const requestRef = useRef<number>();
  const scoreRef = useRef(0);
  const currentLevel = useRef(1);
  const shakeRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('breakoutHS');
    if (saved) setHighScore(parseInt(saved, 10));
    initBricks(1);
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

  const initBricks = (lvl: number) => {
    const b: any[] = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      const rowGap1 = Math.floor(Math.random() * BRICK_COLS);
      const rowGap2 = (rowGap1 + 2) % BRICK_COLS;

      for (let c = 0; c < BRICK_COLS; c++) {
        const brickW = (CANVAS_WIDTH - (BRICK_PADDING * (BRICK_COLS + 1))) / BRICK_COLS;
        let durability = 1;
        let color = '#2dd4bf'; // Cyan
        let indestructible = false;

        if (r === 0) { 
          color = '#f43f5e'; durability = 3; 
        } else if (r === 1) { 
          color = '#fb923c'; durability = 2; 
        } else if (r === 3 && lvl >= 3) { 
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
    for (let i = 0; i < 15; i++) {
      particles.current.push({
        x, y, dx: (Math.random() - 0.5) * 10, dy: (Math.random() - 0.5) * 10,
        life: 1.0, color
      });
    }
  };

  const handleGameOver = async () => {
    setGameState('gameover');
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    shakeRef.current = 20; // Massive shake
    playSound(100, 'sawtooth', 0.2, 0.5);
    vibrate([150, 50, 200, 100, 300]);

    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem('breakoutHS', scoreRef.current.toString());
    }

    const studentId = localStorage.getItem('studentId');
    if (studentId && scoreRef.current > 0) {
      setIsSyncing(true);
      try {
        const { data: existing } = await supabase.from('arcade_scores').select('*').eq('student_id', studentId).eq('game_name', 'breakout').maybeSingle();
        if (!existing) {
          await supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'breakout', score: scoreRef.current }]);
        } else if (scoreRef.current > existing.score) {
          await supabase.from('arcade_scores').update({ score: scoreRef.current }).eq('id', existing.id);
        }
      } catch (e) {}
      setIsSyncing(false);
    }
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  const startNextLevel = () => {
    currentLevel.current++;
    setLevel(currentLevel.current);
    initBricks(currentLevel.current);
    const speed = Math.min(MAX_BALL_SPEED, INITIAL_BALL_SPEED + (currentLevel.current * 0.4));
    balls.current = [{ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 70, dx: speed, dy: -speed, trail: [] }];
    powerUps.current = [];
    setGameState('playing');
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || gameState !== 'playing') return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- SCREEN SHAKE ---
    if (shakeRef.current > 0) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
        shakeRef.current *= 0.85;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
    }

    // Particles
    particles.current.forEach(p => {
      p.x += p.dx; p.y += p.dy; p.life -= 0.04;
      p.dy += 0.2; // Gravity
      if (p.life > 0) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
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
        const offsetX = Math.sin(b.shake) * 3;
        ctx.roundRect(b.x + offsetX, b.y, b.w, b.h, 4);
        ctx.fillStyle = b.color;
        ctx.shadowBlur = b.indestructible ? 0 : 15;
        ctx.shadowColor = b.color;
        ctx.fill();

        if (b.durability > 1) {
          ctx.strokeStyle = "rgba(255,255,255,0.8)";
          ctx.lineWidth = 2;
          ctx.stroke();
          if (b.durability === 2 && b.maxDurability === 3) {
            ctx.beginPath();
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
      if (shakeRef.current > 0) ctx.restore();
      return;
    }

    // Powerups
    powerUps.current.forEach(p => {
      if (p.status === 1) {
        p.y += 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = p.type === 'wide' ? '#a855f7' : '#22d3ee';
        ctx.shadowBlur = 15; ctx.shadowColor = ctx.fillStyle;
        ctx.fill(); ctx.closePath();
        ctx.shadowBlur = 0;

        if (p.y > canvas.height - 40 && p.x > paddleX.current && p.x < paddleX.current + paddleWidth.current) {
          p.status = 0;
          playSound(1000, 'sine', 0.2);
          vibrate([30, 30]);
          if (p.type === 'wide') {
            paddleWidth.current = 130;
            setTimeout(() => paddleWidth.current = INITIAL_PADDLE_WIDTH, 8000);
          } else {
            balls.current.push({ x: p.x, y: p.y, dx: 3, dy: -4, trail: [] });
          }
        }
      }
    });

    // Paddle
    ctx.beginPath();
    ctx.roundRect(paddleX.current, canvas.height - 30, paddleWidth.current, PADDLE_HEIGHT, 6);
    ctx.fillStyle = '#f43f5e';
    ctx.shadowBlur = 20; ctx.shadowColor = '#f43f5e';
    ctx.fill(); ctx.closePath();
    ctx.shadowBlur = 0;

    // Balls
    balls.current.forEach((bl, i) => {
      // Trail tracking
      bl.trail.push({ x: bl.x, y: bl.y });
      if (bl.trail.length > 6) bl.trail.shift();

      // Draw Trail
      bl.trail.forEach((t, ti) => {
          ctx.globalAlpha = (ti / bl.trail.length) * 0.5;
          ctx.beginPath();
          ctx.arc(t.x, t.y, BALL_RADIUS - 1, 0, Math.PI * 2);
          ctx.fillStyle = '#f43f5e';
          ctx.fill(); ctx.closePath();
      });
      ctx.globalAlpha = 1;

      // Wall Bounces
      if (bl.x + bl.dx > CANVAS_WIDTH - BALL_RADIUS || bl.x + bl.dx < BALL_RADIUS) {
        bl.dx = -bl.dx; playSound(300, 'sine', 0.05);
      }
      if (bl.y + bl.dy < BALL_RADIUS) {
        bl.dy = -bl.dy; playSound(300, 'sine', 0.05);
      }

      // Paddle / Death Bounds
      if (bl.y + bl.dy > canvas.height - 30 - BALL_RADIUS) {
        if (bl.x > paddleX.current - BALL_RADIUS && bl.x < paddleX.current + paddleWidth.current + BALL_RADIUS) {
          // Dynamic Edge Spin Hit
          let hitPoint = (bl.x - (paddleX.current + paddleWidth.current / 2)) / (paddleWidth.current / 2);
          bl.dy = -Math.abs(bl.dy); // Ensure it always goes up
          bl.dx = hitPoint * 6; // Sharper angles
          
          // Slight speed increase on paddle hit
          const currentSpeed = Math.sqrt(bl.dx*bl.dx + bl.dy*bl.dy);
          if (currentSpeed < MAX_BALL_SPEED) {
              bl.dx *= 1.02; bl.dy *= 1.02;
          }

          playSound(450, 'sine', 0.08);
          vibrate(15);
          shakeRef.current = 2; // Micro shake on paddle hit
        } else if (bl.y > canvas.height) {
          balls.current.splice(i, 1);
          vibrate(50);
          shakeRef.current = 10;
        }
      }

      // Brick Collision
      bricks.current.forEach(brick => {
        if (brick.status === 1) {
            // Find closest point on brick to ball
            const testX = Math.max(brick.x, Math.min(bl.x, brick.x + brick.w));
            const testY = Math.max(brick.y, Math.min(bl.y, brick.y + brick.h));
            
            const distX = bl.x - testX;
            const distY = bl.y - testY;
            const distance = Math.sqrt((distX*distX) + (distY*distY));

            if (distance <= BALL_RADIUS) {
              // Determine bounce direction
              if (Math.abs(distX) > Math.abs(distY)) {
                  bl.dx = -bl.dx;
              } else {
                  bl.dy = -bl.dy;
              }

              if (!brick.indestructible) {
                brick.durability--;
                brick.shake = 8;
                if (brick.durability <= 0) {
                  brick.status = 0;
                  scoreRef.current += 10 * brick.maxDurability;
                  setScore(scoreRef.current);
                  createParticles(brick.x + brick.w/2, brick.y + brick.h/2, brick.color);
                  shakeRef.current = 4; // Screen shake on break
                  playSound(600, 'triangle', 0.15);
                  vibrate(10);

                  if (Math.random() < 0.15) powerUps.current.push({ x: brick.x + brick.w/2, y: brick.y, type: Math.random() > 0.5 ? 'wide' : 'multi', status: 1 });
                } else {
                  playSound(400, 'triangle', 0.1);
                  vibrate(5);
                }
              } else {
                playSound(200, 'square', 0.05);
                vibrate(5);
              }
            }
        }
      });

      // Move & Draw Core Ball
      bl.x += bl.dx; bl.y += bl.dy;
      ctx.beginPath();
      ctx.arc(bl.x, bl.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.shadowBlur = 15; ctx.shadowColor = '#f43f5e';
      ctx.fill(); ctx.closePath();
      ctx.shadowBlur = 0;
    });

    if (shakeRef.current > 0) ctx.restore();

    if (balls.current.length === 0) handleGameOver();
    else requestRef.current = requestAnimationFrame(draw);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'playing') requestRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [gameState, draw]);

  // Handle touch across the whole container, not just canvas
  const handleTouch = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    paddleX.current = Math.max(0, Math.min(CANVAS_WIDTH - paddleWidth.current, x - paddleWidth.current / 2));
  };

  const startNewGame = () => {
    requestFullscreen();
    initAudio();
    currentLevel.current = 1; setLevel(1);
    scoreRef.current = 0; setScore(0);
    shakeRef.current = 0;
    paddleWidth.current = INITIAL_PADDLE_WIDTH;
    initBricks(1);
    balls.current = [{ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 70, dx: INITIAL_BALL_SPEED, dy: -INITIAL_BALL_SPEED, trail: [] }];
    setGameState('playing');
  };

  return (
    // STRICT TOUCH LOCK
    <div className={`h-[100dvh] w-screen font-sans bg-[var(--background)] text-[var(--text)] flex flex-col items-center pt-8 relative overflow-hidden select-none touch-none overscroll-none transition-colors duration-200 ${flash ? 'bg-red-950/30' : ''}`}>
      
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none transition-all duration-1000">
        <div className={`absolute top-[-10%] right-[-10%] w-[320px] h-[320px] rounded-full ${gameState === 'gameover' ? 'bg-red-500/10' : 'bg-rose-500/10'} blur-[80px]`} />
        <div className="absolute bottom-[20%] left-[-10%] w-[260px] h-[260px] rounded-full bg-pink-500/10 blur-[80px]" />
      </div>

      <div className="w-full max-w-md px-5 flex flex-col items-center h-full relative z-10">
        
        {/* Header */}
        <div className="w-full flex justify-between items-center mb-6">
          <button onPointerDown={handleBack} className="p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all text-zinc-500 z-50">
            <ChevronLeft size={20} />
          </button>
          <div className="text-right">
            <h1 className="text-xl font-black italic uppercase tracking-tighter text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]">Neon Breakout</h1>
            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Node {level}</p>
          </div>
        </div>

        {/* Score */}
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

        {/* GAME CANVAS WRAPPER (Captures touch anywhere inside it) */}
        <div 
          onPointerMove={handleTouch}
          className={`relative w-full aspect-[34/48] max-h-[460px] bg-[#020202] rounded-[32px] border-2 transition-all duration-300 overflow-hidden shadow-2xl touch-none ${flash ? 'border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.4)]' : 'border-[var(--border)]'}`}
        >
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full block" />

          {/* Overlays */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20 pointer-events-none">
              <button onPointerDown={startNewGame} className="px-10 py-4 bg-rose-500 text-white font-black uppercase tracking-widest rounded-full flex items-center gap-3 active:scale-95 shadow-[0_0_30px_rgba(244,63,94,0.4)] pointer-events-auto">
                <Play size={18} fill="currentColor" /> Initialize
              </button>
              <p className="text-[8px] font-black text-rose-300/60 uppercase tracking-[0.2em] mt-4">Engages Fullscreen</p>
            </div>
          )}

          {gameState === 'leveling' && (
            <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-md flex flex-col items-center justify-center z-20 pointer-events-none">
              <Sparkles size={48} className="text-emerald-500 mb-4 animate-bounce" />
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Node Cleared</h2>
              <button onPointerDown={startNextLevel} className="mt-6 px-10 py-4 bg-white text-emerald-600 font-black uppercase tracking-widest rounded-full flex items-center gap-3 active:scale-95 shadow-xl pointer-events-auto">
                Next Node <ChevronRight size={18} />
              </button>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center z-20 p-6 text-center pointer-events-none">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-1">Core Fracture</h2>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-8">System offline at Node {level}</p>
              <button onPointerDown={startNewGame} className="px-10 py-4 bg-white text-red-600 font-black uppercase tracking-widest rounded-full flex items-center gap-3 active:scale-95 shadow-2xl pointer-events-auto">
                <RotateCcw size={18} /> Reboot
              </button>
              {isSyncing && <p className="mt-4 text-[8px] font-black text-white/30 uppercase tracking-widest animate-pulse flex items-center gap-2"><Loader2 size={10} className="animate-spin" /> Syncing...</p>}
            </div>
          )}
        </div>
        
        {/* Legend */}
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
