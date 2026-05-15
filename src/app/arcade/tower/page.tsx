'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Play, RotateCcw, Zap, Loader2, Target, AlignCenter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TowerLogo } from '@/components/ArcadeIcons';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [flash, setFlash] = useState(false);

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
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
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
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };

  // --- GAME LOGIC ---
  const handleGameOver = () => {
    gameStateRef.current = 'gameover';
    setGameState('gameover');
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    playSound(100, 'sawtooth', 0.2, 0.8);
    vibrate([150, 50, 300]);
    shakeRef.current = 20;

    blocks.current.forEach(b => {
      debris.current.push({
        x: b.x, y: b.y, w: b.w, h: b.h, color: b.color,
        dx: (Math.random() - 0.5) * 8, dy: -(Math.random() * 6),
        angle: 0, spin: (Math.random() - 0.5) * 0.4
      });
    });
    blocks.current = [];

    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem('towerHS', scoreRef.current.toString());
    }

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
    if (gameStateRef.current !== 'playing' || !currentBlock.current || Date.now() - gameStartTime.current < 300) return;

    const cb = currentBlock.current;
    const lastBlock = blocks.current[blocks.current.length - 1];

    const overlapLeft = Math.max(cb.x, lastBlock.x);
    const overlapRight = Math.min(cb.x + cb.w, lastBlock.x + lastBlock.w);
    let overlapWidth = overlapRight - overlapLeft;

    if (overlapWidth > 0) {
      const tolerance = 6;
      let isPerfect = false;
      if (Math.abs(cb.x - lastBlock.x) <= tolerance) {
        cb.x = lastBlock.x; cb.w = lastBlock.w;
        overlapWidth = lastBlock.w; isPerfect = true;
      }

      if (!isPerfect) {
        const debrisW = cb.w - overlapWidth;
        const debrisX = cb.x < lastBlock.x ? cb.x : overlapRight;
        debris.current.push({
          x: debrisX, y: cb.y, w: debrisW, h: BLOCK_HEIGHT,
          color: cb.color, dx: cb.x < lastBlock.x ? -3 : 3, dy: 0,
          angle: 0, spin: cb.x < lastBlock.x ? -0.15 : 0.15
        });
        cb.x = overlapLeft; cb.w = overlapWidth;
        comboRef.current = 0; setCombo(0);
        playSound(300, 'square', 0.1, 0.1); vibrate(10);
      } else {
        comboRef.current += 1; setCombo(comboRef.current);
        playSound(600 + (comboRef.current * 50), 'sine', 0.1, 0.15); vibrate(25);
        shakeRef.current = 4;
        cb.color = '#ffffff'; 
        setTimeout(() => { if(cb) cb.color = `hsl(${hueRef.current}, 80%, 60%)`; }, 100);
        if (comboRef.current >= 3 && cb.w < INITIAL_WIDTH) {
           const growth = Math.min(15, INITIAL_WIDTH - cb.w);
           cb.w += growth; cb.x -= growth / 2;
           playSound(900, 'triangle', 0.1, 0.3); comboRef.current = 0; setCombo(0);
        }
      }
      blocks.current.push({ ...cb });
      scoreRef.current += 1; setScore(scoreRef.current);
      currentSpeed.current = Math.min(MAX_SPEED, INITIAL_SPEED + (scoreRef.current * 0.12));
      moveDir.current *= -1; spawnBlock();
    } else {
      debris.current.push({ x: cb.x, y: cb.y, w: cb.w, h: BLOCK_HEIGHT, color: cb.color, dx: 0, dy: 0, angle: 0, spin: moveDir.current * 0.1 });
      currentBlock.current = null; handleGameOver();
    }
  };

  const update = useCallback(() => {
    if (!isRunning.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    if (gameStateRef.current === 'playing' && currentBlock.current) {
        currentBlock.current.x += currentSpeed.current * moveDir.current;
        if (currentBlock.current.x > CANVAS_WIDTH + 10 || currentBlock.current.x < -currentBlock.current.w - 10) moveDir.current *= -1;
    }
    cameraOffset.current += (targetCameraOffset.current - cameraOffset.current) * 0.1;
    debris.current.forEach(d => { d.dy += 0.6; d.x += d.dx; d.y += d.dy; d.angle += d.spin; });
    debris.current = debris.current.filter(d => d.y < CANVAS_HEIGHT + cameraOffset.current + 200);

    if (gameStateRef.current === 'gameover' && debris.current.length === 0) isRunning.current = false;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (shakeRef.current > 0) { ctx.save(); ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current); shakeRef.current *= 0.85; if (shakeRef.current < 0.5) shakeRef.current = 0; }
    ctx.save(); ctx.translate(0, cameraOffset.current);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridY = -cameraOffset.current % 40;
    for(let i=-2; i<CANVAS_HEIGHT/40 + 4; i++) { ctx.beginPath(); ctx.moveTo(0, gridY + i*40 - cameraOffset.current); ctx.lineTo(CANVAS_WIDTH, gridY + i*40 - cameraOffset.current); ctx.stroke(); }

    blocks.current.forEach((b, i) => {
        ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fillRect(b.x, b.y, b.w, 3); 
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; ctx.fillRect(b.x, b.y + b.h - 3, b.w, 3);
        if (i === blocks.current.length - 1 && gameStateRef.current === 'playing') { ctx.shadowBlur = 20; ctx.shadowColor = b.color; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.shadowBlur = 0; }
    });

    if (gameStateRef.current === 'playing' && currentBlock.current && blocks.current.length > 0) {
        const cb = currentBlock.current;
        ctx.fillStyle = cb.color; ctx.shadowBlur = 15; ctx.shadowColor = cb.color; ctx.fillRect(cb.x, cb.y, cb.w, cb.h); ctx.shadowBlur = 0;
        const lastBlock = blocks.current[blocks.current.length - 1];
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.beginPath();
        ctx.moveTo(lastBlock.x, -cameraOffset.current); ctx.lineTo(lastBlock.x, CANVAS_HEIGHT - cameraOffset.current);
        ctx.moveTo(lastBlock.x + lastBlock.w, -cameraOffset.current); ctx.lineTo(lastBlock.x + lastBlock.w, CANVAS_HEIGHT - cameraOffset.current);
        ctx.stroke();
    }

    debris.current.forEach(d => { ctx.save(); ctx.translate(d.x + d.w/2, d.y + d.h/2); ctx.rotate(d.angle); ctx.fillStyle = d.color; ctx.globalAlpha = 0.8; ctx.fillRect(-d.w/2, -d.h/2, d.w, d.h); ctx.restore(); });
    ctx.restore();
    if (shakeRef.current > 0) ctx.restore();
    if (isRunning.current) requestRef.current = requestAnimationFrame(update);
  }, []);

  const initiateGame = (e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    requestFullscreen(); initAudio();
    hueRef.current = 40; 
    blocks.current = [{ x: (CANVAS_WIDTH - INITIAL_WIDTH) / 2, y: BASE_Y, w: INITIAL_WIDTH, h: BLOCK_HEIGHT, color: `hsl(${hueRef.current}, 80%, 60%)` }];
    debris.current = []; currentSpeed.current = INITIAL_SPEED; cameraOffset.current = 0; targetCameraOffset.current = 0;
    scoreRef.current = 0; comboRef.current = 0; setScore(0); setCombo(0); setFlash(false);
    gameStartTime.current = Date.now(); spawnBlock();
    gameStateRef.current = 'playing'; setGameState('playing');
    if (!isRunning.current) { isRunning.current = true; requestRef.current = requestAnimationFrame(update); }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.code === 'Space') handleDrop(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleDrop]);

  return (
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
      
      {/* Background Ambience */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(234, 179, 8, 0.1)', filter: 'blur(80px)' }} />
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 10 }}>
        
        {/* Header Area */}
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
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#eab308' }}>Neon Tower</h1>
          </div>
        </div>

        {/* Score Board */}
        <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '24px' }}>
          <div style={{ flex: 1, background: '#f8fafc', border: combo > 0 ? '2px solid #eab308' : '1px solid #e2e8f0', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'all 0.15s ease', transform: combo > 0 ? 'scale(1.05)' : 'scale(1)', boxShadow: combo > 0 ? '0 0 20px rgba(234, 179, 8, 0.2)' : 'none' }}>
            {combo > 0 && (
                <div style={{ position: 'absolute', top: '8px', right: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Zap size={10} color="#eab308" />
                    <span style={{ fontSize: '10px', fontWeight: 900, color: '#eab308' }}>x{combo}</span>
                </div>
            )}
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Height</span>
            <span style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: '#0f172a', lineHeight: 1 }}>{score}</span>
          </div>

          <div style={{ flex: 1, background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(234, 179, 8, 0.1)' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(161, 98, 7, 0.7)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Trophy size={12} /> Record
            </span>
            <span style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: '#eab308', lineHeight: 1 }}>{highScore}</span>
          </div>
        </div>

        {/* Game Box */}
        <div 
          onPointerDown={handleDrop}
          style={{
            position: 'relative', 
            width: '100%', 
            maxWidth: '340px', 
            height: '480px', 
            background: '#050505', 
            borderRadius: '30px', 
            border: flash ? '2px solid #ef4444' : '2px solid rgba(234, 179, 8, 0.3)', 
            overflow: 'hidden', 
            transition: 'border 0.2s ease, box-shadow 0.2s ease',
            boxShadow: flash ? '0 0 50px rgba(239, 68, 68, 0.4)' : '0 10px 40px rgba(234, 179, 8, 0.15)',
            touchAction: 'none'
          }}
        >
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />

          {/* Overlays */}
          <AnimatePresence>
            {gameState === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                <TowerLogo className="w-20 h-20 text-yellow-400 mb-6 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                <button 
                  onPointerDown={initiateGame} 
                  style={{ padding: '16px 40px', background: '#eab308', color: '#000', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(234, 179, 8, 0.4)', pointerEvents: 'auto' }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Play size={18} fill="currentColor" /> Initiate
                </button>
                <p style={{ margin: '24px 0 0 0', fontSize: '8px', fontWeight: 900, color: 'rgba(253, 224, 71, 0.6)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Engages Fullscreen</p>
              </motion.div>
            )}

            {gameState === 'gameover' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(69, 10, 10, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', zIndex: 20 }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '30px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-1px', color: '#fff', textShadow: '0 0 20px rgba(239,68,68,1)' }}>Tower Collapsed</h2>
                <p style={{ margin: '0 0 32px 0', fontSize: '10px', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '2px' }}>Final Height: {score}</p>
                
                <button 
                  onPointerDown={initiateGame} 
                  style={{ padding: '16px 40px', background: '#fff', color: '#dc2626', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 10px 15px rgba(0,0,0,0.3)', pointerEvents: 'auto' }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <RotateCcw size={18} /> Rebuild
                </button>
                {isSyncing && <p style={{ margin: '16px 0 0 0', fontSize: '8px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }} className="animate-pulse"><Loader2 size={10} className="animate-spin" /> Syncing Data...</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Instruction Legend */}
        <div style={{ display: 'flex', gap: '24px', marginTop: '32px', opacity: 0.8 }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Target size={16} color="#94a3b8" />
             <span style={{ fontSize: '9px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Tap screen to drop</span>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <AlignCenter size={16} color="#94a3b8" />
             <span style={{ fontSize: '9px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Perfect = Combo</span>
           </div>
        </div>

      </div>
    </div>
  );
}
