'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Play, Pause, RotateCcw, Loader2, Trophy, ArrowUp, 
  ArrowDown, ArrowLeft, ArrowRight, Zap, Target, Volume2, VolumeX,
  Shield, Magnet, Gauge
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { RunnerLogo } from '@/components/ArcadeIcons';
import { motion, AnimatePresence } from 'framer-motion';

// --- ENGINE CONSTANTS ---
const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 460;
const FOV = 280;
const CAMERA_Y = 180;
const HORIZON_Y = 140;
const MAX_Z = 2000;
const LANE_WIDTH = 120;
const FIXED_DT = 16.667;

type ObstacleType = 'wall' | 'hurdle' | 'arch' | 'coin' | 'boost' | 'magnet' | 'shield';
type Entity = { 
  id: number, lane: number, z: number, type: ObstacleType, 
  color: string, collected?: boolean, bobOffset?: number 
};
type Particle = { 
  x: number, y: number, z: number, dx: number, dy: number, dz: number, 
  life: number, color: string, size: number, drag: number 
};
type FloatingText = { x: number, y: number, text: string, color: string, life: number, size: number };
type Star = { x: number, y: number, z: number, size: number, speed: number };

// Pseudo-3D Projection Math
const project = (x: number, y: number, z: number) => {
  const safeZ = Math.max(1, FOV + z);
  const scale = FOV / safeZ;
  const px = CANVAS_WIDTH / 2 + x * scale;
  const py = HORIZON_Y + (CAMERA_Y - y) * scale;
  return { px, py, scale };
};

export default function SynthRunner() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // React UI State
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  // Engine Refs (source of truth for game loop)
  const player = useRef({ 
    lane: 0, visX: 0, y: 0, vy: 0, 
    isDucking: false, duckTimer: 0, z: 50,
    lean: 0, engineGlow: 0 
  });
  const entities = useRef<Entity[]>([]);
  const particles = useRef<Particle[]>([]);
  const floatingTexts = useRef<FloatingText[]>([]);
  
  const stars = useRef<Star[]>([]);
  const groundOffset = useRef(0);
  
  const frameCount = useRef(0);
  const lastTimeRef = useRef(0);
  const shakeRef = useRef(0);
  const hitstopRef = useRef(0);
  const scoreRef = useRef(0);
  const coinsRef = useRef(0);
  const speedRef = useRef(12);
  const distanceRef = useRef(0);
  const comboRef = useRef(0);
  const lastCoinTime = useRef(0);
  
  const spawnTimerRef = useRef(0);
  const magnetActive = useRef(false);
  const magnetTimer = useRef(0);
  const shieldActive = useRef(false);
  const shieldTimer = useRef(0);
  const touchStart = useRef<{x: number, y: number} | null>(null);
  
  const isRunning = useRef(false);
  const requestRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gameStateRef = useRef<'idle' | 'playing' | 'gameover'>('idle');
  const isPausedRef = useRef(false);
  const isMutedRef = useRef(false);

  // Sync refs
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Init
  useEffect(() => {
    stars.current = Array.from({ length: 60 }, () => ({
      x: (Math.random() - 0.5) * 3000,
      y: Math.random() * 600 + 20,
      z: Math.random() * MAX_Z,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.5 + 0.2
    }));
    const saved = localStorage.getItem('runnerBest');
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

  const handleBack = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    exitFullscreen();
    isRunning.current = false;
    cancelAnimationFrame(requestRef.current);
    router.back();
  };

  // --- PARTICLES & FX ---
  const spawnParticles = (x: number, y: number, z: number, color: string, amount = 15, speed = 8) => {
    for (let i = 0; i < amount; i++) {
      const angle = (Math.PI * 2 * i) / amount + Math.random() * 0.5;
      const spd = speed * (0.5 + Math.random());
      particles.current.push({ 
        x, y, z, 
        dx: Math.cos(angle) * spd, 
        dy: Math.sin(angle) * spd + 5, 
        dz: (Math.random() - 0.5) * spd, 
        life: 1.0, 
        color,
        size: Math.random() * 3 + 1,
        drag: 0.98
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
    gameStateRef.current = 'gameover';
    setGameState('gameover');
    
    shakeRef.current = 30;
    hitstopRef.current = 20;
    playSound(80, 'sawtooth', 0.3, 1.0);
    if (window.navigator?.vibrate) window.navigator.vibrate([200, 100, 300]);

    const p = player.current;
    spawnParticles(p.visX, p.y, p.z, '#e879f9', 40, 12);
    spawnParticles(p.visX, p.y, p.z, '#facc15', 20, 8);

    const finalScore = Math.floor(scoreRef.current);

    setBestScore(prev => {
      if (finalScore > prev) {
        localStorage.setItem('runnerBest', String(finalScore));
        return finalScore;
      }
      return prev;
    });

    const studentId = localStorage.getItem('studentId');
    if (studentId && finalScore > 0) {
      setIsSyncing(true);
      try {
        const { data: existing } = await supabase
          .from('arcade_scores')
          .select('*')
          .eq('student_id', studentId)
          .eq('game_name', 'runner')
          .maybeSingle();

        if (!existing) {
          await supabase.from('arcade_scores').insert([{ 
            student_id: studentId, 
            game_name: 'runner', 
            score: finalScore 
          }]);
        } else if (finalScore > existing.score) {
          await supabase.from('arcade_scores').update({ score: finalScore }).eq('id', existing.id);
        }
      } catch (e) { /* ignore */ }
      setIsSyncing(false);
    }
  }, []);

  // --- SPAWNING ---
  const spawnChunk = useCallback(() => {
    const zOffset = MAX_Z;
    const r = Math.random();
    const lane = Math.floor(Math.random() * 3) - 1;

    if (r < 0.25) {
      for (let i = 0; i < 4; i++) {
        entities.current.push({ 
          id: Math.random(), lane, z: zOffset + (i * 70), 
          type: 'coin', color: '#facc15', bobOffset: Math.random() * Math.PI * 2 
        });
      }
    } else if (r < 0.35) {
      const types: ObstacleType[] = ['boost', 'magnet', 'shield'];
      const type = types[Math.floor(Math.random() * types.length)];
      const colors = { boost: '#f97316', magnet: '#a855f7', shield: '#3b82f6' };
      entities.current.push({ 
        id: Math.random(), lane, z: zOffset, 
        type, color: colors[type as keyof typeof colors], bobOffset: 0 
      });
    } else {
      const typeR = Math.random();
      let type: ObstacleType = 'wall';
      let color = '#ec4899';
      
      if (typeR > 0.7) { type = 'hurdle'; color = '#22d3ee'; }
      else if (typeR > 0.4) { type = 'arch'; color = '#a855f7'; }

      entities.current.push({ id: Math.random(), lane, z: zOffset, type, color });

      if (Math.random() > 0.65) {
        const otherLane = lane === 0 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        entities.current.push({ id: Math.random(), lane: otherLane, z: zOffset + 30, type: 'wall', color: '#ec4899' });
      }
    }
  }, []);

  // --- MAIN GAME LOOP ---
  const update = useCallback(() => {
    if (!isRunning.current) return; 
    
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
    frameCount.current += dt;

    if (Math.floor(frameCount.current) % 10 === 0) {
      setScore(Math.floor(scoreRef.current));
      setCoins(coinsRef.current);
      setMultiplier(Math.max(1, Math.floor(speedRef.current / 8)));
      setCombo(comboRef.current);
    }

    if (hitstopRef.current > 0) {
      hitstopRef.current -= dt;
      render(ctx);
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    if (gameStateRef.current === 'playing' && !isPausedRef.current) {
      const currentMult = Math.max(1, Math.floor(speedRef.current / 8));
      
      speedRef.current += 0.008 * dt;
      distanceRef.current += speedRef.current * dt;
      scoreRef.current += speedRef.current * 0.03 * dt * currentMult;
      groundOffset.current = (groundOffset.current + speedRef.current * dt) % 100;

      if (magnetTimer.current > 0) {
        magnetTimer.current -= dt;
        if (magnetTimer.current <= 0) magnetActive.current = false;
      }
      if (shieldTimer.current > 0) {
        shieldTimer.current -= dt;
        if (shieldTimer.current <= 0) shieldActive.current = false;
      }

      spawnTimerRef.current -= dt;
      if (spawnTimerRef.current <= 0) {
        spawnChunk();
        spawnTimerRef.current = Math.max(10, 700 / speedRef.current);
      }

      const p = player.current;
      const targetX = p.lane * LANE_WIDTH;
      p.visX += (targetX - p.visX) * 0.25 * dt;
      p.lean += ((p.lane * 15) - p.lean) * 0.1 * dt;
      
      p.y += p.vy * dt;
      p.vy -= 2.0 * dt;
      if (p.y <= 0) {
        if (p.vy < -10) {
          playSound(150, 'square', 0.05, 0.05);
          spawnParticles(p.visX, 0, p.z, '#c084fc', 6, 4);
          shakeRef.current = 3;
        }
        p.y = 0; p.vy = 0;
      }

      if (p.duckTimer > 0) {
        p.duckTimer -= dt;
        if (p.duckTimer <= 0) p.isDucking = false;
      }

      p.engineGlow = 0.5 + Math.sin(frameCount.current * 0.2) * 0.3 + (speedRef.current / 40);

      if (Math.random() < 0.3) {
        particles.current.push({
          x: p.visX + (Math.random() - 0.5) * 10,
          y: 5,
          z: p.z - 10,
          dx: (Math.random() - 0.5) * 2,
          dy: Math.random() * 2,
          dz: -speedRef.current * 0.5,
          life: 0.6,
          color: speedRef.current > 20 ? '#f97316' : '#22d3ee',
          size: Math.random() * 3 + 2,
          drag: 0.95
        });
      }

      for (let i = entities.current.length - 1; i >= 0; i--) {
        const e = entities.current[i];
        e.z -= speedRef.current * dt;

        if (e.type === 'coin' && magnetActive.current && !e.collected) {
          const ex = e.lane * LANE_WIDTH;
          const dist = Math.sqrt((ex - p.visX) ** 2 + (e.z - p.z) ** 2);
          if (dist < 300) {
            e.lane += (p.lane - e.lane) * 0.05 * dt;
          }
        }

        if (e.z < -100) {
          entities.current.splice(i, 1);
          continue;
        }

        if (e.z < p.z + 25 && e.z > p.z - 25) {
          const laneDist = Math.abs(p.visX - (e.lane * LANE_WIDTH));
          
          if (laneDist < 60) {
            if (e.type === 'coin' && !e.collected) {
              e.collected = true;
              coinsRef.current += 1;
              
              const now = Date.now();
              if (now - lastCoinTime.current < 1500) {
                comboRef.current = Math.min(comboRef.current + 1, 10);
              } else {
                comboRef.current = 1;
              }
              lastCoinTime.current = now;

              const points = 10 * comboRef.current * currentMult;
              scoreRef.current += points;
              playSound(800 + (comboRef.current * 30), 'sine', 0.04, 0.08);
              spawnParticles(e.lane * LANE_WIDTH, 25, p.z, '#facc15', 5, 3);
              addFloatingText(e.lane * LANE_WIDTH, 30, `+${points}`, '#facc15', 12);
              if (comboRef.current > 1) {
                addFloatingText(e.lane * LANE_WIDTH, 50, `COMBO x${comboRef.current}`, '#e879f9', 10);
              }
            } 
            else if (!e.collected && !['coin', 'boost', 'magnet', 'shield'].includes(e.type)) {
              let hit = false;
              if (e.type === 'wall') hit = true;
              else if (e.type === 'hurdle' && p.y < 40) hit = true;
              else if (e.type === 'arch' && !p.isDucking) hit = true;

              if (hit) {
                if (shieldActive.current) {
                  shieldActive.current = false;
                  shieldTimer.current = 0;
                  e.collected = true;
                  playSound(300, 'square', 0.08, 0.3);
                  spawnParticles(p.visX, p.y, p.z, '#3b82f6', 15, 5);
                  addFloatingText(p.visX, p.y + 30, 'SHIELD BREAK!', '#3b82f6', 14);
                  continue;
                }
                handleGameOver();
                break;
              }
            }
            else if (['boost', 'magnet', 'shield'].includes(e.type) && !e.collected) {
              e.collected = true;
              playSound(1000, 'sine', 0.1, 0.2);
              spawnParticles(e.lane * LANE_WIDTH, 30, p.z, e.color, 12, 5);
              
              if (e.type === 'boost') {
                speedRef.current = Math.min(speedRef.current + 8, 35);
                addFloatingText(e.lane * LANE_WIDTH, 40, 'SPEED BOOST!', '#f97316', 16);
              } else if (e.type === 'magnet') {
                magnetActive.current = true;
                magnetTimer.current = 400;
                addFloatingText(e.lane * LANE_WIDTH, 40, 'MAGNET!', '#a855f7', 16);
              } else if (e.type === 'shield') {
                shieldActive.current = true;
                shieldTimer.current = 400;
                addFloatingText(e.lane * LANE_WIDTH, 40, 'SHIELD!', '#3b82f6', 16);
              }
            }
          }
        }
      }
    }

    if (!isPausedRef.current) {
      particles.current.forEach(p => {
        p.x += p.dx * dt;
        p.y += p.dy * dt;
        p.z += (p.dz - speedRef.current) * dt;
        p.dy -= 1.0 * dt;
        if (p.y < 0) { p.y = 0; p.dy *= -0.5; }
        p.life -= 0.04 * dt;
        p.dx *= p.drag;
        p.dy *= p.drag;
      });
      particles.current = particles.current.filter(p => p.life > 0);

      floatingTexts.current.forEach(ft => {
        ft.y -= 1.5 * dt;
        ft.life -= 0.02 * dt;
      });
      floatingTexts.current = floatingTexts.current.filter(ft => ft.life > 0);
    }

    render(ctx);
    requestRef.current = requestAnimationFrame(update);
  }, [handleGameOver, spawnChunk]);

  // --- RENDER FUNCTION ---
  const render = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    
    ctx.fillStyle = '#030308';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (shakeRef.current > 0.5) {
      ctx.translate(
        (Math.random() - 0.5) * shakeRef.current,
        (Math.random() - 0.5) * shakeRef.current
      );
      shakeRef.current *= 0.92;
    }

    const skyGrad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
    skyGrad.addColorStop(0, '#0a0a1a');
    skyGrad.addColorStop(0.5, '#1a0a2e');
    skyGrad.addColorStop(1, '#2d1b69');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, HORIZON_Y);

    ctx.fillStyle = 'white';
    stars.current.forEach(s => {
      if (gameStateRef.current === 'playing') {
        s.z -= speedRef.current * s.speed * 3 * 0.5;
        if (s.z <= 10) {
          s.z = MAX_Z;
          s.x = (Math.random() - 0.5) * 3000;
        }
      }
      const proj = project(s.x, s.y, s.z);
      if (proj.scale > 0 && proj.py < HORIZON_Y - 5) {
        const alpha = Math.min(1, (s.z / MAX_Z) * 2);
        ctx.globalAlpha = alpha * s.speed;
        ctx.fillRect(proj.px, proj.py, s.size * proj.scale, s.size * proj.scale * 2);
      }
    });
    ctx.globalAlpha = 1;

    const sunY = HORIZON_Y - 10;
    const sunPulse = Math.sin(frameCount.current * 0.02) * 5;
    ctx.shadowBlur = 40 + sunPulse;
    ctx.shadowColor = '#f97316';
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH / 2, sunY, 50 + sunPulse * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (let i = -40; i < 40; i += 6) {
      const lineY = sunY + i;
      if (lineY < HORIZON_Y) {
        const width = Math.sqrt(2500 - i * i) * 2;
        ctx.fillRect(CANVAS_WIDTH / 2 - width / 2, lineY, width, 2);
      }
    }

    const groundGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, CANVAS_HEIGHT);
    groundGrad.addColorStop(0, '#1a0a3e');
    groundGrad.addColorStop(0.3, '#0f0520');
    groundGrad.addColorStop(1, '#050210');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, HORIZON_Y, CANVAS_WIDTH, CANVAS_HEIGHT - HORIZON_Y);

    ctx.strokeStyle = 'rgba(232, 121, 249, 0.15)';
    ctx.lineWidth = 1;
    
    [-1.5, -0.5, 0.5, 1.5].forEach(laneX => {
      const worldX = laneX * LANE_WIDTH;
      const top = project(worldX, 0, MAX_Z);
      const bottom = project(worldX, 0, 0);
      ctx.beginPath();
      ctx.moveTo(top.px, top.py);
      ctx.lineTo(bottom.px, bottom.py);
      ctx.stroke();
    });

    const gridSpacing = 80;
    const offset = groundOffset.current % gridSpacing;
    for (let z = MAX_Z; z >= 0; z -= gridSpacing) {
      const actualZ = z - offset;
      if (actualZ > 50) {
        const left = project(-1000, 0, actualZ);
        const right = project(1000, 0, actualZ);
        const alpha = Math.min(1, actualZ / 800);
        ctx.strokeStyle = `rgba(232, 121, 249, ${alpha * 0.2})`;
        ctx.beginPath();
        ctx.moveTo(left.px, left.py);
        ctx.lineTo(right.px, right.py);
        ctx.stroke();
      }
    }

    ctx.fillStyle = 'rgba(232, 121, 249, 0.05)';
    const centerTop = project(0, 0, MAX_Z);
    const centerBottom = project(0, 0, 0);
    ctx.fillRect(centerTop.px - 2, centerTop.py, 4, centerBottom.py - centerTop.py);

    const renderList = [
      ...entities.current.filter(e => !e.collected).map(e => ({ ...e, isEntity: true })),
      ...particles.current.map(p => ({ ...p, isParticle: true })),
      ...floatingTexts.current.map(ft => ({ ...ft, isText: true, z: 50 }))
    ].sort((a: any, b: any) => (b.z || 0) - (a.z || 0));

    renderList.forEach((item: any) => {
      if (item.isParticle) {
        const p = item as Particle;
        const proj = project(p.x, p.y, p.z);
        if (proj.scale > 0) {
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = p.size > 2 ? 8 : 0;
          ctx.shadowColor = p.color;
          ctx.fillRect(
            proj.px - p.size * proj.scale / 2,
            proj.py - p.size * proj.scale / 2,
            p.size * proj.scale,
            p.size * proj.scale
          );
        }
      } else if (item.isText) {
        const ft = item as FloatingText;
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.fillStyle = ft.color;
        ctx.font = `900 ${ft.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'black';
        ctx.fillText(ft.text, ft.x, ft.y);
      } else {
        const e = item as Entity;
        const ex = e.lane * LANE_WIDTH;
        const baseProj = project(ex, 0, e.z);
        if (baseProj.scale <= 0) return;

        const bob = e.bobOffset ? Math.sin(frameCount.current * 0.1 + e.bobOffset) * 8 : 0;

        if (e.type === 'coin') {
          const cProj = project(ex, 25 + bob, e.z);
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#facc15';
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.ellipse(cProj.px, cProj.py, 10 * baseProj.scale, 12 * baseProj.scale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(cProj.px, cProj.py, 4 * baseProj.scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } 
        else if (e.type === 'wall') {
          const topProj = project(ex, 55, e.z);
          ctx.fillStyle = 'rgba(236, 72, 153, 0.15)';
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 2 * baseProj.scale;
          ctx.shadowBlur = 10;
          ctx.shadowColor = e.color;
          const w = 85 * baseProj.scale;
          const h = baseProj.py - topProj.py;
          ctx.fillRect(baseProj.px - w / 2, topProj.py, w, h);
          ctx.strokeRect(baseProj.px - w / 2, topProj.py, w, h);
          ctx.fillStyle = e.color;
          ctx.globalAlpha = 0.6;
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(baseProj.px - w / 2 + 4, topProj.py + h * 0.2 + i * h * 0.25, w - 8, 2 * baseProj.scale);
          }
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
        }
        else if (e.type === 'hurdle') {
          const topProj = project(ex, 35, e.z);
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 3 * baseProj.scale;
          ctx.shadowBlur = 8;
          ctx.shadowColor = e.color;
          const w = 85 * baseProj.scale;
          ctx.beginPath();
          ctx.moveTo(baseProj.px - w / 2, baseProj.py);
          ctx.lineTo(baseProj.px - w / 2, topProj.py);
          ctx.lineTo(baseProj.px + w / 2, topProj.py);
          ctx.lineTo(baseProj.px + w / 2, baseProj.py);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(baseProj.px - w / 2, topProj.py + (baseProj.py - topProj.py) * 0.5);
          ctx.lineTo(baseProj.px + w / 2, topProj.py + (baseProj.py - topProj.py) * 0.5);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        else if (e.type === 'arch') {
          const topProj = project(ex, 95, e.z);
          const bottomProj = project(ex, 45, e.z);
          ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 2 * baseProj.scale;
          ctx.shadowBlur = 10;
          ctx.shadowColor = e.color;
          const w = 85 * baseProj.scale;
          const h = bottomProj.py - topProj.py;
          ctx.fillRect(baseProj.px - w / 2, topProj.py, w, h);
          ctx.strokeRect(baseProj.px - w / 2, topProj.py, w, h);
          ctx.beginPath();
          ctx.ellipse(baseProj.px, topProj.py, w / 2, 8 * baseProj.scale, 0, Math.PI, 0);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        else if (['boost', 'magnet', 'shield'].includes(e.type)) {
          const pProj = project(ex, 30 + bob, e.z);
          const colors = { boost: '#f97316', magnet: '#a855f7', shield: '#3b82f6' };
          const color = colors[e.type as keyof typeof colors];
          
          ctx.shadowBlur = 20;
          ctx.shadowColor = color;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(pProj.px, pProj.py, 14 * baseProj.scale, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2 * baseProj.scale;
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.arc(pProj.px, pProj.py, 18 * baseProj.scale, frameCount.current * 0.05, frameCount.current * 0.05 + Math.PI * 1.5);
          ctx.stroke();
          ctx.globalAlpha = 1;
          
          ctx.fillStyle = 'white';
          ctx.font = `bold ${10 * baseProj.scale}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const icons = { boost: '⚡', magnet: 'M', shield: 'S' };
          ctx.fillText(icons[e.type as keyof typeof icons], pProj.px, pProj.py);
          ctx.shadowBlur = 0;
        }
      }
    });

    if (gameStateRef.current === 'playing' || gameStateRef.current === 'gameover') {
      const p = player.current;
      const pProj = project(p.visX, p.y, p.z);
      const pScale = pProj.scale;
      
      ctx.save();
      ctx.translate(pProj.px, pProj.py);
      ctx.rotate(p.lean * Math.PI / 180);
      
      if (shieldActive.current) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4 + Math.sin(frameCount.current * 0.1) * 0.2;
        ctx.beginPath();
        ctx.ellipse(0, -10 * pScale, 25 * pScale, 20 * pScale, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (magnetActive.current) {
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3 + Math.sin(frameCount.current * 0.15) * 0.2;
        ctx.beginPath();
        ctx.arc(0, -10 * pScale, 40 * pScale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.shadowBlur = 20 * p.engineGlow;
      ctx.shadowColor = speedRef.current > 20 ? '#f97316' : '#22d3ee';
      
      const duckScale = p.isDucking ? 0.7 : 1;
      const bodyW = 35 * pScale;
      const bodyH = 18 * pScale * duckScale;
      
      ctx.fillStyle = speedRef.current > 20 ? '#f97316' : '#e879f9';
      ctx.beginPath();
      ctx.moveTo(0, -bodyH);
      ctx.lineTo(bodyW / 2, 0);
      ctx.lineTo(bodyW / 3, bodyH * 0.3);
      ctx.lineTo(-bodyW / 3, bodyH * 0.3);
      ctx.lineTo(-bodyW / 2, 0);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.ellipse(0, -bodyH * 0.4, bodyW * 0.25, bodyH * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#67e8f9';
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.ellipse(0, -bodyH * 0.45, bodyW * 0.15, bodyH * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(-bodyW * 0.4, bodyH * 0.2, bodyW * 0.15, bodyH * 0.4);
      ctx.fillRect(bodyW * 0.25, bodyH * 0.2, bodyW * 0.15, bodyH * 0.4);

      const flameH = (8 + Math.random() * 6 + speedRef.current * 0.3) * pScale;
      const flameColor = speedRef.current > 20 ? '#fbbf24' : '#22d3ee';
      ctx.fillStyle = flameColor;
      ctx.beginPath();
      ctx.moveTo(-bodyW * 0.25, bodyH * 0.5);
      ctx.lineTo(-bodyW * 0.15, bodyH * 0.5 + flameH);
      ctx.lineTo(-bodyW * 0.05, bodyH * 0.5);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(bodyW * 0.05, bodyH * 0.5);
      ctx.lineTo(bodyW * 0.15, bodyH * 0.5 + flameH);
      ctx.lineTo(bodyW * 0.25, bodyH * 0.5);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.restore();
    }

    if (speedRef.current > 20 && gameStateRef.current === 'playing') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const x = Math.random() * CANVAS_WIDTH;
        const y = HORIZON_Y + Math.random() * (CANVAS_HEIGHT - HORIZON_Y);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 20 + Math.random() * 30);
        ctx.stroke();
      }
    }

    const vig = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 100, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 250);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.restore();
  };

  // --- INPUT HANDLING ---
  const handleMove = useCallback((dir: 'left' | 'right' | 'up' | 'down') => {
    if (gameStateRef.current !== 'playing' || isPausedRef.current) return;
    const p = player.current;
    
    if (dir === 'left' && p.lane > -1) { p.lane -= 1; playSound(300, 'triangle', 0.04); }
    if (dir === 'right' && p.lane < 1) { p.lane += 1; playSound(300, 'triangle', 0.04); }
    
    if (dir === 'up' && p.y <= 0) { 
      p.vy = 22; 
      p.isDucking = false; 
      p.duckTimer = 0; 
      playSound(500, 'square', 0.08); 
    }
    
    if (dir === 'down') {
      if (p.y > 0) {
        p.vy = -30; 
        playSound(150, 'sawtooth', 0.08);
      } else {
        p.isDucking = true; 
        p.duckTimer = 30; 
        playSound(200, 'sawtooth', 0.08); 
        spawnParticles(p.visX, 0, p.z, '#a855f7', 8, 3); 
      }
    }
  }, []);

  const handleTouchStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (gameStateRef.current !== 'playing') return;
    touchStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (gameStateRef.current !== 'playing' || !touchStart.current || isPausedRef.current) return;
    const dx = e.clientX - touchStart.current.x;
    const dy = e.clientY - touchStart.current.y;
    const THRESHOLD = 25;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > THRESHOLD) handleMove(dx > 0 ? 'right' : 'left');
    } else {
      if (Math.abs(dy) > THRESHOLD) handleMove(dy > 0 ? 'down' : 'up');
    }
    touchStart.current = null;
  }, [handleMove]);

  const startNew = useCallback((e?: React.SyntheticEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    requestFullscreen();
    initAudio();
    
    player.current = { lane: 0, visX: 0, y: 0, vy: 0, isDucking: false, duckTimer: 0, z: 50, lean: 0, engineGlow: 0.5 };
    entities.current = [];
    particles.current = [];
    floatingTexts.current = [];
    scoreRef.current = 0;
    setScore(0);
    coinsRef.current = 0;
    setCoins(0);
    comboRef.current = 0;
    setCombo(0);
    speedRef.current = 12;
    setMultiplier(1);
    distanceRef.current = 0;
    groundOffset.current = 0;
    shakeRef.current = 0;
    hitstopRef.current = 0;
    frameCount.current = 0;
    lastTimeRef.current = performance.now();
    lastCoinTime.current = 0;
    spawnTimerRef.current = 0;
    magnetActive.current = false;
    magnetTimer.current = 0;
    shieldActive.current = false;
    shieldTimer.current = 0;
    
    syncGameState('playing');
    isRunning.current = true;
    isPausedRef.current = false;
    setIsPaused(false);
    
    cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(update);
  }, [syncGameState, update]);

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
      if (['ArrowUp', 'w', 'W'].includes(e.key)) handleMove('up');
      if (['ArrowDown', 's', 'S'].includes(e.key)) handleMove('down');
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) handleMove('left');
      if (['ArrowRight', 'd', 'D'].includes(e.key)) handleMove('right');
      if (e.key === ' ' || e.key === 'Escape') togglePause();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleMove, togglePause]);

  // Auto-pause on tab blur
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

  // Start loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update]);

  // Cleanup
  useEffect(() => {
    return () => {
      isRunning.current = false;
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', padding: '40px 20px 120px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none', WebkitUserSelect: 'none', overflow: 'hidden', touchAction: 'none' }}>
      
      {/* Background Ambience */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(232, 121, 249, 0.1)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '-10%', width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(250, 204, 21, 0.1)', filter: 'blur(80px)' }} />
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 10 }}>
        
        {/* Header */}
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
                onClick={togglePause} 
                style={{ width: '45px', height: '45px', borderRadius: '14px', background: isPaused ? 'rgba(245, 158, 11, 0.1)' : '#f8fafc', border: isPaused ? '2px solid rgba(245, 158, 11, 0.3)' : '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isPaused ? '#f59e0b' : '#334155', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              >
                {isPaused ? <Play size={20} /> : <Pause size={20} />}
              </button>
            )}
            <button 
              onClick={() => { isMutedRef.current = !isMutedRef.current; setIsMuted(isMutedRef.current); }}
              style={{ width: '45px', height: '45px', borderRadius: '14px', background: '#f8fafc', border: '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
          
          <div style={{ textAlign: 'right' }}>
             <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#e879f9' }}>Synth Runner</h1>
             {bestScore > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'end', gap: '4px', fontSize: '9px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <Trophy size={10} color="#94a3b8" /> Best: {bestScore}
                </div>
             )}
          </div>
        </div>

        {/* Status Board */}
        <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '24px' }}>
          <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Score</span>
            <span style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: '#0f172a', lineHeight: 1 }}>{score}</span>
          </div>

          <div style={{ flex: 1, background: 'rgba(232, 121, 249, 0.1)', border: '1px solid rgba(232, 121, 249, 0.2)', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(232, 121, 249, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', padding: '4px 8px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                    <Trophy size={12} color="#facc15" />
                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#facc15' }}>{coins}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', padding: '4px 8px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                    <Zap size={12} color="#e879f9" />
                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#e879f9' }}>{multiplier}x</span>
                </div>
            </div>
            <span style={{ fontSize: '9px', fontWeight: 900, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Run</span>
          </div>
        </div>

        {/* CANVAS */}
        <div 
          onPointerDown={handleTouchStart}
          onPointerUp={handleTouchEnd}
          style={{
            position: 'relative', width: '100%', maxWidth: '340px', height: '460px', background: '#030308', borderRadius: '30px', 
            border: gameState === 'gameover' ? '2px solid #ef4444' : '2px solid rgba(232, 121, 249, 0.3)', 
            overflow: 'hidden', transition: 'border 0.2s ease, box-shadow 0.2s ease',
            boxShadow: gameState === 'gameover' ? '0 0 50px rgba(239, 68, 68, 0.4)' : '0 10px 40px rgba(232, 121, 249, 0.15)',
            touchAction: 'none'
          }}
        >
          {/* Combo indicator */}
          {combo > 1 && gameState === 'playing' && (
            <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, pointerEvents: 'none' }}>
              <span style={{ fontSize: '18px', fontWeight: 900, fontStyle: 'italic', color: '#e879f9', textShadow: '0 0 10px rgba(232,121,249,0.8)' }} className="animate-pulse">
                COMBO x{combo}
              </span>
            </div>
          )}

          {/* Powerup indicators */}
          {gameState === 'playing' && (
            <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10, pointerEvents: 'none' }}>
              {shieldActive.current && (
                <div style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', padding: '4px 6px' }}>
                  <Shield size={14} color="#60a5fa" />
                </div>
              )}
              {magnetActive.current && (
                <div style={{ background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '6px', padding: '4px 6px' }}>
                  <Magnet size={14} color="#a855f7" />
                </div>
              )}
              {speedRef.current > 20 && (
                <div style={{ background: 'rgba(249, 115, 22, 0.2)', border: '1px solid rgba(249, 115, 22, 0.3)', borderRadius: '6px', padding: '4px 6px' }}>
                  <Gauge size={14} color="#f97316" />
                </div>
              )}
            </div>
          )}
          
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ width: '100%', height: '100%', display: 'block' }} />
          
          <AnimatePresence>
            {gameState === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                <RunnerLogo className="w-20 h-20 text-fuchsia-400 mb-6 animate-pulse" style={{ filter: 'drop-shadow(0 0 15px rgba(232,121,249,0.5))' }} />
                <button 
                  onPointerDown={startNew} 
                  style={{ padding: '16px 40px', background: '#e879f9', color: '#fff', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(232, 121, 249, 0.4)', pointerEvents: 'auto' }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Play size={18} fill="currentColor" /> Jack In
                </button>
                <p style={{ margin: '16px 0 0 0', fontSize: '8px', fontWeight: 900, color: 'rgba(232, 121, 249, 0.6)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Engages Fullscreen</p>
              </motion.div>
            )}

            {isPaused && gameState === 'playing' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                <h2 style={{ margin: '0 0 24px 0', fontSize: '30px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-1px', color: '#f59e0b', textShadow: '0 0 15px rgba(245,158,11,0.5)' }}>Paused</h2>
                <button 
                  onPointerDown={togglePause} 
                  style={{ padding: '16px 40px', background: '#f59e0b', color: '#000', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(245, 158, 11, 0.4)', pointerEvents: 'auto' }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Play size={18} fill="currentColor" /> Resume
                </button>
              </motion.div>
            )}
            
            {gameState === 'gameover' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(69, 10, 10, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, padding: '24px', textAlign: 'center' }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '30px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-1px', color: '#fff', textShadow: '0 0 10px rgba(239,68,68,0.8)' }}>Derezzed</h2>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 900, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '2px' }}>Distance: {score}</p>
                {combo > 3 && <p style={{ margin: '0 0 16px 0', fontSize: '12px', fontWeight: 900, color: '#e879f9' }}>Best Combo: x{combo}</p>}
                {score >= bestScore && score > 0 && <p style={{ margin: '0 0 24px 0', fontSize: '14px', fontWeight: 900, color: '#facc15' }} className="animate-bounce">NEW BEST!</p>}
                
                <button 
                  onPointerDown={startNew} 
                  style={{ padding: '16px 40px', background: '#fff', color: '#dc2626', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 10px 15px rgba(0,0,0,0.3)', pointerEvents: 'auto' }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <RotateCcw size={18} /> Reboot
                </button>
                
                {isSyncing && (
                  <p style={{ margin: '16px 0 0 0', fontSize: '8px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }} className="animate-pulse">
                    <Loader2 size={10} className="animate-spin" /> Syncing...
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CONTROLS */}
        <div style={{ marginTop: '24px', marginBottom: 'auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', touchAction: 'none', userSelect: 'none' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', width: '140px' }}>
            <div /> 
            <button 
              onPointerDown={(e) => { e.preventDefault(); handleMove('up'); }}
              style={{ height: '48px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
              onMouseDown={e => { e.currentTarget.style.background = 'rgba(232, 121, 249, 0.2)'; e.currentTarget.style.borderColor = 'rgba(232, 121, 249, 0.5)'; e.currentTarget.style.color = '#e879f9'; e.currentTarget.style.transform = 'scale(0.85)'; }}
              onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <ArrowUp size={24} strokeWidth={3} />
            </button>
            <div /> 

            <button 
              onPointerDown={(e) => { e.preventDefault(); handleMove('left'); }}
              style={{ height: '48px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
              onMouseDown={e => { e.currentTarget.style.background = 'rgba(232, 121, 249, 0.2)'; e.currentTarget.style.borderColor = 'rgba(232, 121, 249, 0.5)'; e.currentTarget.style.color = '#e879f9'; e.currentTarget.style.transform = 'scale(0.85)'; }}
              onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <ArrowLeft size={24} strokeWidth={3} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
              <RunnerLogo className="w-8 h-8 text-zinc-500" />
            </div>

            <button 
              onPointerDown={(e) => { e.preventDefault(); handleMove('right'); }}
              style={{ height: '48px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
              onMouseDown={e => { e.currentTarget.style.background = 'rgba(232, 121, 249, 0.2)'; e.currentTarget.style.borderColor = 'rgba(232, 121, 249, 0.5)'; e.currentTarget.style.color = '#e879f9'; e.currentTarget.style.transform = 'scale(0.85)'; }}
              onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <ArrowRight size={24} strokeWidth={3} />
            </button>

            <div /> 
            <button 
              onPointerDown={(e) => { e.preventDefault(); handleMove('down'); }}
              style={{ height: '48px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
              onMouseDown={e => { e.currentTarget.style.background = 'rgba(232, 121, 249, 0.2)'; e.currentTarget.style.borderColor = 'rgba(232, 121, 249, 0.5)'; e.currentTarget.style.color = '#e879f9'; e.currentTarget.style.transform = 'scale(0.85)'; }}
              onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <ArrowDown size={24} strokeWidth={3} />
            </button>
            <div /> 
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '120px', height: '120px', borderRadius: '50%', border: '2px dashed #cbd5e1', opacity: 0.8 }}>
            <Target size={24} color="#94a3b8" style={{ marginBottom: '8px' }} />
            <span style={{ fontSize: '9px', fontWeight: 900, textAlign: 'center', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', lineHeight: 1.2 }}>
              D-PAD OR<br/>SWIPE
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
