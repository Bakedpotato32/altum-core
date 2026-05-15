'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Play, RotateCcw, Loader2, Sparkles, Shield, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div style={{
      minHeight: '100dvh',
      background: flash ? 'rgba(239, 68, 68, 0.1)' : '#fff',
      padding: '40px 20px 120px',
      maxWidth: '500px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      transition: 'background 0.2s ease',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      overflow: 'hidden',
      touchAction: 'none'
    }}>
      
      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.1)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '-10%', width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(225, 29, 72, 0.1)', filter: 'blur(80px)' }} />
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 10 }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '24px' }}>
          <button 
            onPointerDown={handleBack} 
            style={{ width: '45px', height: '45px', borderRadius: '14px', background: '#f8fafc', border: '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#f43f5e' }}>Neon Breakout</h1>
            <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Node {level}</p>
          </div>
        </div>

        {/* Score */}
        <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '24px' }}>
          <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Score</span>
            <span style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: '#0f172a', lineHeight: 1 }}>{score}</span>
          </div>
          <div style={{ flex: 1, background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(244, 63, 94, 0.1)' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(244, 63, 94, 0.7)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Trophy size={12} /> Best
            </span>
            <span style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: '#f43f5e', lineHeight: 1 }}>{highScore}</span>
          </div>
        </div>

        {/* GAME CANVAS WRAPPER */}
        <div 
          onPointerMove={handleTouch}
          style={{
            position: 'relative', 
            width: '100%', 
            maxWidth: '340px', 
            height: '460px', 
            background: '#050505', 
            borderRadius: '30px', 
            border: flash ? '2px solid #ef4444' : '2px solid rgba(244, 63, 94, 0.3)', 
            overflow: 'hidden', 
            transition: 'border 0.2s ease, box-shadow 0.2s ease',
            boxShadow: flash ? '0 0 50px rgba(239, 68, 68, 0.4)' : '0 10px 40px rgba(244, 63, 94, 0.15)',
            touchAction: 'none'
          }}
        >
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ width: '100%', height: '100%', display: 'block' }} />

          {/* Overlays */}
          <AnimatePresence>
            {gameState === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                <button 
                  onPointerDown={startNewGame} 
                  style={{ padding: '16px 40px', background: '#f43f5e', color: '#fff', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(244, 63, 94, 0.4)', pointerEvents: 'auto' }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Play size={18} fill="currentColor" /> Initialize
                </button>
                <p style={{ margin: '24px 0 0 0', fontSize: '10px', fontWeight: 900, color: 'rgba(244, 63, 94, 0.6)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Engages Fullscreen</p>
              </motion.div>
            )}

            {gameState === 'leveling' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(16, 185, 129, 0.1)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                <Sparkles size={48} color="#10b981" style={{ marginBottom: '16px' }} className="animate-bounce" />
                <h2 style={{ margin: '0 0 24px 0', fontSize: '28px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-1px', color: '#fff' }}>Node Cleared</h2>
                <button 
                  onPointerDown={startNextLevel} 
                  style={{ padding: '16px 40px', background: '#fff', color: '#10b981', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', pointerEvents: 'auto' }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Next Node <ChevronRight size={18} />
                </button>
              </motion.div>
            )}

            {gameState === 'gameover' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(69, 10, 10, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', zIndex: 20 }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '32px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-1px', color: '#fff' }}>Core Fracture</h2>
                <p style={{ margin: '0 0 32px 0', fontSize: '10px', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '2px' }}>System offline at Node {level}</p>
                <button 
                  onPointerDown={startNewGame} 
                  style={{ padding: '16px 40px', background: '#fff', color: '#dc2626', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', pointerEvents: 'auto' }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <RotateCcw size={18} /> Reboot
                </button>
                {isSyncing && <p style={{ margin: '16px 0 0 0', fontSize: '8px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }} className="animate-pulse"><Loader2 size={10} className="animate-spin" /> Syncing Data...</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Legend */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '32px', opacity: 0.8 }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
             <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 8px #a855f7' }} />
             <span style={{ fontSize: '9px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Wide</span>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
             <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 8px #22d3ee' }} />
             <span style={{ fontSize: '9px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Multi</span>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
             <Shield size={10} color="#94a3b8" />
             <span style={{ fontSize: '9px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Wall</span>
           </div>
        </div>

      </div>
    </div>
  );
}
