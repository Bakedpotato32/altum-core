'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Play, RotateCcw, Loader2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Zap, Target } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CrossyLogo } from '@/components/ArcadeIcons';

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
    
    // GUARANTEED SAFE ZONES: First 3 rows, and every 5th row
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
    const difficultyMult = 1 + (row * 0.008); // NERF: Gentler speed scaling
    const speed = type === 'safe' ? 0 : (1.0 + Math.random() * 1.5) * difficultyMult; // NERF: Slower base vehicles
    const entities: Entity[] = [];

    if (type !== 'safe') {
        // NERF: 1-2 cars max, but keep logs at 2-3 so water is crossable
        const numEntities = type === 'road' ? (Math.floor(Math.random() * 2) + 1) : (Math.floor(Math.random() * 2) + 2); 
        const spacing = CANVAS_WIDTH / numEntities;
        
        for (let i = 0; i < numEntities; i++) {
            const w = type === 'road' ? 40 + Math.random() * 30 : 80 + Math.random() * 50; 
            entities.push({
                id: Math.random(),
                x: i * spacing + (Math.random() * 20),
                y: -(row * GRID),
                w, h: GRID - 10,
                speed, dir,
                type: type === 'road' ? 'car' : 'log'
            });
        }
    }
    lanes.current.set(row, { row, type, speed, dir, entities });
  };

  const ensureChunks = (highestRow: number) => {
    for (let r = highestRow; r < highestRow + 20; r++) {
        generateLane(r);
    }
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
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
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

    isRunning.current = true; 
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
        
        if (maxScore.current % 10 === 0) {
            playSound(800, 'sine', 0.1, 0.2);
            canvasFlashAlpha.current = 0.5;
            vibrate(30);
        } else {
            playSound(400, 'sine', 0.05, 0.05);
        }
    }

    // --- REPAIRED & NERFED CAMERA ENGINE ---
    // NERF: Drastically reduced camera auto-scroll speed
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

    // --- PHYSICS & COLLISIONS ---
    let onLog = false;
    let logSpeed = 0;

    if (player.current.state === 'alive') {
        // NERF: Forgiving player hitbox (shaved 2px off each side)
        const pHitbox = { left: player.current.x + 10, right: player.current.x + GRID - 10, top: player.current.y + 10, bottom: player.current.y + GRID - 10 };

        lanes.current.forEach(lane => {
            lane.entities.forEach(ent => {
                ent.x += ent.speed * ent.dir;
                if (ent.dir === 1 && ent.x > CANVAS_WIDTH) ent.x = -ent.w;
                if (ent.dir === -1 && ent.x < -ent.w) ent.x = CANVAS_WIDTH;

                if (lane.row === currentRow) {
                    const eHitbox = { left: ent.x, right: ent.x + ent.w, top: -(lane.row * GRID) + 5, bottom: -(lane.row * GRID) + GRID - 5 };
                    if (pHitbox.right > eHitbox.left && pHitbox.left < eHitbox.right && pHitbox.bottom > eHitbox.top && pHitbox.top < eHitbox.bottom) {
                        if (ent.type === 'car') {
                            handleGameOver('car');
                        } else if (ent.type === 'log') {
                            onLog = true;
                            logSpeed = ent.speed * ent.dir;
                        }
                    }
                }
            });
        });

        const currentLane = lanes.current.get(currentRow);
        
        if (onLog) {
            player.current.x += logSpeed;
            if (player.current.x < -GRID || player.current.x > CANVAS_WIDTH) {
                handleGameOver('void');
            }
        } else if (currentLane?.type === 'water') {
            if (Math.abs(player.current.y - player.current.visY) < 10) {
                handleGameOver('water');
            }
        }

        if (player.current.visY + cameraOffset.current > CANVAS_HEIGHT + GRID) {
            handleGameOver('void');
        }
    }

    particles.current.forEach(p => {
        p.x += p.dx; p.y += p.dy; p.life -= 0.05;
    });
    particles.current = particles.current.filter(p => p.life > 0);

    if (gameStateRef.current === 'gameover' && particles.current.length === 0) {
        isRunning.current = false; 
    }

    // --- RENDERING ---
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (shakeRef.current > 0) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
        shakeRef.current *= 0.85;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
    }

    ctx.save();
    ctx.translate(0, cameraOffset.current);

    lanes.current.forEach(lane => {
        const ly = -(lane.row * GRID);
        if (ly + cameraOffset.current > CANVAS_HEIGHT + GRID || ly + cameraOffset.current < -GRID * 2) return;

        if (lane.type === 'safe') {
            ctx.fillStyle = '#0f172a'; 
            ctx.fillRect(0, ly, CANVAS_WIDTH, GRID);
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)'; 
            ctx.strokeRect(0, ly, CANVAS_WIDTH, GRID);
        } else if (lane.type === 'road') {
            ctx.fillStyle = '#1e0f12'; 
            ctx.fillRect(0, ly, CANVAS_WIDTH, GRID);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
            for(let i=0; i<CANVAS_WIDTH; i+=30) ctx.fillRect(i, ly + GRID/2 - 1, 15, 2);
        } else if (lane.type === 'water') {
            ctx.fillStyle = '#082f49'; 
            ctx.fillRect(0, ly, CANVAS_WIDTH, GRID);
            ctx.fillStyle = 'rgba(34, 211, 238, 0.15)';
            ctx.fillRect((frameCount.current % 40), ly + 10, 20, 2);
            ctx.fillRect(CANVAS_WIDTH - (frameCount.current % 60), ly + 25, 30, 2);
        }

        lane.entities.forEach(ent => {
            const ey = ly + 5;
            if (ent.type === 'car') {
                ctx.fillStyle = '#9f1239'; 
                ctx.fillRect(ent.x, ey + 4, ent.w, ent.h);
                ctx.fillStyle = '#f43f5e'; 
                ctx.fillRect(ent.x, ey, ent.w, ent.h);
                
                ctx.fillStyle = '#facc15';
                ctx.shadowBlur = 10; ctx.shadowColor = '#facc15';
                if (ent.dir === 1) {
                    ctx.fillRect(ent.x + ent.w - 6, ey + 4, 6, 6);
                    ctx.fillRect(ent.x + ent.w - 6, ey + ent.h - 10, 6, 6);
                } else {
                    ctx.fillRect(ent.x, ey + 4, 6, 6);
                    ctx.fillRect(ent.x, ey + ent.h - 10, 6, 6);
                }
                ctx.shadowBlur = 0;
            } else if (ent.type === 'log') {
                ctx.fillStyle = '#0e7490'; 
                ctx.fillRect(ent.x, ey + 4, ent.w, ent.h);
                ctx.fillStyle = '#22d3ee'; 
                ctx.fillRect(ent.x, ey, ent.w, ent.h);
                ctx.fillStyle = '#cffafe';
                ctx.fillRect(ent.x + 10, ey + ent.h/2 - 1, ent.w - 20, 2);
            }
        });
    });

    if (player.current.state === 'alive') {
        const px = player.current.visX;
        const py = player.current.visY;
        const pSize = GRID - 12;
        
        const hopProgress = Math.abs(player.current.x - player.current.visX) + Math.abs(player.current.y - player.current.visY);
        const yOffset = hopProgress > 5 ? -10 : 0; 
        
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(px + 6, py + 6 + 4, pSize, pSize);

        ctx.fillStyle = '#c2410c'; 
        ctx.fillRect(px + 6, py + 6 + yOffset + 6, pSize, pSize);
        ctx.fillStyle = '#f97316'; 
        ctx.fillRect(px + 6, py + 6 + yOffset, pSize, pSize);

        ctx.fillStyle = 'white';
        ctx.fillRect(px + 10, py + 10 + yOffset, 4, 4);
        ctx.fillRect(px + 20, py + 10 + yOffset, 4, 4);
    }

    particles.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1;

    ctx.restore(); 
    if (shakeRef.current > 0) ctx.restore(); 

    if (canvasFlashAlpha.current > 0) {
        ctx.fillStyle = `rgba(250, 204, 21, ${canvasFlashAlpha.current})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        canvasFlashAlpha.current -= 0.05;
    }

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

    player.current.x = nextX;
    player.current.y = nextY;
    playSound(300, 'square', 0.05, 0.05);
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
        if (Math.abs(dx) > THRESHOLD) movePlayer(dx > 0 ? 1 : -1, 0);
    } else {
        if (Math.abs(dy) > THRESHOLD) movePlayer(0, dy > 0 ? 1 : -1);
    }
    touchStart.current = null;
  };

  const initiateGame = (e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    requestFullscreen();
    initAudio();
    
    lanes.current.clear();
    ensureChunks(0); 
    
    player.current = { x: OFFSET_X + 3 * GRID, y: 0, visX: OFFSET_X + 3 * GRID, visY: 0, state: 'alive' };
    maxScore.current = 0;
    baseCameraOffset.current = 0;
    cameraOffset.current = CANVAS_HEIGHT * 0.65;
    setScore(0);
    particles.current = [];
    shakeRef.current = 0;
    frameCount.current = 0;
    
    gameStateRef.current = 'playing';
    setGameState('playing');
    
    if (!isRunning.current) {
      isRunning.current = true;
      requestRef.current = requestAnimationFrame(update);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
        if (gameStateRef.current !== 'playing') return;
        if (['ArrowUp', 'w', 'W'].includes(e.key)) movePlayer(0, -1);
        if (['ArrowDown', 's', 'S'].includes(e.key)) movePlayer(0, 1);
        if (['ArrowLeft', 'a', 'A'].includes(e.key)) movePlayer(-1, 0);
        if (['ArrowRight', 'd', 'D'].includes(e.key)) movePlayer(1, 0);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className={`h-[100dvh] w-screen font-sans bg-[var(--background)] text-[var(--text)] flex flex-col items-center pt-8 relative overflow-hidden select-none touch-none overscroll-none transition-colors duration-200`}>
      
      <div className="fixed inset-0 -z-10 pointer-events-none transition-colors duration-500" style={{ backgroundColor: flashColor || 'transparent' }}>
        <div className={`absolute top-[-10%] right-[-10%] w-[320px] h-[320px] rounded-full transition-colors ${gameState === 'gameover' ? 'bg-red-500/10' : 'bg-teal-400/10'} blur-[80px]`} />
        <div className="absolute bottom-[20%] left-[-10%] w-[260px] h-[260px] rounded-full bg-blue-500/10 blur-[80px]" />
      </div>

      <div className="w-full max-w-md px-5 flex flex-col h-full relative z-10">
        
        <div className="flex justify-between items-center mb-4">
          <button onPointerDown={handleBack} className="p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all text-zinc-500 z-50 shadow-sm cursor-pointer hover:text-teal-400">
            <ChevronLeft size={20} />
          </button>
          <div className="text-right">
            <h1 className="text-xl font-black italic uppercase tracking-tighter text-teal-400 drop-shadow-[0_0_10px_rgba(45,212,191,0.4)]">Crossy Altu</h1>
            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">Isometric Survival</p>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Score</span>
            <span className="text-3xl font-black italic text-[var(--text)] leading-none">{score}</span>
          </div>
          <div className="flex-1 bg-teal-400/5 border border-teal-400/20 rounded-2xl p-3 flex flex-col items-center justify-center shadow-inner">
            <span className="text-[10px] font-black text-teal-500/70 uppercase tracking-widest flex items-center gap-1 mb-1">
              <Trophy size={10}/> Record
            </span>
            <span className="text-3xl font-black italic text-teal-500 leading-none">{highScore}</span>
          </div>
        </div>

        <div 
          onPointerDown={handleTouchStart}
          onPointerUp={handleTouchEnd}
          className={`relative w-full aspect-[34/46] max-h-[460px] bg-[#050505] rounded-[32px] border-2 transition-all duration-300 overflow-hidden shadow-2xl cursor-pointer touch-none ${gameState === 'gameover' ? 'border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)]' : 'border-[var(--border)]'}`}
        >
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full block pointer-events-none" />

          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20 pointer-events-none">
              <CrossyLogo className="w-20 h-20 text-teal-400 mb-6 drop-shadow-[0_0_15px_rgba(45,212,191,0.6)] animate-pulse" />
              <button onPointerDown={initiateGame} className="px-10 py-4 bg-teal-400 text-black font-black uppercase tracking-widest rounded-full flex items-center gap-3 shadow-[0_0_30px_rgba(45,212,191,0.5)] pointer-events-auto active:scale-95 transition-all">
                <Play size={18} fill="currentColor" /> Enter Grid
              </button>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 pointer-events-none">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] mt-10">Terminated</h2>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-8">Final Score: {score}</p>
              
              <button onPointerDown={initiateGame} className="px-10 py-4 bg-white text-red-600 font-black uppercase tracking-widest rounded-full flex items-center gap-3 shadow-2xl pointer-events-auto active:scale-95 transition-all">
                <RotateCcw size={18} /> Retry
              </button>
              {isSyncing && <p className="mt-4 text-[8px] font-black text-white/30 uppercase tracking-widest animate-pulse flex items-center gap-2"><Loader2 size={10} className="animate-spin" /> Syncing Data...</p>}
            </div>
          )}
        </div>
        
        <div className="mt-6 mb-auto w-full max-w-[280px] mx-auto grid grid-cols-3 gap-2 touch-none select-none">
          <div /> 
          <button onPointerDown={(e) => { e.preventDefault(); movePlayer(0, -1); }} className="h-16 bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-teal-500/20 active:border-teal-500/50 active:scale-[0.85] transition-all shadow-sm text-zinc-500 active:text-teal-500 cursor-pointer">
            <ArrowUp size={32} />
          </button>
          <div /> 

          <button onPointerDown={(e) => { e.preventDefault(); movePlayer(-1, 0); }} className="h-16 bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-teal-500/20 active:border-teal-500/50 active:scale-[0.85] transition-all shadow-sm text-zinc-500 active:text-teal-500 cursor-pointer">
            <ArrowLeft size={32} />
          </button>
          
          <div className="flex flex-col items-center justify-center opacity-40">
             <Target size={16} className="text-zinc-500 mb-1" />
             <span className="text-[7px] font-black uppercase tracking-widest text-zinc-500 text-center leading-tight">D-PAD OR<br/>SWIPE</span>
          </div>

          <button onPointerDown={(e) => { e.preventDefault(); movePlayer(1, 0); }} className="h-16 bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-teal-500/20 active:border-teal-500/50 active:scale-[0.85] transition-all shadow-sm text-zinc-500 active:text-teal-500 cursor-pointer">
            <ArrowRight size={32} />
          </button>

          <div /> 
          <button onPointerDown={(e) => { e.preventDefault(); movePlayer(0, 1); }} className="h-16 bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-teal-500/20 active:border-teal-500/50 active:scale-[0.85] transition-all shadow-sm text-zinc-500 active:text-teal-500 cursor-pointer">
            <ArrowDown size={32} />
          </button>
          <div /> 
        </div>

      </div>
    </div>
  );
}
