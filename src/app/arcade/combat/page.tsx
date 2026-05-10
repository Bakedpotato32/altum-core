'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Target, Shield, Crosshair } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CombatLogo } from '@/components/ArcadeIcons';

// --- ENGINE CONSTANTS ---
const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 420;

type Tank = { id: number, x: number, y: number, radius: number, angle: number, hp: number, maxHp: number, type: 'player' | 'grunt' | 'sniper' | 'bruiser', color: string, speed: number, cooldown: number, targetAngle?: number };
type Bullet = { id: number, x: number, y: number, dx: number, dy: number, speed: number, bounces: number, isPlayer: boolean, color: string, life: number };
type Particle = { x: number, y: number, dx: number, dy: number, life: number, color: string, size: number, angle: number, spin: number };
type Wall = { x: number, y: number, w: number, h: number };

export default function VectorCombat() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // React UI State
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [hp, setHp] = useState(3);
  const [isSyncing, setIsSyncing] = useState(false);

  // Engine Refs (Bypass React completely)
  const isRunning = useRef(false);
  const requestRef = useRef<number>();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gameStateRef = useRef<'idle' | 'playing' | 'gameover'>('idle');
  
  const player = useRef<Tank>({ id: 0, x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 + 100, radius: 12, angle: -Math.PI/2, hp: 3, maxHp: 3, type: 'player', color: '#06b6d4', speed: 2.5, cooldown: 0 });
  const enemies = useRef<Tank[]>([]);
  const bullets = useRef<Bullet[]>([]);
  const particles = useRef<Particle[]>([]);
  const walls = useRef<Wall[]>([]);
  
  const frameCount = useRef(0);
  const shakeRef = useRef(0);
  const scoreRef = useRef(0);
  const waveRef = useRef(1);
  const hpRef = useRef(3);
  const moveInput = useRef({ x: 0, y: 0 });

  // Joystick Refs
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const joystickPointerId = useRef<number | null>(null);

  const syncGameState = (state: 'idle' | 'playing' | 'gameover') => {
      gameStateRef.current = state; setGameState(state);
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

  const spawnParticles = (x: number, y: number, color: string, amount = 10, speed = 4) => {
    for (let i = 0; i < amount; i++) {
      particles.current.push({ x, y, dx: (Math.random() - 0.5) * speed, dy: (Math.random() - 0.5) * speed, life: 1.0, color, size: Math.random() * 8 + 4, angle: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 0.2 });
    }
  };

  const buildMap = () => {
      walls.current = [
          // Borders
          { x: 0, y: 0, w: CANVAS_WIDTH, h: 10 },
          { x: 0, y: CANVAS_HEIGHT - 10, w: CANVAS_WIDTH, h: 10 },
          { x: 0, y: 0, w: 10, h: CANVAS_HEIGHT },
          { x: CANVAS_WIDTH - 10, y: 0, w: 10, h: CANVAS_HEIGHT },
          // Inner obstacles
          { x: 60, y: 80, w: 60, h: 20 },
          { x: CANVAS_WIDTH - 120, y: 80, w: 60, h: 20 },
          { x: CANVAS_WIDTH / 2 - 10, y: CANVAS_HEIGHT / 2 - 40, w: 20, h: 80 },
          { x: 60, y: CANVAS_HEIGHT - 100, w: 60, h: 20 },
          { x: CANVAS_WIDTH - 120, y: CANVAS_HEIGHT - 100, w: 60, h: 20 }
      ];
  };

  const spawnWave = () => {
      const numEnemies = Math.min(2 + Math.floor(waveRef.current / 2), 6);
      for(let i=0; i<numEnemies; i++) {
          const r = Math.random();
          let type: 'grunt'|'sniper'|'bruiser' = 'grunt';
          let hp = 1; let color = '#ef4444'; let speed = 1.0;
          
          if (waveRef.current > 2 && r > 0.7) { type = 'sniper'; color = '#a855f7'; speed = 0.5; }
          else if (waveRef.current > 4 && r > 0.85) { type = 'bruiser'; color = '#f97316'; hp = 3; speed = 1.8; }
          
          enemies.current.push({
              id: Math.random(),
              x: 40 + Math.random() * (CANVAS_WIDTH - 80),
              y: 40 + Math.random() * (CANVAS_HEIGHT / 2 - 40),
              radius: 12, angle: Math.PI/2, hp, maxHp: hp, type, color, speed, cooldown: 60 + Math.random() * 60
          });
      }
      playSound(300, 'square', 0.1, 0.4);
  };

  const checkWallCollision = (x: number, y: number, radius: number) => {
      for (const w of walls.current) {
          if (x + radius > w.x && x - radius < w.x + w.w && y + radius > w.y && y - radius < w.y + w.h) return true;
      }
      return false;
  };

  const update = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) {
        requestRef.current = requestAnimationFrame(update); return;
    }

    frameCount.current++;

    if (frameCount.current % 5 === 0) {
        setScore(scoreRef.current); setWave(waveRef.current); setHp(hpRef.current);
    }

    if (isRunning.current && gameStateRef.current === 'playing') {
        
        // --- WAVE LOGIC ---
        if (enemies.current.length === 0) {
            waveRef.current++;
            spawnWave();
        }

        // --- PLAYER LOGIC ---
        if (player.current.hp > 0) {
            if (player.current.cooldown > 0) player.current.cooldown--;
            
            // Movement (Analog support from Joystick)
            const p = player.current;
            const nextX = p.x + moveInput.current.x * p.speed;
            const nextY = p.y + moveInput.current.y * p.speed;
            
            if (!checkWallCollision(nextX, p.y, p.radius)) p.x = nextX;
            if (!checkWallCollision(p.x, nextY, p.radius)) p.y = nextY;
            
            // Turn hull to face movement
            if (moveInput.current.x !== 0 || moveInput.current.y !== 0) {
                p.targetAngle = Math.atan2(moveInput.current.y, moveInput.current.x);
            }
        }

        // --- ENEMY LOGIC ---
        enemies.current.forEach(e => {
            if (e.cooldown > 0) e.cooldown--;
            
            const dx = player.current.x - e.x;
            const dy = player.current.y - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            e.angle = Math.atan2(dy, dx); // Aim at player

            // Movement AI
            if (e.type === 'grunt' || e.type === 'bruiser') {
                if (dist > 60) {
                    const nx = e.x + Math.cos(e.angle) * e.speed;
                    const ny = e.y + Math.sin(e.angle) * e.speed;
                    if (!checkWallCollision(nx, e.y, e.radius)) e.x = nx;
                    if (!checkWallCollision(e.x, ny, e.radius)) e.y = ny;
                }
            }

            // Firing AI
            if (e.cooldown <= 0 && player.current.hp > 0) {
                const bSpeed = e.type === 'sniper' ? 6 : 3;
                const bLife = e.type === 'sniper' ? 200 : 120;
                bullets.current.push({
                    id: Math.random(),
                    x: e.x + Math.cos(e.angle) * 16, y: e.y + Math.sin(e.angle) * 16,
                    dx: Math.cos(e.angle) * bSpeed, dy: Math.sin(e.angle) * bSpeed,
                    speed: bSpeed, bounces: e.type === 'sniper' ? 2 : 1,
                    isPlayer: false, color: e.color, life: bLife
                });
                e.cooldown = e.type === 'sniper' ? 120 : e.type === 'bruiser' ? 40 : 80;
                playSound(e.type === 'sniper' ? 600 : 300, 'sawtooth', 0.02);
            }
        });

        // --- BULLET LOGIC ---
        bullets.current.forEach(b => {
            let nextX = b.x + b.dx;
            let nextY = b.y + b.dy;
            b.life--;

            // Wall Collision & Ricochet
            let hitWall = false;
            for (const w of walls.current) {
                if (nextX > w.x && nextX < w.x + w.w && nextY > w.y && nextY < w.y + w.h) {
                    hitWall = true;
                    const overlapX = Math.min(Math.abs(nextX - w.x), Math.abs(nextX - (w.x + w.w)));
                    const overlapY = Math.min(Math.abs(nextY - w.y), Math.abs(nextY - (w.y + w.h)));
                    if (overlapX < overlapY) b.dx *= -1; else b.dy *= -1;
                    
                    b.bounces--;
                    playSound(800, 'sine', 0.02, 0.05); // Bounce ping
                    spawnParticles(b.x, b.y, b.color, 3, 2);
                    break;
                }
            }

            if (!hitWall) {
                b.x = nextX; b.y = nextY;
            } else if (b.bounces < 0) {
                b.life = 0; 
            }

            // Tank Collisions
            if (b.life > 0) {
                if (!b.isPlayer && player.current.hp > 0) {
                    const dist = Math.sqrt((b.x - player.current.x)**2 + (b.y - player.current.y)**2);
                    if (dist < player.current.radius + 4) {
                        b.life = 0;
                        hpRef.current -= 1;
                        player.current.hp = hpRef.current;
                        shakeRef.current = 15;
                        playSound(100, 'square', 0.2, 0.4);
                        spawnParticles(player.current.x, player.current.y, player.current.color, 20, 6);
                        if (window.navigator.vibrate) window.navigator.vibrate(200);

                        if (hpRef.current <= 0) {
                            syncGameState('gameover');
                            isRunning.current = false;
                            const studentId = localStorage.getItem('studentId');
                            if (studentId && scoreRef.current > 0) {
                                setIsSyncing(true);
                                // FIXED: Replaced .finally() with standard .then().catch()
                                supabase.from('arcade_scores')
                                  .insert([{ student_id: studentId, game_name: 'combat', score: scoreRef.current }])
                                  .then(() => setIsSyncing(false))
                                  .catch(() => setIsSyncing(false));
                            }
                        }
                    }
                } else if (b.isPlayer) {
                    enemies.current.forEach(e => {
                        const dist = Math.sqrt((b.x - e.x)**2 + (b.y - e.y)**2);
                        if (dist < e.radius + 4) {
                            b.life = 0;
                            e.hp -= 1;
                            spawnParticles(e.x, e.y, e.color, 8, 3);
                            playSound(400, 'square', 0.05);
                            if (e.hp <= 0) {
                                scoreRef.current += e.type === 'boss' ? 50 : e.type === 'bruiser' ? 5 : 1;
                                spawnParticles(e.x, e.y, e.color, 25, 8);
                                playSound(200, 'sawtooth', 0.1, 0.2);
                                if (window.navigator.vibrate) window.navigator.vibrate(40);
                            }
                        }
                    });
                }
            }
        });

        enemies.current = enemies.current.filter(e => e.hp > 0);
        bullets.current = bullets.current.filter(b => b.life > 0);
    }

    particles.current.forEach(p => { p.x += p.dx; p.y += p.dy; p.angle += p.spin; p.life -= 0.05; });
    particles.current = particles.current.filter(p => p.life > 0);

    // --- RENDERING ---
    ctx.save();
    ctx.fillStyle = '#020205'; 
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (shakeRef.current > 0.5) { 
        ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current); 
        shakeRef.current *= 0.9; 
    }

    // Vector Grid
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
    ctx.lineWidth = 1;
    for(let i=0; i<CANVAS_WIDTH; i+=20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke(); }
    for(let i=0; i<CANVAS_HEIGHT; i+=20) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke(); }

    // Walls
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10; ctx.shadowColor = '#3b82f6';
    walls.current.forEach(w => {
        ctx.strokeRect(w.x, w.y, w.w, w.h);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fillRect(w.x, w.y, w.w, w.h);
    });
    ctx.shadowBlur = 0;

    // Laser Sights
    if (gameStateRef.current === 'playing') {
        enemies.current.forEach(e => {
            if (e.type === 'sniper') {
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
                ctx.lineWidth = 1;
                ctx.moveTo(e.x, e.y);
                ctx.lineTo(e.x + Math.cos(e.angle) * CANVAS_WIDTH, e.y + Math.sin(e.angle) * CANVAS_WIDTH);
                ctx.stroke();
            }
        });
    }

    // Tank Renderer
    const drawTank = (t: Tank) => {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.strokeStyle = t.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15; ctx.shadowColor = t.color;

        // Base Hull
        ctx.rotate(t.targetAngle !== undefined ? t.targetAngle : t.angle);
        ctx.strokeRect(-t.radius, -t.radius+2, t.radius*2, t.radius*2 - 4);
        
        // Barrel
        ctx.rotate((t.targetAngle !== undefined ? -t.targetAngle : -t.angle) + t.angle); 
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(18, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(0,0, 6, 0, Math.PI*2); ctx.stroke(); 
        
        ctx.restore();
    };

    enemies.current.forEach(drawTank);
    if (player.current.hp > 0) drawTank(player.current);

    // Bullets
    bullets.current.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.shadowBlur = 10; ctx.shadowColor = b.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = b.color; ctx.lineWidth=2; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.dx*2, b.y - b.dy*2); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    });

    // Particles
    particles.current.forEach(p => { 
        ctx.strokeStyle = p.color; 
        ctx.globalAlpha = p.life; 
        ctx.lineWidth = 2;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
        ctx.beginPath(); ctx.moveTo(-p.size, 0); ctx.lineTo(p.size, 0); ctx.stroke();
        ctx.restore();
    });
    ctx.globalAlpha = 1;

    ctx.restore(); 
    requestRef.current = requestAnimationFrame(update);
  }, []); 

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [update]);

  // --- CONTROLS ---
  const handleCanvasTap = (e: React.PointerEvent) => {
    if (gameStateRef.current !== 'playing' || player.current.hp <= 0) return;
    if (player.current.cooldown > 0) return;

    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

    const angle = Math.atan2(y - player.current.y, x - player.current.x);
    player.current.angle = angle; 

    const bSpeed = 6;
    bullets.current.push({
        id: Math.random(),
        x: player.current.x + Math.cos(angle) * 16, y: player.current.y + Math.sin(angle) * 16,
        dx: Math.cos(angle) * bSpeed, dy: Math.sin(angle) * bSpeed,
        speed: bSpeed, bounces: 2, isPlayer: true, color: '#06b6d4', life: 150
    });
    
    player.current.cooldown = 15; 
    playSound(800, 'square', 0.05);
  };

  // --- ZERO LAG JOYSTICK ---
  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current || !joystickKnobRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    
    const maxR = rect.width / 2 - 20; 
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist > maxR) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
    }
    
    // Direct DOM manipulation - Bypasses React entirely
    joystickKnobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    
    // Feed analog float directly into engine
    moveInput.current = { x: dx / maxR, y: dy / maxR };
  };

  const handleJoystickDown = (e: React.PointerEvent) => {
      if (gameStateRef.current !== 'playing') return;
      joystickPointerId.current = e.pointerId;
      (e.target as Element).setPointerCapture(e.pointerId);
      updateJoystick(e.clientX, e.clientY);
  };

  const handleJoystickMove = (e: React.PointerEvent) => {
      if (joystickPointerId.current !== e.pointerId) return;
      updateJoystick(e.clientX, e.clientY);
  };

  const handleJoystickUp = (e: React.PointerEvent) => {
      if (joystickPointerId.current !== e.pointerId) return;
      joystickPointerId.current = null;
      (e.target as Element).releasePointerCapture(e.pointerId);
      moveInput.current = { x: 0, y: 0 };
      if (joystickKnobRef.current) {
          joystickKnobRef.current.style.transform = `translate(0px, 0px)`;
      }
  };

  const startNew = (e?: React.SyntheticEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
    else if ((elem as any).webkitRequestFullscreen) (elem as any).webkitRequestFullscreen();
    initAudio(); 
    
    player.current.hp = 3; player.current.x = CANVAS_WIDTH/2; player.current.y = CANVAS_HEIGHT - 60;
    enemies.current = []; bullets.current = []; particles.current = [];
    scoreRef.current = 0; setScore(0);
    hpRef.current = 3; setHp(3); 
    waveRef.current = 1; setWave(1);
    shakeRef.current = 0; frameCount.current = 0;
    moveInput.current = { x: 0, y: 0 };
    if (joystickKnobRef.current) joystickKnobRef.current.style.transform = `translate(0px, 0px)`;
    
    buildMap();
    isRunning.current = true; 
    syncGameState('playing');
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#050508] text-white flex flex-col items-center pt-6 overflow-hidden select-none touch-none overscroll-none">
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
              <Crosshair size={12} className="text-yellow-500" />
              <span className="text-sm font-black italic text-yellow-500">W {wave}</span>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
              <Shield size={12} className={hp <= 1 ? 'text-red-500 animate-pulse' : 'text-cyan-400'} />
              <div className="flex gap-0.5">
                  {[...Array(3)].map((_, i) => (
                      <div key={i} className={`w-2 h-4 rounded-sm ${i < hp ? 'bg-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.8)]' : 'bg-zinc-800'}`} />
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* CANVAS */}
        <div onPointerDown={handleCanvasTap} className={`relative w-full aspect-[34/42] bg-[#020205] rounded-3xl border-2 transition-colors duration-300 overflow-hidden shadow-2xl touch-none cursor-crosshair ${gameState === 'gameover' ? 'border-red-500' : 'border-cyan-500/30'}`}>
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full block" />
          
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 pointer-events-none">
              <CombatLogo className="w-20 h-20 text-cyan-400 mb-6 animate-pulse" />
              <button onPointerDown={startNew} className="px-10 py-4 bg-cyan-600 text-white font-black uppercase tracking-widest rounded-full shadow-[0_0_30px_rgba(6,182,212,0.4)] active:scale-95 transition-all pointer-events-auto">Engage</button>
            </div>
          )}
          
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center z-20 p-6 text-center pointer-events-none">
              <h2 className="text-3xl font-black italic uppercase tracking-tight text-white mb-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">Hull Destroyed</h2>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-8">Final Score: {score}</p>
              <button onPointerDown={startNew} className="px-10 py-4 bg-white text-red-600 font-black uppercase tracking-widest rounded-full shadow-xl active:scale-95 transition-all pointer-events-auto">Reboot</button>
              {isSyncing && <p className="mt-4 text-[8px] font-black text-white/30 uppercase animate-pulse flex items-center gap-2"><Loader2 size={10} className="animate-spin" /> Syncing...</p>}
            </div>
          )}
        </div>

        {/* CONTROLS (JOYSTICK & FIRE HINT) */}
        <div className="mt-6 mb-auto w-full flex items-center justify-between px-4 touch-none select-none">
            
            {/* VIRTUAL JOYSTICK */}
            <div className="flex items-center justify-center w-[120px] h-[120px]">
                <div 
                    ref={joystickBaseRef}
                    onPointerDown={handleJoystickDown}
                    onPointerMove={handleJoystickMove}
                    onPointerUp={handleJoystickUp}
                    onPointerCancel={handleJoystickUp}
                    className="relative w-28 h-28 bg-zinc-900/80 border-2 border-white/10 rounded-full flex items-center justify-center touch-none shadow-inner"
                >
                    {/* Crosshairs */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                        <div className="w-full h-[1px] bg-cyan-500"></div>
                        <div className="absolute h-full w-[1px] bg-cyan-500"></div>
                    </div>
                    {/* Draggable Knob */}
                    <div 
                        ref={joystickKnobRef}
                        className="absolute w-12 h-12 bg-cyan-500/20 border-2 border-cyan-400 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)] pointer-events-none"
                    />
                </div>
            </div>

            {/* FIRE HINT */}
            <div className="flex flex-col items-center justify-center w-[100px] h-[100px] rounded-full border-2 border-dashed border-white/5 opacity-40 pointer-events-none">
                <Target size={20} className="text-zinc-500 mb-1" />
                <span className="text-[8px] font-black text-center text-zinc-500 uppercase tracking-widest leading-tight">Tap Game<br/>To Fire</span>
            </div>
        </div>

      </div>
    </div>
  );
}
