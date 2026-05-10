'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Play, RotateCcw, Loader2, Target, Heart, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SlicerLogo } from '@/components/ArcadeIcons';

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

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#facc15'];

export default function FruitSlicer() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // React UI State
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const syncGameState = (state: 'idle' | 'playing' | 'gameover') => {
      gameStateRef.current = state; 
      setGameState(state);
  };

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

  const handleBack = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (document.fullscreenElement) document.exitFullscreen();
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
                    shakeRef.current = 5;
                    comboRef.current = 0;
                    if (window.navigator.vibrate) window.navigator.vibrate(50);
                    
                    if (livesRef.current <= 0) {
                        syncGameState('gameover');
                        const studentId = localStorage.getItem('studentId');
                        if (studentId && scoreRef.current > 0) {
                            setIsSyncing(true);
                            supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'slicer', score: scoreRef.current }])
                            .then(() => setIsSyncing(false)).catch(() => setIsSyncing(false));
                        }
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
                const r = i % 2 === 0 ? e.radius : e.radius * 0.5;
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
        ctx.strokeStyle = '#06b6d4'; 
        ctx.shadowBlur = 15; ctx.shadowColor = '#22d3ee';
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
                  syncGameState('gameover');
                  shakeRef.current = 30;
                  playSound(100, 'sawtooth', 0.5, 0.8);
                  if (window.navigator.vibrate) window.navigator.vibrate([300, 100, 400]);
                  spawnParticles(e.x, e.y, '#ef4444', 60, 12);
                  entities.current.splice(i, 1);

                  const studentId = localStorage.getItem('studentId');
                  if (studentId && scoreRef.current > 0) {
                      setIsSyncing(true);
                      supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'slicer', score: scoreRef.current }])
                      .then(() => setIsSyncing(false)).catch(() => setIsSyncing(false));
                  }
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
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
    else if ((elem as any).webkitRequestFullscreen) (elem as any).webkitRequestFullscreen();
    initAudio(); 
    
    entities.current = []; particles.current = []; trail.current = [];
    scoreRef.current = 0; setScore(0);
    livesRef.current = 3; setLives(3); 
    comboRef.current = 0; setCombo(0);
    shakeRef.current = 0; frameCount.current = 0;
    
    syncGameState('playing');
    isRunning.current = true; 
    
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(update);
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#050508] text-white flex flex-col items-center pt-6 overflow-hidden select-none touch-none overscroll-none">
      <div className="w-full max-w-md px-4 h-full flex flex-col relative z-10">
        
        {/* TOP HUD */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={handleBack} className="p-2 bg-zinc-900 rounded-xl border border-white/10 active:scale-90 shadow-sm transition-transform z-50"><ChevronLeft size={20} /></button>
          <div className="flex gap-2">
            <div className="bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
              <Target size={12} className="text-zinc-400" />
              <span className="text-sm font-black italic text-zinc-300">{score}</span>
            </div>
            {combo > 1 && (
                <div className="bg-cyan-900 border border-cyan-500/50 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] animate-pulse">
                  <Zap size={12} className="text-cyan-400" />
                  <span className="text-sm font-black italic text-cyan-400">x{combo}</span>
                </div>
            )}
            <div className="bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
              <Heart size={12} className={lives <= 1 ? 'text-red-500 animate-pulse fill-red-500' : 'text-pink-500 fill-pink-500'} />
              <span className={`text-sm font-black italic ${lives <= 1 ? 'text-red-500' : 'text-pink-500'}`}>{lives}</span>
            </div>
          </div>
        </div>

        {/* CANVAS */}
        <div 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`relative w-full aspect-[34/46] bg-[#020205] rounded-3xl border-2 transition-colors duration-300 overflow-hidden shadow-2xl touch-none ${gameState === 'gameover' ? 'border-red-500' : 'border-cyan-500/30'}`}
        >
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full block" />
          
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 pointer-events-none backdrop-blur-sm">
              <SlicerLogo className="w-20 h-20 text-cyan-400 mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
              <button onPointerDown={startNew} className="px-10 py-4 bg-cyan-600 text-white font-black uppercase tracking-widest rounded-full shadow-[0_0_30px_rgba(6,182,212,0.4)] active:scale-95 transition-all pointer-events-auto">Unsheathe</button>
            </div>
          )}
          
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center z-20 p-6 text-center pointer-events-none backdrop-blur-md">
              <h2 className="text-3xl font-black italic uppercase tracking-tight text-white mb-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">Critical Failure</h2>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-8">Score: {score}</p>
              <button onPointerDown={startNew} className="px-10 py-4 bg-white text-red-600 font-black uppercase tracking-widest rounded-full shadow-xl active:scale-95 transition-all pointer-events-auto">Retry</button>
              {isSyncing && <p className="mt-4 text-[8px] font-black text-white/30 uppercase animate-pulse flex items-center gap-2"><Loader2 size={10} className="animate-spin" /> Syncing...</p>}
            </div>
          )}
        </div>

        {/* BOTTOM HELPER */}
        <div className="mt-8 mb-auto w-full flex flex-col items-center justify-center opacity-40 pointer-events-none">
            <SlicerLogo className="w-8 h-8 text-zinc-500 mb-2" />
            <span className="text-[9px] font-black text-center text-zinc-500 uppercase tracking-widest leading-tight">Swipe to slice<br/>Avoid red bombs</span>
        </div>

      </div>
    </div>
  );
}
