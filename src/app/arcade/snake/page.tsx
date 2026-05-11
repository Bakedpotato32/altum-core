'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Trophy, Play, RotateCcw, Ghost, ChevronUp, 
  ChevronDown, ChevronRight, Sparkles, Pause, Volume2, VolumeX, Zap 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

  // --- SUPABASE SYNC (untouched logic) ---
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
    
    // Reset refs
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
    
    // Reset state
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
    
    // Countdown
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

  // --- MAIN GAME LOOP (stable, ref-based) ---
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
    <div className={`h-[100dvh] w-screen font-sans bg-[var(--background)] text-[var(--text)] flex flex-col items-center pt-8 relative overflow-hidden touch-none overscroll-none transition-colors duration-200 ${flash ? 'bg-red-950/30' : ''}`}>
      
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

      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[320px] h-[320px] rounded-full bg-emerald-500/10 blur-[80px]" />
        <div className="absolute bottom-[20%] left-[-10%] w-[260px] h-[260px] rounded-full bg-cyan-500/10 blur-[80px]" />
      </div>

      <div className="w-full max-w-md px-5 flex flex-col h-full relative z-10">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button onClick={handleBack} className="p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all text-zinc-500 hover:text-emerald-500 shadow-sm z-50">
              <ChevronLeft size={20} />
            </button>
            {hasStarted && !gameOver && (
              <button onClick={togglePause} className={`p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all shadow-sm ${isPaused ? 'text-amber-500 border-amber-500/30' : 'text-zinc-500 hover:text-emerald-500'}`}>
                {isPaused ? <Play size={20} /> : <Pause size={20} />}
              </button>
            )}
            <button onClick={() => { isMutedRef.current = !isMutedRef.current; setIsMuted(isMutedRef.current); }} className="p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all text-zinc-500 hover:text-emerald-500 shadow-sm">
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
          <div className="text-right">
            <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-none text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]">
              Neon Snake
            </h1>
          </div>
        </div>

        {/* Score Board */}
        <div className="flex gap-3 mb-4">
          <div className={`flex-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm relative overflow-hidden transition-all duration-100 ${pulse ? 'scale-105 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : ''} ${combo > 1 ? 'border-fuchsia-500/40 shadow-[0_0_15px_rgba(232,121,249,0.2)]' : ''}`}>
            <div className="absolute top-1 right-2 flex items-center gap-1 opacity-40">
              <Zap size={10} className="text-emerald-500" />
              <span className="text-[8px] font-black text-emerald-500">{speedPct}%</span>
            </div>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Score</span>
            <span className="text-3xl font-black italic text-[var(--text)] leading-none">{score}</span>
            {combo > 1 && (
              <span className="text-[10px] font-black italic text-fuchsia-400 mt-0.5 animate-pulse">COMBO x{combo}</span>
            )}
          </div>
          <div className={`flex-1 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-all ${newBest ? 'scale-110 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.3)]' : ''}`}>
            <span className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest flex items-center gap-1 mb-1">
              <Trophy size={12}/> Best
            </span>
            <span className="text-3xl font-black italic text-amber-500 leading-none">{highScore}</span>
            {newBest && <span className="text-[9px] font-black text-amber-300 mt-0.5 animate-bounce">NEW BEST!</span>}
          </div>
        </div>

        {/* Game Board */}
        <div 
          className={`relative aspect-square w-full max-w-[300px] mx-auto bg-[#050505] rounded-[8px] border overflow-hidden flex items-center justify-center transition-all duration-200 ${flash ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)]' : 'border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.15)]'}`}
          onPointerDown={handleBoardPointerDown}
          onPointerUp={handleBoardPointerUp}
          style={{ touchAction: 'none' }}
        >
          
          {/* Grid Background */}
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '5% 5%' }}></div>

          <div className="w-full h-full grid relative z-10 p-1" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` }}>
            
            {/* Snake */}
            {snake.map((segment, index) => {
              const isHead = index === 0;
              const opacity = deathAnim ? 1 : 1 - (index / snake.length) * 0.65;
              
              return (
                <div 
                  key={`snake-${index}`}
                  className={`flex items-center justify-center ${deathAnim ? 'animate-death' : ''} ${isHead ? 'bg-emerald-400 z-10 scale-[1.15] shadow-[0_0_15px_rgba(52,211,153,1)] rounded-[6px]' : 'bg-emerald-500 scale-[0.9] rounded-[4px]'}`}
                  style={{ 
                    gridColumnStart: segment.x + 1, 
                    gridRowStart: segment.y + 1, 
                    opacity,
                    ...(deathAnim ? {
                      '--dx': `${(Math.random() - 0.5) * 80}px`,
                      '--dy': `${(Math.random() - 0.5) * 80}px`,
                    } as React.CSSProperties : {})
                  }}
                >
                  {isHead && !deathAnim && (
                    <div className="relative w-full h-full">
                      <div className={`absolute w-1.5 h-1.5 bg-black rounded-full transition-all ${direction.x === 1 ? 'right-1 top-1' : direction.x === -1 ? 'left-1 top-1' : direction.y === 1 ? 'bottom-1 right-1' : 'top-1 right-1'}`} />
                      <div className={`absolute w-1.5 h-1.5 bg-black rounded-full transition-all ${direction.x === 1 ? 'right-1 bottom-1' : direction.x === -1 ? 'left-1 bottom-1' : direction.y === 1 ? 'bottom-1 left-1' : 'top-1 left-1'}`} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Food */}
            <div 
              className={`${food.type === 'gold' ? 'bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,1)]' : 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.9)]'} rounded-full scale-[0.8] animate-pulse z-0 flex items-center justify-center`}
              style={{ gridColumnStart: food.x + 1, gridRowStart: food.y + 1 }}
            >
              {food.type === 'gold' && <Sparkles size={10} className="text-white/90 animate-spin" style={{ animationDuration: '3s' }} />}
            </div>

            {/* Particles */}
            {particles.map(p => (
              <div
                key={p.id}
                className="absolute rounded-full pointer-events-none animate-particle"
                style={{
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
                className="absolute pointer-events-none animate-float font-black text-sm italic whitespace-nowrap"
                style={{
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <Ghost size={48} className="text-emerald-500 mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              <button onClick={startGame} className="px-8 py-4 bg-emerald-500 text-black font-black uppercase tracking-widest rounded-full flex items-center gap-2 hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                <Play size={18} fill="currentColor" /> Initiate
              </button>
              <p className="text-[8px] font-black text-emerald-500/50 uppercase tracking-[0.2em] mt-6">Engages Fullscreen Mode</p>
            </div>
          )}

          {countdown >= 0 && hasStarted && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-30">
              <span className="text-7xl font-black italic text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.8)] animate-pulse">
                {countdown === 0 ? 'GO!' : countdown}
              </span>
            </div>
          )}

          {isPaused && hasStarted && !gameOver && countdown < 0 && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-amber-500 mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">Paused</h2>
              <button onClick={togglePause} className="px-8 py-4 bg-amber-500 text-black font-black uppercase tracking-widest rounded-full flex items-center gap-2 hover:bg-amber-400 active:scale-95 transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                <Play size={18} fill="currentColor" /> Resume
              </button>
            </div>
          )}

          {gameOver && (
            <div className={`absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center z-20 transition-opacity duration-500 ${showGameOver ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-1 drop-shadow-[0_0_20px_rgba(239,68,68,1)]">System Failure</h2>
              <p className="text-[10px] font-bold text-red-300 uppercase tracking-widest mb-3">Final Score: {score}</p>
              
              <div className="h-4 mb-6">
                {isSyncing && <p className="text-[9px] font-black text-white/50 uppercase tracking-widest animate-pulse">Syncing to Cloud...</p>}
                {!isSyncing && score > 0 && <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Score Saved</p>}
              </div>

              <button onClick={startGame} className="px-6 py-3 bg-white text-red-600 font-black uppercase tracking-widest rounded-full flex items-center gap-2 active:scale-95 transition-all shadow-xl hover:scale-105">
                <RotateCcw size={16} /> Reboot
              </button>
            </div>
          )}
        </div>

        {/* D-PAD (pointer-based, no double-fire) */}
        <div className="mt-auto mb-10 max-w-[220px] mx-auto w-full grid grid-cols-3 grid-rows-3 gap-2 select-none" style={{ touchAction: 'none' }}>
          <div /> 
          <button 
            onPointerDown={(e) => { e.preventDefault(); changeDirection({ x: 0, y: -1 }); }}
            className="w-16 h-16 mx-auto bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-emerald-500/20 active:border-emerald-500/50 active:scale-[0.85] transition-all shadow-sm text-zinc-500 active:text-emerald-500"
          >
            <ChevronUp size={36} strokeWidth={3} />
          </button>
          <div /> 

          <button 
            onPointerDown={(e) => { e.preventDefault(); changeDirection({ x: -1, y: 0 }); }}
            className="w-16 h-16 mx-auto bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-emerald-500/20 active:border-emerald-500/50 active:scale-[0.85] transition-all shadow-sm text-zinc-500 active:text-emerald-500"
          >
            <ChevronLeft size={36} strokeWidth={3} />
          </button>
          
          <div className="flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-[var(--border)] opacity-30 shadow-inner" />
          </div>

          <button 
            onPointerDown={(e) => { e.preventDefault(); changeDirection({ x: 1, y: 0 }); }}
            className="w-16 h-16 mx-auto bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-emerald-500/20 active:border-emerald-500/50 active:scale-[0.85] transition-all shadow-sm text-zinc-500 active:text-emerald-500"
          >
            <ChevronRight size={36} strokeWidth={3} />
          </button>

          <div /> 
          <button 
            onPointerDown={(e) => { e.preventDefault(); changeDirection({ x: 0, y: 1 }); }}
            className="w-16 h-16 mx-auto bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-emerald-500/20 active:border-emerald-500/50 active:scale-[0.85] transition-all shadow-sm text-zinc-500 active:text-emerald-500"
          >
            <ChevronDown size={36} strokeWidth={3} />
          </button>
          <div /> 
        </div>

      </div>
    </div>
  );
}
