'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Play, RotateCcw, Loader2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Target } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CrossyLogo } from '@/components/ArcadeIcons';
import { motion, AnimatePresence } from 'framer-motion';

// --- ENGINE CONSTANTS ---
const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 460;
const GRID = 40; 
const COLS = 8;
const OFFSET_X = 10; 

type Entity = { id: number, x: number, y: number, w: number, h: number, speed: number, dir: number, type: 'car' | 'log' };
type Lane = { row: number, type: 'safe' | 'road' | 'water', speed: number, dir: number, entities: Entity[] };
type Particle = { x: number, y: number, dx: number, dy: number, life: number, color: string };

export default function CrossyAltu() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // UI State
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  // Engine Refs
  const isRunning = useRef(false);
  const gameStateRef = useRef<'idle' | 'playing' | 'gameover'>('idle');
  const requestRef = useRef<number>();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const canvasFlashAlpha = useRef(0);

  // Game Logic Refs
  const player = useRef({ x: OFFSET_X + 3 * GRID, y: 0, visX: OFFSET_X + 3 * GRID, visY: 0, state: 'alive' });
  const maxScore = useRef(0);
  const baseCameraOffset = useRef(0); 
  const cameraOffset = useRef(0); 
  const lanes = useRef<Map<number, Lane>>(new Map());
  const particles = useRef<Particle[]>([]);
  const shakeRef = useRef(0);
  const frameCount = useRef(0);

  // Touch Swipe Refs
  const touchStart = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('crossyHS');
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

  const createExplosion = (x: number, y: number, color: string, amount = 15) => {
    for (let i = 0; i < amount; i++) {
      particles.current.push({ x, y, dx: (Math.random() - 0.5) * 10, dy: (Math.random() - 0.5) * 10, life: 1.0, color });
    }
  };

  // --- BALANCED WORLD GENERATION ---
  const generateLane = (row: number) => {
    if (lanes.current.has(row)) return;

    let type: 'safe' | 'road' | 'water' = 'safe';
    if (row < 3 || row % 5 === 0) type = 'safe';
    else {
      const r = Math.random();
      if (r < 0.25) type = 'safe';
      else if (r < 0.65) type = 'road';
      else type = 'water';
    }

    if (type === 'water' && lanes.current.get(row - 1)?.type === 'water' && lanes.current.get(row - 2)?.type === 'water') {
        type = 'safe';
    }

    const dir = Math.random() > 0.5 ? 1 : -1;
    const difficultyMult = 1 + (row * 0.008);
    const speed = type === 'safe' ? 0 : (1.0 + Math.random() * 1.5) * difficultyMult;
    const entities: Entity[] = [];

    if (type !== 'safe') {
        const numEntities = type === 'road' ? (Math.floor(Math.random() * 2) + 1) : (Math.floor(Math.random() * 2) + 2); 
        const spacing = CANVAS_WIDTH / numEntities;
        for (let i = 0; i < numEntities; i++) {
            const w = type === 'road' ? 40 + Math.random() * 30 : 80 + Math.random() * 50; 
            entities.push({
                id: Math.random(), x: i * spacing + (Math.random() * 20),
                y: -(row * GRID), w, h: GRID - 10, speed, dir, type: type === 'road' ? 'car' : 'log'
            });
        }
    }
    lanes.current.set(row, { row, type, speed, dir, entities });
  };

  const ensureChunks = (highestRow: number) => {
    for (let r = highestRow; r < highestRow + 20; r++) generateLane(r);
    for (const key of lanes.current.keys()) {
        if (key < highestRow - 10) lanes.current.delete(key);
    }
  };

  // --- CORE GAME LOOP ---
  const handleGameOver = async (reason: 'car' | 'water' | 'void') => {
    isRunning.current = false;
    gameStateRef.current = 'gameover';
    setGameState('gameover');
    player.current.state = 'dead';
    
    if (reason === 'car') {
        createExplosion(player.current.visX + GRID/2, player.current.visY + GRID/2, '#ef4444', 30);
        playSound(100, 'sawtooth', 0.2, 0.6);
        vibrate([150, 50, 200, 50, 300]);
        shakeRef.current = 20;
        setFlashColor('rgba(239, 68, 68, 0.4)');
    } else if (reason === 'water') {
        createExplosion(player.current.visX + GRID/2, player.current.visY + GRID/2, '#22d3ee', 20);
        playSound(200, 'triangle', 0.1, 0.4);
        vibrate([100, 100]);
        setFlashColor('rgba(34, 211, 238, 0.4)');
    } else {
        createExplosion(player.current.visX + GRID/2, player.current.visY + GRID/2, '#a855f7', 20);
        playSound(50, 'sawtooth', 0.3, 0.8);
        vibrate([300]);
        setFlashColor('rgba(168, 85, 247, 0.4)');
    }
    setTimeout(() => setFlashColor(null), 200);

    if (maxScore.current > highScore) {
      setHighScore(maxScore.current);
      localStorage.setItem('crossyHS', maxScore.current.toString());
    }

    const studentId = localStorage.getItem('studentId');
    if (studentId && maxScore.current > 0) {
      setIsSyncing(true);
      supabase.from('arcade_scores').select('*').eq('student_id', studentId).eq('game_name', 'crossy').maybeSingle()
        .then(({ data: existing }) => {
          if (!existing) return supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'crossy', score: maxScore.current }]);
          else if (maxScore.current > existing.score) return supabase.from('arcade_scores').update({ score: maxScore.current }).eq('id', existing.id);
        }).finally(() => setIsSyncing(false));
    }
  };

  const update = useCallback(() => {
    if (!isRunning.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    frameCount.current++;
    const currentRow = Math.round(-player.current.y / GRID);
    if (currentRow > maxScore.current && player.current.state === 'alive') {
        maxScore.current = currentRow;
        setScore(maxScore.current);
        ensureChunks(maxScore.current);
        if (maxScore.current % 10 === 0) { playSound(800, 'sine', 0.1, 0.2); canvasFlashAlpha.current = 0.5; vibrate(30); }
        else playSound(400, 'sine', 0.05, 0.05);
    }

    if (gameStateRef.current === 'playing' && maxScore.current > 1) {
        const autoScrollSpeed = 0.15 + (maxScore.current * 0.002); 
        baseCameraOffset.current += autoScrollSpeed;
    }

    const idealBase = Math.max(baseCameraOffset.current, maxScore.current * GRID);
    baseCameraOffset.current = idealBase; 
    const targetCameraOffset = baseCameraOffset.current + (CANVAS_HEIGHT * 0.65); 
    cameraOffset.current += (targetCameraOffset - cameraOffset.current) * 0.1;

    player.current.visX += (player.current.x - player.current.visX) * 0.4;
    player.current.visY += (player.current.y - player.current.visY) * 0.4;

    let onLog = false; let logSpeed = 0;
    if (player.current.state === 'alive') {
        const pHitbox = { left: player.current.x + 10, right: player.current.x + GRID - 10, top: player.current.y + 10, bottom: player.current.y + GRID - 10 };
        lanes.current.forEach(lane => {
            lane.entities.forEach(ent => {
                ent.x += ent.speed * ent.dir;
                if (ent.dir === 1 && ent.x > CANVAS_WIDTH) ent.x = -ent.w;
                if (ent.dir === -1 && ent.x < -ent.w) ent.x = CANVAS_WIDTH;
                if (lane.row === currentRow) {
                    const eHitbox = { left: ent.x, right: ent.x + ent.w, top: -(lane.row * GRID) + 5, bottom: -(lane.row * GRID) + GRID - 5 };
                    if (pHitbox.right > eHitbox.left && pHitbox.left < eHitbox.right && pHitbox.bottom > eHitbox.top && pHitbox.top < eHitbox.bottom) {
                        if (ent.type === 'car') handleGameOver('car');
                        else if (ent.type === 'log') { onLog = true; logSpeed = ent.speed * ent.dir; }
                    }
                }
            });
        });
        const currentLane = lanes.current.get(currentRow);
        if (onLog) { player.current.x += logSpeed; if (player.current.x < -GRID || player.current.x > CANVAS_WIDTH) handleGameOver('void'); }
        else if (currentLane?.type === 'water' && Math.abs(player.current.y - player.current.visY) < 10) handleGameOver('water');
        if (player.current.visY + cameraOffset.current > CANVAS_HEIGHT + GRID) handleGameOver('void');
    }

    particles.current.forEach(p => { p.x += p.dx; p.y += p.dy; p.life -= 0.05; });
    particles.current = particles.current.filter(p => p.life > 0);
    if (gameStateRef.current === 'gameover' && particles.current.length === 0) isRunning.current = false;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (shakeRef.current > 0) { ctx.save(); ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current); shakeRef.current *= 0.85; if (shakeRef.current < 0.5) shakeRef.current = 0; }
    ctx.save(); ctx.translate(0, cameraOffset.current);

    lanes.current.forEach(lane => {
        const ly = -(lane.row * GRID);
        if (ly + cameraOffset.current > CANVAS_HEIGHT + GRID || ly + cameraOffset.current < -GRID * 2) return;
        if (lane.type === 'safe') { ctx.fillStyle = '#0f172a'; ctx.fillRect(0, ly, CANVAS_WIDTH, GRID); ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)'; ctx.strokeRect(0, ly, CANVAS_WIDTH, GRID); }
        else if (lane.type === 'road') { ctx.fillStyle = '#1e0f12'; ctx.fillRect(0, ly, CANVAS_WIDTH, GRID); ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; for(let i=0; i<CANVAS_WIDTH; i+=30) ctx.fillRect(i, ly + GRID/2 - 1, 15, 2); }
        else if (lane.type === 'water') { ctx.fillStyle = '#082f49'; ctx.fillRect(0, ly, CANVAS_WIDTH, GRID); ctx.fillStyle = 'rgba(34, 211, 238, 0.15)'; ctx.fillRect((frameCount.current % 40), ly + 10, 20, 2); ctx.fillRect(CANVAS_WIDTH - (frameCount.current % 60), ly + 25, 30, 2); }
        lane.entities.forEach(ent => {
            const ey = ly + 5;
            if (ent.type === 'car') { ctx.fillStyle = '#9f1239'; ctx.fillRect(ent.x, ey + 4, ent.w, ent.h); ctx.fillStyle = '#f43f5e'; ctx.fillRect(ent.x, ey, ent.w, ent.h); ctx.fillStyle = '#facc15'; ctx.shadowBlur = 10; ctx.shadowColor = '#facc15'; if (ent.dir === 1) { ctx.fillRect(ent.x + ent.w - 6, ey + 4, 6, 6); ctx.fillRect(ent.x + ent.w - 6, ey + ent.h - 10, 6, 6); } else { ctx.fillRect(ent.x, ey + 4, 6, 6); ctx.fillRect(ent.x, ey + ent.h - 10, 6, 6); } ctx.shadowBlur = 0; }
            else if (ent.type === 'log') { ctx.fillStyle = '#0e7490'; ctx.fillRect(ent.x, ey + 4, ent.w, ent.h); ctx.fillStyle = '#22d3ee'; ctx.fillRect(ent.x, ey, ent.w, ent.h); ctx.fillStyle = '#cffafe'; ctx.fillRect(ent.x + 10, ey + ent.h/2 - 1, ent.w - 20, 2); }
        });
    });

    if (player.current.state === 'alive') {
        const px = player.current.visX; const py = player.current.visY; const pSize = GRID - 12;
        const hopProgress = Math.abs(player.current.x - player.current.visX) + Math.abs(player.current.y - player.current.visY);
        const yOffset = hopProgress > 5 ? -10 : 0; 
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(px + 6, py + 6 + 4, pSize, pSize);
        ctx.fillStyle = '#c2410c'; ctx.fillRect(px + 6, py + 6 + yOffset + 6, pSize, pSize);
        ctx.fillStyle = '#f97316'; ctx.fillRect(px + 6, py + 6 + yOffset, pSize, pSize);
        ctx.fillStyle = 'white'; ctx.fillRect(px + 10, py + 10 + yOffset, 4, 4); ctx.fillRect(px + 20, py + 10 + yOffset, 4, 4);
    }
    particles.current.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 4, 4); });
    ctx.globalAlpha = 1; ctx.restore(); if (shakeRef.current > 0) ctx.restore(); 
    if (canvasFlashAlpha.current > 0) { ctx.fillStyle = `rgba(250, 204, 21, ${canvasFlashAlpha.current})`; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); canvasFlashAlpha.current -= 0.05; }
    if (isRunning.current) requestRef.current = requestAnimationFrame(update);
  }, []);

  const movePlayer = (dx: number, dy: number) => {
    if (gameStateRef.current !== 'playing' || player.current.state !== 'alive') return;
    let currentGridX = Math.round((player.current.x - OFFSET_X) / GRID);
    let nextX = OFFSET_X + (currentGridX + dx) * GRID;
    if (nextX < 0 || nextX > CANVAS_WIDTH - GRID) return;
    const nextY = player.current.y + (dy * GRID);
    const deathLineY = -cameraOffset.current + CANVAS_HEIGHT;
    if (nextY > deathLineY) return;
    player.current.x = nextX; player.current.y = nextY;
    playSound(300, 'square', 0.05, 0.05);
  };

  const handleTouchStart = (e: React.PointerEvent<HTMLDivElement>) => { if (gameStateRef.current !== 'playing') return; touchStart.current = { x: e.clientX, y: e.clientY }; };
  const handleTouchEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameStateRef.current !== 'playing' || !touchStart.current) return;
    const dx = e.clientX - touchStart.current.x; const dy = e.clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) { if (Math.abs(dx) > 30) movePlayer(dx > 0 ? 1 : -1, 0); }
    else { if (Math.abs(dy) > 30) movePlayer(0, dy > 0 ? 1 : -1); }
    touchStart.current = null;
  };

  const initiateGame = (e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    requestFullscreen(); initAudio();
    lanes.current.clear(); ensureChunks(0); 
    player.current = { x: OFFSET_X + 3 * GRID, y: 0, visX: OFFSET_X + 3 * GRID, visY: 0, state: 'alive' };
    maxScore.current = 0; baseCameraOffset.current = 0; cameraOffset.current = CANVAS_HEIGHT * 0.65;
    setScore(0); particles.current = []; shakeRef.current = 0; frameCount.current = 0;
    gameStateRef.current = 'playing'; setGameState('playing');
    if (!isRunning.current) { isRunning.current = true; requestRef.current = requestAnimationFrame(update); }
  };

  return (
    <div style={{
      minHeight: '100dvh', background: '#fff', padding: '40px 20px 120px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none', WebkitUserSelect: 'none', overflow: 'hidden', touchAction: 'none'
    }}>
      
      {/* Background Ambience */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none', backgroundColor: flashColor || 'transparent' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(20, 184, 166, 0.1)', filter: 'blur(80px)' }} />
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
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#14b8a6' }}>Crossy Altu</h1>
          </div>
        </div>

        {/* Score Board */}
        <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '24px' }}>
          <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Score</span>
            <span style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: '#0f172a', lineHeight: 1 }}>{score}</span>
          </div>

          <div style={{ flex: 1, background: 'rgba(20, 184, 166, 0.1)', border: '1px solid rgba(20, 184, 166, 0.2)', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(20, 184, 166, 0.1)' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(15, 118, 110, 0.7)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Trophy size={12} /> Record
            </span>
            <span style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: '#14b8a6', lineHeight: 1 }}>{highScore}</span>
          </div>
        </div>

        {/* Game Canvas Box */}
        <div 
          onPointerDown={handleTouchStart}
          onPointerUp={handleTouchEnd}
          style={{
            position: 'relative', width: '100%', maxWidth: '340px', height: '460px', background: '#050505', borderRadius: '30px', 
            border: gameState === 'gameover' ? '2px solid #ef4444' : '2px solid rgba(20, 184, 166, 0.3)', 
            overflow: 'hidden', transition: 'border 0.2s ease',
            boxShadow: gameState === 'gameover' ? '0 0 50px rgba(239, 68, 68, 0.4)' : '0 10px 40px rgba(20, 184, 166, 0.15)',
            touchAction: 'none'
          }}
        >
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />

          {/* Overlays */}
          <AnimatePresence>
            {gameState === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                <CrossyLogo className="w-20 h-20 text-teal-400 mb-6 drop-shadow-[0_0_20px_rgba(45,212,191,0.5)]" />
                <button 
                  onPointerDown={initiateGame} 
                  style={{ padding: '16px 40px', background: '#14b8a6', color: '#fff', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(20, 184, 166, 0.4)' }}
                >
                  <Play size={18} fill="currentColor" /> Enter Grid
                </button>
                <p style={{ margin: '16px 0 0 0', fontSize: '8px', fontWeight: 900, color: 'rgba(45, 212, 191, 0.6)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Engages Fullscreen</p>
              </motion.div>
            )}

            {gameState === 'gameover' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'absolute', inset: 0, background: 'rgba(69, 10, 10, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '30px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-1px', color: '#fff', textShadow: '0 0 20px rgba(239,68,68,1)' }}>Terminated</h2>
                <p style={{ margin: '0 0 32px 0', fontSize: '12px', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '2px' }}>Final Score: {score}</p>
                <button 
                  onPointerDown={initiateGame} 
                  style={{ padding: '16px 40px', background: '#fff', color: '#dc2626', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 10px 15px rgba(0,0,0,0.3)' }}
                >
                  <RotateCcw size={18} /> Retry
                </button>
                {isSyncing && <p style={{ margin: '16px 0 0 0', fontSize: '8px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }} className="animate-pulse"><Loader2 size={10} className="animate-spin" /> Syncing Data...</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* D-PAD Controls */}
        <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: '220px', userSelect: 'none', touchAction: 'none' }}>
          <div /> 
          <button 
            onPointerDown={(e) => { e.preventDefault(); movePlayer(0, -1); }}
            style={{ width: '64px', height: '64px', margin: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
            onMouseDown={e => { e.currentTarget.style.background = 'rgba(20, 184, 166, 0.2)'; e.currentTarget.style.borderColor = 'rgba(20, 184, 166, 0.5)'; e.currentTarget.style.color = '#14b8a6'; e.currentTarget.style.transform = 'scale(0.85)'; }}
            onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <ArrowUp size={36} strokeWidth={3} />
          </button>
          <div /> 

          <button 
            onPointerDown={(e) => { e.preventDefault(); movePlayer(-1, 0); }}
            style={{ width: '64px', height: '64px', margin: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
            onMouseDown={e => { e.currentTarget.style.background = 'rgba(20, 184, 166, 0.2)'; e.currentTarget.style.borderColor = 'rgba(20, 184, 166, 0.5)'; e.currentTarget.style.color = '#14b8a6'; e.currentTarget.style.transform = 'scale(0.85)'; }}
            onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <ArrowLeft size={36} strokeWidth={3} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={20} color="#cbd5e1" />
          </div>

          <button 
            onPointerDown={(e) => { e.preventDefault(); movePlayer(1, 0); }}
            style={{ width: '64px', height: '64px', margin: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
            onMouseDown={e => { e.currentTarget.style.background = 'rgba(20, 184, 166, 0.2)'; e.currentTarget.style.borderColor = 'rgba(20, 184, 166, 0.5)'; e.currentTarget.style.color = '#14b8a6'; e.currentTarget.style.transform = 'scale(0.85)'; }}
            onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <ArrowRight size={36} strokeWidth={3} />
          </button>

          <div /> 
          <button 
            onPointerDown={(e) => { e.preventDefault(); movePlayer(0, 1); }}
            style={{ width: '64px', height: '64px', margin: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
            onMouseDown={e => { e.currentTarget.style.background = 'rgba(20, 184, 166, 0.2)'; e.currentTarget.style.borderColor = 'rgba(20, 184, 166, 0.5)'; e.currentTarget.style.color = '#14b8a6'; e.currentTarget.style.transform = 'scale(0.85)'; }}
            onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <ArrowDown size={36} strokeWidth={3} />
          </button>
          <div /> 
        </div>

      </div>
    </div>
  );
}
