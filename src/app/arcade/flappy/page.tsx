'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Trophy, Play, RotateCcw, Flame, 
  Loader2, Pause, Volume2, VolumeX, Sparkles 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

// RECALIBRATED & CAPPED PHYSICS
const GRAVITY = 0.35; // Floaty feel
const JUMP_STRENGTH = -6.0; // Softer jump
const MAX_FALL_SPEED = 7.5; // TERMINAL VELOCITY
const PIPE_SPEED = 2.2; 
const PIPE_WIDTH = 45; 
const PIPE_GAP = 150; // Forgiving gap
const BIRD_SIZE = 24; 
const GAME_WIDTH = 340; 
const GAME_HEIGHT = 500; 

export default function FlappyAltu() {
  const router = useRouter();

  // UI State
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // App State
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [flash, setFlash] = useState(false);
  const [renderTick, setRenderTick] = useState(0);

  // High-Performance Physics Refs
  const birdY = useRef(GAME_HEIGHT / 2);
  const velocity = useRef(0);
  const pipes = useRef<{x: number, topHeight: number, passed: boolean}[]>([]);
  const scoreRef = useRef(0);
  const frameCount = useRef(0);
  const requestRef = useRef<number>();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isPausedRef = useRef(false); 

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const saved = localStorage.getItem('flappyHighScore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // --- FULLSCREEN LOGIC ---
  const requestFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => console.log(err));
    } else if ((elem as any).webkitRequestFullscreen) { /* Safari */
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) { /* IE11 */
      (elem as any).msRequestFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  const handleBack = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    exitFullscreen();
    router.back();
  };

  // --- AUDIO ENGINE ---
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
  };

  const playSound = useCallback((type: 'flap' | 'score' | 'milestone' | 'die') => {
    if (isMuted || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'flap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'score') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'milestone') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.1);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'die') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  }, [isMuted]);

  const syncScore = async (finalScore: number) => {
    const studentId = localStorage.getItem('studentId');
    if (studentId && finalScore > 0) {
      setIsSyncing(true);
      try {
        const { data: existingScore } = await supabase
          .from('arcade_scores')
          .select('id, score')
          .eq('student_id', studentId)
          .eq('game_name', 'flappy')
          .maybeSingle();

        if (!existingScore) {
          await supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'flappy', score: finalScore }]);
        } else if (finalScore > existingScore.score) {
          await supabase.from('arcade_scores').update({ score: finalScore }).eq('id', existingScore.id);
        }
      } catch (err) {
        console.error("Failed to sync flappy score", err);
      }
      setIsSyncing(false);
    }
  };

  const handleGameOver = useCallback(() => {
    setGameState('gameover');
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    playSound('die');
    
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([200, 100, 200]);
    }
    
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem('flappyHighScore', scoreRef.current.toString());
    }
    
    syncScore(scoreRef.current);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  }, [highScore, playSound]);

  const updatePhysics = useCallback(() => {
    if (gameState !== 'playing') return;

    if (!isPausedRef.current) {
      velocity.current = Math.min(velocity.current + GRAVITY, MAX_FALL_SPEED);
      birdY.current += velocity.current;

      const birdTop = birdY.current;
      const birdBottom = birdY.current + BIRD_SIZE;
      const birdLeft = 50; 
      const birdRight = 50 + BIRD_SIZE;
      const hitboxTolerance = 4;

      // Floor / Ceiling Collision
      if (birdBottom >= GAME_HEIGHT || birdTop <= 0) {
        handleGameOver();
        return;
      }

      // Spawning Pipes
      frameCount.current += 1;
      if (frameCount.current % 110 === 0) { 
        const topHeight = Math.random() * (GAME_HEIGHT - PIPE_GAP - 80) + 40;
        pipes.current.push({ x: GAME_WIDTH, topHeight, passed: false });
      }

      // Move pipes & check collisions
      pipes.current.forEach(pipe => {
        pipe.x -= PIPE_SPEED;

        // Score Update
        if (!pipe.passed && pipe.x + PIPE_WIDTH < birdLeft) {
          pipe.passed = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
          
          if (scoreRef.current > 0 && scoreRef.current % 10 === 0) {
            playSound('milestone');
          } else {
            playSound('score');
          }

          if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(30);
          }
        }

        // Pipe Collision 
        if (birdRight - hitboxTolerance > pipe.x && birdLeft + hitboxTolerance < pipe.x + PIPE_WIDTH) {
          if (birdTop + hitboxTolerance < pipe.topHeight || birdBottom - hitboxTolerance > pipe.topHeight + PIPE_GAP) {
            handleGameOver();
          }
        }
      });

      // Cleanup
      pipes.current = pipes.current.filter(p => p.x > -PIPE_WIDTH);
      setRenderTick(t => t + 1);
    }

    requestRef.current = requestAnimationFrame(updatePhysics);
  }, [gameState, handleGameOver, playSound]);

  useEffect(() => {
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(updatePhysics);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState, updatePhysics]);

  const jump = useCallback((e?: React.SyntheticEvent | KeyboardEvent | React.PointerEvent) => {
    if (e && 'preventDefault' in e && e.type !== 'pointerdown') e.preventDefault();
    if (isPaused) return; 
    
    if (gameState === 'idle' || gameState === 'gameover') {
      requestFullscreen();
      initAudio();
      birdY.current = GAME_HEIGHT / 2;
      velocity.current = 0;
      pipes.current = [];
      scoreRef.current = 0;
      frameCount.current = 0;
      setScore(0);
      setGameState('playing');
    }

    if (gameState === 'playing') {
      velocity.current = JUMP_STRENGTH;
      playSound('flap');
    }
  }, [gameState, isPaused, playSound]);

  const togglePause = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (gameState !== 'playing') return;
    setIsPaused(p => !p);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') jump(e);
      if (e.code === 'Escape') setIsPaused(p => !p);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  const hueShift = score > 0 ? Math.min(score * 8, 360) : 0;
  const isMilestone = score > 0 && score % 10 === 0;

  return (
    // FULLSCREEN ROOT: Tap anywhere in this div to jump
    <div 
      onPointerDown={jump}
      style={{
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
        touchAction: 'none',
        cursor: 'pointer'
      }}
    >
      
      {/* Background Ambience */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', filter: 'blur(80px)' }} />
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 10 }}>
        
        {/* Header Area */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', zIndex: 50 }}>
            <button 
                onPointerDown={handleBack} 
                style={{ width: '45px', height: '45px', borderRadius: '14px', background: '#f8fafc', border: '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <ChevronLeft size={24} strokeWidth={2.5} />
            </button>
            {gameState === 'playing' && (
              <button 
                onPointerDown={togglePause} 
                style={{ width: '45px', height: '45px', borderRadius: '14px', background: isPaused ? 'rgba(245, 158, 11, 0.1)' : '#f8fafc', border: isPaused ? '2px solid rgba(245, 158, 11, 0.3)' : '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isPaused ? '#f59e0b' : '#334155', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'all 0.2s ease' }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {isPaused ? <Play size={20} /> : <Pause size={20} />}
              </button>
            )}
            <button 
                onPointerDown={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} 
                style={{ width: '45px', height: '45px', borderRadius: '14px', background: '#f8fafc', border: '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'all 0.2s ease' }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#8b5cf6' }}>
              Flappy Altu
            </h1>
          </div>
        </div>

        {/* Score Board */}
        <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '24px' }}>
          <div style={{ flex: 1, background: '#f8fafc', border: isMilestone ? '2px solid #facc15' : '1px solid #e2e8f0', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'all 0.15s ease', transform: isMilestone ? 'scale(1.05)' : 'scale(1)', boxShadow: isMilestone ? '0 0 20px rgba(250, 204, 21, 0.3)' : 'none', zIndex: isMilestone ? 10 : 1 }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: isMilestone ? '#facc15' : '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Score</span>
            <span style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: isMilestone ? '#facc15' : '#0f172a', lineHeight: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {score} {isMilestone && <Sparkles size={16} className="animate-spin" style={{ animationDuration: '3s' }} />}
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
            height: '500px', 
            background: '#050505', 
            borderRadius: '30px', 
            border: flash ? '2px solid #ef4444' : '2px solid rgba(139, 92, 246, 0.3)', 
            overflow: 'hidden', 
            pointerEvents: 'none', 
            transition: 'border 0.2s ease, box-shadow 0.2s ease',
            boxShadow: flash ? '0 0 50px rgba(239, 68, 68, 0.4)' : '0 10px 40px rgba(139, 92, 246, 0.15)',
            filter: !flash ? `hue-rotate(${hueShift}deg)` : 'none'
          }}
        >
          {/* Base Grid Parallax */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px', backgroundPosition: `-${frameCount.current * 0.5}px 0` }} />
          
          {/* Fast Moving Parallax "Dust" */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2px)', backgroundSize: '60px 80px', backgroundPosition: `-${frameCount.current * 1.5}px ${frameCount.current * 0.2}px` }} />

          {/* Render Pipes */}
          {pipes.current.map((pipe, i) => (
            <React.Fragment key={i}>
              <div 
                style={{ 
                  position: 'absolute', top: 0, left: pipe.x, width: PIPE_WIDTH, height: pipe.topHeight, 
                  background: '#7c3aed', borderLeft: '2px solid #a78bfa', borderRight: '2px solid #a78bfa', borderBottom: '4px solid #a78bfa', 
                  borderRadius: '0 0 6px 6px', boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)' 
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '8px', background: 'rgba(255,255,255,0.1)' }} />
              </div>
              <div 
                style={{ 
                  position: 'absolute', bottom: 0, left: pipe.x, width: PIPE_WIDTH, height: GAME_HEIGHT - pipe.topHeight - PIPE_GAP, 
                  background: '#7c3aed', borderLeft: '2px solid #a78bfa', borderRight: '2px solid #a78bfa', borderTop: '4px solid #a78bfa', 
                  borderRadius: '6px 6px 0 0', boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)' 
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '8px', background: 'rgba(255,255,255,0.1)' }} />
              </div>
            </React.Fragment>
          ))}

          {/* Fox Bird */}
          {gameState !== 'idle' && (
            <div 
              style={{ 
                position: 'absolute', left: 50, top: birdY.current, width: BIRD_SIZE, height: BIRD_SIZE,
                background: '#f97316', border: '2px solid #fdba74', borderRadius: '6px', 
                boxShadow: '0 0 20px rgba(249, 115, 22, 0.8)', transition: 'transform 0.075s',
                transform: `rotate(${Math.min(Math.max(velocity.current * 4, -25), 90)}deg)`,
                filter: `hue-rotate(-${hueShift}deg)` // Cancels out container shift
              }}
            >
              {/* Fox Details */}
              <div style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '2px', zIndex: 10 }}>
                <div style={{ width: '4px', height: '4px', background: '#fff', borderRadius: '50%' }} className="animate-pulse" />
                <div style={{ width: '4px', height: '4px', background: '#fff', borderRadius: '50%' }} className="animate-pulse" />
              </div>
              <div style={{ position: 'absolute', top: '-4px', left: '4px', width: '6px', height: '6px', background: '#fb923c', transform: 'rotate(45deg)', zIndex: 0 }} />
              
              {/* Rocket Boost Trail */}
              <div 
                style={{ 
                  position: 'absolute', top: '50%', left: '-12px', height: '4px', 
                  background: 'linear-gradient(to right, transparent, #fde047)', borderRadius: '4px', 
                  filter: 'blur(1px)', transition: 'all 0.1s', transform: 'translateY(-50%)',
                  width: velocity.current < 0 ? '12px' : '0px', opacity: velocity.current < 0 ? 1 : 0 
                }} 
              />
            </div>
          )}

          {/* Overlays */}
          {gameState === 'idle' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, pointerEvents: 'none', filter: `hue-rotate(-${hueShift}deg)` }}>
              <Flame size={56} color="#f97316" style={{ marginBottom: '16px', filter: 'drop-shadow(0 0 20px rgba(249, 115, 22, 0.6))' }} className="animate-bounce" />
              <div style={{ padding: '16px 32px', background: '#8b5cf6', color: '#fff', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 25px rgba(139, 92, 246, 0.5)' }}>
                <Play size={18} fill="currentColor" /> Tap to Start
              </div>
              <p style={{ margin: '24px 0 0 0', fontSize: '8px', fontWeight: 900, color: 'rgba(196, 181, 253, 0.6)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Engages Fullscreen</p>
            </div>
          )}

          {isPaused && gameState === 'playing' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, pointerEvents: 'none', filter: `hue-rotate(-${hueShift}deg)` }}>
              <h2 style={{ margin: '0 0 24px 0', fontSize: '30px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-1px', color: '#f59e0b', textShadow: '0 0 15px rgba(245, 158, 11, 0.5)' }}>Paused</h2>
              <div style={{ padding: '16px 32px', background: '#f59e0b', color: '#000', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 25px rgba(245, 158, 11, 0.4)' }}>
                <Play size={18} fill="currentColor" /> Tap to Resume
              </div>
            </div>
          )}

          {gameState === 'gameover' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(69, 10, 10, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, pointerEvents: 'none', filter: `hue-rotate(-${hueShift}deg)` }}>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '30px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-1px', color: '#fff', textShadow: '0 0 20px rgba(239, 68, 68, 1)' }}>Core Crashed</h2>
              <p style={{ margin: '0 0 12px 0', fontSize: '10px', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '2px' }}>Final Score: {score}</p>
              
              <div style={{ height: '16px', marginBottom: '24px' }}>
                {isSyncing && <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}><Loader2 size={12} className="animate-spin"/> Syncing...</p>}
                {!isSyncing && score > 0 && <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px' }}>Score Saved</p>}
              </div>

              <div style={{ padding: '12px 24px', background: '#fff', color: '#dc2626', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 15px rgba(0,0,0,0.3)' }}>
                <RotateCcw size={16} /> Tap to Retry
              </div>
            </div>
          )}
        </div>
        
        <p style={{ margin: '32px 0 0 0', fontSize: '9px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center', pointerEvents: 'none' }}>
          Tap anywhere on screen to fly
        </p>

      </div>
    </div>
  );
}
