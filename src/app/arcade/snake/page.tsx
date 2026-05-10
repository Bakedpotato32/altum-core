'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Play, RotateCcw, Ghost, ChevronUp, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]; // Start with length 3
const INITIAL_DIRECTION = { x: 0, y: -1 }; 
const INITIAL_SPEED = 160;

type Food = { x: number, y: number, type: 'regular' | 'gold' };

export default function NeonSnake() {
  const router = useRouter();
  
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState<Food>({ x: 5, y: 5, type: 'regular' });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [isSyncing, setIsSyncing] = useState(false);

  // Core Mechanics Refs
  const directionRef = useRef(INITIAL_DIRECTION);
  const moveQueue = useRef<{x: number, y: number}[]>([]); // THE INPUT BUFFER
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize Audio Engine
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSound = (type: 'eat' | 'eat_gold' | 'die') => {
    if (!audioCtxRef.current) return;
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
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('snakeHighScore');
    if (saved) setHighScore(parseInt(saved, 10));
    spawnFood();
  }, []);

  const spawnFood = useCallback(() => {
    let newFood: Food;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
        type: Math.random() < 0.2 ? 'gold' : 'regular' // 20% chance for Gold Core
      };
      const isOnSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!isOnSnake) break;
    }
    setFood(newFood);
  }, [snake]);

  const handleGameOver = async () => {
    setGameOver(true);
    playSound('die');
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([200, 100, 200]);
    }

    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('snakeHighScore', score.toString());
    }

    const studentId = localStorage.getItem('studentId');
    if (studentId && score > 0) {
      setIsSyncing(true);
      try {
        const { data: existingScore } = await supabase
          .from('arcade_scores')
          .select('id, score')
          .eq('student_id', studentId)
          .eq('game_name', 'snake')
          .maybeSingle();

        if (!existingScore) {
          await supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'snake', score: score }]);
        } else if (score > existingScore.score) {
          await supabase.from('arcade_scores').update({ score: score }).eq('id', existingScore.id);
        }
      } catch (err) {
        console.error("Failed to sync score", err);
      }
      setIsSyncing(false);
    }
  };

  const startGame = () => {
    initAudio();
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    moveQueue.current = [];
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setGameOver(false);
    setHasStarted(true);
    spawnFood();
  };

  // The Flawless Input Queue System
  const changeDirection = (newDir: { x: number, y: number }) => {
    const lastDir = moveQueue.current.length > 0 
      ? moveQueue.current[moveQueue.current.length - 1] 
      : directionRef.current;
    
    // Prevent 180 reverse and duplicates
    if (newDir.x !== 0 && lastDir.x === -newDir.x) return;
    if (newDir.y !== 0 && lastDir.y === -newDir.y) return;
    if (newDir.x === lastDir.x && newDir.y === lastDir.y) return;
    
    // Max buffer size of 3 to keep it feeling snappy
    if (moveQueue.current.length < 3) {
      moveQueue.current.push(newDir);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasStarted || gameOver) return;
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) e.preventDefault();
      
      switch (e.key) {
        case 'ArrowUp': case 'w': changeDirection({ x: 0, y: -1 }); break;
        case 'ArrowDown': case 's': changeDirection({ x: 0, y: 1 }); break;
        case 'ArrowLeft': case 'a': changeDirection({ x: -1, y: 0 }); break;
        case 'ArrowRight': case 'd': changeDirection({ x: 1, y: 0 }); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, gameOver]);

  // Main Game Tick
  useEffect(() => {
    if (!hasStarted || gameOver) return;

    const moveSnake = () => {
      // Process the input queue
      if (moveQueue.current.length > 0) {
        directionRef.current = moveQueue.current.shift()!;
      }
      
      setSnake(prevSnake => {
        const head = prevSnake[0];
        const newHead = { x: head.x + directionRef.current.x, y: head.y + directionRef.current.y };

        // Wall Collision
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          handleGameOver();
          return prevSnake;
        }

        // Self Collision
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          handleGameOver();
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Food Collision
        if (newHead.x === food.x && newHead.y === food.y) {
          const isGold = food.type === 'gold';
          setScore(s => s + (isGold ? 3 : 1));
          setSpeed(s => Math.max(s - 3, 50)); 
          playSound(isGold ? 'eat_gold' : 'eat');
          spawnFood();
          
          if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(isGold ? [30, 30, 30] : 40);
          }
        } else {
          newSnake.pop(); 
        }

        return newSnake;
      });
    };

    const gameInterval = setInterval(moveSnake, speed);
    return () => clearInterval(gameInterval);
  }, [hasStarted, gameOver, food, speed, spawnFood]);

  return (
    <div className="min-h-[100dvh] pb-40 font-sans bg-[var(--background)] text-[var(--text)] flex flex-col items-center pt-8 relative overflow-y-auto">
      
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[320px] h-[320px] rounded-full bg-emerald-500/10 blur-[80px]" />
        <div className="absolute bottom-[20%] left-[-10%] w-[260px] h-[260px] rounded-full bg-cyan-500/10 blur-[80px]" />
      </div>

      <div className="w-full max-w-md px-5 flex flex-col h-full relative z-10">
        
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => router.back()} className="p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all text-zinc-500 hover:text-emerald-500 shadow-sm">
            <ChevronLeft size={20} />
          </button>
          <div className="text-right">
            <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-none text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]">
              Neon Snake
            </h1>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Score</span>
            <span className="text-3xl font-black italic text-[var(--text)] leading-none">{score}</span>
          </div>
          <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <span className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest flex items-center gap-1 mb-1">
              <Trophy size={12}/> Best
            </span>
            <span className="text-3xl font-black italic text-amber-500 leading-none">{highScore}</span>
          </div>
        </div>

        <div className="relative aspect-square w-full max-w-[300px] mx-auto bg-[#050505] rounded-3xl border border-emerald-500/20 overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.15)] flex items-center justify-center">
          
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '10% 10%' }}></div>

          <div className="w-full h-full grid relative z-10 p-1" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` }}>
            {snake.map((segment, index) => {
              const isHead = index === 0;
              return (
                <div 
                  key={`snake-${index}`}
                  className={`transition-all duration-75 ${isHead ? 'bg-emerald-400 z-10 scale-[1.15] shadow-[0_0_15px_rgba(52,211,153,1)] rounded-md' : 'bg-emerald-600/80 scale-[0.85] rounded-[2px]'}`}
                  style={{ gridColumnStart: segment.x + 1, gridRowStart: segment.y + 1 }}
                />
              );
            })}

            <div 
              className={`${food.type === 'gold' ? 'bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,1)]' : 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.9)]'} rounded-full scale-[0.8] animate-pulse z-0 flex items-center justify-center`}
              style={{ gridColumnStart: food.x + 1, gridRowStart: food.y + 1 }}
            >
              {food.type === 'gold' && <Sparkles size={8} className="text-white/80" />}
            </div>
          </div>

          {!hasStarted && !gameOver && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <Ghost size={48} className="text-emerald-500 mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              <button onClick={startGame} className="px-8 py-4 bg-emerald-500 text-black font-black uppercase tracking-widest rounded-full flex items-center gap-2 hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                <Play size={18} fill="currentColor" /> Initiate
              </button>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center z-20">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-1 drop-shadow-[0_0_20px_rgba(239,68,68,1)]">System Failure</h2>
              <p className="text-[10px] font-bold text-red-300 uppercase tracking-widest mb-3">Final Score: {score}</p>
              
              {isSyncing && <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-6 animate-pulse">Syncing to Cloud...</p>}
              {!isSyncing && <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-6">Score Saved</p>}

              <button onClick={startGame} className="px-6 py-3 bg-white text-red-600 font-black uppercase tracking-widest rounded-full flex items-center gap-2 active:scale-95 transition-all shadow-xl">
                <RotateCcw size={16} /> Reboot
              </button>
            </div>
          )}
        </div>

        {/* 10/10 D-PAD */}
        <div className="mt-8 max-w-[220px] mx-auto w-full grid grid-cols-3 grid-rows-3 gap-2 touch-none select-none">
          
          <div /> {/* Top Left */}
          <button 
            onTouchStart={(e) => { e.preventDefault(); changeDirection({ x: 0, y: -1 }); }}
            onMouseDown={(e) => { e.preventDefault(); changeDirection({ x: 0, y: -1 }); }}
            className="w-16 h-16 mx-auto bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-emerald-500/20 active:border-emerald-500/50 active:scale-[0.85] transition-all shadow-sm text-zinc-500 active:text-emerald-500"
          >
            <ChevronUp size={36} strokeWidth={3} />
          </button>
          <div /> {/* Top Right */}

          <button 
            onTouchStart={(e) => { e.preventDefault(); changeDirection({ x: -1, y: 0 }); }}
            onMouseDown={(e) => { e.preventDefault(); changeDirection({ x: -1, y: 0 }); }}
            className="w-16 h-16 mx-auto bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-emerald-500/20 active:border-emerald-500/50 active:scale-[0.85] transition-all shadow-sm text-zinc-500 active:text-emerald-500"
          >
            <ChevronLeft size={36} strokeWidth={3} />
          </button>
          
          <div className="flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-[var(--border)] opacity-30 shadow-inner" />
          </div>

          <button 
            onTouchStart={(e) => { e.preventDefault(); changeDirection({ x: 1, y: 0 }); }}
            onMouseDown={(e) => { e.preventDefault(); changeDirection({ x: 1, y: 0 }); }}
            className="w-16 h-16 mx-auto bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-emerald-500/20 active:border-emerald-500/50 active:scale-[0.85] transition-all shadow-sm text-zinc-500 active:text-emerald-500"
          >
            <ChevronRight size={36} strokeWidth={3} />
          </button>

          <div /> {/* Bottom Left */}
          <button 
            onTouchStart={(e) => { e.preventDefault(); changeDirection({ x: 0, y: 1 }); }}
            onMouseDown={(e) => { e.preventDefault(); changeDirection({ x: 0, y: 1 }); }}
            className="w-16 h-16 mx-auto bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-emerald-500/20 active:border-emerald-500/50 active:scale-[0.85] transition-all shadow-sm text-zinc-500 active:text-emerald-500"
          >
            <ChevronDown size={36} strokeWidth={3} />
          </button>
          <div /> {/* Bottom Right */}

        </div>
      </div>
    </div>
  );
}
