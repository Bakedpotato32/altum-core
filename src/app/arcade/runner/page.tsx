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

  const handleBack = (e: React.SyntheticEvent) => {
    e.stopPropagation();
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

    if (finalScore > bestScore) {
      setBestScore(finalScore);
      localStorage.setItem('runnerBest', String(finalScore));
    }

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
  }, [bestScore]);

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
        type, color: colors[type], bobOffset: 0 
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
    if (!isRunning.current) return; // Only strictly exit if unmounted/back button pressed
    
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

    // Process visual components outside of the playing state 
    // so they animate cleanly during Game Over and Hitstop pauses
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
    <div className="h-[100dvh] w-screen bg-[#030308] text-white flex flex-col items-center pt-6 overflow-hidden select-none touch-none overscroll-none">
      <div className="w-full max-w-md px-4 h-full flex flex-col relative z-10">
        
        {/* HUD */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button onClick={handleBack} className="p-2 bg-zinc-900 rounded-xl border border-white/10 active:scale-90 shadow-sm transition-transform z-50">
              <ChevronLeft size={20} />
            </button>
            {gameState === 'playing' && (
              <button onClick={togglePause} className={`p-2 bg-zinc-900 rounded-xl border border-white/10 active:scale-90 shadow-sm transition-all ${isPaused ? 'text-amber-500 border-amber-500/30' : 'text-zinc-500 hover:text-fuchsia-400'}`}>
                {isPaused ? <Play size={18} /> : <Pause size={18} />}
              </button>
            )}
            <button 
              onClick={() => { isMutedRef.current = !isMutedRef.current; setIsMuted(isMutedRef.current); }}
              className="p-2 bg-zinc-900 rounded-xl border border-white/10 active:scale-90 shadow-sm text-zinc-500 hover:text-fuchsia-400 transition-colors"
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
              <Trophy size={12} className="text-yellow-500" />
              <span className="text-sm font-black italic text-yellow-500">{coins}</span>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
              <Zap size={12} className="text-fuchsia-400" />
              <span className="text-sm font-black italic text-fuchsia-400">{multiplier}x</span>
            </div>
          </div>
        </div>

        {/* Best score */}
        {bestScore > 0 && (
          <div className="text-center mb-2">
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Best: {bestScore}</span>
          </div>
        )}

        {/* CANVAS */}
        <div 
          onPointerDown={handleTouchStart}
          onPointerUp={handleTouchEnd}
          className={`relative w-full aspect-[34/46] bg-[#030308] rounded-3xl border-2 transition-all overflow-hidden shadow-2xl touch-none ${gameState === 'gameover' ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'border-fuchsia-500/20'}`}
          style={{ touchAction: 'none' }}
        >
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full block pointer-events-none" />
          
          {/* Combo indicator */}
          {combo > 1 && gameState === 'playing' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <span className="text-lg font-black italic text-fuchsia-400 animate-pulse drop-shadow-[0_0_10px_rgba(232,121,249,0.8)]">
                COMBO x{combo}
              </span>
            </div>
          )}

          {/* Powerup indicators */}
          {gameState === 'playing' && (
            <div className="absolute top-4 right-4 flex flex-col gap-1 z-10 pointer-events-none">
              {shieldActive.current && (
                <div className="bg-blue-500/20 border border-blue-500/30 rounded px-1.5 py-0.5">
                  <Shield size={10} className="text-blue-400" />
                </div>
              )}
              {magnetActive.current && (
                <div className="bg-purple-500/20 border border-purple-500/30 rounded px-1.5 py-0.5">
                  <Magnet size={10} className="text-purple-400" />
                </div>
              )}
              {speedRef.current > 20 && (
                <div className="bg-orange-500/20 border border-orange-500/30 rounded px-1.5 py-0.5">
                  <Gauge size={10} className="text-orange-400" />
                </div>
              )}
            </div>
          )}
          
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 pointer-events-none backdrop-blur-sm">
              <RunnerLogo className="w-20 h-20 text-fuchsia-400 mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(232,121,249,0.5)]" />
              <button onPointerDown={startNew} className="px-10 py-4 bg-fuchsia-600 text-white font-black uppercase tracking-widest rounded-full shadow-[0_0_30px_rgba(232,121,249,0.4)] active:scale-95 transition-all hover:scale-105 pointer-events-auto">
                <Play size={18} fill="currentColor" className="inline mr-2" /> Jack In
              </button>
              <p className="text-[8px] font-black text-fuchsia-300/60 uppercase tracking-[0.2em] mt-4">Engages Fullscreen</p>
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
            <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center z-20 p-6 text-center pointer-events-none backdrop-blur-md">
              <h2 className="text-3xl font-black italic uppercase tracking-tight text-white mb-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">Derezzed</h2>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Distance: {score}</p>
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
        <div className="mt-6 mb-auto w-full flex items-center justify-between px-2 touch-none select-none">
          <div className="grid grid-cols-3 gap-1.5 w-[140px]">
            <div /> 
            <button 
              onPointerDown={(e) => { e.preventDefault(); handleMove('up'); }}
              className="h-12 bg-zinc-900 border-2 border-white/10 rounded-xl flex items-center justify-center active:bg-fuchsia-500/20 active:border-fuchsia-500/50 text-zinc-500 active:text-fuchsia-400 transition-all active:scale-90"
            >
              <ArrowUp size={24} />
            </button>
            <div /> 

            <button 
              onPointerDown={(e) => { e.preventDefault(); handleMove('left'); }}
              className="h-12 bg-zinc-900 border-2 border-white/10 rounded-xl flex items-center justify-center active:bg-fuchsia-500/20 active:border-fuchsia-500/50 text-zinc-500 active:text-fuchsia-400 transition-all active:scale-90"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center justify-center opacity-30">
              <RunnerLogo className="w-6 h-6 text-zinc-500" />
            </div>
            <button 
              onPointerDown={(e) => { e.preventDefault(); handleMove('right'); }}
              className="h-12 bg-zinc-900 border-2 border-white/10 rounded-xl flex items-center justify-center active:bg-fuchsia-500/20 active:border-fuchsia-500/50 text-zinc-500 active:text-fuchsia-400 transition-all active:scale-90"
            >
              <ArrowRight size={24} />
            </button>

            <div /> 
            <button 
              onPointerDown={(e) => { e.preventDefault(); handleMove('down'); }}
              className="h-12 bg-zinc-900 border-2 border-white/10 rounded-xl flex items-center justify-center active:bg-fuchsia-500/20 active:border-fuchsia-500/50 text-zinc-500 active:text-fuchsia-400 transition-all active:scale-90"
            >
              <ArrowDown size={24} />
            </button>
            <div /> 
          </div>

          <div className="flex flex-col items-center justify-center w-[120px] h-[120px] rounded-full border-2 border-dashed border-white/5 opacity-40">
            <Target size={24} className="text-zinc-500 mb-2" />
            <span className="text-[9px] font-black text-center text-zinc-500 uppercase tracking-widest leading-tight">
              D-PAD OR<br/>SWIPE
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
