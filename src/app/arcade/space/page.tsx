'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Trophy, Play, Pause, RotateCcw, Zap, Loader2, Shield,
  Crosshair, Heart, Sparkles, Bomb, Gauge, Star
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SpaceLogo } from '@/components/ArcadeIcons';
import { motion, AnimatePresence } from 'framer-motion';

// --- GAME CONSTANTS ---
const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 480;
const PLAYER_SIZE = 28;
const BULLET_SPEED = 9;
const MAX_HP = 5;
const FIXED_DT = 16.667;

type Entity = { 
  id: number, x: number, y: number, w: number, h: number, 
  hp: number, maxHp: number, type: string, color: string, 
  shootCooldown: number, hitTimer: number, angle: number, 
  phase: number, moveTimer: number, targetX: number, targetY: number 
};
type Bullet = { 
  x: number, y: number, dx: number, dy: number, 
  owner: 'player' | 'enemy', color: string, size: number, pierce: boolean 
};
type Particle = { 
  x: number, y: number, dx: number, dy: number, 
  life: number, color: string, size: number, drag: number 
};
type PowerUp = { 
  id: number, x: number, y: number, 
  type: 'weapon' | 'health' | 'shield' | 'speed' | 'score' | 'bomb', 
  collected: boolean, bobOffset: number 
};
type FloatingText = { x: number, y: number, text: string, color: string, life: number, size: number };
type StarField = { x: number, y: number, size: number, speed: number, brightness: number };

export default function StarshipAltu() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State (React render only)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [weaponLevel, setWeaponLevel] = useState(1);
  const [hp, setHp] = useState(MAX_HP);
  const [combo, setCombo] = useState(0);
  const [bossName, setBossName] = useState<string | null>(null);
  const [bossHpPct, setBossHpPct] = useState(0);
  const [showBossWarn, setShowBossWarn] = useState(false);

  // Refs (game loop source of truth)
  const player = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60, w: PLAYER_SIZE, h: PLAYER_SIZE });
  const hpRef = useRef(MAX_HP);
  const scoreRef = useRef(0);
  const weaponRef = useRef(1);
  const comboRef = useRef(0);
  const lastKillRef = useRef(0);
  
  // Timers and Buffs
  const multiplierRef = useRef(1);
  const multiplierTimerRef = useRef(0);
  const speedBoostRef = useRef(1);
  const speedBoostTimerRef = useRef(0);
  const shieldRef = useRef(false);
  const shieldTimerRef = useRef(0);
  const isInvulnRef = useRef(false);
  const invulnTimerRef = useRef(0);
  
  const enemies = useRef<Entity[]>([]);
  const bullets = useRef<Bullet[]>([]);
  const particles = useRef<Particle[]>([]);
  const powerUps = useRef<PowerUp[]>([]);
  const floatingTexts = useRef<FloatingText[]>([]);
  const stars = useRef<StarField[]>([]);
  
  const frameCount = useRef(0);
  const lastTimeRef = useRef(0);
  const shakeRef = useRef(0);
  const hitstopRef = useRef(0);
  const requestRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gameStateRef = useRef<'idle' | 'playing' | 'gameover'>('idle');
  const isPausedRef = useRef(false);
  const isRunning = useRef(false);
  
  const bossActiveRef = useRef(false);
  const nextBossScoreRef = useRef(500);
  const warnTimerRef = useRef(0);
  const spawnTimerRef = useRef(0);

  // Sync state ref
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Init stars
  useEffect(() => {
    stars.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 1.5 + 0.3,
      brightness: Math.random() * 0.5 + 0.5
    }));
    const saved = localStorage.getItem('spaceHS');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // --- FULLSCREEN ---
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

  const handleBack = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    exitFullscreen();
    isRunning.current = false;
    cancelAnimationFrame(requestRef.current);
    router.back();
  };

  // --- AUDIO ---
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
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
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color: string, size = 14) => {
    floatingTexts.current.push({ x, y, text, color, life: 1.0, size });
  };

  const createExplosion = (x: number, y: number, color: string, amount = 12, speed = 6) => {
    for (let i = 0; i < amount; i++) {
      const angle = (Math.PI * 2 * i) / amount + Math.random() * 0.5;
      const spd = speed * (0.5 + Math.random());
      particles.current.push({
        x, y,
        dx: Math.cos(angle) * spd,
        dy: Math.sin(angle) * spd,
        life: 1.0,
        color,
        size: Math.random() * 3 + 1,
        drag: 0.98
      });
    }
  };

  const createShockwave = (x: number, y: number, color: string) => {
    for (let i = 0; i < 3; i++) {
      particles.current.push({
        x, y, dx: 0, dy: 0, life: 0.6,
        color, size: 5 + i * 3, drag: 1
      });
    }
  };

  // --- SUPABASE SYNC ---
  const handleSyncScore = useCallback(async () => {
    const studentId = localStorage.getItem('studentId');
    if (studentId && scoreRef.current > 0) {
      setIsSyncing(true);
      try {
        const { data: existing } = await supabase
          .from('arcade_scores')
          .select('*')
          .eq('student_id', studentId)
          .eq('game_name', 'space')
          .maybeSingle();
        if (!existing) {
          await supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'space', score: scoreRef.current }]);
        } else if (scoreRef.current > existing.score) {
          await supabase.from('arcade_scores').update({ score: scoreRef.current }).eq('id', existing.id);
        }
      } catch (e) {}
      setIsSyncing(false);
    }
  }, []);

  const handleGameOver = useCallback(() => {
    isRunning.current = false;
    gameStateRef.current = 'gameover';
    setGameState('gameover');
    createExplosion(player.current.x, player.current.y, '#22d3ee', 50, 10);
    createShockwave(player.current.x, player.current.y, '#22d3ee');
    playSound(80, 'sawtooth', 0.25, 1.0);
    vibrate([200, 100, 200, 100, 400]);

    if (scoreRef.current > highScore) {
      const newHigh = scoreRef.current;
      setHighScore(newHigh);
      localStorage.setItem('spaceHS', newHigh.toString());
    }

    setTimeout(() => handleSyncScore(), 500);
  }, [highScore, handleSyncScore]);

  const damagePlayer = useCallback(() => {
    if (isInvulnRef.current || gameStateRef.current !== 'playing') return;
    
    if (shieldRef.current) {
      shieldRef.current = false;
      shieldTimerRef.current = 0;
      playSound(300, 'square', 0.08, 0.3);
      createExplosion(player.current.x + PLAYER_SIZE/2, player.current.y + PLAYER_SIZE/2, '#60a5fa', 15);
      addFloatingText(player.current.x, player.current.y - 20, 'SHIELD BREAK!', '#60a5fa', 12);
      return;
    }

    hpRef.current -= 1;
    setHp(hpRef.current);
    shakeRef.current = 20;
    isInvulnRef.current = true;
    invulnTimerRef.current = 90; 
    
    playSound(150, 'square', 0.12, 0.4);
    createExplosion(player.current.x + PLAYER_SIZE/2, player.current.y + PLAYER_SIZE/2, '#ef4444', 15, 5);
    vibrate(150);
    addFloatingText(player.current.x, player.current.y - 20, '-1 HP', '#ef4444', 14);

    if (weaponRef.current > 1) {
      weaponRef.current -= 1;
      setWeaponLevel(weaponRef.current);
    }

    if (hpRef.current <= 0) handleGameOver();
  }, [handleGameOver]);

  const spawnEnemy = useCallback(() => {
    if (bossActiveRef.current) return;
    
    const r = Math.random();
    const difficulty = scoreRef.current / 1000;
    let type = 'scout'; let color = '#f43f5e'; let hp = 1; let w = 24; let h = 24;
    let shootCd = 60;

    if (r > 0.85 && difficulty > 0.5) {
      type = 'bomber'; color = '#ef4444'; hp = 2; w = 28; h = 28; shootCd = 80;
    } else if (r > 0.65 && difficulty > 0.3) {
      type = 'interceptor'; color = '#06b6d4'; hp = 1; w = 22; h = 22; shootCd = 35;
    } else if (r > 0.45 && difficulty > 0.8) {
      type = 'tank'; color = '#fb923c'; hp = 5; w = 38; h = 38; shootCd = 100;
    } else if (r > 0.25 && difficulty > 1.2) {
      type = 'hunter'; color = '#a855f7'; hp = 3; w = 30; h = 30; shootCd = 70;
    }

    enemies.current.push({
      id: Math.random(),
      x: Math.random() * (CANVAS_WIDTH - w),
      y: -h, w, h, hp, maxHp: hp, type, color,
      shootCooldown: Math.random() * 30 + shootCd,
      hitTimer: 0, angle: 0, phase: 0, moveTimer: 0,
      targetX: 0, targetY: 0
    });
  }, []);

  const spawnBoss = useCallback(() => {
    const s = scoreRef.current;
    let type = 'boss_destroyer'; let color = '#dc2626'; let hp = 80; let w = 60; let h = 60;
    let name = 'STAR DESTROYER';
    
    if (s >= 3000) {
      type = 'boss_dreadnought'; color = '#7c3aed'; hp = 200; w = 80; h = 80;
      name = 'VOID DREADNOUGHT';
    } else if (s >= 1500) {
      type = 'boss_cruiser'; color = '#ea580c'; hp = 120; w = 70; h = 70;
      name = 'SOLAR CRUISER';
    }

    bossActiveRef.current = true;
    setBossName(name);
    setBossHpPct(100);
    setShowBossWarn(true);
    warnTimerRef.current = 180;
    
    setTimeout(() => {
      enemies.current.push({
        id: Math.random(),
        x: CANVAS_WIDTH / 2 - w / 2,
        y: -h - 20, w, h, hp, maxHp: hp,
        type, color, shootCooldown: 40,
        hitTimer: 0, angle: 0, phase: 0, moveTimer: 0,
        targetX: CANVAS_WIDTH / 2, targetY: 80
      });
      setShowBossWarn(false);
      playSound(200, 'sawtooth', 0.15, 0.5);
    }, 2000);
  }, []);

  const firePlayer = useCallback(() => {
    const p = player.current;
    const w = weaponRef.current;
    const spd = BULLET_SPEED * speedBoostRef.current;
    const baseColor = speedBoostRef.current > 1 ? '#fbbf24' : '#22d3ee';

    if (w === 1) {
      bullets.current.push({ x: p.x + p.w / 2, y: p.y, dx: 0, dy: -spd, owner: 'player', color: baseColor, size: 2, pierce: false });
    } else if (w === 2) {
      bullets.current.push({ x: p.x + 4, y: p.y + 8, dx: 0, dy: -spd, owner: 'player', color: baseColor, size: 2, pierce: false });
      bullets.current.push({ x: p.x + p.w - 4, y: p.y + 8, dx: 0, dy: -spd, owner: 'player', color: baseColor, size: 2, pierce: false });
    } else if (w === 3) {
      bullets.current.push({ x: p.x + p.w / 2, y: p.y, dx: 0, dy: -spd, owner: 'player', color: baseColor, size: 3, pierce: false });
      bullets.current.push({ x: p.x + 2, y: p.y + 10, dx: -1.5, dy: -spd * 0.95, owner: 'player', color: '#67e8f9', size: 2, pierce: false });
      bullets.current.push({ x: p.x + p.w - 2, y: p.y + 10, dx: 1.5, dy: -spd * 0.95, owner: 'player', color: '#67e8f9', size: 2, pierce: false });
    } else if (w === 4) {
      for (let i = -2; i <= 2; i++) {
        bullets.current.push({
          x: p.x + p.w / 2, y: p.y,
          dx: i * 1.2, dy: -spd,
          owner: 'player', color: i === 0 ? baseColor : '#a5f3fc',
          size: 2, pierce: false
        });
      }
    } else {
      bullets.current.push({ x: p.x + p.w / 2, y: p.y, dx: 0, dy: -spd, owner: 'player', color: '#f472b6', size: 4, pierce: true });
      bullets.current.push({ x: p.x + 2, y: p.y + 10, dx: -2, dy: -spd * 0.9, owner: 'player', color: '#f472b6', size: 3, pierce: true });
      bullets.current.push({ x: p.x + p.w - 2, y: p.y + 10, dx: 2, dy: -spd * 0.9, owner: 'player', color: '#f472b6', size: 3, pierce: true });
    }
    playSound(400 + w * 50, 'square', 0.025, 0.06);
  }, []);

  const draw = useCallback(() => {
    if (!isRunning.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const now = performance.now();
    const rawDt = (now - lastTimeRef.current) / FIXED_DT;
    const dt = Math.min(rawDt, 3);
    lastTimeRef.current = now;
    frameCount.current += dt;

    if (hitstopRef.current > 0) {
      hitstopRef.current -= dt;
      requestRef.current = requestAnimationFrame(draw);
      return;
    }

    if (gameStateRef.current === 'playing' && !isPausedRef.current) {
      if (invulnTimerRef.current > 0) {
        invulnTimerRef.current -= dt;
        if (invulnTimerRef.current <= 0) isInvulnRef.current = false;
      }
      if (shieldTimerRef.current > 0) {
        shieldTimerRef.current -= dt;
        if (shieldTimerRef.current <= 0) shieldRef.current = false;
      }
      if (speedBoostTimerRef.current > 0) {
        speedBoostTimerRef.current -= dt;
        if (speedBoostTimerRef.current <= 0) speedBoostRef.current = 1;
      }
      if (multiplierTimerRef.current > 0) {
        multiplierTimerRef.current -= dt;
        if (multiplierTimerRef.current <= 0) multiplierRef.current = 1;
      }
      if (warnTimerRef.current > 0) warnTimerRef.current -= dt;

      if (!bossActiveRef.current && scoreRef.current >= nextBossScoreRef.current) {
        spawnBoss();
        nextBossScoreRef.current += scoreRef.current < 1500 ? 1000 : scoreRef.current < 3000 ? 1500 : 2000;
      }

      const baseSpawnRate = bossActiveRef.current ? 99999 : Math.max(15, 50 - scoreRef.current / 80);
      spawnTimerRef.current -= dt;
      if (spawnTimerRef.current <= 0) {
        spawnEnemy();
        spawnTimerRef.current = baseSpawnRate;
      }

      const fireRate = speedBoostRef.current > 1 ? 8 : 10;
      if (Math.floor(frameCount.current) % fireRate === 0 && hpRef.current > 0) firePlayer();

      const p = player.current;
      
      enemies.current.forEach(e => {
        e.moveTimer += dt;
        const speed = (2 + scoreRef.current / 1000) * (e.type.includes('boss') ? 0.4 : 1) * (e.type === 'tank' ? 0.5 : e.type === 'hunter' ? 0.7 : 1);

        if (e.type === 'boss_destroyer') {
          e.targetX = CANVAS_WIDTH / 2 + Math.sin(e.moveTimer * 0.02) * 100;
          e.x += (e.targetX - e.x) * 0.02 * dt;
          e.y += (e.targetY - e.y) * 0.01 * dt;
          if (e.y < 60) e.y += 0.5 * dt;
          e.shootCooldown -= dt;
          if (e.shootCooldown <= 0) {
            for (let i = -1; i <= 1; i++) {
              bullets.current.push({ x: e.x + e.w / 2, y: e.y + e.h, dx: i * 2, dy: 4, owner: 'enemy', color: e.color, size: 4, pierce: false });
            }
            e.shootCooldown = 50;
          }
        } else if (e.type === 'boss_cruiser') {
          e.x = CANVAS_WIDTH / 2 + Math.sin(e.moveTimer * 0.025) * 120;
          e.y = 80 + Math.sin(e.moveTimer * 0.05) * 40;
          e.shootCooldown -= dt;
          if (e.shootCooldown <= 0) {
            const angle = Math.atan2(p.y - e.y, p.x - e.x);
            bullets.current.push({ x: e.x + e.w / 2, y: e.y + e.h, dx: Math.cos(angle) * 5, dy: Math.sin(angle) * 5, owner: 'enemy', color: e.color, size: 5, pierce: false });
            for (let i = -2; i <= 2; i++) {
              if (i === 0) continue;
              bullets.current.push({ x: e.x + e.w / 2, y: e.y + e.h, dx: Math.cos(angle + i * 0.3) * 4, dy: Math.sin(angle + i * 0.3) * 4, owner: 'enemy', color: '#fb923c', size: 3, pierce: false });
            }
            e.shootCooldown = 45;
          }
        } else if (e.type === 'boss_dreadnought') {
          const phase = Math.floor(e.moveTimer / 300) % 3; e.phase = phase;
          if (phase === 0) {
            e.x += (CANVAS_WIDTH / 2 - e.w / 2 - e.x) * 0.02 * dt; e.y += (60 - e.y) * 0.01 * dt;
            e.shootCooldown -= dt;
            if (e.shootCooldown <= 0) {
              const angle = Math.atan2(p.y - e.y, p.x - e.x);
              for (let i = 0; i < 8; i++) {
                const a = angle + (i / 8) * Math.PI * 2;
                bullets.current.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, dx: Math.cos(a) * 3, dy: Math.sin(a) * 3, owner: 'enemy', color: e.color, size: 4, pierce: false });
              }
              e.shootCooldown = 60;
            }
          } else if (phase === 1) {
            e.x += Math.sin(e.moveTimer * 0.03) * 3 * dt; e.shootCooldown -= dt;
            if (e.shootCooldown <= 0) {
              bullets.current.push({ x: e.x + e.w / 2, y: e.y + e.h, dx: 0, dy: 6, owner: 'enemy', color: '#ef4444', size: 6, pierce: false });
              e.shootCooldown = 20;
            }
          } else {
            e.y += 2 * dt; if (e.y > 200) e.y -= 4 * dt; e.shootCooldown -= dt;
            if (e.shootCooldown <= 0) {
              bullets.current.push({ x: e.x + e.w / 2, y: e.y + e.h, dx: (Math.random() - 0.5) * 4, dy: 5, owner: 'enemy', color: '#fbbf24', size: 4, pierce: false });
              e.shootCooldown = 15;
            }
          }
        } else {
          e.y += speed * dt;
          if (e.type === 'hunter') { e.x += Math.sin(frameCount.current * 0.03 + e.id * 10) * 2.5 * dt; e.x = Math.max(0, Math.min(CANVAS_WIDTH - e.w, e.x)); }
          else if (e.type === 'interceptor') { e.x += Math.sin(frameCount.current * 0.08) * 3 * dt; }
          else if (e.type === 'bomber') { e.y += speed * 0.6 * dt; }
        }

        if (!e.type.includes('boss')) {
          e.shootCooldown -= dt;
          if (e.shootCooldown <= 0 && e.y > 0 && e.y < CANVAS_HEIGHT - 100) {
            if (e.type === 'tank') { bullets.current.push({ x: e.x + e.w / 2, y: e.y + e.h, dx: 0, dy: 4.5, owner: 'enemy', color: e.color, size: 5, pierce: false }); e.shootCooldown = 90; }
            else if (e.type === 'hunter') { const angle = Math.atan2(p.y - e.y, p.x - e.x); bullets.current.push({ x: e.x + e.w / 2, y: e.y + e.h, dx: Math.cos(angle) * 4.5, dy: Math.sin(angle) * 4.5, owner: 'enemy', color: e.color, size: 4, pierce: false }); e.shootCooldown = 70; }
            else if (e.type === 'interceptor') { bullets.current.push({ x: e.x + e.w / 2, y: e.y + e.h, dx: 0, dy: 5.5, owner: 'enemy', color: e.color, size: 3, pierce: false }); e.shootCooldown = 35; }
            else if (e.type === 'bomber') { bullets.current.push({ x: e.x + e.w / 2, y: e.y + e.h, dx: 0, dy: 3.5, owner: 'enemy', color: '#ef4444', size: 6, pierce: false }); e.shootCooldown = 80; }
          }
        }

        if (hpRef.current > 0 && !isInvulnRef.current) {
          const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
          const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
          const dist = Math.sqrt((cx - pcx) ** 2 + (cy - pcy) ** 2);
          if (dist < (e.w + p.w) / 2 * 0.7) { e.hp = 0; damagePlayer(); createExplosion(cx, cy, e.color, 20); }
        }
      });

      bullets.current.forEach(b => {
        b.x += b.dx * dt; b.y += b.dy * dt;
        if (b.owner === 'player') {
          enemies.current.forEach(e => {
            if (e.hp > 0 && b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
              if (!b.pierce) b.dy = 1000;
              e.hp -= 1; e.hitTimer = 4;
              if (e.type.includes('boss')) { hitstopRef.current = 3; shakeRef.current = 5; setBossHpPct((e.hp / e.maxHp) * 100); }
              playSound(350, 'triangle', 0.04, 0.08);
              if (e.hp <= 0) {
                const now = Date.now();
                if (now - lastKillRef.current < 2000) { comboRef.current = Math.min(comboRef.current + 1, 20); } else { comboRef.current = 1; }
                lastKillRef.current = now; setCombo(comboRef.current);
                const baseScore = e.type.includes('boss') ? 500 : e.maxHp * 10;
                const comboBonus = Math.floor(baseScore * (comboRef.current * 0.1));
                const totalScore = (baseScore + comboBonus) * multiplierRef.current;
                scoreRef.current += totalScore; setScore(scoreRef.current);
                createExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color, e.maxHp * 10, 7); createShockwave(e.x + e.w / 2, e.y + e.h / 2, e.color);
                if (e.type.includes('boss')) { bossActiveRef.current = false; setBossName(null); setBossHpPct(0); shakeRef.current = 30; hitstopRef.current = 15; spawnTimerRef.current = 60; playSound(150, 'sawtooth', 0.2, 0.8); addFloatingText(e.x + e.w / 2, e.y, `BOSS DEFEATED! +${totalScore}`, '#fbbf24', 20); }
                else { playSound(600, 'square', 0.08, 0.15); addFloatingText(e.x + e.w / 2, e.y, `+${totalScore}`, '#fbbf24', 14); if (comboRef.current > 1) { addFloatingText(e.x + e.w / 2, e.y - 15, `COMBO x${comboRef.current}`, '#e879f9', 12); } }
                if (Math.random() > 0.88) {
                  const types: PowerUp['type'][] = ['weapon', 'health', 'shield', 'speed', 'score', 'bomb'];
                  powerUps.current.push({ id: Math.random(), x: e.x + e.w / 2, y: e.y + e.h / 2, type: types[Math.floor(Math.random() * types.length)], collected: false, bobOffset: Math.random() * Math.PI * 2 });
                }
              }
            }
          });
        } else {
          const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
          if (Math.abs(b.x - pcx) < 14 && Math.abs(b.y - pcy) < 14) { b.dy = 1000; damagePlayer(); }
        }
      });

      powerUps.current.forEach(pu => {
        pu.y += 2 * dt; pu.bobOffset += 0.05 * dt;
        const bob = Math.sin(pu.bobOffset) * 3;
        const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
        if (Math.abs(pu.x - pcx) < 22 && Math.abs(pu.y + bob - pcy) < 22 && !pu.collected) {
          pu.collected = true; playSound(800, 'sine', 0.1, 0.25); vibrate(40);
          switch (pu.type) {
            case 'weapon': weaponRef.current = Math.min(5, weaponRef.current + 1); setWeaponLevel(weaponRef.current); addFloatingText(pu.x, pu.y, 'WEAPON UP!', '#22d3ee', 16); break;
            case 'health': hpRef.current = Math.min(MAX_HP, hpRef.current + 1); setHp(hpRef.current); addFloatingText(pu.x, pu.y, '+HP', '#10b981', 16); break;
            case 'shield': shieldRef.current = true; shieldTimerRef.current = 600; addFloatingText(pu.x, pu.y, 'SHIELD!', '#60a5fa', 16); break;
            case 'speed': speedBoostRef.current = 1.5; speedBoostTimerRef.current = 300; addFloatingText(pu.x, pu.y, 'SPEED!', '#fbbf24', 16); break;
            case 'score': multiplierRef.current = 2; multiplierTimerRef.current = 300; addFloatingText(pu.x, pu.y, '2x SCORE!', '#f472b6', 16); break;
            case 'bomb': enemies.current.forEach(e => { if (!e.type.includes('boss')) { createExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color, 15); scoreRef.current += e.maxHp * 5; } }); enemies.current = enemies.current.filter(e => e.type.includes('boss')); addFloatingText(pcx, pcy - 30, 'BOMB!', '#ef4444', 20); shakeRef.current = 25; playSound(200, 'sawtooth', 0.15, 0.5); break;
          }
        }
      });
      enemies.current = enemies.current.filter(e => e.hp > 0 && e.y < CANVAS_HEIGHT + 50);
      bullets.current = bullets.current.filter(b => b.y > -20 && b.y < CANVAS_HEIGHT + 20 && b.x > -20 && b.x < CANVAS_WIDTH + 20);
      powerUps.current = powerUps.current.filter(pu => !pu.collected && pu.y < CANVAS_HEIGHT);
    }

    particles.current.forEach(p => { p.x += p.dx * dt; p.y += p.dy * dt; p.dx *= p.drag; p.dy *= p.drag; p.life -= 0.025 * dt; if (p.drag === 1) p.size += 0.5 * dt; });
    particles.current = particles.current.filter(p => p.life > 0);
    floatingTexts.current.forEach(ft => { ft.y -= 0.8 * dt; ft.life -= 0.015 * dt; });
    floatingTexts.current = floatingTexts.current.filter(ft => ft.life > 0);

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#020205'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    stars.current.forEach(s => {
      const spd = s.speed * (1 + scoreRef.current / 5000); s.y += spd * dt;
      if (s.y > CANVAS_HEIGHT) { s.y = 0; s.x = Math.random() * CANVAS_WIDTH; }
      ctx.globalAlpha = s.brightness * (0.5 + Math.sin(frameCount.current * 0.01 + s.x) * 0.5);
      ctx.fillStyle = s.size > 1.5 ? '#a5f3fc' : '#ffffff'; ctx.fillRect(s.x, s.y, s.size, s.size);
    });
    ctx.globalAlpha = 1;

    if (shakeRef.current > 0) { ctx.save(); ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current); shakeRef.current *= Math.pow(0.92, dt); if (shakeRef.current < 0.5) shakeRef.current = 0; }

    powerUps.current.forEach(pu => {
      const bob = Math.sin(pu.bobOffset) * 3;
      const colors: any = { weapon: '#22d3ee', health: '#10b981', shield: '#60a5fa', speed: '#fbbf24', score: '#f472b6', bomb: '#ef4444' };
      ctx.save(); ctx.translate(pu.x, pu.y + bob); ctx.shadowBlur = 15; ctx.shadowColor = colors[pu.type]; ctx.fillStyle = colors[pu.type]; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'white'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const icons: any = { weapon: 'W', health: 'H', shield: 'S', speed: '⚡', score: '2x', bomb: '💥' }; ctx.fillText(icons[pu.type], 0, 0); ctx.restore();
    });

    particles.current.forEach(p => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.shadowBlur = p.size > 3 ? 10 : 0; ctx.shadowColor = p.color; if (p.drag === 1) { ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke(); } else { ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); } });
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;

    const pl = player.current;
    if (hpRef.current > 0) {
      const flicker = isInvulnRef.current && Math.floor(frameCount.current / 4) % 2 === 0;
      if (!flicker) {
        ctx.save(); ctx.translate(pl.x + pl.w / 2, pl.y + pl.h / 2);
        if (shieldRef.current) { ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + Math.sin(frameCount.current * 0.1) * 0.3; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
        ctx.shadowBlur = 20; ctx.shadowColor = speedBoostRef.current > 1 ? '#fbbf24' : '#22d3ee'; ctx.fillStyle = speedBoostRef.current > 1 ? '#fbbf24' : '#22d3ee'; ctx.beginPath(); ctx.moveTo(0, -pl.h / 2); ctx.lineTo(pl.w / 2, pl.h / 2); ctx.lineTo(0, pl.h / 2 - 6); ctx.lineTo(-pl.w / 2, pl.h / 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#0ea5e9'; ctx.beginPath(); ctx.ellipse(0, -2, 4, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        const flH = 8 + Math.random() * 6 + (speedBoostRef.current > 1 ? 6 : 0); const flC = speedBoostRef.current > 1 ? '#f59e0b' : '#facc15'; ctx.fillStyle = flC; ctx.shadowBlur = 10; ctx.shadowColor = flC; ctx.beginPath(); ctx.moveTo(-4, pl.h / 2 - 2); ctx.lineTo(0, pl.h / 2 + flH); ctx.lineTo(4, pl.h / 2 - 2); ctx.fill(); ctx.restore();
      }
    }

    enemies.current.forEach(e => {
      ctx.save(); ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
      ctx.fillStyle = e.hitTimer > 0 ? '#ffffff' : e.color; if (e.hitTimer > 0) ctx.globalAlpha = 0.7;
      ctx.shadowBlur = e.type.includes('boss') ? 20 : 12; ctx.shadowColor = e.color;
      if (e.type === 'scout') { ctx.beginPath(); ctx.moveTo(0, e.h / 2); ctx.lineTo(e.w / 2, -e.h / 2); ctx.lineTo(0, -e.h / 2 + 6); ctx.lineTo(-e.w / 2, -e.h / 2); ctx.closePath(); ctx.fill(); }
      else if (e.type === 'tank') { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i; ctx.lineTo(Math.cos(a) * (e.w / 2), Math.sin(a) * (e.w / 2)); } ctx.closePath(); ctx.fill(); }
      else if (e.type === 'hunter') { ctx.beginPath(); ctx.moveTo(0, -e.h / 2); ctx.lineTo(e.w / 2, 0); ctx.lineTo(0, e.h / 2); ctx.lineTo(-e.w / 2, 0); ctx.closePath(); ctx.fill(); }
      else if (e.type === 'interceptor') { ctx.beginPath(); ctx.moveTo(0, -e.h / 2); ctx.lineTo(3, 0); ctx.lineTo(e.w / 2, e.h / 2); ctx.lineTo(0, 3); ctx.lineTo(-e.w / 2, e.h / 2); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill(); }
      else if (e.type === 'bomber') { ctx.fillRect(-(e.w / 4), -(e.w / 2), e.w / 2, e.w); ctx.fillRect(-(e.w / 2), -(e.w / 4), e.w, e.w / 2); }
      else if (e.type.includes('boss')) { ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h); }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.restore();
      if (e.maxHp > 2) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x, e.y - 10, e.w, 4); const hpPct = e.hp / e.maxHp; ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444'; ctx.fillRect(e.x, e.y - 10, e.w * hpPct, 4); }
    });

    bullets.current.forEach(b => { ctx.fillStyle = b.color; ctx.shadowBlur = 8; ctx.shadowColor = b.color; if (b.owner === 'player') { ctx.fillRect(b.x - b.size / 2, b.y, b.size, 10); } else { ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2); ctx.fill(); } });
    ctx.shadowBlur = 0;

    floatingTexts.current.forEach(ft => { ctx.globalAlpha = Math.max(0, ft.life); ctx.fillStyle = ft.color; ctx.font = `900 ${ft.size}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(ft.text, ft.x, ft.y); });
    ctx.globalAlpha = 1;

    if (warnTimerRef.current > 0) { const alpha = Math.min(1, warnTimerRef.current / 60) * (0.5 + Math.sin(frameCount.current * 0.2) * 0.5); ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.3})`; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); ctx.fillStyle = '#ef4444'; ctx.font = '900 24px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('WARNING', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20); ctx.font = '900 16px sans-serif'; ctx.fillText(bossName || 'BOSS APPROACHING', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 15); }
    if (shakeRef.current > 0) ctx.restore();
    requestRef.current = requestAnimationFrame(draw);
  }, []);

  // --- INPUT HANDLING ---
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (gameStateRef.current !== 'playing') return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    player.current.x = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_SIZE, x - PLAYER_SIZE / 2));
    player.current.y = Math.max(0, Math.min(CANVAS_HEIGHT - PLAYER_SIZE, y - PLAYER_SIZE));
  }, []);

  const togglePause = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);
    if (!isPausedRef.current) { lastTimeRef.current = performance.now(); }
  }, []);

  const startNewGame = useCallback((e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    requestFullscreen(); initAudio();
    scoreRef.current = 0; setScore(0); weaponRef.current = 1; setWeaponLevel(1); hpRef.current = MAX_HP; setHp(MAX_HP); comboRef.current = 0; setCombo(0); bossActiveRef.current = false; nextBossScoreRef.current = 500; setBossName(null); setBossHpPct(0); multiplierRef.current = 1; speedBoostRef.current = 1; shieldRef.current = false; isInvulnRef.current = false; spawnTimerRef.current = 0; warnTimerRef.current = 0; invulnTimerRef.current = 0; shieldTimerRef.current = 0; speedBoostTimerRef.current = 0; multiplierTimerRef.current = 0; shakeRef.current = 0; hitstopRef.current = 0; frameCount.current = 0; lastTimeRef.current = performance.now(); enemies.current = []; bullets.current = []; particles.current = []; powerUps.current = []; floatingTexts.current = []; player.current = { x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT - 80, w: PLAYER_SIZE, h: PLAYER_SIZE };
    gameStateRef.current = 'playing'; setGameState('playing'); isRunning.current = true; isPausedRef.current = false; setIsPaused(false);
    requestRef.current = requestAnimationFrame(draw);
  }, [draw]);

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', padding: '40px 20px 120px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none', WebkitUserSelect: 'none', overflow: 'hidden', touchAction: 'none' }}>
      
      {/* Background Ambience */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(34, 211, 238, 0.1)', filter: 'blur(80px)' }} />
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 10 }}>
        
        {/* Header Area */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', zIndex: 50 }}>
            <button 
                onPointerDown={handleBack} 
                style={{ width: '45px', height: '45px', borderRadius: '14px', background: '#f8fafc', border: '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            >
              <ChevronLeft size={24} strokeWidth={2.5} />
            </button>
            {gameState === 'playing' && (
              <button 
                onPointerDown={togglePause} 
                style={{ width: '45px', height: '45px', borderRadius: '14px', background: isPaused ? 'rgba(245, 158, 11, 0.1)' : '#f8fafc', border: isPaused ? '2px solid rgba(245, 158, 11, 0.3)' : '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isPaused ? '#f59e0b' : '#334155', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              >
                {isPaused ? <Play size={20} /> : <Pause size={20} />}
              </button>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#06b6d4' }}>Starship Altu</h1>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'end', gap: '8px' }}>
              <span style={{ fontSize: '8px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Weapon Lvl {weaponLevel}</span>
              {combo > 1 && <span style={{ fontSize: '8px', fontWeight: 900, fontStyle: 'italic', color: '#d946ef' }}>COMBO x{combo}</span>}
            </div>
          </div>
        </div>

        {/* Score Board */}
        <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '24px' }}>
          <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Score</span>
            <span style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: '#0f172a', lineHeight: 1 }}>{score}</span>
            {multiplierRef.current > 1 && <span style={{ position: 'absolute', top: '8px', right: '12px', fontSize: '9px', fontWeight: 900, color: '#f472b6' }}>2x</span>}
          </div>

          <div style={{ flex: 1, background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(6, 182, 212, 0.1)' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(6, 182, 212, 0.7)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Trophy size={12} /> Best
            </span>
            <span style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: '#06b6d4', lineHeight: 1 }}>{highScore}</span>
          </div>
        </div>

        {/* Boss Health Bar */}
        {bossName && !showBossWarn && (
          <div style={{ width: '100%', marginBottom: '12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '9px', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{bossName}</span>
            <div style={{ flex: 1, height: '8px', background: '#fee2e2', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#ef4444', width: `${bossHpPct}%`, transition: 'width 0.3s ease', borderRadius: '4px' }} />
            </div>
          </div>
        )}

        {/* Game Canvas Box */}
        <div 
          onPointerMove={handlePointerMove}
          style={{
            position: 'relative', width: '100%', maxWidth: '340px', height: '480px', background: '#050505', borderRadius: '30px', 
            border: showBossWarn ? '2px solid #ef4444' : '2px solid rgba(34, 211, 238, 0.3)', 
            overflow: 'hidden', transition: 'border 0.2s ease',
            boxShadow: showBossWarn ? '0 0 50px rgba(239, 68, 68, 0.3)' : '0 10px 40px rgba(34, 211, 238, 0.15)',
            touchAction: 'none'
          }}
        >
          {/* HUD Icons */}
          {gameState === 'playing' && (
            <>
              <div style={{ position: 'absolute', top: '12px', left: '16px', display: 'flex', gap: '4px', zIndex: 10 }}>
                {Array.from({ length: MAX_HP }).map((_, i) => <Heart key={i} size={14} color={i < hp ? '#ef4444' : '#334155'} fill={i < hp ? '#ef4444' : 'transparent'} />)}
                {shieldRef.current && <Shield size={14} color="#60a5fa" fill="#60a5fa" />}
              </div>
              <div style={{ position: 'absolute', top: '12px', right: '16px', display: 'flex', flexDir: 'column', gap: '4px', zIndex: 10 }}>
                 {speedBoostRef.current > 1 && <Zap size={14} color="#fbbf24" fill="#fbbf24" />}
              </div>
            </>
          )}

          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ width: '100%', height: '100%', display: 'block' }} />

          {/* Overlays */}
          <AnimatePresence>
            {gameState === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                <SpaceLogo className="w-20 h-20 text-cyan-500 mb-6 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]" />
                <button 
                  onPointerDown={startNewGame} 
                  style={{ padding: '16px 40px', background: '#06b6d4', color: '#fff', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(6, 182, 212, 0.4)' }}
                >
                  <Play size={18} fill="currentColor" /> Initialize
                </button>
                <p style={{ margin: '16px 0 0 0', fontSize: '8px', fontWeight: 900, color: 'rgba(165, 243, 252, 0.6)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Engages Fullscreen</p>
              </motion.div>
            )}

            {gameState === 'gameover' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'absolute', inset: 0, background: 'rgba(69, 10, 10, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '30px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-1px', color: '#fff', textShadow: '0 0 20px rgba(239,68,68,1)' }}>Hull Breach</h2>
                <p style={{ margin: '0 0 32px 0', fontSize: '12px', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '2px' }}>Final Score: {score}</p>
                <button 
                  onPointerDown={startNewGame} 
                  style={{ padding: '16px 40px', background: '#fff', color: '#dc2626', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 10px 15px rgba(0,0,0,0.3)' }}
                >
                  <RotateCcw size={18} /> Reboot
                </button>
                {isSyncing && <p style={{ margin: '16px 0 0 0', fontSize: '8px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }} className="animate-pulse"><Loader2 size={10} className="animate-spin" /> Syncing Data...</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginTop: '32px', opacity: 0.8 }}>
           {[
             { Icon: Crosshair, color: '#06b6d4', label: 'Weapon' },
             { Icon: Heart, color: '#10b981', label: 'Health' },
             { Icon: Shield, color: '#3b82f6', label: 'Shield' },
             { Icon: Gauge, color: '#f59e0b', label: 'Speed' },
             { Icon: Sparkles, color: '#f472b6', label: '2x Score' },
             { Icon: Bomb, color: '#ef4444', label: 'Bomb' }
           ].map((item, i) => (
             <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
               <item.Icon size={10} color={item.color} />
               <span style={{ fontSize: '8px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</span>
             </div>
           ))}
        </div>

      </div>
    </div>
  );
}
