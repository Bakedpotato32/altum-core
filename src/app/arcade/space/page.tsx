'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Trophy, Play, Pause, RotateCcw, Zap, Loader2, Shield,
  Crosshair, Heart, Sparkles, Bomb, Gauge, Star
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SpaceLogo } from '@/components/ArcadeIcons';

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
type Star = { x: number, y: number, size: number, speed: number, brightness: number };

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
  const stars = useRef<Star[]>([]);
  
  const frameCount = useRef(0);
  const lastTimeRef = useRef(0);
  const shakeRef = useRef(0);
  const hitstopRef = useRef(0);
  const requestRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gameStateRef = useRef<'idle' | 'playing' | 'gameover'>('idle');
  const isPausedRef = useRef(false);
  
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
  const isRunning = useRef(false);
  
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => { /* Silent fail on strict browsers */ });
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

  // --- SUPABASE ---
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
      addFloatingText(player.current.x, player.current.y - 35, 'WEAPON DOWN!', '#fbbf24', 11);
    }

    if (hpRef.current <= 0) handleGameOver();
  }, [handleGameOver]);

  // --- ENEMY SPAWNING ---
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
    const score = scoreRef.current;
    let type = 'boss_destroyer'; let color = '#dc2626'; let hp = 80; let w = 60; let h = 60;
    let name = 'STAR DESTROYER';
    
    if (score >= 3000) {
      type = 'boss_dreadnought'; color = '#7c3aed'; hp = 200; w = 80; h = 80;
      name = 'VOID DREADNOUGHT';
    } else if (score >= 1500) {
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

  // --- WEAPON SYSTEM ---
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

  // --- MAIN GAME LOOP ---
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
      // Loop timers
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

      // Boss Spawning
      if (!bossActiveRef.current && scoreRef.current >= nextBossScoreRef.current) {
        spawnBoss();
        nextBossScoreRef.current += scoreRef.current < 1500 ? 1000 : scoreRef.current < 3000 ? 1500 : 2000;
      }

      // Normal Enemy Spawning
      const baseSpawnRate = bossActiveRef.current ? 99999 : Math.max(15, 50 - scoreRef.current / 80);
      spawnTimerRef.current -= dt;
      if (spawnTimerRef.current <= 0) {
        spawnEnemy();
        spawnTimerRef.current = baseSpawnRate;
      }

      // Auto Fire
      const fireRate = speedBoostRef.current > 1 ? 8 : 10;
      if (Math.floor(frameCount.current) % fireRate === 0 && hpRef.current > 0) {
        firePlayer();
      }

      const p = player.current;
      
      // Update Enemies
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
              bullets.current.push({
                x: e.x + e.w / 2, y: e.y + e.h,
                dx: i * 2, dy: 4,
                owner: 'enemy', color: e.color, size: 4, pierce: false
              });
            }
            e.shootCooldown = 50;
          }
        } else if (e.type === 'boss_cruiser') {
          e.x = CANVAS_WIDTH / 2 + Math.sin(e.moveTimer * 0.025) * 120;
          e.y = 80 + Math.sin(e.moveTimer * 0.05) * 40;
          
          e.shootCooldown -= dt;
          if (e.shootCooldown <= 0) {
            const angle = Math.atan2(p.y - e.y, p.x - e.x);
            bullets.current.push({
              x: e.x + e.w / 2, y: e.y + e.h,
              dx: Math.cos(angle) * 5, dy: Math.sin(angle) * 5,
              owner: 'enemy', color: e.color, size: 5, pierce: false
            });
            for (let i = -2; i <= 2; i++) {
              if (i === 0) continue;
              bullets.current.push({
                x: e.x + e.w / 2, y: e.y + e.h,
                dx: Math.cos(angle + i * 0.3) * 4, dy: Math.sin(angle + i * 0.3) * 4,
                owner: 'enemy', color: '#fb923c', size: 3, pierce: false
              });
            }
            e.shootCooldown = 45;
          }
        } else if (e.type === 'boss_dreadnought') {
          const phase = Math.floor(e.moveTimer / 300) % 3;
          e.phase = phase;
          
          if (phase === 0) {
            e.x += (CANVAS_WIDTH / 2 - e.w / 2 - e.x) * 0.02 * dt;
            e.y += (60 - e.y) * 0.01 * dt;
            e.shootCooldown -= dt;
            if (e.shootCooldown <= 0) {
              const angle = Math.atan2(p.y - e.y, p.x - e.x);
              for (let i = 0; i < 8; i++) {
                const a = angle + (i / 8) * Math.PI * 2;
                bullets.current.push({
                  x: e.x + e.w / 2, y: e.y + e.h / 2,
                  dx: Math.cos(a) * 3, dy: Math.sin(a) * 3,
                  owner: 'enemy', color: e.color, size: 4, pierce: false
                });
              }
              e.shootCooldown = 60;
            }
          } else if (phase === 1) {
            e.x += Math.sin(e.moveTimer * 0.03) * 3 * dt;
            e.shootCooldown -= dt;
            if (e.shootCooldown <= 0) {
              bullets.current.push({
                x: e.x + e.w / 2, y: e.y + e.h,
                dx: 0, dy: 6,
                owner: 'enemy', color: '#ef4444', size: 6, pierce: false
              });
              e.shootCooldown = 20;
            }
          } else {
            e.y += 2 * dt;
            if (e.y > 200) e.y -= 4 * dt;
            e.shootCooldown -= dt;
            if (e.shootCooldown <= 0) {
              bullets.current.push({
                x: e.x + e.w / 2, y: e.y + e.h,
                dx: (Math.random() - 0.5) * 4, dy: 5,
                owner: 'enemy', color: '#fbbf24', size: 4, pierce: false
              });
              e.shootCooldown = 15;
            }
          }
        } else {
          e.y += speed * dt;
          if (e.type === 'hunter') {
            e.x += Math.sin(frameCount.current * 0.03 + e.id * 10) * 2.5 * dt;
            e.x = Math.max(0, Math.min(CANVAS_WIDTH - e.w, e.x));
          } else if (e.type === 'interceptor') {
            e.x += Math.sin(frameCount.current * 0.08) * 3 * dt;
          } else if (e.type === 'bomber') {
            e.y += speed * 0.6 * dt;
          }
        }

        if (!e.type.includes('boss')) {
          e.shootCooldown -= dt;
          if (e.shootCooldown <= 0 && e.y > 0 && e.y < CANVAS_HEIGHT - 100) {
            if (e.type === 'tank') {
              bullets.current.push({
                x: e.x + e.w / 2, y: e.y + e.h,
                dx: 0, dy: 4.5,
                owner: 'enemy', color: e.color, size: 5, pierce: false
              });
              e.shootCooldown = 90;
            } else if (e.type === 'hunter') {
              const angle = Math.atan2(p.y - e.y, p.x - e.x);
              bullets.current.push({
                x: e.x + e.w / 2, y: e.y + e.h,
                dx: Math.cos(angle) * 4.5, dy: Math.sin(angle) * 4.5,
                owner: 'enemy', color: e.color, size: 4, pierce: false
              });
              e.shootCooldown = 70;
            } else if (e.type === 'interceptor') {
              bullets.current.push({
                x: e.x + e.w / 2, y: e.y + e.h,
                dx: 0, dy: 5.5,
                owner: 'enemy', color: e.color, size: 3, pierce: false
              });
              e.shootCooldown = 35;
            } else if (e.type === 'bomber') {
              bullets.current.push({
                x: e.x + e.w / 2, y: e.y + e.h,
                dx: 0, dy: 3.5,
                owner: 'enemy', color: '#ef4444', size: 6, pierce: false
              });
              e.shootCooldown = 80;
            }
          }
        }

        if (hpRef.current > 0 && !isInvulnRef.current) {
          const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
          const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
          const dist = Math.sqrt((cx - pcx) ** 2 + (cy - pcy) ** 2);
          const minDist = (e.w + p.w) / 2 * 0.7;
          
          if (dist < minDist) {
            e.hp = 0;
            damagePlayer();
            createExplosion(cx, cy, e.color, 20);
          }
        }
      });

      // Update Bullets & Collisions
      bullets.current.forEach(b => {
        b.x += b.dx * dt;
        b.y += b.dy * dt;

        if (b.owner === 'player') {
          enemies.current.forEach(e => {
            if (e.hp > 0 && b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
              if (!b.pierce) b.dy = 1000;
              e.hp -= 1;
              e.hitTimer = 4;
              
              if (e.type.includes('boss')) {
                hitstopRef.current = 3;
                shakeRef.current = 5;
                setBossHpPct((e.hp / e.maxHp) * 100);
              }

              playSound(350, 'triangle', 0.04, 0.08);

              if (e.hp <= 0) {
                const now = Date.now();
                if (now - lastKillRef.current < 2000) {
                  comboRef.current = Math.min(comboRef.current + 1, 20);
                } else {
                  comboRef.current = 1;
                }
                lastKillRef.current = now;
                setCombo(comboRef.current);

                const baseScore = e.type.includes('boss') ? 500 : e.maxHp * 10;
                const comboBonus = Math.floor(baseScore * (comboRef.current * 0.1));
                const totalScore = (baseScore + comboBonus) * multiplierRef.current;
                scoreRef.current += totalScore;
                setScore(scoreRef.current);

                createExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color, e.maxHp * 10, 7);
                createShockwave(e.x + e.w / 2, e.y + e.h / 2, e.color);
                
                if (e.type.includes('boss')) {
                  bossActiveRef.current = false;
                  setBossName(null);
                  setBossHpPct(0);
                  shakeRef.current = 30;
                  hitstopRef.current = 15;
                  spawnTimerRef.current = 60; // FIX: Reset timer immediately so enemies resume!
                  playSound(150, 'sawtooth', 0.2, 0.8);
                  addFloatingText(e.x + e.w / 2, e.y, `BOSS DEFEATED! +${totalScore}`, '#fbbf24', 20);
                } else {
                  playSound(600, 'square', 0.08, 0.15);
                  addFloatingText(e.x + e.w / 2, e.y, `+${totalScore}`, '#fbbf24', 14);
                  if (comboRef.current > 1) {
                    addFloatingText(e.x + e.w / 2, e.y - 15, `COMBO x${comboRef.current}`, '#e879f9', 12);
                  }
                }

                const dropRoll = Math.random();
                if (dropRoll > 0.88) {
                  const types: PowerUp['type'][] = ['weapon', 'health', 'shield', 'speed', 'score', 'bomb'];
                  const type = types[Math.floor(Math.random() * types.length)];
                  powerUps.current.push({
                    id: Math.random(), x: e.x + e.w / 2, y: e.y + e.h / 2,
                    type, collected: false, bobOffset: Math.random() * Math.PI * 2
                  });
                }
              }
            }
          });
        } else {
          const bcx = b.x, bcy = b.y;
          const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
          if (Math.abs(bcx - pcx) < 14 && Math.abs(bcy - pcy) < 14) {
            b.dy = 1000;
            damagePlayer();
          }
        }
      });

      // Update PowerUps
      powerUps.current.forEach(pu => {
        pu.y += 2 * dt;
        pu.bobOffset += 0.05 * dt;
        
        const bob = Math.sin(pu.bobOffset) * 3;
        const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
        
        if (Math.abs(pu.x - pcx) < 22 && Math.abs(pu.y + bob - pcy) < 22 && !pu.collected) {
          pu.collected = true;
          playSound(800, 'sine', 0.1, 0.25);
          vibrate(40);
          
          switch (pu.type) {
            case 'weapon':
              weaponRef.current = Math.min(5, weaponRef.current + 1);
              setWeaponLevel(weaponRef.current);
              addFloatingText(pu.x, pu.y, 'WEAPON UP!', '#22d3ee', 16);
              createExplosion(pu.x, pu.y, '#22d3ee', 10);
              break;
            case 'health':
              hpRef.current = Math.min(MAX_HP, hpRef.current + 1);
              setHp(hpRef.current);
              addFloatingText(pu.x, pu.y, '+HP', '#10b981', 16);
              createExplosion(pu.x, pu.y, '#10b981', 10);
              break;
            case 'shield':
              shieldRef.current = true;
              shieldTimerRef.current = 600;
              addFloatingText(pu.x, pu.y, 'SHIELD!', '#60a5fa', 16);
              createExplosion(pu.x, pu.y, '#60a5fa', 10);
              break;
            case 'speed':
              speedBoostRef.current = 1.5;
              speedBoostTimerRef.current = 300;
              addFloatingText(pu.x, pu.y, 'SPEED!', '#fbbf24', 16);
              createExplosion(pu.x, pu.y, '#fbbf24', 10);
              break;
            case 'score':
              multiplierRef.current = 2;
              multiplierTimerRef.current = 300; // FIX: Handled efficiently in Game Loop!
              addFloatingText(pu.x, pu.y, '2x SCORE!', '#f472b6', 16);
              createExplosion(pu.x, pu.y, '#f472b6', 10);
              break;
            case 'bomb':
              enemies.current.forEach(e => {
                // FIX: Will properly filter bosses because types strictly include "boss" now!
                if (!e.type.includes('boss')) {
                  createExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color, 15);
                  scoreRef.current += e.maxHp * 5;
                }
              });
              enemies.current = enemies.current.filter(e => e.type.includes('boss'));
              addFloatingText(pcx, pcy - 30, 'BOMB!', '#ef4444', 20);
              shakeRef.current = 25;
              playSound(200, 'sawtooth', 0.15, 0.5);
              break;
          }
        }
      });

      enemies.current = enemies.current.filter(e => e.hp > 0 && e.y < CANVAS_HEIGHT + 50);
      bullets.current = bullets.current.filter(b => b.y > -20 && b.y < CANVAS_HEIGHT + 20 && b.x > -20 && b.x < CANVAS_WIDTH + 20);
      powerUps.current = powerUps.current.filter(pu => !pu.collected && pu.y < CANVAS_HEIGHT);
    }

    particles.current.forEach(p => {
      p.x += p.dx * dt;
      p.y += p.dy * dt;
      p.dx *= p.drag;
      p.dy *= p.drag;
      p.life -= 0.025 * dt;
      if (p.drag === 1) p.size += 0.5 * dt;
    });
    particles.current = particles.current.filter(p => p.life > 0);

    floatingTexts.current.forEach(ft => {
      ft.y -= 0.8 * dt;
      ft.life -= 0.015 * dt;
    });
    floatingTexts.current = floatingTexts.current.filter(ft => ft.life > 0);

    // --- RENDERING ---
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#020205';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    stars.current.forEach(s => {
      const speed = s.speed * (1 + scoreRef.current / 5000);
      s.y += speed * dt;
      if (s.y > CANVAS_HEIGHT) {
        s.y = 0;
        s.x = Math.random() * CANVAS_WIDTH;
      }
      ctx.globalAlpha = s.brightness * (0.5 + Math.sin(frameCount.current * 0.01 + s.x) * 0.5);
      ctx.fillStyle = s.size > 1.5 ? '#a5f3fc' : '#ffffff';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });
    ctx.globalAlpha = 1;

    if (shakeRef.current > 0) {
      ctx.save();
      ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
      shakeRef.current *= Math.pow(0.92, dt);
      if (shakeRef.current < 0.5) shakeRef.current = 0;
    }

    const vig = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 100, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 280);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    powerUps.current.forEach(pu => {
      const bob = Math.sin(pu.bobOffset) * 3;
      const colors: Record<string, string> = {
        weapon: '#22d3ee', health: '#10b981', shield: '#60a5fa',
        speed: '#fbbf24', score: '#f472b6', bomb: '#ef4444'
      };
      const glowColors: Record<string, string> = {
        weapon: 'rgba(34,211,238,0.4)', health: 'rgba(16,185,129,0.4)',
        shield: 'rgba(96,165,250,0.4)', speed: 'rgba(251,191,36,0.4)',
        score: 'rgba(244,114,182,0.4)', bomb: 'rgba(239,68,68,0.4)'
      };
      
      ctx.save();
      ctx.translate(pu.x, pu.y + bob);
      ctx.shadowBlur = 15;
      ctx.shadowColor = glowColors[pu.type];
      ctx.fillStyle = colors[pu.type];
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icons: Record<string, string> = { weapon: 'W', health: 'H', shield: 'S', speed: '⚡', score: '2x', bomb: '💥' };
      ctx.fillText(icons[pu.type], 0, 0);
      ctx.restore();
    });

    particles.current.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = p.size > 3 ? 10 : 0;
      ctx.shadowColor = p.color;
      if (p.drag === 1) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    const pl = player.current;
    if (hpRef.current > 0) {
      const flicker = isInvulnRef.current && Math.floor(frameCount.current / 4) % 2 === 0;
      
      if (!flicker) {
        ctx.save();
        ctx.translate(pl.x + pl.w / 2, pl.y + pl.h / 2);
        
        if (shieldRef.current) {
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.6 + Math.sin(frameCount.current * 0.1) * 0.3;
          ctx.beginPath();
          ctx.arc(0, 0, 22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        ctx.shadowBlur = 20;
        ctx.shadowColor = speedBoostRef.current > 1 ? '#fbbf24' : '#22d3ee';
        ctx.fillStyle = speedBoostRef.current > 1 ? '#fbbf24' : '#22d3ee';
        
        ctx.beginPath();
        ctx.moveTo(0, -pl.h / 2);
        ctx.lineTo(pl.w / 2, pl.h / 2);
        ctx.lineTo(0, pl.h / 2 - 6);
        ctx.lineTo(-pl.w / 2, pl.h / 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.ellipse(0, -2, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0891b2';
        ctx.fillRect(-pl.w / 2 + 2, 2, 4, 8);
        ctx.fillRect(pl.w / 2 - 6, 2, 4, 8);

        ctx.shadowBlur = 0;

        const flameHeight = 8 + Math.random() * 6 + (speedBoostRef.current > 1 ? 6 : 0);
        const flameColor = speedBoostRef.current > 1 ? '#f59e0b' : '#facc15';
        ctx.fillStyle = flameColor;
        ctx.shadowBlur = 10;
        ctx.shadowColor = flameColor;
        ctx.beginPath();
        ctx.moveTo(-4, pl.h / 2 - 2);
        ctx.lineTo(0, pl.h / 2 + flameHeight);
        ctx.lineTo(4, pl.h / 2 - 2);
        ctx.fill();
        
        ctx.restore();
      }
    }

    enemies.current.forEach(e => {
      ctx.save();
      ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
      
      if (e.hitTimer > 0) {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = e.color;
      }

      ctx.shadowBlur = e.type.includes('boss') ? 20 : 12;
      ctx.shadowColor = e.color;

      if (e.type === 'scout') {
        ctx.beginPath();
        ctx.moveTo(0, e.h / 2);
        ctx.lineTo(e.w / 2, -e.h / 2);
        ctx.lineTo(0, -e.h / 2 + 6);
        ctx.lineTo(-e.w / 2, -e.h / 2);
        ctx.closePath();
        ctx.fill();
      } else if (e.type === 'tank') {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const r = e.w / 2;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (e.type === 'hunter') {
        ctx.beginPath();
        ctx.moveTo(0, -e.h / 2);
        ctx.lineTo(e.w / 2, 0);
        ctx.lineTo(0, e.h / 2);
        ctx.lineTo(-e.w / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = e.hitTimer > 0 ? '#fff' : '#7c3aed';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'interceptor') {
        ctx.beginPath();
        ctx.moveTo(0, -e.h / 2);
        ctx.lineTo(3, 0);
        ctx.lineTo(e.w / 2, e.h / 2);
        ctx.lineTo(0, 3);
        ctx.lineTo(-e.w / 2, e.h / 2);
        ctx.lineTo(-3, 0);
        ctx.closePath();
        ctx.fill();
      } else if (e.type === 'bomber') {
        const s = e.w / 2;
        ctx.fillRect(-s / 2, -s, s, s * 2);
        ctx.fillRect(-s, -s / 2, s * 2, s);
        ctx.fillStyle = e.hitTimer > 0 ? '#fff' : '#dc2626';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'boss_destroyer') {
        ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h);
        ctx.fillStyle = e.hitTimer > 0 ? '#fff' : '#991b1b';
        ctx.fillRect(-e.w / 2 + 5, -e.h / 2 + 5, e.w - 10, e.h - 10);
        ctx.fillStyle = e.hitTimer > 0 ? '#fff' : '#f87171';
        ctx.fillRect(-4, e.h / 2, 8, 12);
      } else if (e.type === 'boss_cruiser') {
        ctx.beginPath();
        ctx.moveTo(0, -e.h / 2);
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i;
          const r = i % 2 === 0 ? e.w / 2 : e.w / 3;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = e.hitTimer > 0 ? '#fff' : '#c2410c';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'boss_dreadnought') {
        ctx.beginPath();
        ctx.ellipse(0, 0, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = e.hitTimer > 0 ? '#fff' : '#5b21b6';
        ctx.beginPath();
        ctx.ellipse(0, 0, e.w / 2 - 8, e.h / 2 - 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = e.hitTimer > 0 ? '#fff' : '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, 8 + Math.sin(frameCount.current * 0.05) * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();

      if (e.maxHp > 2) {
        const barW = e.w;
        const barH = 4;
        const barX = e.x;
        const barY = e.y - 10;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX, barY, barW, barH);
        const hpPct = e.hp / e.maxHp;
        ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(barX, barY, barW * hpPct, barH);
      }
    });

    bullets.current.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = b.color;
      if (b.owner === 'player') {
        ctx.fillRect(b.x - b.size / 2, b.y, b.size, 10);
        ctx.globalAlpha = 0.3;
        ctx.fillRect(b.x - b.size / 2, b.y + 8, b.size, 6);
        ctx.globalAlpha = 1;
      } else {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.shadowBlur = 0;

    floatingTexts.current.forEach(ft => {
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillStyle = ft.color;
      ctx.font = `900 ${ft.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'black';
      ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (warnTimerRef.current > 0) {
      const alpha = Math.min(1, warnTimerRef.current / 60) * (0.5 + Math.sin(frameCount.current * 0.2) * 0.5);
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.3})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#ef4444';
      ctx.font = '900 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ef4444';
      ctx.fillText('WARNING', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
      ctx.font = '900 16px sans-serif';
      ctx.fillText(bossName || 'BOSS APPROACHING', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 15);
    }

    if (multiplierRef.current > 1) {
      ctx.fillStyle = '#f472b6';
      ctx.font = '900 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('2x SCORE', CANVAS_WIDTH - 10, 20);
    }

    if (speedBoostRef.current > 1) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('SPEED BOOST', 10, 20);
    }

    if (shakeRef.current > 0) ctx.restore();

    requestRef.current = requestAnimationFrame(draw);
  }, []);

  // --- INPUT HANDLING ---
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (gameStateRef.current !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
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
    if (!isPausedRef.current) {
      lastTimeRef.current = performance.now();
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameStateRef.current !== 'playing') return;
      const speed = 8;
      const p = player.current;
      if (['ArrowUp', 'w', 'W'].includes(e.key)) p.y = Math.max(0, p.y - speed);
      if (['ArrowDown', 's', 'S'].includes(e.key)) p.y = Math.min(CANVAS_HEIGHT - PLAYER_SIZE, p.y + speed);
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) p.x = Math.max(0, p.x - speed);
      if (['ArrowRight', 'd', 'D'].includes(e.key)) p.x = Math.min(CANVAS_WIDTH - PLAYER_SIZE, p.x + speed);
      if (e.key === ' ' || e.key === 'Escape') togglePause();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePause]);

  const startNewGame = useCallback((e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    requestFullscreen();
    initAudio();
    
    scoreRef.current = 0;
    setScore(0);
    weaponRef.current = 1;
    setWeaponLevel(1);
    hpRef.current = MAX_HP;
    setHp(MAX_HP);
    comboRef.current = 0;
    setCombo(0);
    bossActiveRef.current = false;
    nextBossScoreRef.current = 500;
    setBossName(null);
    setBossHpPct(0);
    
    // --- BUFF & TIMER RESETS ---
    multiplierRef.current = 1;
    speedBoostRef.current = 1;
    shieldRef.current = false;
    isInvulnRef.current = false;

    spawnTimerRef.current = 0;
    warnTimerRef.current = 0;
    invulnTimerRef.current = 0;
    shieldTimerRef.current = 0;
    speedBoostTimerRef.current = 0;
    multiplierTimerRef.current = 0;
    
    shakeRef.current = 0;
    hitstopRef.current = 0;
    frameCount.current = 0;
    lastTimeRef.current = performance.now();
    enemies.current = [];
    bullets.current = [];
    particles.current = [];
    powerUps.current = [];
    floatingTexts.current = [];
    
    player.current = { x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT - 80, w: PLAYER_SIZE, h: PLAYER_SIZE };
    
    gameStateRef.current = 'playing';
    setGameState('playing');
    isRunning.current = true;
    isPausedRef.current = false;
    setIsPaused(false);
    
    requestRef.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && gameStateRef.current === 'playing' && !isPausedRef.current) {
        isPausedRef.current = true;
        setIsPaused(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    return () => {
      isRunning.current = false;
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="h-[100dvh] w-screen font-sans bg-[var(--background)] text-[var(--text)] flex flex-col items-center pt-8 relative overflow-hidden touch-none overscroll-none select-none">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[320px] h-[320px] rounded-full bg-cyan-500/10 blur-[80px]" />
        <div className="absolute bottom-[20%] left-[-10%] w-[260px] h-[260px] rounded-full bg-blue-500/10 blur-[80px]" />
        <div className="absolute top-[40%] left-[30%] w-[200px] h-[200px] rounded-full bg-purple-500/5 blur-[60px]" />
      </div>

      <div className="w-full max-w-md px-5 flex flex-col items-center h-full relative z-10">
        
        {/* Header */}
        <div className="w-full flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button onPointerDown={handleBack} className="p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all text-zinc-500 hover:text-cyan-500 shadow-sm z-50 cursor-pointer">
              <ChevronLeft size={20} />
            </button>
            {gameState === 'playing' && (
              <button onClick={togglePause} className={`p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all shadow-sm ${isPaused ? 'text-amber-500 border-amber-500/30' : 'text-zinc-500 hover:text-cyan-500'}`}>
                {isPaused ? <Play size={18} /> : <Pause size={18} />}
              </button>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-xl font-black italic uppercase tracking-tighter text-cyan-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">Starship Altu</h1>
            <div className="flex items-center justify-end gap-2 mt-0.5">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Weapon Lvl {weaponLevel}</span>
              {combo > 1 && <span className="text-[8px] font-black italic text-fuchsia-400 animate-pulse">COMBO x{combo}</span>}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="w-full flex gap-3 mb-4">
          <div className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Score</span>
            <span className="text-3xl font-black italic text-[var(--text)]">{score}</span>
            {multiplierRef.current > 1 && (
              <span className="absolute top-1 right-2 text-[8px] font-black text-pink-400 animate-pulse">2x</span>
            )}
          </div>
          <div className="flex-1 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-3 flex flex-col items-center justify-center shadow-inner">
            <span className="text-[10px] font-black text-cyan-500/70 uppercase tracking-widest flex items-center gap-1 mb-1"><Trophy size={10}/> Best</span>
            <span className="text-3xl font-black italic text-cyan-500">{highScore}</span>
          </div>
        </div>

        {/* Boss Health Bar */}
        {bossName && !showBossWarn && (
          <div className="w-full mb-2 bg-zinc-900/80 border border-red-500/30 rounded-xl p-2 flex items-center gap-2">
            <span className="text-[10px] font-black text-red-400 uppercase whitespace-nowrap">{bossName}</span>
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                style={{ width: `${bossHpPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Game Canvas */}
        <div 
          onPointerMove={handlePointerMove}
          className={`relative w-full aspect-[34/48] max-h-[500px] bg-[#050505] rounded-[24px] border-2 transition-all overflow-hidden shadow-2xl touch-none ${gameState === 'gameover' ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : showBossWarn ? 'border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'border-[var(--border)]'}`}
          style={{ touchAction: 'none' }}
        >
          {/* HP overlay */}
          {gameState === 'playing' && (
            <div className="absolute top-3 left-3 flex gap-1 z-10 pointer-events-none">
              {Array.from({ length: MAX_HP }).map((_, i) => (
                <Heart 
                  key={i} 
                  size={14} 
                  className={i < hp ? "text-red-500 fill-red-500/30 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" : "text-zinc-700"} 
                />
              ))}
              {shieldRef.current && (
                <Shield size={14} className="text-blue-400 fill-blue-400/30 animate-pulse" />
              )}
            </div>
          )}

          {/* Powerup indicators */}
          {gameState === 'playing' && (
            <div className="absolute top-3 right-3 flex flex-col gap-1 z-10 pointer-events-none">
              {speedBoostRef.current > 1 && (
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded px-1.5 py-0.5">
                  <Zap size={10} className="text-yellow-400" />
                </div>
              )}
              {multiplierRef.current > 1 && (
                <div className="bg-pink-500/20 border border-pink-500/30 rounded px-1.5 py-0.5">
                  <Star size={10} className="text-pink-400" />
                </div>
              )}
            </div>
          )}

          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full block touch-none" />

          {/* Overlays */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20 pointer-events-none">
              <SpaceLogo className="w-20 h-20 text-cyan-500 mb-6 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)] animate-pulse" />
              <button onPointerDown={startNewGame} className="px-10 py-4 bg-cyan-500 text-black font-black uppercase tracking-widest rounded-full flex items-center gap-3 active:scale-95 shadow-[0_0_30px_rgba(34,211,238,0.4)] pointer-events-auto transition-all hover:scale-105">
                <Play size={18} fill="currentColor" /> Initialize
              </button>
              <p className="text-[8px] font-black text-cyan-300/60 uppercase tracking-[0.2em] mt-4">Engages Fullscreen</p>
            </div>
          )}

          {isPaused && gameState === 'playing' && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-amber-500 mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">Paused</h2>
              <button onClick={togglePause} className="px-8 py-4 bg-amber-500 text-black font-black uppercase tracking-widest rounded-full flex items-center gap-2 active:scale-95 shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                <Play size={18} fill="currentColor" /> Resume
              </button>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center z-20 p-6 text-center pointer-events-none">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">Hull Breach</h2>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Ship Destroyed at {score} pts</p>
              {combo > 5 && <p className="text-[10px] font-bold text-fuchsia-400 mb-2">Best Combo: x{combo}</p>}
              
              <div className="h-4 mb-6">
                {isSyncing && <p className="text-[9px] font-black text-white/50 uppercase tracking-widest animate-pulse flex items-center gap-2"><Loader2 size={10} className="animate-spin" /> Syncing Data...</p>}
                {!isSyncing && score > 0 && <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Score Saved</p>}
              </div>

              <button onPointerDown={startNewGame} className="px-8 py-3 bg-white text-red-600 font-black uppercase tracking-widest rounded-full flex items-center gap-2 active:scale-95 shadow-xl pointer-events-auto transition-all hover:scale-105">
                <RotateCcw size={16} /> Reboot
              </button>
            </div>
          )}
        </div>

        {/* Legend / Powerup Guide */}
        <div className="flex flex-wrap justify-center gap-2 mt-4 opacity-70 w-full pointer-events-none">
          <div className="flex items-center gap-1 bg-[var(--card)] px-2 py-1 rounded-lg border border-[var(--border)]">
            <Crosshair size={8} className="text-cyan-400" />
            <span className="text-[7px] font-black text-zinc-500 uppercase">Weapon</span>
          </div>
          <div className="flex items-center gap-1 bg-[var(--card)] px-2 py-1 rounded-lg border border-[var(--border)]">
            <Heart size={8} className="text-emerald-400" />
            <span className="text-[7px] font-black text-zinc-500 uppercase">Health</span>
          </div>
          <div className="flex items-center gap-1 bg-[var(--card)] px-2 py-1 rounded-lg border border-[var(--border)]">
            <Shield size={8} className="text-blue-400" />
            <span className="text-[7px] font-black text-zinc-500 uppercase">Shield</span>
          </div>
          <div className="flex items-center gap-1 bg-[var(--card)] px-2 py-1 rounded-lg border border-[var(--border)]">
            <Gauge size={8} className="text-yellow-400" />
            <span className="text-[7px] font-black text-zinc-500 uppercase">Speed</span>
          </div>
          <div className="flex items-center gap-1 bg-[var(--card)] px-2 py-1 rounded-lg border border-[var(--border)]">
            <Sparkles size={8} className="text-pink-400" />
            <span className="text-[7px] font-black text-zinc-500 uppercase">2x Score</span>
          </div>
          <div className="flex items-center gap-1 bg-[var(--card)] px-2 py-1 rounded-lg border border-[var(--border)]">
            <Bomb size={8} className="text-red-400" />
            <span className="text-[7px] font-black text-zinc-500 uppercase">Bomb</span>
          </div>
        </div>

      </div>
    </div>
  );
}
