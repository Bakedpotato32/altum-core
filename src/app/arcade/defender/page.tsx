'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Play, RotateCcw, Loader2, Coins, Shield, X, ArrowUpCircle, Crosshair, Hexagon, Flame, Snowflake, Target } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DefenderLogo } from '@/components/ArcadeIcons';

// --- ENGINE CONSTANTS ---
const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 420;
const PATH_WIDTH = 30;

type Waypoint = { x: number, y: number };
type Enemy = { id: number, x: number, y: number, hp: number, maxHp: number, speed: number, baseSpeed: number, wpIndex: number, type: string, color: string, reward: number, slowTimer: number };
type TurretType = 'blaster' | 'cannon' | 'sniper' | 'cryo' | 'spread';
type Turret = { id: number, x: number, y: number, type: TurretType, level: number, range: number, damage: number, fireRate: number, cooldown: number, angle: number, color: string, targetId: number | null };
type Bullet = { x: number, y: number, dx: number, dy: number, speed: number, damage: number, targetId: number, color: string, type: TurretType, life: number };
type Particle = { x: number, y: number, dx: number, dy: number, life: number, color: string, size: number };

const TOWER_DATA: Record<TurretType, any> = {
  blaster: { name: 'PULSE', cost: 50, color: '#3b82f6', range: 85, dmg: 10, rate: 25, Icon: Crosshair },
  cannon: { name: 'FLAK', cost: 120, color: '#f97316', range: 95, dmg: 35, rate: 75, Icon: Hexagon },
  sniper: { name: 'RAILGUN', cost: 200, color: '#a855f7', range: 250, dmg: 160, rate: 130, Icon: Target },
  cryo: { name: 'CRYO', cost: 150, color: '#06b6d4', range: 80, dmg: 1, rate: 2, Icon: Snowflake },
  spread: { name: 'PLASMA', cost: 180, color: '#ec4899', range: 70, dmg: 18, rate: 48, Icon: Flame }
};

const PATH: Waypoint[] = [
  { x: -20, y: 50 }, { x: 280, y: 50 }, { x: 280, y: 150 },
  { x: 60, y: 150 }, { x: 60, y: 270 }, { x: 300, y: 270 },
  { x: 300, y: 370 }, { x: 170, y: 370 }
];

function distToSegment(p: {x:number, y:number}, v: Waypoint, w: Waypoint) {
  const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
  if (l2 === 0) return Math.sqrt((p.x - v.x)**2 + (p.y - v.y)**2);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((p.x - (v.x + t * (w.x - v.x)))**2 + (p.y - (v.y + t * (w.y - v.y)))**2);
}

export default function CoreDefender() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // --- UI STATE (React) ---
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(250);
  const [coreHp, setCoreHp] = useState(20);
  const [wave, setWave] = useState(1);
  const [selectedToBuild, setSelectedToBuild] = useState<TurretType | null>(null);
  const [activeTurretId, setActiveTurretId] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- ENGINE REFS (Bypasses React completely for zero-lag physics) ---
  const requestRef = useRef<number>();
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const gameStateRef = useRef<'idle' | 'playing' | 'gameover'>('idle');
  const activeTurretIdRef = useRef<number | null>(null);
  const selectedToBuildRef = useRef<TurretType | null>(null);
  
  const enemies = useRef<Enemy[]>([]);
  const turrets = useRef<Turret[]>([]);
  const bullets = useRef<Bullet[]>([]);
  const particles = useRef<Particle[]>([]);
  
  const frameCount = useRef(0);
  const shakeRef = useRef(0);
  const coinsRef = useRef(250);
  const scoreRef = useRef(0);
  const coreHpRef = useRef(20);
  const waveRef = useRef(1);

  // Controlled UI Syncing
  const syncGameState = (state: 'idle' | 'playing' | 'gameover') => {
      gameStateRef.current = state;
      setGameState(state);
  };
  const setTurretId = (id: number | null) => {
      activeTurretIdRef.current = id;
      setActiveTurretId(id);
  };
  const setBuildType = (type: TurretType | null) => {
      selectedToBuildRef.current = type;
      setSelectedToBuild(type);
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

  const spawnParticles = (x: number, y: number, color: string, amount = 10, speed = 5) => {
    for (let i = 0; i < amount; i++) {
      particles.current.push({ x, y, dx: (Math.random() - 0.5) * speed, dy: (Math.random() - 0.5) * speed, life: 1.0, color, size: Math.random() * 2 + 1 });
    }
  };

  const handleDeath = (e: Enemy) => {
    coinsRef.current += e.reward; 
    scoreRef.current += 1;
    spawnParticles(e.x, e.y, e.color, e.type === 'boss' ? 40 : 12);
    playSound(e.type === 'boss' ? 150 : 900, 'triangle', 0.05);
  };

  const spawnEnemy = () => {
    const waveMult = 1 + (waveRef.current * 0.22);
    const r = Math.random();
    let type = 'scout'; let hp = 20 * waveMult; let speed = 1.25; let color = '#ef4444'; let reward = 5;

    if (waveRef.current % 10 === 0 && r > 0.85) { type = 'boss'; hp = 600 * waveMult; speed = 0.4; color = '#991b1b'; reward = 120; }
    else if (r > 0.78) { type = 'tank'; hp = 90 * waveMult; speed = 0.65; color = '#f97316'; reward = 18; }
    else if (r > 0.55) { type = 'swarm'; hp = 10 * waveMult; speed = 2.3; color = '#eab308'; reward = 4; }
    
    enemies.current.push({ id: Math.random(), x: PATH[0].x, y: PATH[0].y, hp, maxHp: hp, speed, baseSpeed: speed, wpIndex: 1, type, color, reward, slowTimer: 0 });
  };

  // --- THE INDESTRUCTIBLE ENGINE LOOP ---
  // No React dependencies. This loop cannot be killed by state changes.
  const update = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) {
        requestRef.current = requestAnimationFrame(update);
        return;
    }

    frameCount.current++;

    // 10Hz UI THROTTLE: Silently hands data to React without interrupting physics
    if (frameCount.current % 6 === 0) {
        setScore(scoreRef.current);
        setCoins(coinsRef.current);
        setCoreHp(coreHpRef.current);
        setWave(waveRef.current);
    }

    if (gameStateRef.current === 'playing') {
      if (frameCount.current % 900 === 0) { waveRef.current += 1; playSound(400, 'sine', 0.05, 0.5); }
      const spawnRate = Math.max(18, 85 - (waveRef.current * 4));
      if (frameCount.current % Math.floor(spawnRate) === 0) spawnEnemy();

      // Enemy Logic
      enemies.current.forEach(e => {
        let curSpeed = e.baseSpeed;
        if (e.slowTimer > 0) { curSpeed *= 0.4; e.slowTimer--; }
        if (e.wpIndex < PATH.length) {
          const target = PATH[e.wpIndex];
          const dx = target.x - e.x, dy = target.y - e.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < curSpeed) { e.x = target.x; e.y = target.y; e.wpIndex++; }
          else { e.x += (dx / dist) * curSpeed; e.y += (dy / dist) * curSpeed; }
        } else if (e.hp > 0) {
          e.hp = 0; 
          coreHpRef.current -= e.type === 'boss' ? 5 : 1;
          playSound(150, 'sawtooth', 0.1);
          shakeRef.current = 15;
          spawnParticles(e.x, e.y, e.color, 20);

          if (coreHpRef.current <= 0) { 
            syncGameState('gameover'); 
            spawnParticles(PATH[PATH.length-1].x, PATH[PATH.length-1].y, '#ef4444', 60, 15);
            const studentId = localStorage.getItem('studentId');
            if (studentId && scoreRef.current > 0) {
              setIsSyncing(true);
              supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'defender', score: scoreRef.current }]).finally(() => setIsSyncing(false));
            }
          }
        }
      });

      // Turret Logic
      turrets.current.forEach(t => {
        if (t.cooldown > 0) t.cooldown--;
        let target: Enemy | null = null, closest = t.range;
        enemies.current.forEach(e => {
          const dist = Math.sqrt((e.x - t.x) ** 2 + (e.y - t.y) ** 2);
          if (dist <= t.range && dist < closest) { closest = dist; target = e; }
        });
        
        t.targetId = target ? (target as Enemy).id : null;
        if (target) {
          const e = target as Enemy;
          
          // Smoother Angle Lerp
          let diff = Math.atan2(e.y - t.y, e.x - t.x) - t.angle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          t.angle += diff * 0.25;

          if (t.type === 'cryo') { 
              e.slowTimer = 35; 
              if (t.cooldown <= 0) { e.hp -= t.damage; t.cooldown = t.fireRate; if (e.hp <= 0) handleDeath(e); } 
          }
          else if (t.cooldown <= 0) {
            if (t.type === 'spread') {
                [-0.3, 0, 0.3].forEach(offset => {
                    bullets.current.push({ x: t.x + Math.cos(t.angle + offset) * 12, y: t.y + Math.sin(t.angle + offset) * 12, dx: Math.cos(t.angle + offset) * 8, dy: Math.sin(t.angle + offset) * 8, speed: 8, damage: t.damage, targetId: e.id, color: t.color, type: t.type, life: 30 });
                });
            } else {
                const bSpd = t.type === 'sniper' ? 18 : 9;
                bullets.current.push({ x: t.x + Math.cos(t.angle) * 15, y: t.y + Math.sin(t.angle) * 15, dx: Math.cos(t.angle) * bSpd, dy: Math.sin(t.angle) * bSpd, speed: bSpd, damage: t.damage, targetId: e.id, color: t.color, type: t.type, life: 120 });
            }
            t.cooldown = t.fireRate;
            playSound(t.type === 'sniper' ? 700 : 400, 'square', 0.02);
          }
        }
      });

      // Bullet Logic
      bullets.current.forEach(b => {
        b.x += b.dx; b.y += b.dy; b.life--;
        enemies.current.forEach(e => {
          if (e.hp > 0 && b.damage > 0 && Math.abs(b.x - e.x) < 14 && Math.abs(b.y - e.y) < 14) {
            e.hp -= b.damage; 
            b.life = 0;
            b.damage = 0; // Prevent multi-hit overkill
            
            if (b.type === 'cannon') { 
              spawnParticles(b.x, b.y, '#f97316', 8, 3);
              enemies.current.forEach(se => { 
                  if (se.hp > 0 && se.id !== e.id && Math.sqrt((se.x - b.x)**2 + (se.y - b.y)**2) < 45) { 
                      se.hp -= 15; // fixed splash
                      if (se.hp <= 0) handleDeath(se); 
                  }
              });
            }
            if (e.hp <= 0) handleDeath(e);
          }
        });
      });

      enemies.current = enemies.current.filter(e => e.hp > 0);
      bullets.current = bullets.current.filter(b => b.life > 0);
    }

    // Particles animate universally
    particles.current.forEach(p => { p.x += p.dx; p.y += p.dy; p.life -= 0.04; });
    particles.current = particles.current.filter(p => p.life > 0);

    // --- RENDER BLOCK ---
    ctx.save();
    ctx.fillStyle = '#020205'; // Explicit solid black fill completely destroys transparency blinks
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Guaranteed paired Shake Context
    if (shakeRef.current > 0.5) { 
        ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current); 
        shakeRef.current *= 0.9; 
    } else {
        shakeRef.current = 0;
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < CANVAS_WIDTH; i += 20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke(); }
    for (let i = 0; i < CANVAS_HEIGHT; i += 20) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke(); }

    ctx.strokeStyle = '#1e1b4b'; ctx.lineWidth = PATH_WIDTH; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y); ctx.stroke();

    // Data Flow Arrows
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)'; ctx.lineWidth = 2;
    const arrowGap = 40; const flowOffset = (frameCount.current % arrowGap);
    for (let i = 0; i < PATH.length - 1; i++) {
        const start = PATH[i], end = PATH[i+1], dist = Math.sqrt((end.x-start.x)**2 + (end.y-start.y)**2), dx = (end.x-start.x)/dist, dy = (end.y-start.y)/dist;
        for (let j = flowOffset; j < dist; j += arrowGap) {
            const ax = start.x + dx * j, ay = start.y + dy * j;
            ctx.beginPath(); ctx.moveTo(ax - dx*5 + dy*3, ay - dy*5 - dx*3); ctx.lineTo(ax, ay); ctx.lineTo(ax - dx*5 - dy*3, ay - dy*5 + dx*3); ctx.stroke();
        }
    }

    const core = PATH[PATH.length - 1];
    ctx.fillStyle = '#4f46e5'; ctx.shadowBlur = 20; ctx.shadowColor = '#6366f1';
    ctx.beginPath(); ctx.arc(core.x, core.y, 20 + Math.sin(frameCount.current * 0.1) * 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

    // Range Highlight
    if (activeTurretIdRef.current) {
      const t = turrets.current.find(tr => tr.id === activeTurretIdRef.current);
      if (t) { ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    }

    turrets.current.forEach(t => {
      // Draw Laser underneath turret (Fixes context stack overflow bug)
      if (t.type === 'cryo' && t.targetId) {
          const target = enemies.current.find(en => en.id === t.targetId);
          if (target) {
              ctx.beginPath();
              ctx.strokeStyle = `rgba(6, 182, 212, ${0.4 + Math.random() * 0.4})`;
              ctx.lineWidth = t.level * 2;
              ctx.moveTo(t.x, t.y); ctx.lineTo(target.x, target.y); ctx.stroke();
          }
      }

      ctx.save(); ctx.translate(t.x, t.y);
      ctx.fillStyle = '#0f172a'; ctx.strokeStyle = t.id === activeTurretIdRef.current ? 'white' : t.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      
      ctx.rotate(t.angle); ctx.fillStyle = t.color;
      if (t.type === 'blaster') { ctx.fillRect(0, -3, 16, 6); if (t.level >= 2) ctx.fillRect(0, -5, 12, 10); }
      else if (t.type === 'sniper') { ctx.fillRect(0, -2, 24, 4); if(t.level>=3) ctx.fillRect(18, -5, 8, 10); }
      else if (t.type === 'cannon') { ctx.fillRect(0, -6, 15, 12); if(t.level>=2) ctx.fillRect(15, -4, 5, 8); }
      else if (t.type === 'spread') { ctx.fillRect(0, -7, 12, 4); ctx.fillRect(0, 3, 12, 4); if(t.level>=2) ctx.fillRect(0, -2, 14, 4); }
      else if (t.type === 'cryo') { ctx.fillRect(0, -4, 14, 8); }
      ctx.restore();
    });

    enemies.current.forEach(e => {
      ctx.fillStyle = e.slowTimer > 0 ? '#67e8f9' : e.color;
      ctx.save(); ctx.translate(e.x, e.y);
      if (e.type === 'scout') { ctx.rotate(Math.atan2(PATH[e.wpIndex]?.y-e.y, PATH[e.wpIndex]?.x-e.x)); ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(-8,8); ctx.lineTo(-8,-8); ctx.fill(); }
      else if (e.type === 'tank') { ctx.fillRect(-12,-12,24,24); }
      else if (e.type === 'boss') { ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.fill(); ctx.fillStyle='black'; ctx.fillRect(-8,-8,16,16); }
      else { ctx.beginPath(); ctx.arc(0,0,7,0,Math.PI*2); ctx.fill(); }
      ctx.restore();
      
      if (e.hp < e.maxHp) { ctx.fillStyle = '#000'; ctx.fillRect(e.x - 12, e.y - 20, 24, 3); ctx.fillStyle = '#22c55e'; ctx.fillRect(e.x - 12, e.y - 20, 24 * (Math.max(0, e.hp) / e.maxHp), 3); }
    });

    bullets.current.forEach(b => { ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.type==='cannon'?5:3, 0, Math.PI * 2); ctx.fill(); });
    particles.current.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });

    ctx.restore(); // GUARANTEED RESTORE

    requestRef.current = requestAnimationFrame(update);
  }, []); // NO DEPENDENCIES. LOOP CAN NEVER BE KILLED.

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [update]);

  const handleTap = (e: React.PointerEvent) => {
    if (gameStateRef.current !== 'playing') return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

    const tapped = turrets.current.find(t => Math.sqrt((t.x - x) ** 2 + (t.y - y) ** 2) < 22);
    if (tapped) { setTurretId(tapped.id); setBuildType(null); playSound(400, 'sine', 0.05); return; }
    if (!selectedToBuildRef.current) { setTurretId(null); return; }

    const data = TOWER_DATA[selectedToBuildRef.current];
    if (coinsRef.current < data.cost) { playSound(200, 'sawtooth', 0.05); return; }
    
    let inv = false;
    for (let i = 0; i < PATH.length - 1; i++) { if (distToSegment({ x, y }, PATH[i], PATH[i + 1]) < (PATH_WIDTH / 2) + 15) inv = true; }
    if (!inv) inv = turrets.current.some(t => Math.sqrt((t.x - x) ** 2 + (t.y - y) ** 2) < 32);
    
    if (!inv) {
      coinsRef.current -= data.cost; setCoins(coinsRef.current);
      turrets.current.push({ id: Math.random(), x, y, type: selectedToBuildRef.current, level: 1, range: data.range, damage: data.dmg, fireRate: data.rate, cooldown: 0, angle: 0, color: data.color, targetId: null });
      setBuildType(null);
      playSound(800, 'square', 0.05);
    } else {
      playSound(200, 'sawtooth', 0.05);
    }
  };

  const handleBackNavigation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (document.fullscreenElement) document.exitFullscreen();
    router.back();
  };

  const startNew = () => {
    initAudio(); 
    enemies.current = []; turrets.current = []; bullets.current = []; particles.current = [];
    scoreRef.current = 0; setScore(0);
    coinsRef.current = 250; setCoins(250); 
    coreHpRef.current = 20; setCoreHp(20); 
    waveRef.current = 1; setWave(1);
    shakeRef.current = 0; frameCount.current = 0;
    setBuildType(null); setTurretId(null);
    syncGameState('playing');
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#050508] text-white flex flex-col items-center pt-6 overflow-hidden select-none touch-none overscroll-none">
      <div className="w-full max-w-md px-4 h-full flex flex-col relative z-10">
        
        {/* HUD */}
        <div className="flex justify-between items-center mb-3">
          <button onClick={handleBackNavigation} className="p-2 bg-zinc-900 rounded-xl border border-white/10 active:scale-90 shadow-sm transition-transform"><ChevronLeft size={20} /></button>
          <div className="flex gap-2">
            <div className="bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
              <Target size={12} className="text-zinc-400" />
              <span className="text-sm font-black italic text-zinc-300">{score}</span>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
              <Coins size={12} className="text-yellow-500" />
              <span className="text-sm font-black italic text-yellow-500">{coins}</span>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
              <Shield size={12} className={coreHp <= 5 ? 'text-red-500 animate-pulse' : 'text-indigo-400'} />
              <span className={`text-sm font-black italic ${coreHp <= 5 ? 'text-red-500' : 'text-indigo-400'}`}>{coreHp}</span>
            </div>
          </div>
        </div>

        {/* CANVAS */}
        <div onPointerDown={handleTap} className={`relative w-full aspect-[34/42] bg-[#020205] rounded-3xl border-2 transition-colors duration-300 overflow-hidden shadow-2xl ${gameState === 'gameover' ? 'border-red-500' : selectedToBuild ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.2)]' : 'border-white/10'}`}>
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full block" />
          
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
              <DefenderLogo className="w-20 h-20 text-indigo-500 mb-6 animate-pulse" />
              <button onPointerDown={startNew} className="px-10 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-full shadow-lg active:scale-95 transition-all">Defend Core</button>
            </div>
          )}
          
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center z-20 p-6 text-center">
              <h2 className="text-3xl font-black italic uppercase tracking-tight text-white mb-1">Grid Offline</h2>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-8">Survived till Wave {wave}</p>
              <button onPointerDown={startNew} className="px-10 py-4 bg-white text-red-600 font-black uppercase tracking-widest rounded-full shadow-xl active:scale-95 transition-all">Re-Initialize</button>
              {isSyncing && <p className="mt-4 text-[8px] font-black text-white/30 uppercase tracking-widest animate-pulse flex items-center gap-2"><Loader2 size={10} className="animate-spin" /> Syncing Data...</p>}
            </div>
          )}

          {gameState === 'playing' && <div className="absolute top-4 right-4 bg-black/40 border border-white/10 rounded-lg px-3 py-1 font-black italic text-[10px] text-white uppercase pointer-events-none">Wave {wave}</div>}
        </div>

        {/* BOTTOM MENU */}
        <div className="mt-4 mb-auto w-full h-[110px] flex flex-col justify-center">
          {activeTurretId ? (
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-xl">
              {(() => {
                const t = turrets.current.find(tr => tr.id === activeTurretId);
                if (!t) return null;
                const data = TOWER_DATA[t.type];
                const upCost = Math.floor(data.cost * t.level * 1.5);
                return (
                  <>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <data.Icon size={14} style={{ color: data.color }} />
                        <span className="text-[12px] font-black uppercase" style={{ color: data.color }}>{data.name} LVL {t.level}</span>
                      </div>
                      <button onPointerDown={() => {
                        const tIndex = turrets.current.findIndex(tr => tr.id === activeTurretId);
                        if (tIndex !== -1) {
                          coinsRef.current += Math.floor(TOWER_DATA[turrets.current[tIndex].type].cost * 0.5 * turrets.current[tIndex].level);
                          setCoins(coinsRef.current);
                          spawnParticles(turrets.current[tIndex].x, turrets.current[tIndex].y, turrets.current[tIndex].color, 15);
                          turrets.current.splice(tIndex, 1);
                          setTurretId(null);
                          playSound(300, 'sawtooth', 0.1);
                        }
                      }} className="px-3 py-1 bg-red-500/10 text-red-500 rounded-lg text-[9px] font-black uppercase w-max active:scale-95">Sell</button>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.level < 3 && <button onPointerDown={() => {
                        if (coinsRef.current >= upCost) {
                          coinsRef.current -= upCost; setCoins(coinsRef.current);
                          t.level++; t.damage = Math.floor(t.damage * 1.5); t.range = Math.floor(t.range * 1.1);
                          spawnParticles(t.x, t.y, '#ffffff', 20);
                          playSound(1000, 'sine', 0.1);
                        } else {
                          playSound(200, 'sawtooth', 0.1);
                        }
                      }} className={`px-4 py-3 rounded-xl flex items-center gap-2 font-black uppercase text-[10px] active:scale-95 transition-all ${coins >= upCost ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}><ArrowUpCircle size={16} /> {upCost}</button>}
                      <button onPointerDown={() => setTurretId(null)} className="p-3 bg-zinc-800 text-zinc-400 rounded-xl active:scale-95"><X size={16} /></button>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 w-full hide-scrollbar">
              {Object.entries(TOWER_DATA).map(([key, data]) => {
                const isSelected = selectedToBuild === key;
                const can = coins >= data.cost;
                const Ico = data.Icon;
                return (
                  <button key={key} onPointerDown={() => can ? setBuildType(isSelected ? null : key as TurretType) : playSound(200, 'sawtooth', 0.05)} className={`shrink-0 w-[100px] h-[90px] rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${isSelected ? 'bg-zinc-800 border-yellow-400 scale-105 shadow-lg' : can ? 'bg-zinc-900 border-white/10' : 'bg-zinc-900 border-white/5 opacity-40 grayscale'}`}>
                    <Ico size={20} style={{ color: data.color }} className={isSelected ? 'animate-bounce' : ''} />
                    <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: data.color }}>{data.name}</span>
                    <div className={`flex items-center gap-1 text-[10px] font-black ${can ? 'text-yellow-500' : 'text-zinc-500'}`}>{data.cost} <Coins size={10} /></div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
