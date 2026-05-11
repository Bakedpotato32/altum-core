'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Loader2, Target, Shield, Crosshair, Volume2, VolumeX,
  Zap, Trophy, Heart, RotateCcw, Play
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CombatLogo } from '@/components/ArcadeIcons';

// --- ENGINE CONSTANTS ---
const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 480;
const FIXED_DT = 16.667;

type TankType = 'player' | 'grunt' | 'sniper' | 'bruiser';
type Tank = { 
  id: number, x: number, y: number, radius: number, 
  angle: number, turretAngle: number, hp: number, maxHp: number, 
  type: TankType, color: string, speed: number, cooldown: number,
  hitTimer: number, muzzleFlash: number 
};
type Bullet = { 
  id: number, x: number, y: number, dx: number, dy: number, 
  speed: number, bounces: number, isPlayer: boolean, color: string, 
  life: number, trail: {x: number, y: number}[] 
};
type Particle = { 
  x: number, y: number, dx: number, dy: number, 
  life: number, color: string, size: number, angle: number, spin: number, drag: number 
};
type FloatingText = { x: number, y: number, text: string, color: string, life: number, size: number };
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
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  // Engine Refs
  const isUnmounted = useRef(false);
  const requestRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gameStateRef = useRef<'idle' | 'playing' | 'gameover'>('idle');
  const isPausedRef = useRef(false);
  const isMutedRef = useRef(false);
  
  const player = useRef<Tank>({ 
    id: 0, x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 + 100, 
    radius: 14, angle: -Math.PI/2, turretAngle: -Math.PI/2,
    hp: 3, maxHp: 3, type: 'player', color: '#06b6d4', 
    speed: 2.5, cooldown: 0, hitTimer: 0, muzzleFlash: 0 
  });
  const enemies = useRef<Tank[]>([]);
  const bullets = useRef<Bullet[]>([]);
  const particles = useRef<Particle[]>([]);
  const floatingTexts = useRef<FloatingText[]>([]);
  const walls = useRef<Wall[]>([]);
  
  const frameCount = useRef(0);
  const lastTimeRef = useRef(0);
  const shakeRef = useRef(0);
  const hitstopRef = useRef(0);
  const scoreRef = useRef(0);
  const waveRef = useRef(1);
  const hpRef = useRef(3);
  const comboRef = useRef(0);
  const lastKillTime = useRef(0);
  const moveInput = useRef({ x: 0, y: 0 });
  const waveAnnounceTimer = useRef(0);

  // Joystick Refs
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const joystickPointerId = useRef<number | null>(null);

  // Sync refs
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Init
  useEffect(() => {
    const saved = localStorage.getItem('combatBest');
    if (saved) setBestScore(parseInt(saved, 10));
  }, []);

  // --- AUDIO ---
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  };

  const playSound = (freq: number, type: OscillatorType = 'sine', vol = 0.1, duration = 0.1) => {
    if (isMutedRef.current || !audioCtxRef.current) return;
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

  // --- FULLSCREEN ---
  const requestFullscreen = async () => {
    const elem = document.documentElement;
    try {
      if (elem.requestFullscreen) await elem.requestFullscreen();
      else if ((elem as any).webkitRequestFullscreen) await (elem as any).webkitRequestFullscreen();
    } catch (err) { /* ignore */ }
  };

  const exitFullscreen = async () => {
    try {
      const doc = document as any;
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
      else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
    } catch (err) { /* ignore */ }
  };

  const handleBack = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    exitFullscreen();
    isUnmounted.current = true;
    cancelAnimationFrame(requestRef.current);
    router.back();
  };

  // --- FX ---
  const spawnParticles = (x: number, y: number, color: string, amount = 10, speed = 4) => {
    for (let i = 0; i < amount; i++) {
      const angle = (Math.PI * 2 * i) / amount + Math.random() * 0.5;
      const spd = speed * (0.5 + Math.random());
      particles.current.push({ 
        x, y, 
        dx: Math.cos(angle) * spd, 
        dy: Math.sin(angle) * spd, 
        life: 1.0, 
        color, 
        size: Math.random() * 6 + 3, 
        angle: Math.random() * Math.PI, 
        spin: (Math.random() - 0.5) * 0.3,
        drag: 0.96
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color: string, size = 14) => {
    floatingTexts.current.push({ x, y, text, color, life: 1.0, size });
  };

  // --- SUPABASE ---
  const syncGameState = useCallback((state: 'idle' | 'playing' | 'gameover') => {
    gameStateRef.current = state; 
    setGameState(state);
  }, []);

  const handleGameOver = useCallback(async () => {
    if (gameStateRef.current === 'gameover') return;
    
    gameStateRef.current = 'gameover';
    setGameState('gameover');
    
    shakeRef.current = 25;
    hitstopRef.current = 15;
    playSound(80, 'sawtooth', 0.25, 1.0);
    if (window.navigator?.vibrate) window.navigator.vibrate([200, 100, 300]);

    const p = player.current;
    spawnParticles(p.x, p.y, p.color, 35, 10);
    spawnParticles(p.x, p.y, '#fbbf24', 15, 6);

    const finalScore = scoreRef.current;

    if (finalScore > bestScore) {
      setBestScore(finalScore);
      localStorage.setItem('combatBest', String(finalScore));
    }

    const studentId = localStorage.getItem('studentId');
    if (studentId && finalScore > 0) {
      setIsSyncing(true);
      try {
        const { data: existing } = await supabase
          .from('arcade_scores')
          .select('*')
          .eq('student_id', studentId)
          .eq('game_name', 'combat')
          .maybeSingle();

        if (!existing) {
          await supabase.from('arcade_scores').insert([{ 
            student_id: studentId, 
            game_name: 'combat', 
            score: finalScore 
          }]);
        } else if (finalScore > existing.score) {
          await supabase.from('arcade_scores').update({ score: finalScore }).eq('id', existing.id);
        }
      } catch (e) { /* ignore */ }
      setIsSyncing(false);
    }
  }, [bestScore]);

  // --- MAP ---
  const buildMap = useCallback(() => {
    walls.current = [
      { x: 0, y: 0, w: CANVAS_WIDTH, h: 10 },
      { x: 0, y: CANVAS_HEIGHT - 10, w: CANVAS_WIDTH, h: 10 },
      { x: 0, y: 0, w: 10, h: CANVAS_HEIGHT },
      { x: CANVAS_WIDTH - 10, y: 0, w: 10, h: CANVAS_HEIGHT },
      { x: 50, y: 70, w: 70, h: 18 },
      { x: CANVAS_WIDTH - 120, y: 70, w: 70, h: 18 },
      { x: CANVAS_WIDTH / 2 - 12, y: CANVAS_HEIGHT / 2 - 50, w: 24, h: 100 },
      { x: 50, y: CANVAS_HEIGHT - 110, w: 70, h: 18 },
      { x: CANVAS_WIDTH - 120, y: CANVAS_HEIGHT - 110, w: 70, h: 18 }
    ];
  }, []);

  const checkWallCollision = (x: number, y: number, radius: number) => {
    for (const w of walls.current) {
      if (x + radius > w.x && x - radius < w.x + w.w && 
          y + radius > w.y && y - radius < w.y + w.h) return true;
    }
    return false;
  };

  // --- SPAWNING ---
  const spawnWave = useCallback(() => {
    const numEnemies = Math.min(2 + Math.floor(waveRef.current / 2), 6);
    const newEnemies: Tank[] = [];

    for (let i = 0; i < numEnemies; i++) {
      const r = Math.random();
      let type: TankType = 'grunt';
      let hp = 1; 
      let color = '#ef4444'; 
      let speed = 1.0;
      
      if (waveRef.current > 2 && r > 0.7) { 
        type = 'sniper'; 
        color = '#a855f7'; 
        speed = 0.6; 
      } else if (waveRef.current > 4 && r > 0.85) { 
        type = 'bruiser'; 
        color = '#f97316'; 
        hp = 4; 
        speed = 1.5; 
      }
      
      const radius = type === 'bruiser' ? 16 : 13;
      
      let ex = 0;
      let ey = 0;
      let valid = false;
      let attempts = 0;

      while (!valid && attempts < 50) {
        ex = 40 + Math.random() * (CANVAS_WIDTH - 80);
        ey = 40 + Math.random() * (CANVAS_HEIGHT / 2 - 40);
        
        let hitWall = false;
        for (const w of walls.current) {
          if (ex + radius + 10 > w.x && ex - radius - 10 < w.x + w.w && 
              ey + radius + 10 > w.y && ey - radius - 10 < w.y + w.h) {
            hitWall = true;
            break;
          }
        }

        let hitEnemy = false;
        for (const other of newEnemies) {
          const dist = Math.sqrt((ex - other.x)**2 + (ey - other.y)**2);
          if (dist < radius + other.radius + 15) {
            hitEnemy = true;
            break;
          }
        }

        if (!hitWall && !hitEnemy) valid = true;
        attempts++;
      }
      
      const newTank: Tank = {
        id: Math.random(),
        x: ex,
        y: ey,
        radius, 
        angle: Math.PI/2, 
        turretAngle: Math.PI/2,
        hp, 
        maxHp: hp, 
        type, 
        color, 
        speed, 
        cooldown: 60 + Math.random() * 60,
        hitTimer: 0,
        muzzleFlash: 0
      };

      newEnemies.push(newTank);
      enemies.current.push(newTank);
    }
    
    waveAnnounceTimer.current = 90; // 1.5s announcement
    playSound(300, 'square', 0.1, 0.4);
  }, []);

  // --- MAIN LOOP ---
  const update = useCallback(() => {
    if (isUnmounted.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) {
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const now = performance.now();
    const rawDt = (now - lastTimeRef.current) / FIXED_DT;
    const dt = Math.min(rawDt, 3);
    lastTimeRef.current = now;

    if (!isPausedRef.current) {
      frameCount.current++; 

      // UI sync
      if (frameCount.current % 6 === 0) {
        setScore(scoreRef.current);
        setWave(waveRef.current);
        setHp(hpRef.current);
        setCombo(comboRef.current);
      }

      // Hitstop logic
      if (hitstopRef.current > 0) {
        hitstopRef.current -= dt;
      } 
      else if (gameStateRef.current === 'playing') {
        
        // Wave logic
        if (enemies.current.length === 0) {
          waveRef.current++;
          spawnWave();
        }

        if (waveAnnounceTimer.current > 0) waveAnnounceTimer.current -= dt;

        // Player logic
        if (player.current.hp > 0) {
          if (player.current.cooldown > 0) player.current.cooldown -= dt;
          if (player.current.muzzleFlash > 0) player.current.muzzleFlash -= dt;
          if (player.current.hitTimer > 0) player.current.hitTimer -= dt;
          
          const p = player.current;
          const moveSpeed = p.speed * (Math.abs(moveInput.current.x) > 0.1 || Math.abs(moveInput.current.y) > 0.1 ? 1 : 0);
          const nextX = p.x + moveInput.current.x * moveSpeed * dt;
          const nextY = p.y + moveInput.current.y * moveSpeed * dt;
          
          if (!checkWallCollision(nextX, p.y, p.radius)) p.x = nextX;
          if (!checkWallCollision(p.x, nextY, p.radius)) p.y = nextY;
          
          if (moveInput.current.x !== 0 || moveInput.current.y !== 0) {
            p.turretAngle = Math.atan2(moveInput.current.y, moveInput.current.x);
          }
          p.angle += (p.turretAngle - p.angle) * 0.15 * dt;
        }

        // Enemy logic
        enemies.current.forEach(e => {
          if (e.cooldown > 0) e.cooldown -= dt;
          if (e.muzzleFlash > 0) e.muzzleFlash -= dt;
          if (e.hitTimer > 0) e.hitTimer -= dt;
          
          const dx = player.current.x - e.x;
          const dy = player.current.y - e.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          e.turretAngle = Math.atan2(dy, dx);

          // Movement AI
          let moveDirX = 0;
          let moveDirY = 0;

          if (e.type === 'grunt' || e.type === 'bruiser') {
            if (dist > (e.type === 'bruiser' ? 50 : 70)) {
              moveDirX = Math.cos(e.turretAngle) * e.speed;
              moveDirY = Math.sin(e.turretAngle) * e.speed;
            } else if (e.type === 'bruiser' && dist < 40) {
              moveDirX = -Math.cos(e.turretAngle) * e.speed * 0.5;
              moveDirY = -Math.sin(e.turretAngle) * e.speed * 0.5;
            }
          } else if (e.type === 'sniper') {
            const strafeAngle = e.turretAngle + Math.PI/2;
            const strafeSpeed = Math.sin(frameCount.current * 0.03) * 0.8;
            moveDirX = Math.cos(strafeAngle) * strafeSpeed;
            moveDirY = Math.sin(strafeAngle) * strafeSpeed;
          }

          if (moveDirX !== 0 || moveDirY !== 0) {
            const nx = e.x + moveDirX * dt;
            const ny = e.y + moveDirY * dt;
            
            const hitX = checkWallCollision(nx, e.y, e.radius);
            const hitY = checkWallCollision(e.x, ny, e.radius);

            if (!hitX) e.x = nx;
            if (!hitY) e.y = ny;

            if (hitY && !hitX && Math.abs(moveDirY) > 0.1) {
              const slideX = e.x + Math.sign(moveDirX || 1) * e.speed * dt;
              if (!checkWallCollision(slideX, e.y, e.radius)) e.x = slideX;
            } else if (hitX && !hitY && Math.abs(moveDirX) > 0.1) {
              const slideY = e.y + Math.sign(moveDirY || 1) * e.speed * dt;
              if (!checkWallCollision(e.x, slideY, e.radius)) e.y = slideY;
            }
          }

          e.angle += (e.turretAngle - e.angle) * 0.1 * dt;

          // Firing
          if (e.cooldown <= 0 && player.current.hp > 0) {
            const bSpeed = e.type === 'sniper' ? 6.5 : e.type === 'bruiser' ? 3.5 : 3;
            const bLife = e.type === 'sniper' ? 200 : 120;
            bullets.current.push({
              id: Math.random(),
              x: e.x + Math.cos(e.angle) * 18, 
              y: e.y + Math.sin(e.angle) * 18,
              dx: Math.cos(e.angle) * bSpeed, 
              dy: Math.sin(e.angle) * bSpeed,
              speed: bSpeed, 
              bounces: 0, // Enemy bullets no longer bounce
              isPlayer: false, 
              color: e.color, 
              life: bLife,
              trail: []
            });
            e.cooldown = e.type === 'sniper' ? 100 : e.type === 'bruiser' ? 35 : 70;
            e.muzzleFlash = 5;
            playSound(e.type === 'sniper' ? 500 : 300, 'sawtooth', 0.03, 0.08);
          }
        });

        // Bullet logic
        bullets.current.forEach(b => {
          b.trail.push({ x: b.x, y: b.y });
          if (b.trail.length > 8) b.trail.shift();

          let nextX = b.x + b.dx * dt;
          let nextY = b.y + b.dy * dt;
          b.life -= dt;

          let hitWall = false;
          for (const w of walls.current) {
            if (nextX > w.x && nextX < w.x + w.w && nextY > w.y && nextY < w.y + w.h) {
              hitWall = true;
              
              if (b.bounces <= 0) {
                b.life = 0;
                spawnParticles(b.x, b.y, b.color, 6, 2);
              } else {
                const overlapX = Math.min(Math.abs(nextX - w.x), Math.abs(nextX - (w.x + w.w)));
                const overlapY = Math.min(Math.abs(nextY - w.y), Math.abs(nextY - (w.y + w.h)));
                if (overlapX < overlapY) b.dx *= -1; 
                else b.dy *= -1;
                
                b.bounces--;
                playSound(600, 'sine', 0.02, 0.05);
                spawnParticles(b.x, b.y, b.color, 4, 3);
                spawnParticles(b.x, b.y, '#ffffff', 2, 2);
              }
              break;
            }
          }

          if (!hitWall && b.life > 0) {
            b.x = nextX; 
            b.y = nextY;
          }

          if (b.life > 0) {
            if (!b.isPlayer && player.current.hp > 0) {
              const dist = Math.sqrt((b.x - player.current.x)**2 + (b.y - player.current.y)**2);
              if (dist < player.current.radius + 4) {
                b.life = 0;
                hpRef.current -= 1;
                player.current.hp = hpRef.current;
                player.current.hitTimer = 10;
                shakeRef.current = 15;
                hitstopRef.current = 3;
                playSound(120, 'square', 0.15, 0.4);
                spawnParticles(player.current.x, player.current.y, player.current.color, 20, 6);
                spawnParticles(player.current.x, player.current.y, '#ffffff', 8, 4);
                if (window.navigator?.vibrate) window.navigator.vibrate(200);

                if (hpRef.current <= 0 && gameStateRef.current === 'playing') {
                  handleGameOver();
                }
              }
            } else if (b.isPlayer) {
              enemies.current.forEach(e => {
                const dist = Math.sqrt((b.x - e.x)**2 + (b.y - e.y)**2);
                if (dist < e.radius + 4) {
                  b.life = 0;
                  e.hp -= 1;
                  e.hitTimer = 8;
                  spawnParticles(e.x, e.y, e.color, 10, 4);
                  spawnParticles(e.x, e.y, '#ffffff', 4, 2);
                  playSound(400, 'square', 0.05, 0.1);
                  
                  if (e.hp <= 0) {
                    const now = Date.now();
                    if (now - lastKillTime.current < 2000) {
                      comboRef.current = Math.min(comboRef.current + 1, 10);
                    } else {
                      comboRef.current = 1;
                    }
                    lastKillTime.current = now;

                    const points = e.type === 'bruiser' ? 5 : e.type === 'sniper' ? 3 : 1;
                    const comboBonus = Math.floor(points * comboRef.current * 0.5);
                    const total = points + comboBonus;
                    scoreRef.current += total;
                    
                    spawnParticles(e.x, e.y, e.color, 30, 8);
                    spawnParticles(e.x, e.y, '#fbbf24', 10, 5);
                    playSound(200, 'sawtooth', 0.1, 0.3);
                    addFloatingText(e.x, e.y - 20, `+${total}`, '#fbbf24', 14);
                    if (comboRef.current > 1) {
                      addFloatingText(e.x, e.y - 38, `COMBO x${comboRef.current}`, '#e879f9', 11);
                    }
                    if (window.navigator?.vibrate) window.navigator.vibrate(40);
                  } else {
                    addFloatingText(e.x, e.y - 15, '-1', e.color, 10);
                  }
                }
              });
            }
          }
        });

        enemies.current = enemies.current.filter(e => e.hp > 0);
        bullets.current = bullets.current.filter(b => b.life > 0);
      } // End of GamePlay Logic

      // --- FX Logic
      particles.current.forEach(p => { 
        p.x += p.dx * dt; 
        p.y += p.dy * dt; 
        p.angle += p.spin * dt; 
        p.life -= 0.04 * dt;
        p.dx *= p.drag;
        p.dy *= p.drag;
      });
      particles.current = particles.current.filter(p => p.life > 0);

      floatingTexts.current.forEach(ft => {
        ft.y -= 1 * dt;
        ft.life -= 0.018 * dt;
      });
      floatingTexts.current = floatingTexts.current.filter(ft => ft.life > 0);
    } // End of Pause Check

    render(ctx);
    requestRef.current = requestAnimationFrame(update);
  }, [handleGameOver, spawnWave]);

  // --- RENDER ---
  const render = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    
    // Clear
    ctx.fillStyle = '#020205';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Screen shake
    if (shakeRef.current > 0.5) {
      ctx.translate(
        (Math.random() - 0.5) * shakeRef.current,
        (Math.random() - 0.5) * shakeRef.current
      );
      if (!isPausedRef.current) shakeRef.current *= 0.92;
    }

    // Grid background
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < CANVAS_WIDTH; i += 20) {
      ctx.beginPath(); 
      ctx.moveTo(i, 0); 
      ctx.lineTo(i, CANVAS_HEIGHT); 
      ctx.stroke();
    }
    for (let i = 0; i < CANVAS_HEIGHT; i += 20) {
      ctx.beginPath(); 
      ctx.moveTo(0, i); 
      ctx.lineTo(CANVAS_WIDTH, i); 
      ctx.stroke();
    }

    // Walls with neon glow
    walls.current.forEach(w => {
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#3b82f6';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
      
      ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.fillRect(w.x, w.y, w.w, w.h);
      
      // Inner detail lines
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(w.x + 3, w.y + 3, w.w - 6, w.h - 6);
    });
    ctx.shadowBlur = 0;

    // Laser sights for snipers
    if (gameStateRef.current === 'playing') {
      enemies.current.filter(e => e.type === 'sniper').forEach(e => {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 10]);
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(e.angle) * CANVAS_WIDTH, e.y + Math.sin(e.angle) * CANVAS_WIDTH);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // Bullet trails
    bullets.current.forEach(b => {
      if (b.trail.length > 1) {
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(b.trail[0].x, b.trail[0].y);
        for (let i = 1; i < b.trail.length; i++) {
          ctx.lineTo(b.trail[i].x, b.trail[i].y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });

    // Draw tank function
    const drawTank = (t: Tank, isPlayer: boolean) => {
      ctx.save();
      ctx.translate(t.x, t.y);
      
      const flicker = t.hitTimer > 0 && Math.floor(frameCount.current / 2) % 2 === 0;
      if (flicker) {
        ctx.globalAlpha = 0.5;
      }

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, t.radius + 2, t.radius * 0.8, t.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tank body
      ctx.rotate(isPlayer ? t.angle : t.angle);
      
      // Treads
      ctx.fillStyle = isPlayer ? '#1e293b' : '#1a1a1a';
      const treadW = t.radius * 2.2;
      const treadH = t.radius * 0.35;
      ctx.fillRect(-treadW/2, -t.radius + 2, treadW, treadH);
      ctx.fillRect(-treadW/2, t.radius - treadH - 2, treadW, treadH);
      
      // Tread details
      ctx.strokeStyle = isPlayer ? '#334155' : '#2a2a2a';
      ctx.lineWidth = 1;
      for (let i = -treadW/2 + 4; i < treadW/2; i += 6) {
        ctx.beginPath();
        ctx.moveTo(i, -t.radius + 2);
        ctx.lineTo(i, -t.radius + 2 + treadH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i, t.radius - treadH - 2);
        ctx.lineTo(i, t.radius - 2);
        ctx.stroke();
      }

      // Main hull
      ctx.shadowBlur = 15;
      ctx.shadowColor = t.color;
      ctx.fillStyle = t.color;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.rect(-t.radius + 2, -t.radius + 4, t.radius * 2 - 4, t.radius * 2 - 8);
      ctx.fill();
      
      ctx.globalAlpha = flicker ? 0.5 : 1;
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Inner detail
      ctx.fillStyle = t.color;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(-t.radius * 0.3, -t.radius * 0.3, t.radius * 0.6, t.radius * 0.6);
      ctx.globalAlpha = flicker ? 0.5 : 1;

      // Turret
      ctx.rotate(isPlayer ? -t.angle + t.turretAngle : -t.angle + t.turretAngle);
      
      // Barrel
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(t.radius + 8, 0);
      ctx.stroke();
      
      // Muzzle flash
      if (t.muzzleFlash > 0) {
        ctx.fillStyle = '#fbbf24';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#fbbf24';
        ctx.beginPath();
        ctx.arc(t.radius + 10, 0, 4 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 15;
        ctx.shadowColor = t.color;
      }

      // Turret dome
      ctx.fillStyle = isPlayer ? '#0e7490' : t.color;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, t.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = flicker ? 0.5 : 1;

      ctx.restore();

      // Health bar
      if (t.hp < t.maxHp) {
        const barW = t.radius * 2;
        const barH = 3;
        const barY = t.y - t.radius - 10;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(t.x - barW/2, barY, barW, barH);
        const hpPct = t.hp / t.maxHp;
        ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(t.x - barW/2, barY, barW * hpPct, barH);
      }

      // Type indicator for enemies
      if (!isPlayer) {
        ctx.fillStyle = t.color;
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        const labels = { grunt: 'G', sniper: 'S', bruiser: 'B' };
        ctx.fillText(labels[t.type], t.x, t.y + t.radius + 12);
      }
    };

    // Draw enemies
    enemies.current.forEach(e => drawTank(e, false));
    
    // Draw player
    if (player.current.hp > 0) {
      drawTank(player.current, true);
      
      // Player shield indicator when full hp
      if (hpRef.current >= 3) {
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(player.current.x, player.current.y, player.current.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Bullets
    bullets.current.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Glow core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // Particles
    particles.current.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.lineTo(p.size, 0);
      ctx.stroke();
      ctx.restore();
    });
    ctx.globalAlpha = 1;

    // Floating texts
    floatingTexts.current.forEach(ft => {
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillStyle = ft.color;
      ctx.font = `900 ${ft.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowBlur = 3;
      ctx.shadowColor = 'black';
      ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Wave announcement
    if (waveAnnounceTimer.current > 0) {
      const progress = 1 - (waveAnnounceTimer.current / 90);
      ctx.globalAlpha = Math.max(0, Math.sin(progress * Math.PI));
      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#fbbf24';
      ctx.fillText(`WAVE ${waveRef.current}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);
      ctx.font = '900 14px sans-serif';
      ctx.fillText(`${enemies.current.length} ENEMIES`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 5);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // Vignette
    const vig = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 80, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 220);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.restore();
  };

  // --- CONTROLS ---
  const handleCanvasTap = useCallback((e: React.PointerEvent) => {
    if (gameStateRef.current !== 'playing' || player.current.hp <= 0 || isPausedRef.current) return;
    if (player.current.cooldown > 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

    const angle = Math.atan2(y - player.current.y, x - player.current.x);
    player.current.turretAngle = angle;
    player.current.angle = angle;

    const bSpeed = 7;
    bullets.current.push({
      id: Math.random(),
      x: player.current.x + Math.cos(angle) * 18,
      y: player.current.y + Math.sin(angle) * 18,
      dx: Math.cos(angle) * bSpeed,
      dy: Math.sin(angle) * bSpeed,
      speed: bSpeed,
      bounces: 3,
      isPlayer: true,
      color: '#06b6d4',
      life: 180,
      trail: []
    });
    
    player.current.cooldown = 12;
    player.current.muzzleFlash = 4;
    playSound(800, 'square', 0.05, 0.08);
    
    // SAFE RECOIL
    const recoilX = player.current.x - Math.cos(angle) * 2;
    const recoilY = player.current.y - Math.sin(angle) * 2;
    if (!checkWallCollision(recoilX, player.current.y, player.current.radius)) player.current.x = recoilX;
    if (!checkWallCollision(player.current.x, recoilY, player.current.radius)) player.current.y = recoilY;
  }, []);

  // GLOBAL JOYSTICK EVENT LISTENER
  const updateJoystick = useCallback((clientX: number, clientY: number) => {
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
    
    joystickKnobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    
    const deadzone = 0.15;
    const normalizedX = dx / maxR;
    const normalizedY = dy / maxR;
    moveInput.current = {
      x: Math.abs(normalizedX) < deadzone ? 0 : normalizedX,
      y: Math.abs(normalizedY) < deadzone ? 0 : normalizedY
    };
  }, []);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (joystickPointerId.current === e.pointerId) {
        updateJoystick(e.clientX, e.clientY);
      }
    };
    const handleUp = (e: PointerEvent) => {
      if (joystickPointerId.current === e.pointerId) {
        joystickPointerId.current = null;
        moveInput.current = { x: 0, y: 0 };
        if (joystickKnobRef.current) {
          joystickKnobRef.current.style.transform = `translate(0px, 0px)`;
        }
      }
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [updateJoystick]);

  const handleJoystickDown = useCallback((e: React.PointerEvent) => {
    if (gameStateRef.current !== 'playing' || isPausedRef.current) return;
    joystickPointerId.current = e.pointerId;
    updateJoystick(e.clientX, e.clientY);
  }, [updateJoystick]);

  const startNew = useCallback((e?: React.SyntheticEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    requestFullscreen();
    initAudio();
    
    player.current = { 
      id: 0, x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60,
      radius: 14, angle: -Math.PI/2, turretAngle: -Math.PI/2,
      hp: 3, maxHp: 3, type: 'player', color: '#06b6d4',
      speed: 2.8, cooldown: 0, hitTimer: 0, muzzleFlash: 0
    };
    enemies.current = [];
    bullets.current = [];
    particles.current = [];
    floatingTexts.current = [];
    scoreRef.current = 0;
    setScore(0);
    hpRef.current = 3;
    setHp(3);
    waveRef.current = 1;
    setWave(1);
    comboRef.current = 0;
    setCombo(0);
    shakeRef.current = 0;
    hitstopRef.current = 0;
    frameCount.current = 0;
    lastTimeRef.current = performance.now();
    waveAnnounceTimer.current = 0;
    moveInput.current = { x: 0, y: 0 };
    
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = `translate(0px, 0px)`;
    }
    
    buildMap();
    spawnWave(); 

    syncGameState('playing');
    isPausedRef.current = false;
    setIsPaused(false);
  }, [syncGameState, buildMap, spawnWave]);

  const togglePause = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);
    if (!isPausedRef.current) {
      lastTimeRef.current = performance.now();
    }
  }, []);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameStateRef.current !== 'playing') return;
      const speed = 0.8;
      if (['w', 'W', 'ArrowUp'].includes(e.key)) moveInput.current.y = -speed;
      if (['s', 'S', 'ArrowDown'].includes(e.key)) moveInput.current.y = speed;
      if (['a', 'A', 'ArrowLeft'].includes(e.key)) moveInput.current.x = -speed;
      if (['d', 'D', 'ArrowRight'].includes(e.key)) moveInput.current.x = speed;
      if (e.key === ' ' || e.key === 'Escape') togglePause();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (['w', 'W', 'ArrowUp', 's', 'S', 'ArrowDown'].includes(e.key)) moveInput.current.y = 0;
      if (['a', 'A', 'ArrowLeft', 'd', 'D', 'ArrowRight'].includes(e.key)) moveInput.current.x = 0;
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [togglePause]);

  // Auto-pause
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

  // Start loop securely
  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update]);

  return (
    <div className="h-[100dvh] w-screen bg-[#050508] text-white flex flex-col items-center pt-6 overflow-hidden select-none touch-none overscroll-none">
      <div className="w-full max-w-md px-4 h-full flex flex-col relative z-10">
        
        {/* HUD */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button onClick={handleBack} className="p-2 bg-zinc-900 rounded-xl border border-white/10 active:scale-90 shadow-sm transition-transform z-50">
              <ChevronLeft size={20} />
            </button>
            {gameState === 'playing' && (
              <button onClick={togglePause} className={`p-2 bg-zinc-900 rounded-xl border border-white/10 active:scale-90 shadow-sm transition-all ${isPaused ? 'text-amber-500 border-amber-500/30' : 'text-zinc-500 hover:text-cyan-400'}`}>
                {isPaused ? <Play size={18} /> : <PauseIcon />}
              </button>
            )}
            <button 
              onClick={() => { isMutedRef.current = !isMutedRef.current; setIsMuted(isMutedRef.current); }}
              className="p-2 bg-zinc-900 rounded-xl border border-white/10 active:scale-90 shadow-sm text-zinc-500 hover:text-cyan-400 transition-colors"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
          
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
              <Heart size={12} className={hp <= 1 ? 'text-red-500 animate-pulse' : 'text-cyan-400'} />
              <div className="flex gap-0.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`w-2 h-4 rounded-sm transition-all ${i < hp ? 'bg-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.8)]' : 'bg-zinc-800'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Best score */}
        {bestScore > 0 && (
          <div className="text-center mb-2">
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center justify-center gap-1">
              <Trophy size={10} className="text-yellow-600" /> Best: {bestScore}
            </span>
          </div>
        )}

        {/* CANVAS */}
        <div 
          onPointerDown={handleCanvasTap}
          className={`relative w-full aspect-[36/48] bg-[#020205] rounded-3xl border-2 transition-all overflow-hidden shadow-2xl touch-none cursor-crosshair ${gameState === 'gameover' ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'border-cyan-500/20'}`}
          style={{ touchAction: 'none' }}
        >
          {/* Combo indicator */}
          {combo > 1 && gameState === 'playing' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <span className="text-lg font-black italic text-fuchsia-400 animate-pulse drop-shadow-[0_0_10px_rgba(232,121,249,0.8)]">
                COMBO x{combo}
              </span>
            </div>
          )}

          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full block" />
          
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 pointer-events-none backdrop-blur-sm">
              <CombatLogo className="w-20 h-20 text-cyan-400 mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
              <button onPointerDown={startNew} className="px-10 py-4 bg-cyan-600 text-white font-black uppercase tracking-widest rounded-full shadow-[0_0_30px_rgba(6,182,212,0.4)] active:scale-95 transition-all hover:scale-105 pointer-events-auto">
                <Crosshair size={18} className="inline mr-2" /> Engage
              </button>
            </div>
          )}

          {isPaused && gameState === 'playing' && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-amber-500 mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">Paused</h2>
              <button onClick={togglePause} className="px-8 py-4 bg-amber-500 text-black font-black uppercase tracking-widest rounded-full flex items-center gap-2 active:scale-95 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all hover:scale-105">
                <Play size={18} fill="currentColor" /> Resume
              </button>
            </div>
          )}
          
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center z-20 p-6 text-center pointer-events-none backdrop-blur-md">
              <h2 className="text-3xl font-black italic uppercase tracking-tight text-white mb-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">Hull Destroyed</h2>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Final Score: {score}</p>
              {combo > 3 && <p className="text-[10px] font-bold text-fuchsia-400 mb-2">Best Combo: x{combo}</p>}
              {score >= bestScore && score > 0 && <p className="text-sm font-black text-yellow-400 mb-4 animate-bounce">NEW BEST!</p>}
              
              <button onPointerDown={startNew} className="px-10 py-4 bg-white text-red-600 font-black uppercase tracking-widest rounded-full shadow-xl active:scale-95 transition-all hover:scale-105 pointer-events-auto">
                <RotateCcw size={18} className="inline mr-2" /> Reboot
              </button>
              
              {isSyncing && (
                <p className="mt-4 text-[8px] font-black text-white/30 uppercase animate-pulse flex items-center gap-2">
                  <Loader2 size={10} className="animate-spin" /> Syncing...
                </p>
              )}
            </div>
          )}
        </div>

        {/* CONTROLS */}
        <div className="mt-4 mb-auto w-full flex flex-col items-center justify-center gap-6 touch-none select-none">
          
          {/* VIRTUAL JOYSTICK */}
          <div className="flex items-center justify-center w-[140px] h-[140px]">
            <div 
              ref={joystickBaseRef}
              onPointerDown={handleJoystickDown}
              className="relative w-32 h-32 bg-zinc-900/80 border-2 border-white/10 rounded-full flex items-center justify-center touch-none shadow-inner active:border-cyan-500/30 transition-colors cursor-crosshair"
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                <div className="w-full h-[1px] bg-cyan-500" />
                <div className="absolute h-full w-[1px] bg-cyan-500" />
              </div>
              <div 
                ref={joystickKnobRef}
                className="absolute w-12 h-12 bg-cyan-500/20 border-2 border-cyan-400 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)] pointer-events-none transition-transform"
              />
            </div>
          </div>

          {/* FIRE HINT */}
          <div className="opacity-40 flex items-center justify-center gap-2 pointer-events-none">
            <Target size={16} className="text-zinc-500" />
            <span className="text-[10px] font-black text-center text-zinc-500 uppercase tracking-widest leading-tight">
              Tap Game Area To Fire
            </span>
          </div>
          
        </div>

      </div>
    </div>
  );
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}
