'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Play, RotateCcw, Loader2, Trophy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Zap, Target } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { RunnerLogo } from '@/components/ArcadeIcons';

// --- ENGINE CONSTANTS ---
const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 460;
const FOV = 250; 
const CAMERA_Y = 220; 
const HORIZON_Y = 160;
const MAX_Z = 1500;
const LANE_WIDTH = 110; // Wider lanes for clearer distinction

type ObstacleType = 'wall' | 'hurdle' | 'arch' | 'coin';
type Entity = { id: number, lane: number, z: number, type: ObstacleType, color: string, collected?: boolean };
type Particle = { x: number, y: number, z: number, dx: number, dy: number, dz: number, life: number, color: string };
type Star = { x: number, y: number, z: number };

// Pseudo-3D Projection Math
const project = (x: number, y: number, z: number) => {
    const scale = FOV / (Math.max(1, FOV + z)); // Prevent divide by zero
    const px = CANVAS_WIDTH / 2 + x * scale;
    const py = HORIZON_Y + (CAMERA_Y - y) * scale;
    return { px, py, scale };
};

export default function SynthRunner() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // React UI State
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);

  // Engine Refs (Bypass React for 60fps)
  const isRunning = useRef(false);
  const requestRef = useRef<number>();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gameStateRef = useRef<'idle' | 'playing' | 'gameover'>('idle');
  
  const player = useRef({ lane: 0, visX: 0, y: 0, vy: 0, isDucking: false, duckTimer: 0, z: 50 });
  const entities = useRef<Entity[]>([]);
  const particles = useRef<Particle[]>([]);
  
  const stars = useRef<Star[]>(Array.from({length: 40}, () => ({
      x: (Math.random() - 0.5) * 2000,
      y: Math.random() * 800 + 50,
      z: Math.random() * MAX_Z
  })));
  
  const frameCount = useRef(0);
  const shakeRef = useRef(0);
  const scoreRef = useRef(0);
  const coinsRef = useRef(0);
  const speedRef = useRef(12);
  const distanceRef = useRef(0);
  const touchStart = useRef<{x: number, y: number} | null>(null);

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

  const spawnParticles = (x: number, y: number, z: number, color: string, amount = 15) => {
    for (let i = 0; i < amount; i++) {
      particles.current.push({ x, y, z, dx: (Math.random() - 0.5) * 25, dy: Math.random() * 25, dz: (Math.random() - 0.5) * 25, life: 1.0, color });
    }
  };

  const spawnChunk = () => {
      const zOffset = MAX_Z;
      const r = Math.random();
      const lane = Math.floor(Math.random() * 3) - 1; 

      if (r < 0.3) {
          for(let i=0; i<3; i++) {
              entities.current.push({ id: Math.random(), lane, z: zOffset + (i * 80), type: 'coin', color: '#facc15' });
          }
      } else {
          const typeR = Math.random();
          let type: ObstacleType = 'wall';
          let color = '#ec4899'; 
          
          if (typeR > 0.7) { type = 'hurdle'; color = '#22d3ee'; } 
          else if (typeR > 0.4) { type = 'arch'; color = '#a855f7'; }

          entities.current.push({ id: Math.random(), lane, z: zOffset, type, color });

          if (Math.random() > 0.6) {
              const otherLane = lane === 0 ? (Math.random() > 0.5 ? 1 : -1) : 0;
              entities.current.push({ id: Math.random(), lane: otherLane, z: zOffset, type: 'wall', color: '#ec4899' });
          }
      }
  };

  // --- INDESTRUCTIBLE ENGINE LOOP ---
  const update = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) {
        requestRef.current = requestAnimationFrame(update);
        return;
    }

    frameCount.current++;

    if (frameCount.current % 6 === 0) {
        setScore(Math.floor(scoreRef.current));
        setCoins(coinsRef.current);
        setMultiplier(Math.floor(speedRef.current / 10));
    }

    if (isRunning.current && gameStateRef.current === 'playing') {
      
      speedRef.current += 0.005;
      distanceRef.current += speedRef.current;
      scoreRef.current += (speedRef.current * 0.02);

      const spawnInterval = Math.max(12, Math.floor(800 / speedRef.current));
      if (frameCount.current % spawnInterval === 0) {
          spawnChunk();
      }

      const p = player.current;
      // Snappier Lane switching
      const targetX = p.lane * LANE_WIDTH;
      p.visX += (targetX - p.visX) * 0.35; 

      // Heavier Gravity
      p.y += p.vy;
      p.vy -= 2.2; 
      if (p.y <= 0) {
          if (p.vy < -15) { 
              playSound(150, 'square', 0.05, 0.05);
              spawnParticles(p.visX, 0, p.z, '#c084fc', 8);
              shakeRef.current = 5;
          }
          p.y = 0; p.vy = 0;
      }

      if (p.duckTimer > 0) {
          p.duckTimer--;
          if (p.duckTimer <= 0) p.isDucking = false;
      }

      for (let i = entities.current.length - 1; i >= 0; i--) {
          const e = entities.current[i];
          e.z -= speedRef.current;

          if (e.z < -100) {
              entities.current.splice(i, 1);
              continue;
          }

          if (e.z < p.z + 20 && e.z > p.z - 20) {
              if (Math.abs(p.visX - (e.lane * LANE_WIDTH)) < 55) { // Forgiving Hitbox
                  
                  if (e.type === 'coin' && !e.collected) {
                      e.collected = true;
                      coinsRef.current += 1;
                      scoreRef.current += 10;
                      playSound(800 + (coinsRef.current % 5) * 50, 'sine', 0.05, 0.1);
                      spawnParticles(e.lane * LANE_WIDTH, 20, p.z, '#facc15', 6);
                  } 
                  else if (!e.collected) {
                      let hit = false;
                      if (e.type === 'wall') hit = true;
                      else if (e.type === 'hurdle' && p.y < 35) hit = true; 
                      else if (e.type === 'arch' && !p.isDucking) hit = true;

                      if (hit) {
                          syncGameState('gameover');
                          isRunning.current = false;
                          shakeRef.current = 20;
                          playSound(100, 'sawtooth', 0.3, 0.5);
                          if (window.navigator.vibrate) window.navigator.vibrate([200, 100, 300]);
                          spawnParticles(p.visX, p.y, p.z, '#e879f9', 60);

                          const studentId = localStorage.getItem('studentId');
                          if (studentId && scoreRef.current > 0) {
                            setIsSyncing(true);
                            supabase.from('arcade_scores')
                              .insert([{ student_id: studentId, game_name: 'runner', score: Math.floor(scoreRef.current) }])
                              .then(() => setIsSyncing(false))
                              .catch(() => setIsSyncing(false)); // Failsafe catching!
                          }
                      }
                  }
              }
          }
      }
    }

    particles.current.forEach(p => { 
        p.x += p.dx; p.y += p.dy; p.z += p.dz - speedRef.current; 
        p.dy -= 1.5; 
        if (p.y < 0) p.y = 0;
        p.life -= 0.05; 
    });
    particles.current = particles.current.filter(p => p.life > 0);

    // --- RENDERING ---
    ctx.save();
    ctx.fillStyle = '#05050a'; 
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (shakeRef.current > 0.5) { 
        ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current); 
        shakeRef.current *= 0.9; 
    }

    const bgGrad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
    bgGrad.addColorStop(0, '#0f0c29'); 
    bgGrad.addColorStop(1, '#a855f7'); 
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, HORIZON_Y);

    if (gameStateRef.current === 'playing') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        stars.current.forEach(s => {
            s.z -= speedRef.current * 3; 
            if (s.z <= 10) {
                s.z = MAX_Z;
                s.x = (Math.random() - 0.5) * 2000;
                s.y = Math.random() * 800 + 50;
            }
            const proj = project(s.x, s.y, s.z);
            if (proj.scale > 0 && proj.py < HORIZON_Y) {
                ctx.fillRect(proj.px, proj.py, 2 * proj.scale, 10 * proj.scale); 
            }
        });
    }

    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;
    ctx.shadowBlur = 20; ctx.shadowColor = '#f97316';
    ctx.beginPath(); ctx.arc(CANVAS_WIDTH/2, HORIZON_Y, 60, Math.PI, Math.PI*2); ctx.stroke();
    ctx.globalCompositeOperation = 'destination-out';
    const sunAnim = (distanceRef.current * 0.1) % 10;
    for(let i=0; i<60; i+=10) { ctx.fillRect(CANVAS_WIDTH/2 - 60, HORIZON_Y - i - sunAnim, 120, 2); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(232, 121, 249, 0.4)'; 
    ctx.lineWidth = 1;
    [-200, -100, 0, 100, 200].forEach(lx => {
        const bottomPt = project(lx * 6, 0, 0);
        const topPt = project(lx, 0, MAX_Z);
        ctx.beginPath(); ctx.moveTo(topPt.px, topPt.py); ctx.lineTo(bottomPt.px, bottomPt.py); ctx.stroke();
    });
    
    const gridSpacing = 100;
    const gridOffset = distanceRef.current % gridSpacing;
    for (let z = MAX_Z; z >= 0; z -= gridSpacing) {
        const actualZ = z - gridOffset;
        if (actualZ > 0) {
            const ptLeft = project(-1000, 0, actualZ);
            const ptRight = project(1000, 0, actualZ);
            ctx.beginPath(); ctx.moveTo(ptLeft.px, ptLeft.py); ctx.lineTo(ptRight.px, ptRight.py); ctx.stroke();
        }
    }

    const renderList = [
        ...entities.current.filter(e => !e.collected),
        ...particles.current.map(p => ({ ...p, isParticle: true }))
    ].sort((a, b) => b.z - a.z);

    renderList.forEach(item => {
        if ((item as any).isParticle) {
            const p = item as Particle;
            const proj = project(p.x, p.y, p.z);
            if (proj.scale > 0) {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.fillRect(proj.px, proj.py, 4 * proj.scale, 4 * proj.scale);
                ctx.globalAlpha = 1;
            }
        } else {
            const e = item as Entity;
            const ex = e.lane * LANE_WIDTH;
            const baseProj = project(ex, 0, e.z);
            if (baseProj.scale <= 0) return;

            ctx.shadowBlur = 10; ctx.shadowColor = e.color;

            if (e.type === 'coin') {
                const cy = 20 + Math.sin(frameCount.current * 0.1 + e.id) * 10;
                const cProj = project(ex, cy, e.z);
                ctx.fillStyle = e.color;
                ctx.beginPath(); ctx.ellipse(cProj.px, cProj.py, 12 * baseProj.scale, Math.abs(Math.cos(frameCount.current * 0.1)) * 12 * baseProj.scale, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cProj.px, cProj.py, 4 * baseProj.scale, 0, Math.PI*2); ctx.fill();
            } 
            else if (e.type === 'wall') {
                const topProj = project(ex, 60, e.z);
                ctx.fillStyle = 'rgba(236, 72, 153, 0.2)'; ctx.strokeStyle = e.color; ctx.lineWidth = 2 * baseProj.scale;
                const w = 90 * baseProj.scale; const h = baseProj.py - topProj.py;
                ctx.fillRect(baseProj.px - w/2, topProj.py, w, h); ctx.strokeRect(baseProj.px - w/2, topProj.py, w, h);
                ctx.beginPath(); ctx.moveTo(baseProj.px - w/4, topProj.py + h/3); ctx.lineTo(baseProj.px, topProj.py + h/2); ctx.lineTo(baseProj.px + w/4, topProj.py + h/3); ctx.stroke();
            }
            else if (e.type === 'hurdle') {
                const topProj = project(ex, 30, e.z);
                ctx.strokeStyle = e.color; ctx.lineWidth = 4 * baseProj.scale;
                const w = 90 * baseProj.scale; 
                ctx.beginPath(); ctx.moveTo(baseProj.px - w/2, baseProj.py); ctx.lineTo(baseProj.px - w/2, topProj.py); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(baseProj.px + w/2, baseProj.py); ctx.lineTo(baseProj.px + w/2, topProj.py); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(baseProj.px - w/2, topProj.py); ctx.lineTo(baseProj.px + w/2, topProj.py); ctx.stroke();
            }
            else if (e.type === 'arch') {
                const topProj = project(ex, 100, e.z);
                const bottomProj = project(ex, 50, e.z);
                ctx.fillStyle = 'rgba(168, 85, 247, 0.2)'; ctx.strokeStyle = e.color; ctx.lineWidth = 2 * baseProj.scale;
                const w = 90 * baseProj.scale; const h = bottomProj.py - topProj.py;
                ctx.fillRect(baseProj.px - w/2, topProj.py, w, h); ctx.strokeRect(baseProj.px - w/2, topProj.py, w, h);
                ctx.beginPath(); ctx.moveTo(baseProj.px - w/2, bottomProj.py); ctx.lineTo(baseProj.px - w/2, baseProj.py); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(baseProj.px + w/2, bottomProj.py); ctx.lineTo(baseProj.px + w/2, baseProj.py); ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }
    });

    if (gameStateRef.current === 'playing') {
        const p = player.current;
        const pProj = project(p.visX, p.y, p.z);
        const pHeight = p.isDucking ? 20 : 50; 
        const pTop = project(p.visX, p.y + pHeight, p.z); 
        
        ctx.shadowBlur = 20; ctx.shadowColor = '#e879f9';
        ctx.fillStyle = 'rgba(232, 121, 249, 0.3)';
        ctx.beginPath(); ctx.arc(pProj.px, pProj.py + 10, 15 * pProj.scale, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = '#e879f9'; 
        const pw = 40 * pProj.scale; const ph = pProj.py - pTop.py;
        ctx.fillRect(pProj.px - pw/2, pTop.py, pw, ph);
        
        ctx.fillStyle = '#fff';
        ctx.fillRect(pProj.px - (pw/4), pTop.py + (ph/4), pw/2, ph/2);
        ctx.shadowBlur = 0;
    }

    ctx.restore(); 
    requestRef.current = requestAnimationFrame(update);
  }, []); 

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [update]);

  const handleMove = (dir: 'left' | 'right' | 'up' | 'down') => {
      if (gameStateRef.current !== 'playing') return;
      const p = player.current;
      
      if (dir === 'left' && p.lane > -1) { p.lane -= 1; playSound(300, 'triangle', 0.05); }
      if (dir === 'right' && p.lane < 1) { p.lane += 1; playSound(300, 'triangle', 0.05); }
      
      if (dir === 'up' && p.y <= 0) { 
          p.vy = 26; 
          p.isDucking = false; p.duckTimer = 0; 
          playSound(500, 'square', 0.1); 
      }
      
      if (dir === 'down') {
          if (p.y > 0) {
              p.vy = -35; 
              playSound(150, 'sawtooth', 0.1);
          } else {
              p.isDucking = true; p.duckTimer = 35; 
              playSound(200, 'sawtooth', 0.1); 
              spawnParticles(p.visX, 0, p.z, '#a855f7', 10); 
          }
      }
  };

  const handleTouchStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameStateRef.current !== 'playing') return;
    touchStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleTouchEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameStateRef.current !== 'playing' || !touchStart.current) return;
    const dx = e.clientX - touchStart.current.x;
    const dy = e.clientY - touchStart.current.y;
    const THRESHOLD = 30;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > THRESHOLD) handleMove(dx > 0 ? 'right' : 'left');
    } else {
        if (Math.abs(dy) > THRESHOLD) handleMove(dy > 0 ? 'down' : 'up');
    }
    touchStart.current = null;
  };

  const startNew = (e?: React.SyntheticEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
    else if ((elem as any).webkitRequestFullscreen) (elem as any).webkitRequestFullscreen();
    initAudio(); 
    
    player.current = { lane: 0, visX: 0, y: 0, vy: 0, isDucking: false, duckTimer: 0, z: 50 };
    entities.current = []; particles.current = [];
    scoreRef.current = 0; setScore(0);
    coinsRef.current = 0; setCoins(0); 
    speedRef.current = 12; setMultiplier(1);
    distanceRef.current = 0;
    shakeRef.current = 0; frameCount.current = 0;
    
    syncGameState('playing');
    isRunning.current = true; 
    
    // Safety check to absolutely guarantee loop starts
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
        if (gameStateRef.current !== 'playing') return;
        if (['ArrowUp', 'w', 'W'].includes(e.key)) handleMove('up');
        if (['ArrowDown', 's', 'S'].includes(e.key)) handleMove('down');
        if (['ArrowLeft', 'a', 'A'].includes(e.key)) handleMove('left');
        if (['ArrowRight', 'd', 'D'].includes(e.key)) handleMove('right');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="h-[100dvh] w-screen bg-[#05050a] text-white flex flex-col items-center pt-6 overflow-hidden select-none touch-none overscroll-none">
      <div className="w-full max-w-md px-4 h-full flex flex-col relative z-10">
        
        {/* HUD */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={handleBack} className="p-2 bg-zinc-900 rounded-xl border border-white/10 active:scale-90 shadow-sm transition-transform z-50"><ChevronLeft size={20} /></button>
          <div className="flex gap-2">
            <div className="bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
              <Target size={12} className="text-zinc-400" />
              <span className="text-sm font-black italic text-zinc-300">{score}</span>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
              <Trophy size={12} className="text-yellow-500" />
              <span className="text-sm font-black italic text-yellow-500">{coins}</span>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
              <Zap size={12} className="text-fuchsia-400" />
              <span className="text-sm font-black italic text-fuchsia-400">{multiplier}x</span>
            </div>
          </div>
        </div>

        {/* CANVAS */}
        <div 
          onPointerDown={handleTouchStart}
          onPointerUp={handleTouchEnd}
          className={`relative w-full aspect-[34/46] bg-[#05050a] rounded-3xl border-2 transition-colors duration-300 overflow-hidden shadow-2xl touch-none ${gameState === 'gameover' ? 'border-red-500' : 'border-fuchsia-500/30'}`}
        >
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full block pointer-events-none" />
          
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 pointer-events-none backdrop-blur-sm">
              <RunnerLogo className="w-20 h-20 text-fuchsia-400 mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(232,121,249,0.5)]" />
              <button onPointerDown={startNew} className="px-10 py-4 bg-fuchsia-600 text-white font-black uppercase tracking-widest rounded-full shadow-[0_0_30px_rgba(232,121,249,0.4)] active:scale-95 transition-all pointer-events-auto">Jack In</button>
            </div>
          )}
          
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center z-20 p-6 text-center pointer-events-none backdrop-blur-md">
              <h2 className="text-3xl font-black italic uppercase tracking-tight text-white mb-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">Derezzed</h2>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-8">Distance: {score}</p>
              <button onPointerDown={startNew} className="px-10 py-4 bg-white text-red-600 font-black uppercase tracking-widest rounded-full shadow-xl active:scale-95 transition-all pointer-events-auto">Reboot</button>
              {isSyncing && <p className="mt-4 text-[8px] font-black text-white/30 uppercase animate-pulse flex items-center gap-2"><Loader2 size={10} className="animate-spin" /> Syncing...</p>}
            </div>
          )}
        </div>

        {/* CONTROLS */}
        <div className="mt-6 mb-auto w-full flex items-center justify-between px-2 touch-none select-none">
            <div className="grid grid-cols-3 gap-1.5 w-[140px]">
                <div /> 
                <button onPointerDown={(e) => { e.preventDefault(); handleMove('up'); }} className="h-12 bg-zinc-900 border-2 border-white/10 rounded-xl flex items-center justify-center active:bg-fuchsia-500/20 active:border-fuchsia-500/50 text-zinc-500 active:text-fuchsia-400"><ArrowUp size={24} /></button>
                <div /> 

                <button onPointerDown={(e) => { e.preventDefault(); handleMove('left'); }} className="h-12 bg-zinc-900 border-2 border-white/10 rounded-xl flex items-center justify-center active:bg-fuchsia-500/20 active:border-fuchsia-500/50 text-zinc-500 active:text-fuchsia-400"><ArrowLeft size={24} /></button>
                <div className="flex items-center justify-center opacity-30"><RunnerLogo className="w-6 h-6 text-zinc-500" /></div>
                <button onPointerDown={(e) => { e.preventDefault(); handleMove('right'); }} className="h-12 bg-zinc-900 border-2 border-white/10 rounded-xl flex items-center justify-center active:bg-fuchsia-500/20 active:border-fuchsia-500/50 text-zinc-500 active:text-fuchsia-400"><ArrowRight size={24} /></button>

                <div /> 
                <button onPointerDown={(e) => { e.preventDefault(); handleMove('down'); }} className="h-12 bg-zinc-900 border-2 border-white/10 rounded-xl flex items-center justify-center active:bg-fuchsia-500/20 active:border-fuchsia-500/50 text-zinc-500 active:text-fuchsia-400"><ArrowDown size={24} /></button>
                <div /> 
            </div>

            <div className="flex flex-col items-center justify-center w-[120px] h-[120px] rounded-full border-2 border-dashed border-white/5 opacity-40">
                <Target size={24} className="text-zinc-500 mb-2" />
                <span className="text-[9px] font-black text-center text-zinc-500 uppercase tracking-widest leading-tight">D-PAD OR<br/>SWIPE</span>
            </div>
        </div>

      </div>
    </div>
  );
}
