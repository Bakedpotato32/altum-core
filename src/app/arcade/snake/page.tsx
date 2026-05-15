'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Trophy, Play, RotateCcw, Ghost, ChevronUp, 
  ChevronDown, ChevronRight, Sparkles, Pause, Volume2, VolumeX, Zap 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
const INITIAL_DIRECTION = { x: 0, y: -1 }; 
const INITIAL_SPEED = 160;
const MIN_SPEED = 50;

type Food = { x: number; y: number; type: 'regular' | 'gold' };

type Particle = { id: number; x: number; y: number; dx: number; dy: number; color: string; size: number };
type FloatingText = { id: number; x: number; y: number; text: string; color: string };

export default function NeonSnake() {
  const router = useRouter();
  
  // --- REFS (source of truth for game loop) ---
  const snakeRef = useRef(INITIAL_SNAKE);
  const directionRef = useRef(INITIAL_DIRECTION);
  const moveQueueRef = useRef<{x: number, y: number}[]>([]); 
  const foodRef = useRef<Food>({ x: 5, y: 5, type: 'regular' });
  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);
  const speedRef = useRef(INITIAL_SPEED);
  const gameOverRef = useRef(false);
  const hasStartedRef = useRef(false);
  const isPausedRef = useRef(false);
  const isMutedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const comboRef = useRef(0);
  const lastEatTimeRef = useRef(0);
  const countdownRef = useRef(0);
  const pointerStartRef = useRef<{x: number, y: number} | null>(null);

  // --- STATE (for React rendering only) ---
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState<Food>({ x: 5, y: 5, type: 'regular' });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [gameOver, setGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [combo, setCombo] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [deathAnim, setDeathAnim] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [newBest, setNewBest] = useState(false);

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

  const handleBack = () => {
    exitFullscreen();
    router.back();
  };

  // --- AUDIO ---
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSound = (type: 'eat' | 'eat_gold' | 'die') => {
    if (isMutedRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'eat') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'eat_gold') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'die') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  };

  // --- SUPABASE SYNC ---
  const handleSyncScore = useCallback(async () => {
    const studentId = localStorage.getItem('studentId');
    if (studentId && scoreRef.current > 0) {
      setIsSyncing(true);
      try {
        const { data: existingScore } = await supabase
          .from('arcade_scores')
          .select('id, score')
          .eq('student_id', studentId)
          .eq('game_name', 'snake')
          .maybeSingle();

        if (!existingScore) {
          await supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'snake', score: scoreRef.current }]);
        } else if (scoreRef.current > existingScore.score) {
          await supabase.from('arcade_scores').update({ score: scoreRef.current }).eq('id', existingScore.id);
        }
      } catch (err) {
        console.error("Failed to sync score", err);
      }
      setIsSyncing(false);
    }
  }, []);

  // --- GAME LOGIC ---
  const spawnFood = useCallback(() => {
    const occupied = new Set(snakeRef.current.map(s => `${s.x},${s.y}`));
    let attempts = 0;
    let newFood: Food;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
        type: Math.random() < 0.2 ? 'gold' : 'regular'
      };
      attempts++;
    } while (occupied.has(`${newFood.x},${newFood.y}`) && attempts < 200);
    
    foodRef.current = newFood;
    setFood(newFood);
  }, []);

  const spawnParticles = useCallback((gridX: number, gridY: number, color: string) => {
    const cellPct = 100 / GRID_SIZE;
    const newParts: Particle[] = [];
    for (let i = 0; i < 10; i++) {
      newParts.push({
        id: Math.random(),
        x: gridX * cellPct + cellPct / 2,
        y: gridY * cellPct + cellPct / 2,
        dx: (Math.random() - 0.5) * 3,
        dy: (Math.random() - 0.5) * 3,
        color,
        size: Math.random() * 3 + 2
      });
    }
    setParticles(prev => [...prev, ...newParts]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParts.find(np => np.id === p.id)));
    }, 700);
  }, []);

  const addFloatingText = useCallback((gridX: number, gridY: number, text: string, color: string) => {
    const id = Math.random();
    const cellPct = 100 / GRID_SIZE;
    setFloatingTexts(prev => [...prev, { 
      id, 
      x: gridX * cellPct + cellPct / 2, 
      y: gridY * cellPct, 
      text, 
      color 
    }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 900);
  }, []);

  const doGameOver = useCallback(() => {
    gameOverRef.current = true;
    setGameOver(true);
    setFlash(true);
    setDeathAnim(true);
    setTimeout(() => setFlash(false), 250);
    playSound('die');
    
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate([200, 100, 200]);
    }

    if (scoreRef.current > highScoreRef.current) {
      highScoreRef.current = scoreRef.current;
      setHighScore(scoreRef.current);
      localStorage.setItem('snakeHighScore', scoreRef.current.toString());
      setNewBest(true);
      setTimeout(() => setNewBest(false), 4000);
    }

    setTimeout(() => setShowGameOver(true), 500);
    setTimeout(() => handleSyncScore(), 800);
  }, [handleSyncScore]);

  const changeDirection = useCallback((newDir: { x: number, y: number }) => {
    if (isPausedRef.current || gameOverRef.current || !hasStartedRef.current || countdownRef.current >= 0) return;
    
    const lastDir = moveQueueRef.current.length > 0 
      ? moveQueueRef.current[moveQueueRef.current.length - 1] 
      : directionRef.current;
    
    if (newDir.x !== 0 && lastDir.x === -newDir.x) return;
    if (newDir.y !== 0 && lastDir.y === -newDir.y) return;
    if (newDir.x === lastDir.x && newDir.y === lastDir.y) return;
    
    if (moveQueueRef.current.length < 3) {
      moveQueueRef.current.push(newDir);
    }
  }, []);

  const togglePause = useCallback(() => {
    if (!hasStartedRef.current || gameOverRef.current) return;
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);
  }, []);

  const startGame = useCallback(() => {
    requestFullscreen();
    initAudio();
    
    snakeRef.current = [...INITIAL_SNAKE];
    directionRef.current = { ...INITIAL_DIRECTION };
    moveQueueRef.current = [];
    scoreRef.current = 0;
    speedRef.current = INITIAL_SPEED;
    gameOverRef.current = false;
    isPausedRef.current = false;
    comboRef.current = 0;
    lastEatTimeRef.current = 0;
    countdownRef.current = 3;
    
    setSnake([...INITIAL_SNAKE]);
    setDirection({ ...INITIAL_DIRECTION });
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setGameOver(false);
    setIsPaused(false);
    setCombo(0);
    setFlash(false);
    setPulse(false);
    setDeathAnim(false);
    setShowGameOver(false);
    setNewBest(false);
    setParticles([]);
    setFloatingTexts([]);
    
    setHasStarted(true);
    hasStartedRef.current = true;
    
    setCountdown(3);
    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count < 0) {
        clearInterval(interval);
        countdownRef.current = -1;
        setCountdown(-1);
        return;
      }
      countdownRef.current = count;
      setCountdown(count);
    }, 500);
  }, []);

  // --- MAIN GAME LOOP ---
  useEffect(() => {
    if (!hasStartedRef.current || gameOverRef.current || isPausedRef.current || countdownRef.current >= 0) return;

    let timeoutId: NodeJS.Timeout;
    
    const tick = () => {
      if (gameOverRef.current || isPausedRef.current) return;
      
      if (moveQueueRef.current.length > 0) {
        directionRef.current = moveQueueRef.current.shift()!;
        setDirection({ ...directionRef.current });
      }
      
      const currentSnake = snakeRef.current;
      const head = currentSnake[0];
      const newHead = {
        x: head.x + directionRef.current.x,
        y: head.y + directionRef.current.y
      };
      
      // Wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        doGameOver();
        return;
      }
      
      // Self collision
      if (currentSnake.some((seg, i) => i > 0 && seg.x === newHead.x && seg.y === newHead.y)) {
        doGameOver();
        return;
      }
      
      const newSnake = [newHead, ...currentSnake];
      
      if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
        const isGold = foodRef.current.type === 'gold';
        const now = Date.now();
        
        if (now - lastEatTimeRef.current < 2000) {
          comboRef.current = Math.min(comboRef.current + 1, 10);
        } else {
          comboRef.current = 1;
        }
        lastEatTimeRef.current = now;
        
        const basePoints = isGold ? 3 : 1;
        const points = basePoints * comboRef.current;
        scoreRef.current += points;
        setScore(scoreRef.current);
        setCombo(comboRef.current);
        
        const speedDec = isGold ? 5 : 2;
        speedRef.current = Math.max(speedRef.current - speedDec, MIN_SPEED);
        setSpeed(speedRef.current);
        
        playSound(isGold ? 'eat_gold' : 'eat');
        spawnParticles(newHead.x, newHead.y, isGold ? '#fbbf24' : '#22d3ee');
        addFloatingText(newHead.x, newHead.y, `+${points}`, isGold ? '#fbbf24' : '#22d3ee');
        if (comboRef.current > 1) {
          addFloatingText(newHead.x, newHead.y - 1, `COMBO x${comboRef.current}!`, '#e879f9');
        }
        
        setPulse(true);
        setTimeout(() => setPulse(false), 150);
        
        if (typeof window !== 'undefined' && window.navigator?.vibrate) {
          window.navigator.vibrate(isGold ? [30, 30, 30] : 40);
        }
        
        spawnFood();
      } else {
        newSnake.pop();
        if (comboRef.current > 0 && Date.now() - lastEatTimeRef.current > 2000) {
          comboRef.current = 0;
          setCombo(0);
        }
      }
      
      snakeRef.current = newSnake;
      setSnake([...newSnake]);
      
      timeoutId = setTimeout(tick, speedRef.current);
    };
    
    timeoutId = setTimeout(tick, speedRef.current);
    return () => clearTimeout(timeoutId);
  }, [hasStarted, gameOver, isPaused, countdown, doGameOver, spawnFood, spawnParticles, addFloatingText]);

  // --- KEYBOARD ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasStartedRef.current || gameOverRef.current) return;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
      
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': changeDirection({ x: 0, y: -1 }); break;
        case 'ArrowDown': case 's': case 'S': changeDirection({ x: 0, y: 1 }); break;
        case 'ArrowLeft': case 'a': case 'A': changeDirection({ x: -1, y: 0 }); break;
        case 'ArrowRight': case 'd': case 'D': changeDirection({ x: 1, y: 0 }); break;
        case ' ': case 'Escape': togglePause(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, togglePause]);

  // --- AUTO-PAUSE ON TAB HIDE ---
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && hasStartedRef.current && !gameOverRef.current && !isPausedRef.current) {
        isPausedRef.current = true;
        setIsPaused(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // --- INIT ---
  useEffect(() => {
    const saved = localStorage.getItem('snakeHighScore');
    if (saved) {
      const val = parseInt(saved, 10);
      highScoreRef.current = val;
      setHighScore(val);
    }
    spawnFood();
  }, [spawnFood]);

  const speedPct = Math.min(100, Math.round(((INITIAL_SPEED - speed) / (INITIAL_SPEED - MIN_SPEED)) * 100));

  // --- SWIPE / POINTER HANDLERS ---
  const handleBoardPointerDown = (e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };
  const handleBoardPointerUp = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const threshold = 30;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > threshold) changeDirection({ x: dx > 0 ? 1 : -1, y: 0 });
    } else {
      if (Math.abs(dy) > threshold) changeDirection({ x: 0, y: dy > 0 ? 1 : -1 });
    }
    pointerStartRef.current = null;
  };

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
      overflow: 'hidden'
    }}>
      
      <style>{`
        @keyframes particle-burst {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes float-up {
          0% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -30px) scale(1.3); opacity: 0; }
        }
        @keyframes death-fly {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
        }
        .animate-particle { animation: particle-burst 0.7s ease-out forwards; }
        .animate-float { animation: float-up 0.8s ease-out forwards; }
        .animate-death { animation: death-fly 0.6s ease-out forwards; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={handleBack} 
            style={{ width: '45px', height: '45px', borderRadius: '14px', background: '#f8fafc', border: '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          
          {hasStarted && !gameOver && (
            <button 
              onClick={togglePause} 
              style={{ width: '45px', height: '45px', borderRadius: '14px', background: isPaused ? 'rgba(245, 158, 11, 0.1)' : '#f8fafc', border: isPaused ? '2px solid rgba(245, 158, 11, 0.3)' : '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isPaused ? '#f59e0b' : '#334155', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'all 0.2s ease' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isPaused ? <Play size={20} /> : <Pause size={20} />}
            </button>
          )}
          
          <button 
            onClick={() => { isMutedRef.current = !isMutedRef.current; setIsMuted(isMutedRef.current); }} 
            style={{ width: '45px', height: '45px', borderRadius: '14px', background: '#f8fafc', border: '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'all 0.2s ease' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#10b981' }}>Neon Snake</h1>
        </div>
      </div>

      {/* Score Board */}
      <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '24px' }}>
        <div style={{ flex: 1, background: '#f8fafc', border: pulse ? '2px solid #10b981' : combo > 1 ? '2px solid rgba(217, 70, 239, 0.4)' : '1px solid #e2e8f0', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'all 0.15s ease', transform: pulse ? 'scale(1.05)' : 'scale(1)', boxShadow: pulse ? '0 0 20px rgba(16, 185, 129, 0.2)' : combo > 1 ? '0 0 15px rgba(217, 70, 239, 0.15)' : 'none' }}>
          <div style={{ position: 'absolute', top: '12px', right: '16px', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.6 }}>
            <Zap size={10} color="#10b981" />
            <span style={{ fontSize: '9px', fontWeight: 900, color: '#10b981' }}>{speedPct}%</span>
          </div>
          <span style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Score</span>
          <span style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: '#0f172a', lineHeight: 1 }}>{score}</span>
          {combo > 1 && (
            <span style={{ fontSize: '10px', fontWeight: 900, fontStyle: 'italic', color: '#d946ef', marginTop: '4px' }} className="animate-pulse">COMBO x{combo}</span>
          )}
        </div>

        <div style={{ flex: 1, background: newBest ? 'rgba(245, 158, 11, 0.1)' : '#f8fafc', border: newBest ? '2px solid #f59e0b' : '1px solid #e2e8f0', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease', transform: newBest ? 'scale(1.05)' : 'scale(1)', boxShadow: newBest ? '0 0 20px rgba(245, 158, 11, 0.2)' : 'none' }}>
          <span style={{ fontSize: '10px', fontWeight: 900, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Trophy size={12} /> Best
          </span>
          <span style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: '#f59e0b', lineHeight: 1 }}>{highScore}</span>
          {newBest && <span style={{ fontSize: '9px', fontWeight: 900, color: '#f59e0b', marginTop: '4px' }} className="animate-bounce">NEW BEST!</span>}
        </div>
      </div>

      {/* Game Board */}
      <div 
        style={{ 
          position: 'relative', 
          aspectRatio: '1/1', 
          width: '100%', 
          maxWidth: '360px', 
          background: '#050505', 
          borderRadius: '20px', 
          border: flash ? '2px solid #ef4444' : '2px solid rgba(16, 185, 129, 0.3)', 
          overflow: 'hidden', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: flash ? '0 0 40px rgba(239, 68, 68, 0.4)' : '0 10px 30px rgba(16, 185, 129, 0.15)',
          transition: 'all 0.2s ease',
          touchAction: 'none'
        }}
        onPointerDown={handleBoardPointerDown}
        onPointerUp={handleBoardPointerUp}
      >
        
        {/* Grid Background */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '5% 5%' }} />

        <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`, position: 'relative', zIndex: 10, padding: '4px' }}>
          
          {/* Snake */}
          {snake.map((segment, index) => {
            const isHead = index === 0;
            const opacity = deathAnim ? 1 : 1 - (index / snake.length) * 0.65;
            
            return (
              <div 
                key={`snake-${index}`}
                className={deathAnim ? 'animate-death' : ''}
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gridColumnStart: segment.x + 1, 
                  gridRowStart: segment.y + 1, 
                  opacity,
                  background: isHead ? '#34d399' : '#10b981',
                  borderRadius: isHead ? '6px' : '4px',
                  transform: isHead ? 'scale(1.15)' : 'scale(0.9)',
                  boxShadow: isHead && !deathAnim ? '0 0 15px rgba(52,211,153,1)' : 'none',
                  zIndex: isHead ? 10 : 1,
                  ...(deathAnim ? {
                    '--dx': `${(Math.random() - 0.5) * 80}px`,
                    '--dy': `${(Math.random() - 0.5) * 80}px`,
                  } as React.CSSProperties : {})
                }}
              >
                {isHead && !deathAnim && (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <div style={{ position: 'absolute', width: '6px', height: '6px', background: '#000', borderRadius: '50%', transition: 'all 0.1s', ...(direction.x === 1 ? {right: '4px', top: '4px'} : direction.x === -1 ? {left: '4px', top: '4px'} : direction.y === 1 ? {bottom: '4px', right: '4px'} : {top: '4px', right: '4px'}) }} />
                    <div style={{ position: 'absolute', width: '6px', height: '6px', background: '#000', borderRadius: '50%', transition: 'all 0.1s', ...(direction.x === 1 ? {right: '4px', bottom: '4px'} : direction.x === -1 ? {left: '4px', bottom: '4px'} : direction.y === 1 ? {bottom: '4px', left: '4px'} : {top: '4px', left: '4px'}) }} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Food */}
          <div 
            style={{ 
              gridColumnStart: food.x + 1, gridRowStart: food.y + 1, 
              background: food.type === 'gold' ? '#facc15' : '#22d3ee',
              borderRadius: '50%', transform: 'scale(0.8)',
              boxShadow: food.type === 'gold' ? '0 0 20px rgba(250,204,21,1)' : '0 0 15px rgba(34,211,238,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 0
            }}
            className="animate-pulse"
          >
            {food.type === 'gold' && <Sparkles size={12} color="#fff" fill="#fff" className="animate-spin" style={{ animationDuration: '3s' }} />}
          </div>

          {/* Particles */}
          {particles.map(p => (
            <div
              key={p.id}
              className="animate-particle"
              style={{
                position: 'absolute',
                borderRadius: '50%',
                pointerEvents: 'none',
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                boxShadow: `0 0 8px ${p.color}`,
                '--tx': `${p.dx * 25}px`,
                '--ty': `${p.dy * 25}px`,
              } as React.CSSProperties}
            />
          ))}

          {/* Floating Texts */}
          {floatingTexts.map(t => (
            <div
              key={t.id}
              className="animate-float"
              style={{
                position: 'absolute',
                pointerEvents: 'none',
                fontWeight: 900,
                fontSize: '14px',
                fontStyle: 'italic',
                whiteSpace: 'nowrap',
                left: `${t.x}%`,
                top: `${t.y}%`,
                color: t.color,
                textShadow: `0 0 10px ${t.color}`,
              }}
            >
              {t.text}
            </div>
          ))}
        </div>

        {/* Overlays */}
        {!hasStarted && !gameOver && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
            <Ghost size={48} color="#10b981" style={{ marginBottom: '16px', filter: 'drop-shadow(0 0 15px rgba(16,185,129,0.5))' }} className="animate-bounce" />
            <button 
              onClick={startGame} 
              style={{ padding: '16px 32px', background: '#10b981', color: '#fff', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Play size={20} fill="currentColor" /> INITIATE
            </button>
            <p style={{ margin: '24px 0 0 0', fontSize: '10px', fontWeight: 900, color: 'rgba(16, 185, 129, 0.5)', textTransform: 'uppercase', letterSpacing: '2px' }}>Engages Fullscreen Mode</p>
          </div>
        )}

        {countdown >= 0 && hasStarted && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
            <span style={{ fontSize: '80px', fontWeight: 900, fontStyle: 'italic', color: '#34d399', textShadow: '0 0 30px rgba(52,211,153,0.8)' }} className="animate-pulse">
              {countdown === 0 ? 'GO!' : countdown}
            </span>
          </div>
        )}

        {isPaused && hasStarted && !gameOver && countdown < 0 && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '36px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#f59e0b', textShadow: '0 0 15px rgba(245,158,11,0.5)' }}>Paused</h2>
            <button 
              onClick={togglePause} 
              style={{ padding: '16px 32px', background: '#f59e0b', color: '#fff', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(245, 158, 11, 0.4)' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Play size={20} fill="currentColor" /> Resume
            </button>
          </div>
        )}

        {gameOver && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(69, 10, 10, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, transition: 'opacity 0.5s', opacity: showGameOver ? 1 : 0, pointerEvents: showGameOver ? 'auto' : 'none' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '32px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#fff', textShadow: '0 0 20px rgba(239,68,68,1)' }}>System Failure</h2>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 900, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '2px' }}>Final Score: {score}</p>
            
            <div style={{ height: '20px', marginBottom: '24px' }}>
              {isSyncing && <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }} className="animate-pulse">Syncing to Cloud...</p>}
              {!isSyncing && score > 0 && <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, color: '#34d399', textTransform: 'uppercase', letterSpacing: '1px' }}>Score Saved</p>}
            </div>

            <button 
              onClick={startGame} 
              style={{ padding: '12px 24px', background: '#fff', color: '#dc2626', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '32px', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <RotateCcw size={18} /> Reboot
            </button>
          </div>
        )}
      </div>

      {/* D-PAD (pointer-based, no double-fire) */}
      <div style={{ marginTop: 'auto', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: '12px', width: '220px', userSelect: 'none', touchAction: 'none' }}>
        <div /> 
        <button 
          onPointerDown={(e) => { e.preventDefault(); changeDirection({ x: 0, y: -1 }); }}
          style={{ width: '64px', height: '64px', margin: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
          onMouseDown={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'; e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)'; e.currentTarget.style.color = '#10b981'; e.currentTarget.style.transform = 'scale(0.85)'; }}
          onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <ChevronUp size={36} strokeWidth={3} />
        </button>
        <div /> 

        <button 
          onPointerDown={(e) => { e.preventDefault(); changeDirection({ x: -1, y: 0 }); }}
          style={{ width: '64px', height: '64px', margin: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
          onMouseDown={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'; e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)'; e.currentTarget.style.color = '#10b981'; e.currentTarget.style.transform = 'scale(0.85)'; }}
          onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <ChevronLeft size={36} strokeWidth={3} />
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }} />
        </div>

        <button 
          onPointerDown={(e) => { e.preventDefault(); changeDirection({ x: 1, y: 0 }); }}
          style={{ width: '64px', height: '64px', margin: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
          onMouseDown={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'; e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)'; e.currentTarget.style.color = '#10b981'; e.currentTarget.style.transform = 'scale(0.85)'; }}
          onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <ChevronRight size={36} strokeWidth={3} />
        </button>

        <div /> 
        <button 
          onPointerDown={(e) => { e.preventDefault(); changeDirection({ x: 0, y: 1 }); }}
          style={{ width: '64px', height: '64px', margin: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
          onMouseDown={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'; e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)'; e.currentTarget.style.color = '#10b981'; e.currentTarget.style.transform = 'scale(0.85)'; }}
          onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <ChevronDown size={36} strokeWidth={3} />
        </button>
        <div /> 
      </div>

    </div>
  );
}
