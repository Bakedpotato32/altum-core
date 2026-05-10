'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Play, RotateCcw, Zap, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SpaceLogo } from '@/components/ArcadeIcons';

// --- GAME CONSTANTS ---
const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 480;
const PLAYER_SIZE = 28;
const BULLET_SPEED = 8;
const MAX_HP = 3;

type Entity = { id: number, x: number, y: number, w: number, h: number, hp: number, maxHp: number, type: string, color: string, shootCooldown: number, hitTimer: number };
type Bullet = { x: number, y: number, dx: number, dy: number, owner: 'player' | 'enemy', color: string };
type Particle = { x: number, y: number, dx: number, dy: number, life: number, color: string };
type PowerUp = { id: number, x: number, y: number, type: 'weapon' | 'health', collected: boolean };

export default function StarshipAltu() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [weaponLevel, setWeaponLevel] = useState(1);
  const [hp, setHp] = useState(MAX_HP);
  const [flashColor, setFlashColor] = useState<string | null>(null); // Natively handles screen flashes

  // Engine Refs
  const player = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60, w: PLAYER_SIZE, h: PLAYER_SIZE });
  const hpRef = useRef(MAX_HP);
  const enemies = useRef<Entity[]>([]);
  const bullets = useRef<Bullet[]>([]);
  const particles = useRef<Particle[]>([]);
  const powerUps = useRef<PowerUp[]>([]);
  const stars = useRef(Array.from({length: 60}, () => ({ x: Math.random() * CANVAS_WIDTH, y: Math.random() * CANVAS_HEIGHT, size: Math.random() * 1.5, speed: Math.random() * 2 + 0.5 })));
  
  const frameCount = useRef(0);
  const scoreRef = useRef(0);
  const weaponRef = useRef(1);
  const shakeRef = useRef(0);
  const requestRef = useRef<number>();
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('spaceHS');
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

  const playSound = (freq: number, type: OscillatorType = 'sine', vol = 0.05, duration = 0.1) => {
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

  const triggerFlash = (color: string) => {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), 150);
  };

  const createExplosion = (x: number, y: number, color: string, amount = 12) => {
    for (let i = 0; i < amount; i++) {
      particles.current.push({ x, y, dx: (Math.random() - 0.5) * 12, dy: (Math.random() - 0.5) * 12, life: 1.0, color });
    }
  };

  const handleGameOver = async () => {
    setGameState('gameover');
    createExplosion(player.current.x, player.current.y, '#22d3ee', 40);
    triggerFlash('rgba(239, 68, 68, 0.4)'); // Red flash
    playSound(100, 'sawtooth', 0.2, 0.8);
    vibrate([200, 100, 200, 100, 400]);

    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem('spaceHS', scoreRef.current.toString());
    }

    const studentId = localStorage.getItem('studentId');
    if (studentId && scoreRef.current > 0) {
      setIsSyncing(true);
      try {
        const { data: existing } = await supabase.from('arcade_scores').select('*').eq('student_id', studentId).eq('game_name', 'space').maybeSingle();
        if (!existing) {
          await supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'space', score: scoreRef.current }]);
        } else if (scoreRef.current > existing.score) {
          await supabase.from('arcade_scores').update({ score: scoreRef.current }).eq('id', existing.id);
        }
      } catch (e) {}
      setIsSyncing(false);
    }
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  const damagePlayer = () => {
    hpRef.current -= 1;
    setHp(hpRef.current);
    shakeRef.current = 15;
    triggerFlash('rgba(239, 68, 68, 0.3)');
    playSound(150, 'square', 0.1, 0.3);
    createExplosion(player.current.x + PLAYER_SIZE/2, player.current.y + PLAYER_SIZE/2, '#22d3ee', 10);
    vibrate(100);
    
    // Downgrade weapon on hit
    if (weaponRef.current > 1) {
        weaponRef.current -= 1;
        setWeaponLevel(weaponRef.current);
    }

    if (hpRef.current <= 0) handleGameOver();
  };

  const spawnEnemy = () => {
    const r = Math.random();
    let type = 'scout'; let color = '#f43f5e'; let hp = 1; let w = 25; let h = 25;

    if (r > 0.75 && scoreRef.current > 150) {
        type = 'tank'; color = '#fb923c'; hp = 4; w = 35; h = 35; // Big orange square
    } else if (r > 0.5 && scoreRef.current > 300) {
        type = 'hunter'; color = '#a855f7'; hp = 2; w = 30; h = 30; // Purple diamond
    }

    enemies.current.push({
      id: Math.random(),
      x: Math.random() * (CANVAS_WIDTH - w),
      y: -h, w, h, hp, maxHp: hp, type, color,
      shootCooldown: Math.random() * 40 + 40,
      hitTimer: 0
    });
  };

  const firePlayer = () => {
    const p = player.current;
    if (weaponRef.current === 1) {
      bullets.current.push({ x: p.x + p.w / 2, y: p.y, dx: 0, dy: -BULLET_SPEED, owner: 'player', color: '#22d3ee' });
    } else if (weaponRef.current === 2) {
      bullets.current.push({ x: p.x, y: p.y + 10, dx: 0, dy: -BULLET_SPEED, owner: 'player', color: '#22d3ee' });
      bullets.current.push({ x: p.x + p.w, y: p.y + 10, dx: 0, dy: -BULLET_SPEED, owner: 'player', color: '#22d3ee' });
    } else {
      bullets.current.push({ x: p.x + p.w / 2, y: p.y, dx: 0, dy: -BULLET_SPEED, owner: 'player', color: '#22d3ee' });
      bullets.current.push({ x: p.x, y: p.y + 10, dx: -2, dy: -BULLET_SPEED, owner: 'player', color: '#67e8f9' });
      bullets.current.push({ x: p.x + p.w, y: p.y + 10, dx: 2, dy: -BULLET_SPEED, owner: 'player', color: '#67e8f9' });
    }
    playSound(400, 'square', 0.02, 0.05);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || gameState !== 'playing') return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frameCount.current++;

    // Screen Shake Logic
    if (shakeRef.current > 0) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
        shakeRef.current *= 0.9;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
    }

    // Dynamic Starfield
    ctx.fillStyle = "white";
    stars.current.forEach(s => {
        s.y += s.speed + (scoreRef.current / 2000); // Speed up stars as you progress
        if (s.y > CANVAS_HEIGHT) { s.y = 0; s.x = Math.random() * CANVAS_WIDTH; }
        ctx.globalAlpha = s.speed / 3;
        ctx.fillRect(s.x, s.y, s.size, s.size);
    });
    ctx.globalAlpha = 1;

    // Particles
    particles.current.forEach(p => {
      p.x += p.dx; p.y += p.dy; p.life -= 0.04;
      if (p.life > 0) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
      }
    });
    particles.current = particles.current.filter(p => p.life > 0);
    ctx.globalAlpha = 1;

    // Powerups
    powerUps.current.forEach(pu => {
        pu.y += 2.5;
        ctx.fillStyle = pu.type === 'weapon' ? "#22d3ee" : "#10b981";
        ctx.shadowBlur = 15; ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, 8, 0, Math.PI * 2);
        ctx.fill(); ctx.shadowBlur = 0;

        // Player picks up powerup
        const p = player.current;
        if (Math.abs(pu.x - (p.x + p.w/2)) < 25 && Math.abs(pu.y - (p.y + p.h/2)) < 25) {
            pu.collected = true;
            playSound(1200, 'sine', 0.1, 0.2);
            vibrate(30);
            triggerFlash('rgba(34, 211, 238, 0.2)');
            if (pu.type === 'weapon') {
                weaponRef.current = Math.min(3, weaponRef.current + 1);
                setWeaponLevel(weaponRef.current);
            } else {
                hpRef.current = Math.min(MAX_HP, hpRef.current + 1);
                setHp(hpRef.current);
            }
        }
    });
    powerUps.current = powerUps.current.filter(pu => !pu.collected && pu.y < CANVAS_HEIGHT);

    // Draw Player Ship (Arrowhead)
    const p = player.current;
    if (hpRef.current > 0) {
        ctx.shadowBlur = 15; ctx.shadowColor = "#22d3ee";
        ctx.fillStyle = "#22d3ee";
        ctx.beginPath();
        ctx.moveTo(p.x + p.w / 2, p.y); // Nose
        ctx.lineTo(p.x + p.w, p.y + p.h); // Right Wing
        ctx.lineTo(p.x + p.w / 2, p.y + p.h - 8); // Engine indent
        ctx.lineTo(p.x, p.y + p.h); // Left Wing
        ctx.fill();
        ctx.shadowBlur = 0;

        // Dynamic Engine glow based on movement/time
        ctx.fillStyle = "#facc15";
        ctx.fillRect(p.x + p.w/2 - 2, p.y + p.h - 5, 4, Math.random() * 8 + 6);
    }

    // Auto-fire
    if (frameCount.current % 12 === 0 && hpRef.current > 0) firePlayer();

    // Enemies Logic
    if (frameCount.current % Math.max(20, 60 - Math.floor(scoreRef.current / 100)) === 0) spawnEnemy();
    
    enemies.current.forEach((e) => {
      // Movement Logic
      let speed = 2 + (scoreRef.current / 800);
      if (e.type === 'tank') speed *= 0.5;
      if (e.type === 'hunter') speed *= 0.8;
      e.y += speed;

      if (e.type === 'hunter') {
          e.x += Math.sin(frameCount.current / 20 + e.id) * 3;
          e.x = Math.max(0, Math.min(CANVAS_WIDTH - e.w, e.x));
      }

      // Enemy Shooting Logic
      e.shootCooldown--;
      if (e.shootCooldown <= 0 && e.y > 0) {
          if (e.type === 'tank') {
              bullets.current.push({ x: e.x + e.w/2, y: e.y + e.h, dx: 0, dy: 5, owner: 'enemy', color: '#fb923c' });
              e.shootCooldown = 90;
          } else if (e.type === 'hunter') {
              // Aim directly at player
              const angle = Math.atan2((p.y - e.y), ((p.x + p.w/2) - (e.x + e.w/2)));
              bullets.current.push({ x: e.x + e.w/2, y: e.y + e.h, dx: Math.cos(angle) * 5, dy: Math.sin(angle) * 5, owner: 'enemy', color: '#a855f7' });
              e.shootCooldown = 70;
          }
      }

      // Draw Enemy
      ctx.shadowBlur = 10; ctx.shadowColor = e.color;
      ctx.fillStyle = e.hitTimer > 0 ? '#ffffff' : e.color;
      ctx.beginPath();
      
      if (e.type === 'scout') {
          ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + e.w, e.y); ctx.lineTo(e.x + e.w/2, e.y + e.h);
      } else if (e.type === 'tank') {
          ctx.rect(e.x, e.y, e.w, e.h);
      } else if (e.type === 'hunter') {
          ctx.moveTo(e.x + e.w/2, e.y); ctx.lineTo(e.x + e.w, e.y + e.h/2);
          ctx.lineTo(e.x + e.w/2, e.y + e.h); ctx.lineTo(e.x, e.y + e.h/2);
      }
      ctx.fill(); ctx.shadowBlur = 0;
      if (e.hitTimer > 0) e.hitTimer--;

      // Physical Collision with player
      if (hpRef.current > 0 && Math.abs(e.x + e.w/2 - (p.x + p.w/2)) < 20 && Math.abs(e.y + e.h/2 - (p.y + p.h/2)) < 20) {
        e.hp = 0; // Destroy enemy
        damagePlayer();
      }
    });

    // Bullets Logic
    bullets.current.forEach((b, bi) => {
      b.x += b.dx; b.y += b.dy;
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 5; ctx.shadowColor = b.color;
      
      if (b.owner === 'player') {
          ctx.fillRect(b.x - 1.5, b.y, 3, 10);
          // Player Bullet hitting Enemy
          enemies.current.forEach((e) => {
            if (e.hp > 0 && b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
              b.dy = 1000; // Move bullet offscreen to despawn
              e.hp -= 1;
              e.hitTimer = 3;
              playSound(300, 'triangle', 0.05);
              
              if (e.hp <= 0) {
                createExplosion(e.x + e.w/2, e.y + e.h/2, e.color, e.maxHp * 8);
                scoreRef.current += 10 * e.maxHp;
                setScore(scoreRef.current);
                playSound(600, 'square', 0.1);
                
                // Loot drops
                const dropRoll = Math.random();
                if (dropRoll > 0.92) powerUps.current.push({id: Math.random(), x: e.x + e.w/2, y: e.y, type: 'weapon', collected: false});
                else if (dropRoll < 0.05 && hpRef.current < MAX_HP) powerUps.current.push({id: Math.random(), x: e.x + e.w/2, y: e.y, type: 'health', collected: false});
              }
            }
          });
      } else {
          // Enemy Bullet hitting Player
          ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
          if (hpRef.current > 0 && Math.abs(b.x - (p.x + p.w/2)) < 12 && Math.abs(b.y - (p.y + p.h/2)) < 15) {
              b.dy = 1000;
              damagePlayer();
          }
      }
      ctx.shadowBlur = 0;
    });

    // Cleanup dead entities
    enemies.current = enemies.current.filter(e => e.hp > 0 && e.y < CANVAS_HEIGHT);
    bullets.current = bullets.current.filter(b => b.y > -20 && b.y < CANVAS_HEIGHT + 20);

    if (shakeRef.current > 0) ctx.restore();

    if (gameState === 'playing') requestRef.current = requestAnimationFrame(draw);
  }, [gameState]);

  // Use Pointer Event for better touch lock without scrolling
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    
    player.current.x = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_SIZE, x - PLAYER_SIZE / 2));
    player.current.y = Math.max(0, Math.min(CANVAS_HEIGHT - PLAYER_SIZE, y - PLAYER_SIZE));
  };

  const startNewGame = (e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    requestFullscreen();
    initAudio();
    
    // HARD RESET ENGINE - Fixes ghost arrays from previous session
    scoreRef.current = 0; 
    setScore(0);
    weaponRef.current = 1; 
    setWeaponLevel(1);
    hpRef.current = MAX_HP; 
    setHp(MAX_HP);
    shakeRef.current = 0;
    frameCount.current = 0; 
    enemies.current = []; 
    bullets.current = []; 
    particles.current = []; 
    powerUps.current = [];
    player.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 80, w: PLAYER_SIZE, h: PLAYER_SIZE };
    
    setGameState('playing');
  };

  useEffect(() => {
    if (gameState === 'playing') requestRef.current = requestAnimationFrame(draw);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current!); };
  }, [gameState, draw]);

  return (
    // STRICT TOUCH LOCK
    <div className="h-[100dvh] w-screen font-sans bg-[var(--background)] text-[var(--text)] flex flex-col items-center pt-8 relative overflow-hidden touch-none overscroll-none select-none">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10 pointer-events-none transition-colors duration-500" style={{ backgroundColor: flashColor || 'transparent' }}>
        <div className="absolute top-[-10%] right-[-10%] w-[320px] h-[320px] rounded-full bg-cyan-500/10 blur-[80px]" />
        <div className="absolute bottom-[20%] left-[-10%] w-[260px] h-[260px] rounded-full bg-blue-500/10 blur-[80px]" />
      </div>

      <div className="w-full max-w-md px-5 flex flex-col items-center h-full relative z-10">
        
        {/* Header */}
        <div className="w-full flex justify-between items-center mb-6">
          <button onPointerDown={handleBack} className="p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all text-zinc-500 hover:text-cyan-500 shadow-sm z-50 cursor-pointer">
            <ChevronLeft size={20} />
          </button>
          <div className="text-right">
            <h1 className="text-xl font-black italic uppercase tracking-tighter text-cyan-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">Starship Altu</h1>
            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Weapon Lvl {weaponLevel}</p>
          </div>
        </div>

        {/* Status Bar */}
        <div className="w-full flex gap-3 mb-6">
          <div className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Score</span>
            <span className="text-3xl font-black italic text-[var(--text)]">{score}</span>
          </div>
          <div className="flex-1 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-3 flex flex-col items-center justify-center shadow-inner">
            <span className="text-[10px] font-black text-cyan-500/70 uppercase tracking-widest flex items-center gap-1 mb-1"><Trophy size={10}/> Best</span>
            <span className="text-3xl font-black italic text-cyan-500">{highScore}</span>
          </div>
        </div>

        {/* Game Canvas Wrapper */}
        <div 
          onPointerMove={handlePointerMove}
          className={`relative w-full aspect-[34/48] max-h-[500px] bg-[#050505] rounded-[32px] border-2 transition-all overflow-hidden shadow-2xl touch-none ${flashColor ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'border-[var(--border)]'}`}
        >
          {/* Integrity (HP) UI overlay */}
          {gameState === 'playing' && (
            <div className="absolute top-4 left-4 flex gap-1.5 z-10 pointer-events-none">
               {Array.from({ length: MAX_HP }).map((_, i) => (
                 <Shield key={i} size={14} className={i < hp ? "text-cyan-400 fill-cyan-400/20 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" : "text-zinc-700"} />
               ))}
            </div>
          )}

          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full block touch-none" />

          {/* Overlays */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20 pointer-events-none">
              <SpaceLogo className="w-20 h-20 text-cyan-500 mb-6 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)] animate-pulse" />
              <button onPointerDown={startNewGame} className="px-10 py-4 bg-cyan-500 text-black font-black uppercase tracking-widest rounded-full flex items-center gap-3 active:scale-95 shadow-[0_0_30px_rgba(34,211,238,0.4)] pointer-events-auto transition-all">
                <Play size={18} fill="currentColor" /> Initialize
              </button>
              <p className="text-[8px] font-black text-cyan-300/60 uppercase tracking-[0.2em] mt-4">Engages Fullscreen</p>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center z-20 p-6 text-center pointer-events-none">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">Hull Breach</h2>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-8">Ship Destroyed at {score} pts</p>
              <button onPointerDown={startNewGame} className="px-10 py-4 bg-white text-red-600 font-black uppercase tracking-widest rounded-full flex items-center gap-3 active:scale-95 shadow-2xl pointer-events-auto transition-all">
                <RotateCcw size={18} /> Reboot
              </button>
              {isSyncing && <p className="mt-4 text-[8px] font-black text-white/30 uppercase tracking-widest animate-pulse flex items-center gap-2"><Loader2 size={10} className="animate-spin" /> Syncing Data...</p>}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-6 opacity-60 w-full pointer-events-none">
           <div className="flex items-center gap-1.5 bg-[var(--card)] px-3 py-1.5 rounded-full border border-[var(--border)] shadow-sm">
             <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
             <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Upgrade</span>
           </div>
           <div className="flex items-center gap-1.5 bg-[var(--card)] px-3 py-1.5 rounded-full border border-[var(--border)] shadow-sm">
             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
             <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Shield</span>
           </div>
           <div className="flex items-center gap-1.5 bg-[var(--card)] px-3 py-1.5 rounded-full border border-[var(--border)] shadow-sm">
             <div className="w-2 h-2 bg-orange-400" />
             <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Tank</span>
           </div>
           <div className="flex items-center gap-1.5 bg-[var(--card)] px-3 py-1.5 rounded-full border border-[var(--border)] shadow-sm">
             <div className="w-2 h-2 rotate-45 bg-purple-500" />
             <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Hunter</span>
           </div>
        </div>

      </div>
    </div>
  );
}
