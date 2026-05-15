'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Play, RotateCcw, Loader2, Target, Heart, Zap, Trophy 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SlicerLogo } from '@/components/ArcadeIcons';
import { motion, AnimatePresence } from 'framer-motion';

// --- ENGINE CONSTANTS ---
const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 460;

type EntityType = 'fruit' | 'bomb';
type Point = { x: number, y: number };

// An entity is either an intact target, or a "half" tumbling away
type Entity = {
    id: number, type: EntityType, x: number, y: number, vx: number, vy: number,
    radius: number, color: string, sides: number, rotation: number, vRot: number,
    isHalf: boolean, life: number
};

type Particle = { x: number, y: number, vx: number, vy: number, life: number, color: string, size: number };
type TrailPoint = Point & { age: number };

// Helper: Distance from point to line segment (Perfect Slice Detection)
function distToSegment(p: Point, v: Point, w: Point) {
    const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
    if (l2 === 0) return Math.sqrt((p.x - v.x)**2 + (p.y - v.y)**2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt((p.x - (v.x + t * (w.x - v.x)))**2 + (p.y - (v.y + t * (w.y - v.y)))**2);
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#facc15', '#06b6d4'];

export default function FruitSlicer() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // React UI State
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [flash, setFlash] = useState(false);

  // Engine Refs (Bypass React for 60fps)
  const isRunning = useRef(false);
  const requestRef = useRef<number>();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gameStateRef = useRef<'idle' | 'playing' | 'gameover'>('idle');
  
  const entities = useRef<Entity[]>([]);
  const particles = useRef<Particle[]>([]);
  const trail = useRef<TrailPoint[]>([]);
  
  const frameCount = useRef(0);
  const shakeRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const comboRef = useRef(0);
  const comboTimer = useRef(0);
  
  const isPointerDown = useRef(false);
  const lastPointer = useRef<Point | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('slicerHS');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const syncGameState = useCallback((state: 'idle' | 'playing' | 'gameover') => {
      gameStateRef.current = state; 
      setGameState(state);
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
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duration);
  };

  const requestFullscreen = async () => {
    const elem = document.documentElement;
    try {
      if (elem.requestFullscreen) await elem.requestFullscreen();
      else if ((elem as any).webkitRequestFullscreen) await (elem as any).webkitRequestFullscreen();
      else if ((elem as any).msRequestFullscreen) await (elem as any).msRequestFullscreen();
    } catch (err) { /* ignore */ }
  };

  const exitFullscreen = async () => {
    try {
      const doc = document as any;
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
      else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      else if (doc.msFullscreenElement && doc.msExitFullscreen) await doc.msExitFullscreen();
    } catch (err) { /* ignore */ }
  };

  const handleBack = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    exitFullscreen();
    isRunning.current = false;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    router.back();
  };

  const spawnParticles = (x: number, y: number, color: string, amount = 15, speed = 6) => {
    for (let i = 0; i < amount; i++) {
      particles.current.push({ x, y, vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed, life: 1.0, color, size: Math.random() * 3 + 1 });
    }
  };

  const throwEntities = () => {
      const maxBatch = Math.min(1 + Math.floor(scoreRef.current / 50), 4);
      const batchSize = Math.floor(Math.random() * maxBatch) + 1;
      
      for(let i=0; i<batchSize; i++) {
          const isBomb = Math.random() > 0.85; 
          const spawnX = 50 + Math.random() * (CANVAS_WIDTH - 100);
          
          // SMART INWARD THROWING
          let vx = (Math.random() - 0.5) * 4;
          if (spawnX < CANVAS_WIDTH / 3) vx = Math.abs(vx) + 0.5; // Force right
          else if (spawnX > (CANVAS_WIDTH * 2) / 3) vx = -Math.abs(vx) - 0.5; // Force left

          entities.current.push({
              id: Math.random(),
              type: isBomb ? 'bomb' : 'fruit',
              x: spawnX,
              y: CANVAS_HEIGHT + 20,
              vx: vx,
              vy: -(10 + Math.random() * 3), // PERFECTED GRAVITY ARC
              radius: isBomb ? 20 : 25,
              color: isBomb ? '#ef4444' : COLORS[Math.floor(Math.random() * COLORS.length)],
              sides: Math.floor(Math.random() * 4) + 3, 
              rotation: Math.random() * Math.PI,
              vRot: (Math.random() - 0.5) * 0.2,
              isHalf: false,
              life: 1
          });
      }
      playSound(300, 'sine', 0.05, 0.2); 
  };

  const handleGameOver = async () => {
    syncGameState('gameover');
    
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem('slicerHS', scoreRef.current.toString());
    }

    const studentId = localStorage.getItem('studentId');
    if (studentId && scoreRef.current > 0) {
      setIsSyncing(true);
      try {
        const { data: existing } = await supabase.from('arcade_scores').select('*').eq('student_id', studentId).eq('game_name', 'slicer').maybeSingle();
        if (!existing) {
          await supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'slicer', score: scoreRef.current }]);
        } else if (scoreRef.current > existing.score) {
          await supabase.from('arcade_scores').update({ score: scoreRef.current }).eq('id', existing.id);
        }
      } catch (e) { /* ignore */ }
      setIsSyncing(false);
    }
  };

  // --- THE INDESTRUCTIBLE ENGINE LOOP ---
  const update = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) {
        requestRef.current = requestAnimationFrame(update); return;
    }

    frameCount.current++;

    // Throttled UI Sync
    if (frameCount.current % 5 === 0) {
        setScore(scoreRef.current);
        setLives(livesRef.current);
        setCombo(comboRef.current);
    }

    if (gameStateRef.current === 'playing') {
        
        if (frameCount.current % 80 === 0 && Math.random() > 0.2) throwEntities();

        if (comboTimer.current > 0) {
            comboTimer.current--;
            if (comboTimer.current <= 0 && comboRef.current > 1) {
                comboRef.current = 0; 
            }
        }

        for (let i = trail.current.length - 1; i >= 0; i--) {
            trail.current[i].age -= 0.08;
            if (trail.current[i].age <= 0) trail.current.splice(i, 1);
        }

        for (let i = entities.current.length - 1; i >= 0; i--) {
            const e = entities.current[i];
            e.x += e.vx;
            e.y += e.vy;
            e.vy += 0.25; 
            e.rotation += e.vRot;
            
            if (e.isHalf) e.life -= 0.02;

            if (e.y > CANVAS_HEIGHT + 50 && e.vy > 0) {
                if (!e.isHalf && e.type === 'fruit') {
                    livesRef.current -= 1;
                    playSound(150, 'sawtooth', 0.1, 0.3);
                    shakeRef.current = 8;
                    comboRef.current = 0;
                    setFlash(true);
                    setTimeout(() => setFlash(false), 150);
                    if (window.navigator.vibrate) window.navigator.vibrate(50);
                    
                    if (livesRef.current <= 0) {
                        handleGameOver();
                    }
                }
                entities.current.splice(i, 1);
            } else if (e.isHalf && e.life <= 0) {
                entities.current.splice(i, 1);
            }
        }
    }

    // Particles run regardless of play state for smooth explosions
    particles.current.forEach(p => { 
        p.x += p.vx; p.y += p.vy; p.vy += 0.2; 
        p.life -= 0.03; 
    });
    particles.current = particles.current.filter(p => p.life > 0);

    // Completely stop loop only when everything settles after game over
    if (gameStateRef.current === 'gameover' && particles.current.length === 0 && trail.current.length === 0) {
        isRunning.current = false;
    }

    // --- RENDERING ---
    ctx.save();
    ctx.fillStyle = '#050508'; 
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (shakeRef.current > 0.5) { 
        ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current); 
        shakeRef.current *= 0.9; 
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for(let i=0; i<CANVAS_WIDTH; i+=40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke(); }
    for(let i=0; i<CANVAS_HEIGHT; i+=40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke(); }

    const drawShape = (e: Entity) => {
        ctx.beginPath();
        if (e.type === 'bomb') {
            for (let i = 0; i < 8; i++) {
                const a = e.rotation + (i * Math.PI) / 4;
                const r = i % 2 === 0 ? e.radius : e.radius * 0.8;
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
        } else {
            for (let i = 0; i < e.sides; i++) {
                const a = e.rotation + (i * Math.PI * 2) / e.sides;
                ctx.lineTo(Math.cos(a) * e.radius, Math.sin(a) * e.radius);
            }
        }
        ctx.closePath();
    };

    entities.current.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.globalAlpha = e.isHalf ? Math.max(0, e.life) : 1;
        
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15; ctx.shadowColor = e.color;
        
        if (e.isHalf) {
            ctx.beginPath();
            ctx.rect(-e.radius*2, 0, e.radius*4, e.radius*2);
            ctx.clip();
        }

        drawShape(e);
        
        ctx.fillStyle = `${e.color}33`; 
        ctx.fill();
        ctx.stroke();

        if (e.type === 'bomb') {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(0, 0, 6 + Math.sin(frameCount.current*0.2)*2, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();
    });

    particles.current.forEach(p => { 
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (trail.current.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trail.current[0].x, trail.current[0].y);
        for(let i=1; i<trail.current.length; i++) {
            const xc = (trail.current[i].x + trail.current[i-1].x) / 2;
            const yc = (trail.current[i].y + trail.current[i-1].y) / 2;
            ctx.quadraticCurveTo(trail.current[i-1].x, trail.current[i-1].y, xc, yc);
        }
        ctx.lineTo(trail.current[trail.current.length-1].x, trail.current[trail.current.length-1].y);
        
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#2dd4bf'; 
        ctx.shadowBlur = 15; ctx.shadowColor = '#2dd4bf';
        ctx.stroke();
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff'; 
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    ctx.restore(); 

    if (isRunning.current) requestRef.current = requestAnimationFrame(update);
  }, []); 

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [update]);

  // --- KINETIC SLICING LOGIC ---
  const checkSlices = (currPos: Point) => {
      if (!lastPointer.current || gameStateRef.current !== 'playing') return;

      for (let i = entities.current.length - 1; i >= 0; i--) {
          const e = entities.current[i];
          if (e.isHalf) continue; 

          const dist = distToSegment(e, lastPointer.current, currPos);
          
          if (dist < e.radius) {
              if (e.type === 'bomb') {
                  shakeRef.current = 30;
                  playSound(100, 'sawtooth', 0.5, 0.8);
                  if (window.navigator.vibrate) window.navigator.vibrate([300, 100, 400]);
                  spawnParticles(e.x, e.y, '#ef4444', 60, 12);
                  entities.current.splice(i, 1);
                  handleGameOver();
              } else {
                  comboRef.current += 1;
                  comboTimer.current = 60; 
                  const points = 10 * comboRef.current;
                  scoreRef.current += points;
                  
                  playSound(800 + (comboRef.current % 5) * 100, 'square', 0.05, 0.1);
                  if (window.navigator.vibrate) window.navigator.vibrate(20);
                  spawnParticles(e.x, e.y, e.color, 15, 8);

                  const cutAngle = Math.atan2(currPos.y - lastPointer.current.y, currPos.x - lastPointer.current.x);
                  
                  entities.current.push({ ...e, id: Math.random(), isHalf: true, vx: e.vx + Math.cos(cutAngle + Math.PI/2)*3, vy: e.vy + Math.sin(cutAngle + Math.PI/2)*3, vRot: 0.2 });
                  entities.current.push({ ...e, id: Math.random(), isHalf: true, vx: e.vx + Math.cos(cutAngle - Math.PI/2)*3, vy: e.vy + Math.sin(cutAngle - Math.PI/2)*3, vRot: -0.2 });
                  
                  entities.current.splice(i, 1);
              }
          }
      }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
      if (gameStateRef.current !== 'playing') return;
      isPointerDown.current = true;
      const rect = canvasRef.current!.getBoundingClientRect();
      const pos = { x: (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width), y: (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height) };
      lastPointer.current = pos;
      trail.current.push({ ...pos, age: 1 });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (!isPointerDown.current || gameStateRef.current !== 'playing') return;
      const rect = canvasRef.current!.getBoundingClientRect();
      const pos = { x: (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width), y: (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height) };
      
      checkSlices(pos);
      
      lastPointer.current = pos;
      trail.current.push({ ...pos, age: 1 });
      
      if (trail.current.length > 15) trail.current.shift();
  };

  const handlePointerUp = () => {
      isPointerDown.current = false;
      lastPointer.current = null;
  };

  const startNew = (e?: React.SyntheticEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    requestFullscreen();
    initAudio(); 
    
    entities.current = []; particles.current = []; trail.current = [];
    scoreRef.current = 0; setScore(0);
    livesRef.current = 3; setLives(3); 
    comboRef.current = 0; setCombo(0);
    shakeRef.current = 0; frameCount.current = 0;
    setFlash(false);
    
    syncGameState('playing');
    isRunning.current = true; 
    
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(update);
  };

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
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(236, 72, 153, 0.1)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '-10%', width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(14, 165, 233, 0.1)', filter: 'blur(80px)' }} />
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
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#ec4899' }}>Fruit Slicer</h1>
          </div>
        </div>

        {/* Score Board */}
        <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '24px' }}>
          <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Score</span>
            <span style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: '#0f172a', lineHeight: 1 }}>{score}</span>
          </div>

          <div style={{ flex: 1, background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.2)', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(236, 72, 153, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Heart size={14} color="#f43f5e" fill={lives > 0 ? '#f43f5e' : 'transparent'} className={lives === 1 ? 'animate-pulse' : ''} />
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#f43f5e' }}>{lives}</span>
              </div>
              <div style={{ width: '1px', height: '14px', background: 'rgba(236, 72, 153, 0.3)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Trophy size={14} color="#f59e0b" />
                <span style={{ fontSize: '14px', fontWeight: 900, fontStyle: 'italic', color: '#f59e0b' }}>{highScore}</span>
              </div>
            </div>
            {combo > 1 ? (
              <span style={{ fontSize: '10px', fontWeight: 900, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '1px' }} className="animate-pulse">Combo x{combo}</span>
            ) : (
              <span style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(236, 72, 153, 0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>Kinetic Slashing</span>
            )}
          </div>
        </div>

        {/* Game Canvas Box */}
        <div 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{
            position: 'relative', width: '100%', maxWidth: '340px', height: '460px', background: '#050505', borderRadius: '30px', 
            border: gameState === 'gameover' || flash ? '2px solid #ef4444' : '2px solid rgba(236, 72, 153, 0.3)', 
            overflow: 'hidden', transition: 'border 0.2s ease, box-shadow 0.2s ease',
            boxShadow: gameState === 'gameover' || flash ? '0 0 50px rgba(239, 68, 68, 0.4)' : '0 10px 40px rgba(236, 72, 153, 0.15)',
            touchAction: 'none'
          }}
        >
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ width: '100%', height: '100%', display: 'block' }} />
          
          <AnimatePresence>
            {gameState === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, pointerEvents: 'none' }}>
                <SlicerLogo className="w-20 h-20 text-pink-400 mb-6 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]" className="animate-pulse" />
                <button 
                  onPointerDown={startNew} 
                  style={{ padding: '16px 40px', background: '#ec4899', color: '#fff', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(236, 72, 153, 0.4)', pointerEvents: 'auto' }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Play size={18} fill="currentColor" /> Unsheathe
                </button>
                <p style={{ margin: '16px 0 0 0', fontSize: '8px', fontWeight: 900, color: 'rgba(236, 72, 153, 0.6)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Engages Fullscreen</p>
              </motion.div>
            )}
            
            {gameState === 'gameover' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(69, 10, 10, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, padding: '24px', textAlign: 'center', pointerEvents: 'none' }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '30px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-1px', color: '#fff', textShadow: '0 0 20px rgba(239,68,68,1)' }}>Critical Failure</h2>
                <p style={{ margin: '0 0 32px 0', fontSize: '12px', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '2px' }}>Final Score: {score}</p>
                
                <button 
                  onPointerDown={startNew} 
                  style={{ padding: '16px 40px', background: '#fff', color: '#dc2626', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 10px 15px rgba(0,0,0,0.3)', pointerEvents: 'auto' }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <RotateCcw size={18} /> Retry
                </button>
                {isSyncing && <p style={{ margin: '16px 0 0 0', fontSize: '8px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }} className="animate-pulse"><Loader2 size={10} className="animate-spin" /> Syncing...</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM HELPER */}
        <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, pointerEvents: 'none' }}>
            <SlicerLogo className="w-8 h-8 text-zinc-500 mb-2" />
            <span style={{ fontSize: '10px', fontWeight: 900, textAlign: 'center', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', lineHeight: 1.4 }}>
              Swipe to slice<br/>Avoid red bombs
            </span>
        </div>

      </div>
    </div>
  );
}
