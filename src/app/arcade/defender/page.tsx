'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Play, Coins, Shield, X, ArrowUpCircle,
  Crosshair, Hexagon, Flame, Snowflake, Target, Pause,
  Volume2, VolumeX, FastForward
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DefenderLogo } from '@/components/ArcadeIcons';

// --- ENGINE CONSTANTS ---
const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 420;
const PATH_WIDTH = 30;
const FIXED_DT = 16.667; // 60fps baseline ms

type Waypoint = { x: number; y: number };
type Enemy = {
  id: number; x: number; y: number; hp: number; maxHp: number;
  speed: number; baseSpeed: number; wpIndex: number; type: string;
  color: string; reward: number; slowTimer: number; spawnScale: number;
};
type TurretType = 'blaster' | 'cannon' | 'sniper' | 'cryo' | 'spread';
type Targeting = 'first' | 'closest' | 'strongest';
type Turret = {
  id: number; x: number; y: number; type: TurretType; level: number;
  range: number; damage: number; fireRate: number; cooldown: number;
  angle: number; color: string; targetId: number | null; targeting: Targeting;
};
type Bullet = {
  x: number; y: number; dx: number; dy: number; speed: number;
  damage: number; targetId: number; color: string; type: TurretType; life: number;
};
type Particle = {
  x: number; y: number; dx: number; dy: number; life: number;
  color: string; size: number;
};
type FloatingText = {
  x: number; y: number; text: string; color: string; life: number;
  dy: number; size: number;
};
type Beam = {
  x1: number; y1: number; x2: number; y2: number; life: number; color: string;
};

const TOWER_DATA: Record<TurretType, any> = {
  blaster: { name: 'PULSE', cost: 50, color: '#3b82f6', range: 85, dmg: 12, rate: 22, Icon: Crosshair, desc: 'Fast, reliable damage.' },
  cannon: { name: 'FLAK', cost: 120, color: '#f97316', range: 95, dmg: 40, rate: 70, Icon: Hexagon, desc: 'Explosive area damage.' },
  sniper: { name: 'RAILGUN', cost: 200, color: '#a855f7', range: 250, dmg: 200, rate: 120, Icon: Target, desc: 'Long range, instant hit.' },
  cryo: { name: 'CRYO', cost: 150, color: '#06b6d4', range: 80, dmg: 2, rate: 2, Icon: Snowflake, desc: 'Slows enemies in range.' },
  spread: { name: 'PLASMA', cost: 180, color: '#ec4899', range: 70, dmg: 14, rate: 40, Icon: Flame, desc: 'Triple spread shot.' }
};

const PATH: Waypoint[] = [
  { x: -20, y: 50 }, { x: 280, y: 50 }, { x: 280, y: 150 },
  { x: 60, y: 150 }, { x: 60, y: 270 }, { x: 300, y: 270 },
  { x: 300, y: 370 }, { x: 170, y: 370 }
];

const CORE_POS = PATH[PATH.length - 1];

function distToSegment(p: { x: number; y: number }, v: Waypoint, w: Waypoint) {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2);
}

export default function CoreDefender() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(250);
  const [coreHp, setCoreHp] = useState(20);
  const [wave, setWave] = useState(1);
  const [selectedToBuild, setSelectedToBuild] = useState<TurretType | null>(null);
  const [activeTurretId, setActiveTurretId] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speedMult, setSpeedMult] = useState(1);
  const [bestWave, setBestWave] = useState(0);
  const [uiTick, setUiTick] = useState(0);

  // Refs for game loop (avoid stale closures and unnecessary effect restarts)
  const isRunning = useRef(false);
  const isPausedRef = useRef(false);
  const requestRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const enemies = useRef<Enemy[]>([]);
  const turrets = useRef<Turret[]>([]);
  const bullets = useRef<Bullet[]>([]);
  const particles = useRef<Particle[]>([]);
  const floatingTexts = useRef<FloatingText[]>([]);
  const beams = useRef<Beam[]>([]);
  const frameCount = useRef(0);
  const shakeRef = useRef(0);
  const coinsRef = useRef(250);
  const scoreRef = useRef(0);
  const coreHpRef = useRef(20);
  const waveRef = useRef(1);
  const canvasFlashAlpha = useRef(0);
  const lastTimeRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const waveTimerRef = useRef(900);
  const waveAnnounceTimer = useRef(0);
  const speedRef = useRef(1);
  const soundRef = useRef(true);
  const activeTurretIdRef = useRef<number | null>(null);
  const selectedToBuildRef = useRef<TurretType | null>(null);
  const gameStateRef = useRef<'idle' | 'playing' | 'gameover'>('idle');
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const killStreakRef = useRef(0);
  const lastKillTimeRef = useRef(0);
  const totalKillsRef = useRef(0);

  // Load best wave
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('coreDefender_bestWave');
      if (saved) setBestWave(parseInt(saved));
    }
  }, []);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { activeTurretIdRef.current = activeTurretId; }, [activeTurretId]);
  useEffect(() => { selectedToBuildRef.current = selectedToBuild; }, [selectedToBuild]);
  useEffect(() => { speedRef.current = speedMult; }, [speedMult]);
  useEffect(() => { soundRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
  };

  const playSound = (freq: number, type: OscillatorType = 'sine', vol = 0.1, duration = 0.1) => {
    if (!soundRef.current || !audioCtxRef.current) return;
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

  const addFloatingText = (x: number, y: number, text: string, color: string, size = 14, dy = -0.8) => {
    floatingTexts.current.push({ x, y, text, color, life: 1.0, dy, size });
  };

  const spawnParticles = (x: number, y: number, color: string, amount = 15, speed = 8) => {
    for (let i = 0; i < amount; i++) {
      particles.current.push({
        x, y, dx: (Math.random() - 0.5) * speed, dy: (Math.random() - 0.5) * speed,
        life: 1.0, color, size: Math.random() * 2 + 1
      });
    }
  };

  const handleDeath = (e: Enemy) => {
    const now = performance.now();
    if (now - lastKillTimeRef.current < 2000) {
      killStreakRef.current++;
    } else {
      killStreakRef.current = 1;
    }
    lastKillTimeRef.current = now;

    const streakBonus = killStreakRef.current > 2 ? killStreakRef.current * 2 : 0;
    const totalReward = e.reward + streakBonus;

    coinsRef.current += totalReward;
    setCoins(coinsRef.current);
    scoreRef.current += 1;
    setScore(scoreRef.current);
    totalKillsRef.current += 1;

    spawnParticles(e.x, e.y, e.color, e.type === 'boss' ? 50 : 20, e.type === 'boss' ? 10 : 6);
    playSound(e.type === 'boss' ? 120 : 900, e.type === 'boss' ? 'sawtooth' : 'triangle', 0.06, e.type === 'boss' ? 0.3 : 0.1);

    addFloatingText(e.x, e.y - 10, `+${totalReward}`, '#fbbf24', 12, -1.2);
    if (killStreakRef.current > 2) {
      addFloatingText(e.x, e.y - 25, `COMBO x${killStreakRef.current}`, '#f472b6', 14, -1.5);
    }
  };

  const spawnEnemy = () => {
    const waveMult = 1 + (waveRef.current * 0.22);
    const r = Math.random();
    let type = 'scout'; let hp = 22 * waveMult; let speed = 1.3; let color = '#ef4444'; let reward = 5;

    if (waveRef.current % 10 === 0 && r > 0.9) {
      type = 'boss'; hp = 700 * waveMult; speed = 0.35; color = '#991b1b'; reward = 150;
    } else if (r > 0.8) {
      type = 'tank'; hp = 110 * waveMult; speed = 0.6; color = '#f97316'; reward = 20;
    } else if (r > 0.55) {
      type = 'swarm'; hp = 12 * waveMult; speed = 2.5; color = '#eab308'; reward = 4;
    }
    enemies.current.push({
      id: Math.random(), x: PATH[0].x, y: PATH[0].y, hp, maxHp: hp, speed,
      baseSpeed: speed, wpIndex: 1, type, color, reward, slowTimer: 0, spawnScale: 0
    });
  };

  const getTarget = (t: Turret): Enemy | null => {
    const inRange = enemies.current.filter(e => {
      const dist = Math.sqrt((e.x - t.x) ** 2 + (e.y - t.y) ** 2);
      return dist <= t.range && e.hp > 0;
    });
    if (inRange.length === 0) return null;

    if (t.targeting === 'closest') {
      return inRange.reduce((best, e) => {
        const d = Math.sqrt((e.x - t.x) ** 2 + (e.y - t.y) ** 2);
        const bd = Math.sqrt((best.x - t.x) ** 2 + (best.y - t.y) ** 2);
        return d < bd ? e : best;
      });
    } else if (t.targeting === 'strongest') {
      return inRange.reduce((best, e) => e.hp > best.hp ? e : best);
    } else {
      // First: highest wpIndex, then closest to next waypoint
      return inRange.reduce((best, e) => {
        if (e.wpIndex > best.wpIndex) return e;
        if (e.wpIndex < best.wpIndex) return best;
        const target = PATH[e.wpIndex];
        if (!target) return best;
        const de = Math.sqrt((e.x - target.x) ** 2 + (e.y - target.y) ** 2);
        const db = Math.sqrt((best.x - target.x) ** 2 + (best.y - target.y) ** 2);
        return de < db ? e : best;
      });
    }
  };

  // Main game loop — stable callback, reads only refs
  const update = useCallback(() => {
    if (!isRunning.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const now = performance.now();
    const rawDt = (now - lastTimeRef.current) / FIXED_DT;
    const dt = Math.min(rawDt, 4) * speedRef.current;
    lastTimeRef.current = now;
    frameCount.current += dt;

    if (gameStateRef.current === 'playing' && !isPausedRef.current) {
      // Wave timer
      waveTimerRef.current -= dt;
      if (waveTimerRef.current <= 0) {
        waveRef.current += 1;
        setWave(waveRef.current);
        waveTimerRef.current = 900; // ~15s
        waveAnnounceTimer.current = 90; // 1.5s display
        playSound(440, 'sine', 0.08, 0.6);
        const bonus = 30 + waveRef.current * 15;
        coinsRef.current += bonus;
        setCoins(coinsRef.current);
        addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20, `WAVE ${waveRef.current}`, '#fbbf24', 28, -0.6);
        addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10, `+${bonus} BONUS`, '#34d399', 16, -0.4);
      }

      // Spawn timer
      const spawnRate = Math.max(10, 75 - (waveRef.current * 3));
      spawnTimerRef.current -= dt;
      if (spawnTimerRef.current <= 0) {
        spawnEnemy();
        spawnTimerRef.current = spawnRate;
      }

      // Update enemies
      enemies.current.forEach(e => {
        if (e.spawnScale < 1) e.spawnScale = Math.min(1, e.spawnScale + 0.05 * dt);

        let currentSpeed = e.baseSpeed;
        if (e.slowTimer > 0) { currentSpeed *= 0.4; e.slowTimer -= dt; }

        if (e.wpIndex < PATH.length) {
          const target = PATH[e.wpIndex];
          const dx = target.x - e.x, dy = target.y - e.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < currentSpeed * dt) {
            e.x = target.x; e.y = target.y; e.wpIndex++;
          } else {
            e.x += (dx / dist) * currentSpeed * dt;
            e.y += (dy / dist) * currentSpeed * dt;
          }
          // Trail particles for fast enemies
          if (e.type === 'swarm' && Math.random() < 0.2) {
            particles.current.push({ x: e.x, y: e.y, dx: (Math.random() - 0.5) * 2, dy: (Math.random() - 0.5) * 2, life: 0.5, color: e.color, size: 1 });
          }
        } else if (e.hp > 0) {
          e.hp = 0;
          const dmg = e.type === 'boss' ? 5 : e.type === 'tank' ? 2 : 1;
          coreHpRef.current -= dmg;
          setCoreHp(coreHpRef.current);
          playSound(150, 'sawtooth', 0.15);
          shakeRef.current = 15 + dmg * 2;
          canvasFlashAlpha.current = 0.4;
          spawnParticles(e.x, e.y, e.color, 25);
          addFloatingText(CORE_POS.x, CORE_POS.y - 30, `-${dmg}`, '#ef4444', 18, -1);
          if (coreHpRef.current <= 0) {
            isRunning.current = false;
            setGameState('gameover');
            const saved = parseInt(localStorage.getItem('coreDefender_bestWave') || '0');
            if (waveRef.current > saved) {
              localStorage.setItem('coreDefender_bestWave', String(waveRef.current));
              setBestWave(waveRef.current);
            }
          }
        }
      });

      // Update turrets
      turrets.current.forEach(t => {
        if (t.cooldown > 0) t.cooldown -= dt;
        const target = getTarget(t);
        t.targetId = target ? target.id : null;

        if (target) {
          const targetAngle = Math.atan2(target.y - t.y, target.x - t.x);
          t.angle += (targetAngle - t.angle) * 0.2 * dt;

          if (t.type === 'cryo') {
            target.slowTimer = 40;
            if (t.cooldown <= 0) {
              target.hp -= t.damage;
              t.cooldown = t.fireRate;
              if (target.hp <= 0) handleDeath(target);
            }
          } else if (t.type === 'sniper') {
            if (t.cooldown <= 0) {
              target.hp -= t.damage;
              t.cooldown = t.fireRate;
              playSound(800, 'square', 0.04, 0.15);
              beams.current.push({ x1: t.x, y1: t.y, x2: target.x, y2: target.y, life: 8, color: t.color });
              spawnParticles(target.x, target.y, t.color, 8, 4);
              if (target.hp <= 0) handleDeath(target);
              else addFloatingText(target.x, target.y - 15, String(t.damage), t.color, 14, -1);
            }
          } else if (t.type === 'spread') {
            if (t.cooldown <= 0) {
              const count = t.level >= 3 ? 5 : 3;
              const spread = t.level >= 3 ? 0.4 : 0.3;
              for (let i = 0; i < count; i++) {
                const angleOffset = (i - (count - 1) / 2) * spread;
                const angle = t.angle + angleOffset;
                const bSpeed = 8;
                bullets.current.push({
                  x: t.x + Math.cos(angle) * 15, y: t.y + Math.sin(angle) * 15,
                  dx: Math.cos(angle) * bSpeed, dy: Math.sin(angle) * bSpeed,
                  speed: bSpeed, damage: t.damage, targetId: target.id,
                  color: t.color, type: t.type, life: 100
                });
              }
              t.cooldown = t.fireRate;
              playSound(350, 'square', 0.03);
            }
          } else if (t.cooldown <= 0) {
            const bSpeed = t.type === 'cannon' ? 6 : 9;
            bullets.current.push({
              x: t.x + Math.cos(t.angle) * 15, y: t.y + Math.sin(t.angle) * 15,
              dx: Math.cos(t.angle) * bSpeed, dy: Math.sin(t.angle) * bSpeed,
              speed: bSpeed, damage: t.damage, targetId: target.id,
              color: t.color, type: t.type, life: 120
            });
            t.cooldown = t.fireRate;
            playSound(t.type === 'cannon' ? 300 : 450, 'square', 0.03);
          }
        }
      });

      // Update bullets
      bullets.current.forEach(b => {
        b.x += b.dx * dt;
        b.y += b.dy * dt;
        b.life -= dt;
        enemies.current.forEach(e => {
          if (e.hp > 0 && Math.abs(b.x - e.x) < 14 && Math.abs(b.y - e.y) < 14) {
            e.hp -= b.damage;
            b.life = 0;
            if (b.type === 'cannon') {
              spawnParticles(b.x, b.y, '#f97316', 10, 4);
              enemies.current.forEach(se => {
                if (se.hp > 0 && Math.sqrt((se.x - b.x) ** 2 + (se.y - b.y) ** 2) < 50) {
                  se.hp -= b.damage * 0.5;
                  if (se.hp <= 0) handleDeath(se);
                }
              });
            }
            if (e.hp <= 0) handleDeath(e);
            else if (b.damage > 30) addFloatingText(e.x, e.y - 15, String(b.damage), b.color, 12, -0.8);
          }
        });
      });

      enemies.current = enemies.current.filter(e => e.hp > 0);
      bullets.current = bullets.current.filter(b => b.life > 0);
    }

    // Update particles
    particles.current.forEach(p => {
      p.x += p.dx * dt;
      p.y += p.dy * dt;
      p.life -= 0.035 * dt;
    });
    particles.current = particles.current.filter(p => p.life > 0);

    // Update floating texts
    floatingTexts.current.forEach(ft => {
      ft.y += ft.dy * dt;
      ft.life -= 0.018 * dt;
    });
    floatingTexts.current = floatingTexts.current.filter(ft => ft.life > 0);

    // Update beams
    beams.current.forEach(b => b.life -= dt);
    beams.current = beams.current.filter(b => b.life > 0);

    if (waveAnnounceTimer.current > 0) waveAnnounceTimer.current -= dt;

    // --- RENDERING ---
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Screen shake
    if (shakeRef.current > 0) {
      ctx.save();
      ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
      shakeRef.current *= Math.pow(0.9, dt);
      if (shakeRef.current < 0.5) shakeRef.current = 0;
    }

    // Vignette
    const vig = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 120, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 260);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    for (let i = 0; i < CANVAS_WIDTH; i += 20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke(); }
    for (let i = 0; i < CANVAS_HEIGHT; i += 20) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke(); }

    // Path
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = PATH_WIDTH;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(99, 102, 241, 0.2)';
    ctx.beginPath();
    ctx.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Path arrows
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.lineWidth = 2;
    const arrowGap = 40;
    const flowOffset = (frameCount.current % arrowGap);
    for (let i = 0; i < PATH.length - 1; i++) {
      const start = PATH[i], end = PATH[i + 1];
      const dist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
      const dx = (end.x - start.x) / dist, dy = (end.y - start.y) / dist;
      for (let j = flowOffset; j < dist; j += arrowGap) {
        const ax = start.x + dx * j, ay = start.y + dy * j;
        ctx.beginPath();
        ctx.moveTo(ax - dx * 5 + dy * 3, ay - dy * 5 - dx * 3);
        ctx.lineTo(ax, ay);
        ctx.lineTo(ax - dx * 5 - dy * 3, ay - dy * 5 + dx * 3);
        ctx.stroke();
      }
    }

    // Core
    const corePulse = 20 + Math.sin(frameCount.current * 0.08) * 3;
    ctx.fillStyle = '#4f46e5';
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#6366f1';
    ctx.beginPath();
    ctx.arc(CORE_POS.x, CORE_POS.y, corePulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Core shield ring (depletes with HP)
    const shieldPct = coreHpRef.current / 20;
    ctx.strokeStyle = `rgba(99, 102, 241, ${0.3 * shieldPct})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(CORE_POS.x, CORE_POS.y, corePulse + 8, 0, Math.PI * 2);
    ctx.stroke();

    // Placement preview
    if (selectedToBuildRef.current && mousePosRef.current) {
      const mx = mousePosRef.current.x;
      const my = mousePosRef.current.y;
      const data = TOWER_DATA[selectedToBuildRef.current];

      let invalid = false;
      for (let i = 0; i < PATH.length - 1; i++) {
        if (distToSegment({ x: mx, y: my }, PATH[i], PATH[i + 1]) < (PATH_WIDTH / 2) + 15) invalid = true;
      }
      if (!invalid) invalid = turrets.current.some(t => Math.sqrt((t.x - mx) ** 2 + (t.y - my) ** 2) < 32);

      ctx.globalAlpha = 0.4;
      ctx.fillStyle = invalid ? '#ef4444' : data.color;
      ctx.beginPath(); ctx.arc(mx, my, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = invalid ? '#ef4444' : '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(mx, my, data.range, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Active turret range
    if (activeTurretIdRef.current) {
      const t = turrets.current.find(tr => tr.id === activeTurretIdRef.current);
      if (t) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
    }

    // Turrets
    turrets.current.forEach(t => {
      ctx.save();
      ctx.translate(t.x, t.y);

      // Base ring
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = t.id === activeTurretIdRef.current ? 'white' : t.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // Level pips
      ctx.fillStyle = t.color;
      for (let i = 0; i < t.level; i++) {
        ctx.beginPath();
        ctx.arc(0, -20 - i * 5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.rotate(t.angle);
      ctx.fillStyle = t.color;

      if (t.type === 'blaster') {
        ctx.fillRect(0, -3, 16, 6);
        if (t.level >= 2) ctx.fillRect(0, -5, 12, 10);
      } else if (t.type === 'sniper') {
        ctx.fillRect(0, -2, 24, 4);
        if (t.level >= 3) ctx.fillRect(18, -5, 8, 10);
      } else if (t.type === 'cannon') {
        ctx.fillRect(0, -6, 15, 12);
        if (t.level >= 2) ctx.fillRect(15, -4, 5, 8);
      } else if (t.type === 'cryo') {
        ctx.fillRect(0, -4, 14, 8);
      } else {
        ctx.fillRect(0, -7, 12, 4);
        ctx.fillRect(0, 3, 12, 4);
        if (t.level >= 2) ctx.fillRect(0, -2, 14, 4);
      }
      ctx.restore();

      // Cryo beam (drawn after restore to avoid transform issues)
      if (t.type === 'cryo' && t.targetId) {
        const target = enemies.current.find(en => en.id === t.targetId);
        if (target) {
          ctx.save();
          ctx.strokeStyle = 'rgba(6,182,212,0.6)';
          ctx.lineWidth = t.level * 2.5;
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(6,182,212,0.4)';
          ctx.beginPath();
          ctx.moveTo(t.x, t.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    });

    // Enemies
    enemies.current.forEach(e => {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(e.spawnScale, e.spawnScale);

      ctx.fillStyle = e.slowTimer > 0 ? '#67e8f9' : e.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.fillStyle;

      if (e.type === 'scout') {
        const angle = e.wpIndex < PATH.length ? Math.atan2(PATH[e.wpIndex].y - e.y, PATH[e.wpIndex].x - e.x) : 0;
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-8, 8);
        ctx.lineTo(-8, -8);
        ctx.fill();
      } else if (e.type === 'tank') {
        ctx.fillRect(-12, -12, 24, 24);
      } else if (e.type === 'boss') {
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.fillRect(-8, -8, 16, 16);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.shadowBlur = 0;

      // HP bar
      if (e.hp < e.maxHp) {
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x - 12, e.y - 22, 24, 4);
        ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#22c55e' : e.hp / e.maxHp > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(e.x - 12, e.y - 22, 24 * (e.hp / e.maxHp), 4);
      }
    });

    // Bullets
    bullets.current.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.type === 'cannon' ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Beams
    beams.current.forEach(b => {
      ctx.save();
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = b.life / 8;
      ctx.shadowBlur = 10;
      ctx.shadowColor = b.color;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.restore();
    });

    // Particles
    particles.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Floating texts
    floatingTexts.current.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillStyle = ft.color;
      ctx.font = `900 ${ft.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'black';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    // Wave announcement
    if (waveAnnounceTimer.current > 0) {
      ctx.save();
      const progress = 1 - (waveAnnounceTimer.current / 90);
      ctx.globalAlpha = Math.sin(progress * Math.PI);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#fbbf24';
      ctx.fillText(`WAVE ${waveRef.current}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.restore();
    }

    // Red flash on core damage
    if (canvasFlashAlpha.current > 0) {
      ctx.fillStyle = `rgba(239, 68, 68, ${canvasFlashAlpha.current})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      canvasFlashAlpha.current -= 0.04 * dt;
    }

    if (shakeRef.current > 0) ctx.restore();

    requestRef.current = requestAnimationFrame(update);
  }, []);

  const handleTap = (e: React.PointerEvent) => {
    if (gameState !== 'playing' || isPausedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

    const tapped = turrets.current.find(t => Math.sqrt((t.x - x) ** 2 + (t.y - y) ** 2) < 22);
    if (tapped) {
      setActiveTurretId(tapped.id);
      setSelectedToBuild(null);
      playSound(600, 'sine', 0.03, 0.05);
      return;
    }

    if (!selectedToBuild) {
      setActiveTurretId(null);
      return;
    }

    const data = TOWER_DATA[selectedToBuild];
    if (coinsRef.current < data.cost) {
      playSound(200, 'sawtooth', 0.05, 0.1);
      return;
    }

    let invalid = false;
    for (let i = 0; i < PATH.length - 1; i++) {
      if (distToSegment({ x, y }, PATH[i], PATH[i + 1]) < (PATH_WIDTH / 2) + 15) invalid = true;
    }
    if (!invalid) invalid = turrets.current.some(t => Math.sqrt((t.x - x) ** 2 + (t.y - y) ** 2) < 32);

    if (!invalid) {
      coinsRef.current -= data.cost;
      setCoins(coinsRef.current);
      turrets.current.push({
        id: Math.random(), x, y, type: selectedToBuild, level: 1,
        range: data.range, damage: data.dmg, fireRate: data.rate,
        cooldown: 0, angle: 0, color: data.color, targetId: null, targeting: 'first'
      });
      setSelectedToBuild(null);
      spawnParticles(x, y, data.color, 20, 5);
      playSound(800, 'sine', 0.05, 0.15);
    } else {
      playSound(200, 'sawtooth', 0.05, 0.1);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    mousePosRef.current = { x, y };
  };

  const startNew = () => {
    initAudio();
    isRunning.current = true;
    isPausedRef.current = false;
    setIsPaused(false);
    setGameState('playing');
    enemies.current = [];
    turrets.current = [];
    bullets.current = [];
    particles.current = [];
    floatingTexts.current = [];
    beams.current = [];
    scoreRef.current = 0;
    setScore(0);
    coinsRef.current = 250;
    setCoins(250);
    coreHpRef.current = 20;
    setCoreHp(20);
    waveRef.current = 1;
    setWave(1);
    frameCount.current = 0;
    spawnTimerRef.current = 60;
    waveTimerRef.current = 900;
    killStreakRef.current = 0;
    totalKillsRef.current = 0;
    lastTimeRef.current = performance.now();
  };

  const togglePause = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    const next = !isPausedRef.current;
    isPausedRef.current = next;
    setIsPaused(next);
    if (!next) {
      lastTimeRef.current = performance.now();
    }
  }, []);

  const toggleSpeed = useCallback(() => {
    const next = speedRef.current === 1 ? 2 : 1;
    speedRef.current = next;
    setSpeedMult(next);
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      isRunning.current = true;
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(update);
    } else {
      isRunning.current = false;
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, update]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveTurretId(null);
        setSelectedToBuild(null);
      }
      if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        togglePause();
      }
      if (e.key === '1') setSelectedToBuild(prev => prev === 'blaster' ? null : 'blaster');
      if (e.key === '2') setSelectedToBuild(prev => prev === 'cannon' ? null : 'cannon');
      if (e.key === '3') setSelectedToBuild(prev => prev === 'sniper' ? null : 'sniper');
      if (e.key === '4') setSelectedToBuild(prev => prev === 'cryo' ? null : 'cryo');
      if (e.key === '5') setSelectedToBuild(prev => prev === 'spread' ? null : 'spread');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePause]);

  const handleBack = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (document.fullscreenElement) document.exitFullscreen();
    isRunning.current = false;
    cancelAnimationFrame(requestRef.current);
    router.back();
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#050508] text-white flex flex-col items-center pt-6 overflow-hidden select-none touch-none overscroll-none transition-colors duration-200">
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="w-full max-w-md px-4 flex flex-col h-full relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <button onClick={handleBack} className="p-2 bg-zinc-900 rounded-xl border border-white/10 active:scale-90 transition-all shadow-sm">
            <ChevronLeft size={20} />
          </button>

          <div className="flex gap-2 items-center">
            {gameState === 'playing' && (
              <>
                <button onClick={togglePause} className="p-2 bg-zinc-900 rounded-xl border border-white/10 active:scale-90 transition-all shadow-sm">
                  {isPaused ? <Play size={18} /> : <Pause size={18} />}
                </button>
                <button
                  onClick={toggleSpeed}
                  className={`p-2 rounded-xl border active:scale-90 transition-all shadow-sm ${speedMult === 2 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' : 'bg-zinc-900 border-white/10'}`}
                >
                  <FastForward size={18} />
                </button>
              </>
            )}
            <div className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-sm">
              <Coins size={14} className="text-yellow-500" />
              <span className="text-lg font-black italic text-yellow-500">{coins}</span>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-sm">
              <Shield size={14} className="text-indigo-400" />
              <span className="text-lg font-black italic text-indigo-400">{coreHp}</span>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div
          onPointerDown={handleTap}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => { mousePosRef.current = null; }}
          className={`relative w-full aspect-[34/42] bg-[#020205] rounded-3xl border-2 transition-all duration-500 overflow-hidden shadow-2xl ${gameState === 'gameover' ? 'border-red-500' : selectedToBuild ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.2)]' : 'border-white/10'}`}
          style={{ touchAction: 'none' }}
        >
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full block" />

          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <DefenderLogo className="w-20 h-20 text-indigo-500 mb-6 animate-pulse" />
              <div className="text-center mb-6">
                <h1 className="text-2xl font-black italic uppercase tracking-widest text-white mb-1">Core Defender</h1>
                {bestWave > 0 && <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Best Wave: {bestWave}</p>}
              </div>
              <button onPointerDown={startNew} className="px-10 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-full shadow-lg active:scale-95 transition-all hover:bg-indigo-500">
                Defend Core
              </button>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              </div>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center z-20 p-6 text-center">
              <h2 className="text-3xl font-black italic uppercase text-white mb-1">Grid Offline</h2>
              <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Survived till Wave {wave}</p>
              <p className="text-sm text-zinc-300 mb-6">Total Kills: {totalKillsRef.current}</p>
              {wave >= bestWave && <p className="text-sm text-yellow-400 font-bold mb-6 animate-bounce">NEW BEST WAVE!</p>}
              <button onPointerDown={startNew} className="px-10 py-4 bg-white text-red-600 font-black uppercase tracking-widest rounded-full shadow-xl active:scale-95 transition-all hover:scale-105">
                Re-Initialize
              </button>
            </div>
          )}

          {gameState === 'playing' && isPaused && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <h2 className="text-2xl font-black italic uppercase text-white mb-6 tracking-widest">Paused</h2>
              <div className="flex gap-3">
                <button onPointerDown={togglePause} className="px-8 py-3 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-full shadow-lg active:scale-95">
                  Resume
                </button>
                <button onPointerDown={startNew} className="px-8 py-3 bg-zinc-800 text-white font-black uppercase tracking-widest rounded-full shadow-lg active:scale-95">
                  Restart
                </button>
              </div>
            </div>
          )}

          {gameState === 'playing' && !isPaused && (
            <div className="absolute top-4 right-4 bg-black/40 border border-white/10 rounded-lg px-3 py-1 font-black italic text-[10px] text-white uppercase flex items-center gap-2">
              <span>Wave {wave}</span>
              {speedMult === 2 && <span className="text-yellow-400">2x</span>}
            </div>
          )}
        </div>

        {/* Bottom Panel */}
        <div className="mt-4 mb-auto w-full h-[120px] flex flex-col justify-center">
          {activeTurretId ? (
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-xl">
              {(() => {
                const t = turrets.current.find(tr => tr.id === activeTurretId);
                if (!t) return null;
                const data = TOWER_DATA[t.type];
                const upCost = Math.floor(data.cost * t.level * 1.5);
                const sellValue = Math.floor(data.cost * 0.5 * t.level);
                return (
                  <>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <data.Icon size={16} style={{ color: data.color }} />
                        <span className="text-[13px] font-black uppercase" style={{ color: data.color }}>{data.name} LVL {t.level}</span>
                      </div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">{data.desc}</div>
                      <div className="flex gap-2 mt-1">
                        <button
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const tIndex = turrets.current.findIndex(tr => tr.id === activeTurretId);
                            if (tIndex !== -1) {
                              const turret = turrets.current[tIndex];
                              coinsRef.current += Math.floor(TOWER_DATA[turret.type].cost * 0.5 * turret.level);
                              setCoins(coinsRef.current);
                              turrets.current.splice(tIndex, 1);
                              setActiveTurretId(null);
                              spawnParticles(turret.x, turret.y, turret.color, 20);
                              playSound(400, 'sine', 0.05, 0.15);
                              addFloatingText(turret.x, turret.y, `+${sellValue}`, '#fbbf24', 14, -1);
                            }
                          }}
                          className="px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[9px] font-black uppercase active:scale-95 hover:bg-red-500/20 transition-colors"
                        >
                          Sell +{sellValue}
                        </button>
                        <button
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const modes: Targeting[] = ['first', 'closest', 'strongest'];
                            const idx = modes.indexOf(t.targeting);
                            t.targeting = modes[(idx + 1) % modes.length];
                            setUiTick(v => v + 1);
                          }}
                          className="px-3 py-1.5 bg-zinc-800 text-zinc-400 border border-white/10 rounded-lg text-[9px] font-black uppercase active:scale-95 hover:text-white transition-colors"
                        >
                          {t.targeting}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.level < 3 ? (
                        <button
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const turret = turrets.current.find(tr => tr.id === activeTurretId);
                            if (turret && coinsRef.current >= upCost) {
                              coinsRef.current -= upCost;
                              setCoins(coinsRef.current);
                              turret.level++;
                              turret.damage = Math.floor(turret.damage * 1.6);
                              turret.range = Math.floor(turret.range * 1.15);
                              playSound(1000, 'sine', 0.1, 0.2);
                              spawnParticles(turret.x, turret.y, '#ffffff', 25, 6);
                              addFloatingText(turret.x, turret.y - 20, 'UPGRADED!', '#fff', 16, -1.5);
                            } else {
                              playSound(200, 'sawtooth', 0.05, 0.1);
                            }
                          }}
                          className={`px-4 py-3 rounded-xl flex items-center gap-2 font-black uppercase text-[10px] active:scale-95 transition-all ${coins >= upCost ? 'bg-emerald-600 text-white shadow-lg hover:bg-emerald-500' : 'bg-zinc-800 text-zinc-500 grayscale'}`}
                        >
                          <ArrowUpCircle size={16} /> {upCost}
                        </button>
                      ) : (
                        <div className="px-4 py-3 rounded-xl bg-zinc-800 text-zinc-500 font-black uppercase text-[10px]">
                          MAX
                        </div>
                      )}
                      <button onPointerDown={() => setActiveTurretId(null)} className="p-3 bg-zinc-800 text-zinc-400 rounded-xl active:scale-95 hover:text-white transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar w-full">
              {Object.entries(TOWER_DATA).map(([key, data]) => {
                const isSelected = selectedToBuild === key;
                const can = coins >= data.cost;
                const Ico = data.Icon;
                return (
                  <button
                    key={key}
                    onPointerDown={() => can ? setSelectedToBuild(isSelected ? null : key as TurretType) : playSound(200, 'sawtooth', 0.05, 0.1)}
                    className={`shrink-0 w-[100px] h-[100px] rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all relative ${isSelected ? 'bg-zinc-800 border-yellow-400 scale-105 shadow-lg shadow-yellow-400/10' : can ? 'bg-zinc-900 border-white/10 hover:border-white/30' : 'bg-zinc-900 border-white/5 opacity-40 grayscale'}`}
                  >
                    <Ico size={22} style={{ color: data.color }} className={isSelected ? 'animate-bounce' : ''} />
                    <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: data.color }}>{data.name}</span>
                    <div className={`flex items-center gap-1 text-[10px] font-black ${can ? 'text-yellow-500' : 'text-zinc-500'}`}>
                      <Coins size={10} /> {data.cost}
                    </div>
                    <div className="text-[8px] text-zinc-500 text-center px-2 leading-tight">{data.desc}</div>
                    <div className="absolute top-1 right-1 text-[8px] font-black text-zinc-600 bg-zinc-800 rounded px-1">
                      {key === 'blaster' ? '1' : key === 'cannon' ? '2' : key === 'sniper' ? '3' : key === 'cryo' ? '4' : '5'}
                    </div>
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
