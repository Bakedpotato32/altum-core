'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Play, RotateCcw, Footprints, Zap, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// --- CALIBRATED ENGINE CONSTANTS ---
const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 400;
const GRAVITY = 0.6;
const JUMP_FORCE = -11.5;
const GROUND_Y = 310;
const INITIAL_SPEED = 5.5;
const MAX_SPEED = 15;
const SPAWN_INTERVAL = 1400; // ms

export default function AltuDash() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // React UI States
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [flash, setFlash] = useState(false);

  // --- HARDCORE ENGINE REFS (Bypasses React for 60fps smoothness) ---
  const isRunning = useRef(false);
  const gameStateRef = useRef<'idle' | 'playing' | 'gameover'>('idle');
  const altyY = useRef(GROUND_Y);
  const velocity = useRef(0);
  const isCrouching = useRef(false);
  const obstacles = useRef<any[]>([]);
  const particles = useRef<any[]>([]);
  const gameSpeed = useRef(INITIAL_SPEED);
  const distance = useRef(0);
  const frameCount = useRef(0);
  const lastSpawnTime = useRef(0);
  const scoreRef = useRef(0);
  const requestRef = useRef<number>();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const canvasFlashAlpha = useRef(0); // Canvas-native flash (Zero lag)

  useEffect(() => {
    const saved = localStorage.getItem('altyDashHS');
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
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duration);
  };

  const vibrate = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };

  // --- CORE GAME LOOP ---
  const handleGameOver = async () => {
    isRunning.current = false;
    gameStateRef.current = 'gameover';
    setGameState('gameover');
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    playSound(100, 'sawtooth', 0.2, 0.5);
    vibrate([150, 50, 200, 100, 300]); 

    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem('altyDashHS', scoreRef.current.toString());
    }

    const studentId = localStorage.getItem('studentId');
    if (studentId && scoreRef.current > 5) {
      setIsSyncing(true);
      try {
        const { data: existing } = await supabase.from('arcade_scores').select('*').eq('student_id', studentId).eq('game_name', 'dino').maybeSingle();
        if (!existing) {
          await supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'dino', score: scoreRef.current }]);
        } else if (scoreRef.current > existing.score) {
          await supabase.from('arcade_scores').update({ score: scoreRef.current }).eq('id', existing.id);
        }
      } catch (e) {}
      setIsSyncing(false);
    }
  };

  const update = useCallback(() => {
    if (!isRunning.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    frameCount.current++;
    distance.current += gameSpeed.current;

    // --- STATE UPDATES (Throttled for React) ---
    const currentScore = Math.floor(distance.current / 10);
    if (currentScore !== scoreRef.current) {
        scoreRef.current = currentScore;
        setScore(currentScore);
        
        // Milestone Speed Up - Using Canvas Flash to prevent DOM Repaint lag
        if (currentScore > 0 && currentScore % 100 === 0) {
           playSound(800, 'sine', 0.1, 0.2);
           setTimeout(() => playSound(1200, 'sine', 0.1, 0.2), 100);
           vibrate([50, 50, 50]);
           canvasFlashAlpha.current = 0.6; // Triggers high-perf canvas flash
        }
    }

    if (frameCount.current % 600 === 0) {
        gameSpeed.current = Math.min(MAX_SPEED, gameSpeed.current + 0.4);
    }

    // --- PHYSICS ---
    velocity.current += GRAVITY;
    if (isCrouching.current && altyY.current < GROUND_Y) {
      velocity.current += GRAVITY * 1.5; // Fast fall
    }
    
    altyY.current += velocity.current;
    if (altyY.current >= GROUND_Y) {
      altyY.current = GROUND_Y;
      velocity.current = 0;
    }

    // --- RENDERING ---
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Parallax Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 20; i++) {
        let sx = CANVAS_WIDTH - ((i * 87 + (distance.current * 0.1)) % CANVAS_WIDTH);
        ctx.globalAlpha = 0.3;
        ctx.fillRect(sx, (i * 43) % CANVAS_HEIGHT, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Ground
    ctx.fillStyle = '#f59e0b';
    ctx.globalAlpha = 0.2;
    ctx.fillRect(0, GROUND_Y + 40, CANVAS_WIDTH, CANVAS_HEIGHT - (GROUND_Y + 40));
    ctx.globalAlpha = 1;
    ctx.fillRect(0, GROUND_Y + 40, CANVAS_WIDTH, 2);

    // Particles Trail
    if (altyY.current === GROUND_Y && frameCount.current % 4 === 0) {
      particles.current.push({ x: 60, y: GROUND_Y + 35, life: 1, speedX: gameSpeed.current * 0.8 });
    }
    ctx.fillStyle = '#f97316';
    particles.current.forEach(p => {
        p.x -= p.speedX;
        p.life -= 0.05;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillRect(p.x, p.y, 8 * p.life, 3);
    });
    particles.current = particles.current.filter(p => p.life > 0);
    ctx.globalAlpha = 1;

    // Spawning Obstacles
    const now = Date.now();
    if (now - lastSpawnTime.current > Math.max(600, SPAWN_INTERVAL - (gameSpeed.current * 70))) {
      const type = Math.random() > 0.65 && distance.current > 800 ? 'air' : 'ground';
      obstacles.current.push({
        id: now,
        x: CANVAS_WIDTH,
        width: type === 'air' ? 24 : 20 + Math.random() * 15,
        height: type === 'air' ? 24 : 35 + Math.random() * 45,
        type
      });
      lastSpawnTime.current = now;
    }

    // --- ALTU (THE FOX) VECTOR DRAWING ---
    const foxY = isCrouching.current ? altyY.current + 20 : altyY.current;
    
    ctx.fillStyle = '#f97316';
    ctx.shadowBlur = 15; ctx.shadowColor = '#f97316';
    ctx.beginPath();
    
    if (isCrouching.current) {
        // Aerodynamic Ducking Shape
        ctx.moveTo(70, foxY + 20); // tail bottom
        ctx.lineTo(75, foxY + 10); // tail top
        ctx.lineTo(90, foxY + 10); // back
        ctx.lineTo(105, foxY); // head top
        ctx.lineTo(115, foxY + 10); // nose
        ctx.lineTo(100, foxY + 20); // belly
        ctx.fill();
        
        // Ear
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.moveTo(95, foxY + 5); ctx.lineTo(100, foxY - 5); ctx.lineTo(105, foxY + 5);
        ctx.fill();

        // Eye
        ctx.fillStyle = 'white';
        ctx.fillRect(102, foxY + 8, 3, 3);
    } else {
        // Full Running Fox Shape
        ctx.moveTo(65, foxY + 20); // tail out back
        ctx.lineTo(75, foxY + 15); // tail base
        ctx.lineTo(80, foxY + 5); // back
        ctx.lineTo(95, foxY); // head top
        ctx.lineTo(105, foxY + 10); // nose
        ctx.lineTo(95, foxY + 20); // chest
        ctx.lineTo(95, foxY + 40); // front leg
        ctx.lineTo(88, foxY + 40);
        ctx.lineTo(88, foxY + 30); // belly
        ctx.lineTo(82, foxY + 40); // back leg
        ctx.lineTo(75, foxY + 40);
        ctx.lineTo(75, foxY + 25); // butt
        ctx.fill();

        // Ear
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.moveTo(85, foxY + 5); ctx.lineTo(90, foxY - 8); ctx.lineTo(95, foxY + 2);
        ctx.fill();

        // Eye
        ctx.fillStyle = 'white';
        ctx.fillRect(95, foxY + 8, 3, 3);
    }
    ctx.shadowBlur = 0;

    // Precise Fox Hitbox
    const altyHitbox = isCrouching.current 
        ? { left: 70, right: 115, top: foxY, bottom: foxY + 20 }
        : { left: 75, right: 105, top: foxY, bottom: foxY + 40 };

    // Draw & Detect Obstacles
    obstacles.current.forEach(obs => {
        obs.x -= gameSpeed.current;

        if (obs.type === 'air') {
            ctx.fillStyle = '#22d3ee';
            ctx.shadowBlur = 15; ctx.shadowColor = '#22d3ee';
            ctx.beginPath();
            ctx.arc(obs.x + obs.width/2, GROUND_Y - 25, obs.width/2, 0, Math.PI*2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#ef4444';
            ctx.shadowBlur = 15; ctx.shadowColor = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(obs.x, GROUND_Y + 40);
            ctx.lineTo(obs.x + obs.width/2, GROUND_Y + 40 - obs.height);
            ctx.lineTo(obs.x + obs.width, GROUND_Y + 40);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        const obsHitbox = {
            left: obs.x + 4,
            right: obs.x + obs.width - 4,
            top: obs.type === 'air' ? GROUND_Y - 25 - obs.width/2 : GROUND_Y + 40 - obs.height + 4,
            bottom: obs.type === 'air' ? GROUND_Y - 25 + obs.width/2 : GROUND_Y + 40
        };

        if (
            altyHitbox.right > obsHitbox.left &&
            altyHitbox.left < obsHitbox.right &&
            altyHitbox.bottom > obsHitbox.top &&
            altyHitbox.top < obsHitbox.bottom
        ) {
            handleGameOver();
        }
    });
    obstacles.current = obstacles.current.filter(o => o.x > -50);

    // Canvas Native Flash (No DOM lag)
    if (canvasFlashAlpha.current > 0) {
        ctx.fillStyle = `rgba(250, 204, 21, ${canvasFlashAlpha.current})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        canvasFlashAlpha.current -= 0.03;
    }

    if (isRunning.current) requestRef.current = requestAnimationFrame(update);
  }, []);

  const initiateGame = (e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    requestFullscreen();
    initAudio();
    
    // Hard Reset Engine
    altyY.current = GROUND_Y;
    velocity.current = 0;
    isCrouching.current = false;
    obstacles.current = [];
    particles.current = [];
    gameSpeed.current = INITIAL_SPEED;
    distance.current = 0;
    frameCount.current = 0;
    lastSpawnTime.current = Date.now() - SPAWN_INTERVAL; // Force instant spawn
    scoreRef.current = 0;
    canvasFlashAlpha.current = 0;
    setScore(0);
    setFlash(false);
    
    gameStateRef.current = 'playing';
    setGameState('playing');
    isRunning.current = true;
    requestRef.current = requestAnimationFrame(update);
  };

  const handleJump = (e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (gameStateRef.current === 'playing' && altyY.current >= GROUND_Y - 5) { 
      velocity.current = JUMP_FORCE;
      playSound(400, 'triangle', 0.1, 0.1);
      vibrate(15);
    }
  };

  const handleDuckStart = (e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (gameStateRef.current === 'playing') {
      isCrouching.current = true;
      playSound(250, 'sine', 0.05, 0.05);
      vibrate(10);
    }
  };

  const handleDuckEnd = (e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    isCrouching.current = false;
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') handleJump(e as any);
      if (e.code === 'ArrowDown') handleDuckStart(e as any);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown') handleDuckEnd(e as any);
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKey); window.removeEventListener('keyup', handleKeyUp); };
  }, [handleJump, handleDuckStart, handleDuckEnd]);

  return (
    <div style={{
      minHeight: '100dvh',
      background: flash ? 'rgba(239, 68, 68, 0.1)' : '#fff',
      padding: '40px 20px 120px',
      maxWidth: '500px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      transition: 'background 0.2s ease',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      overflow: 'hidden',
      touchAction: 'none'
    }}>
      
      {/* Background Ambience */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '-10%', width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(249, 115, 22, 0.1)', filter: 'blur(80px)' }} />
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 10 }}>
        
        {/* Header Area */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '24px' }}>
          <button 
            onPointerDown={handleBack} 
            style={{ width: '45px', height: '45px', borderRadius: '14px', background: '#f8fafc', border: '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#f59e0b' }}>Altu Dash</h1>
          </div>
        </div>

        {/* Score Board */}
        <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '24px' }}>
          <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Distance</span>
            <span style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: '#0f172a', lineHeight: 1, display: 'flex', alignItems: 'flex-end' }}>
              {score} <span style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 700, marginLeft: '4px', fontStyle: 'normal' }}>m</span>
            </span>
          </div>

          <div style={{ flex: 1, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(245, 158, 11, 0.1)' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(245, 158, 11, 0.7)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Trophy size={12} /> Best
            </span>
            <span style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: '#f59e0b', lineHeight: 1 }}>{highScore}</span>
          </div>
        </div>

        {/* The Game Box */}
        <div 
          style={{
            position: 'relative', 
            width: '100%', 
            maxWidth: '340px', 
            height: '400px', 
            background: '#050505', 
            borderRadius: '30px', 
            border: flash ? '2px solid #ef4444' : '2px solid rgba(245, 158, 11, 0.3)', 
            overflow: 'hidden', 
            transition: 'border 0.2s ease, box-shadow 0.2s ease',
            boxShadow: flash ? '0 0 50px rgba(239, 68, 68, 0.4)' : '0 10px 40px rgba(245, 158, 11, 0.15)'
          }}
        >
          
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ width: '100%', height: '100%', display: 'block' }} />

          {/* Overlays */}
          <AnimatePresence>
            {gameState === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }} className="animate-pulse">
                  <Footprints size={40} color="#f59e0b" />
                </div>
                <p style={{ margin: '0 0 24px 0', fontSize: '10px', fontWeight: 900, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.3em' }}>Altu Dash Protocol</p>
                <button 
                  onPointerDown={initiateGame} 
                  style={{ padding: '16px 40px', background: '#f59e0b', color: '#000', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(245, 158, 11, 0.4)', pointerEvents: 'auto' }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Play size={18} fill="currentColor" /> Initiate Dash
                </button>
              </motion.div>
            )}

            {gameState === 'gameover' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(69, 10, 10, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: '0 0 20px rgba(239,68,68,0.4)' }}>
                  <Zap size={32} color="#ef4444" />
                </div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '32px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-1px', color: '#fff', textShadow: '0 0 10px rgba(239,68,68,0.8)' }}>Core Impact</h2>
                <p style={{ margin: '0 0 32px 0', fontSize: '10px', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '2px' }}>System offline at {score}m</p>
                
                <button 
                  onPointerDown={initiateGame} 
                  style={{ padding: '16px 40px', background: '#fff', color: '#dc2626', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', pointerEvents: 'auto' }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <RotateCcw size={18} /> Reboot
                </button>
                {isSyncing && <p style={{ margin: '16px 0 0 0', fontSize: '8px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }} className="animate-pulse"><Loader2 size={10} className="animate-spin" /> Syncing Data...</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* --- HIGH-POLISH ERGONOMIC CONTROLS --- */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '24px', width: '100%', touchAction: 'none', userSelect: 'none' }}>
           <button 
              onPointerDown={handleJump}
              style={{ width: '130px', height: '100px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
              onMouseDown={e => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)'; e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.5)'; e.currentTarget.style.color = '#f59e0b'; e.currentTarget.style.transform = 'scale(0.95)'; }}
              onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
           >
              <ArrowUp size={44} strokeWidth={2.5} style={{ marginBottom: '4px' }} />
              <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Jump</span>
           </button>
           
           <button 
              onPointerDown={handleDuckStart}
              onPointerUp={handleDuckEnd}
              onPointerLeave={handleDuckEnd}
              style={{ width: '130px', height: '100px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
              onMouseDown={e => { e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)'; e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.5)'; e.currentTarget.style.color = '#06b6d4'; e.currentTarget.style.transform = 'scale(0.95)'; }}
              onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
           >
              <ArrowDown size={44} strokeWidth={2.5} style={{ marginBottom: '4px' }} />
              <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Duck</span>
           </button>
        </div>

      </div>
    </div>
  );
}
