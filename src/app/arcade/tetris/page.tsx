'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Play, RotateCcw, LayoutGrid, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Zap, Pause } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// --- GAME CONSTANTS ---
const COLS = 10;
const ROWS = 20;
const INITIAL_SPEED = 800;

const TETROMINOS: any = {
  I: { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: '#22d3ee' },
  J: { shape: [[1,0,0],[1,1,1],[0,0,0]], color: '#3b82f6' },
  L: { shape: [[0,0,1],[1,1,1],[0,0,0]], color: '#fb923c' },
  O: { shape: [[1,1],[1,1]], color: '#facc15' },
  S: { shape: [[0,1,1],[1,1,0],[0,0,0]], color: '#4ade80' },
  T: { shape: [[0,1,0],[1,1,1],[0,0,0]], color: '#a855f7' },
  Z: { shape: [[1,1,0],[0,1,1],[0,0,0]], color: '#ef4444' }
};

const createEmptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

export default function TetrisCore() {
  const router = useRouter();
  
  const [board, setBoard] = useState(createEmptyBoard());
  const [activePiece, setActivePiece] = useState<any>(null);
  const [nextPiece, setNextPiece] = useState<any>(null);
  const [holdPiece, setHoldPiece] = useState<any>(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'paused'>('idle');
  const [isSyncing, setIsSyncing] = useState(false);

  const speedRef = useRef(INITIAL_SPEED);
  const scoreRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gameLoopRef = useRef<any>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
  };

  const playSound = (type: 'move' | 'rotate' | 'drop' | 'clear' | 'gameover') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);

    osc.start();

    if (type === 'move') {
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'rotate') {
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'clear') {
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(20, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else {
        osc.stop();
    }
  };

  const isCollision = useCallback((pos: any, shape: any, currentBoard: any) => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const newX = pos.x + x;
          const newY = pos.y + y;
          if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && currentBoard[newY][newX] !== 0)) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  const handleGameOver = useCallback(async () => {
    setGameState('gameover');
    playSound('gameover');
    if (window.navigator.vibrate) window.navigator.vibrate([200, 100, 200]);
    
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem('tetrisHighScore', scoreRef.current.toString());
    }

    const studentId = localStorage.getItem('studentId');
    if (studentId && scoreRef.current > 0) {
      setIsSyncing(true);
      const { data: existing } = await supabase.from('arcade_scores').select('*').eq('student_id', studentId).eq('game_name', 'tetris').maybeSingle();
      if (!existing) {
        await supabase.from('arcade_scores').insert([{ student_id: studentId, game_name: 'tetris', score: scoreRef.current }]);
      } else if (scoreRef.current > existing.score) {
        await supabase.from('arcade_scores').update({ score: scoreRef.current }).eq('id', existing.id);
      }
      setIsSyncing(false);
    }
  }, [highScore]);

  const spawnPiece = useCallback((type?: string, isHold: boolean = false) => {
    const keys = Object.keys(TETROMINOS);
    const randomType = type || keys[Math.floor(Math.random() * keys.length)];
    const newPiece = {
      pos: { x: Math.floor(COLS / 2) - 1, y: 0 },
      tetromino: TETROMINOS[randomType],
      type: randomType
    };

    setBoard(prevBoard => {
      if (isCollision(newPiece.pos, newPiece.tetromino.shape, prevBoard)) {
        handleGameOver();
      }
      return prevBoard;
    });

    setActivePiece(newPiece);
    if (!isHold) {
      const nextType = keys[Math.floor(Math.random() * keys.length)];
      setNextPiece({ type: nextType, tetromino: TETROMINOS[nextType] });
    }
    return newPiece;
  }, [handleGameOver, isCollision]);

  const rotate = (matrix: any) => {
    return matrix[0].map((_: any, index: any) => matrix.map((col: any) => col[index]).reverse());
  };

  const handleRotate = () => {
    if (!activePiece || gameState !== 'playing') return;
    const newShape = rotate(activePiece.tetromino.shape);
    let newPos = { ...activePiece.pos };
    if (isCollision(newPos, newShape, board)) {
      newPos.x += 1; 
      if (isCollision(newPos, newShape, board)) {
        newPos.x -= 2; 
        if (isCollision(newPos, newShape, board)) return;
      }
    }
    setActivePiece({ ...activePiece, pos: newPos, tetromino: { ...activePiece.tetromino, shape: newShape } });
    playSound('rotate');
  };

  const handleMove = (dir: number) => {
    if (!activePiece || gameState !== 'playing') return;
    const newPos = { ...activePiece.pos, x: activePiece.pos.x + dir };
    if (!isCollision(newPos, activePiece.tetromino.shape, board)) {
      setActivePiece({ ...activePiece, pos: newPos });
      playSound('move');
    }
  };

  const performLock = useCallback((pieceToLock: any) => {
    setBoard(prevBoard => {
      const newBoard = prevBoard.map(row => [...row]);
      pieceToLock.tetromino.shape.forEach((row: any, y: number) => {
        row.forEach((value: number, x: number) => {
          if (value !== 0) {
            const boardY = pieceToLock.pos.y + y;
            const boardX = pieceToLock.pos.x + x;
            if (boardY >= 0) newBoard[boardY][boardX] = pieceToLock.tetromino.color;
          }
        });
      });

      let linesCleared = 0;
      const filteredBoard = newBoard.filter(row => {
        const isFull = row.every(cell => cell !== 0);
        if (isFull) linesCleared++;
        return !isFull;
      });

      while (filteredBoard.length < ROWS) {
        filteredBoard.unshift(Array( COLS).fill(0));
      }

      if (linesCleared > 0) {
        const points = [0, 100, 300, 500, 800][linesCleared];
        scoreRef.current += points;
        setScore(scoreRef.current);
        speedRef.current = Math.max(100, INITIAL_SPEED - (Math.floor(scoreRef.current / 1000) * 100));
        playSound('clear');
        if (window.navigator.vibrate) window.navigator.vibrate(50);
      }

      return filteredBoard;
    });

    setCanHold(true);
    spawnPiece(nextPiece?.type);
  }, [nextPiece, spawnPiece]);

  const drop = useCallback(() => {
    if (!activePiece || gameState !== 'playing') return;
    const newPos = { ...activePiece.pos, y: activePiece.pos.y + 1 };
    
    if (!isCollision(newPos, activePiece.tetromino.shape, board)) {
      setActivePiece({ ...activePiece, pos: newPos });
    } else {
      performLock(activePiece);
    }
  }, [activePiece, board, gameState, isCollision, performLock]);

  const handleHardDrop = () => {
    if (!activePiece || gameState !== 'playing') return;
    let newY = activePiece.pos.y;
    while (!isCollision({ x: activePiece.pos.x, y: newY + 1 }, activePiece.tetromino.shape, board)) {
      newY++;
    }
    const finalPiece = { ...activePiece, pos: { ...activePiece.pos, y: newY } };
    setActivePiece(finalPiece);
    performLock(finalPiece);
    if (window.navigator.vibrate) window.navigator.vibrate(40);
  };

  const handleHold = () => {
    if (!canHold || gameState !== 'playing' || !activePiece) return;
    const currentType = activePiece.type;
    if (holdPiece) {
      spawnPiece(holdPiece.type, true);
    } else {
      spawnPiece(nextPiece.type);
    }
    setHoldPiece({ type: currentType, tetromino: TETROMINOS[currentType] });
    setCanHold(false);
  };

  const startGame = () => {
    initAudio();
    setBoard(createEmptyBoard());
    setScore(0);
    scoreRef.current = 0;
    speedRef.current = INITIAL_SPEED;
    setHoldPiece(null);
    setCanHold(true);
    setGameState('playing');
    const keys = Object.keys(TETROMINOS);
    const t1 = keys[Math.floor(Math.random() * keys.length)];
    const t2 = keys[Math.floor(Math.random() * keys.length)];
    setActivePiece({ pos: { x: 4, y: 0 }, tetromino: TETROMINOS[t1], type: t1 });
    setNextPiece({ type: t2, tetromino: TETROMINOS[t2] });
  };

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(drop, speedRef.current);
    } else {
      clearInterval(gameLoopRef.current);
    }
    return () => clearInterval(gameLoopRef.current);
  }, [gameState, drop]);

  const getGhostPos = () => {
    if (!activePiece) return null;
    let ghostY = activePiece.pos.y;
    while (!isCollision({ x: activePiece.pos.x, y: ghostY + 1 }, activePiece.tetromino.shape, board)) {
      ghostY++;
    }
    return { ...activePiece.pos, y: ghostY };
  };

  const ghost = getGhostPos();

  return (
    <div className="min-h-[100dvh] pb-40 font-sans bg-[var(--background)] text-[var(--text)] flex flex-col items-center pt-8 relative overflow-y-auto select-none touch-none">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[320px] h-[320px] rounded-full bg-blue-500/10 blur-[80px]" />
        <div className="absolute bottom-[20%] left-[-10%] w-[260px] h-[260px] rounded-full bg-indigo-500/10 blur-[80px]" />
      </div>

      <div className="w-full max-w-md px-5 flex flex-col relative z-10">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => router.back()} className="p-2.5 bg-[var(--card)] rounded-xl border border-[var(--border)] active:scale-90 transition-all text-zinc-500">
            <ChevronLeft size={20} />
          </button>
          <div className="text-right">
            <h1 className="text-xl font-black italic uppercase tracking-tighter text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]">Tetris Core</h1>
          </div>
        </div>

        <div className="flex gap-4 mb-4 h-[440px]">
          <div className="flex flex-col gap-3 w-20">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-2 flex flex-col items-center shadow-sm">
              <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest mb-1">HOLD</span>
              <div className="w-12 h-12 flex items-center justify-center">
                {holdPiece && <MiniPreview piece={holdPiece} />}
              </div>
            </div>
            <div className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-2 flex flex-col items-center justify-center shadow-sm">
              <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest mb-1">SCORE</span>
              <span className="text-lg font-black italic text-blue-500 leading-none">{score}</span>
              <div className="h-px w-8 bg-[var(--border)] my-3" />
              <Trophy size={10} className="text-amber-500 mb-1" />
              <span className="text-xs font-black italic text-zinc-400">{highScore}</span>
            </div>
          </div>

          <div className="relative flex-1 bg-[#050505] rounded-2xl border-2 border-blue-500/20 overflow-hidden shadow-2xl">
            <div className="absolute inset-0 grid grid-cols-10 grid-rows-20 opacity-[0.05] pointer-events-none">
              {Array.from({ length: 200 }).map((_, i) => <div key={i} className="border-[0.5px] border-white" />)}
            </div>
            
            <div className="relative w-full h-full">
              {board.map((row, y) => row.map((cell, x) => cell ? (
                <Block key={`b-${x}-${y}`} x={x} y={y} color={cell} />
              ) : null))}

              {gameState === 'playing' && ghost && activePiece?.tetromino.shape.map((row: any, y: number) => row.map((value: number, x: number) => (
                value !== 0 && <Block key={`g-${x}-${y}`} x={ghost.x + x} y={ghost.y + y} color={activePiece.tetromino.color} isGhost />
              )))}

              {gameState === 'playing' && activePiece && activePiece.tetromino.shape.map((row: any, y: number) => row.map((value: number, x: number) => (
                value !== 0 && <Block key={`a-${x}-${y}`} x={activePiece.pos.x + x} y={activePiece.pos.y + y} color={activePiece.tetromino.color} />
              )))}
            </div>

            {gameState === 'idle' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20 p-6 text-center">
                <LayoutGrid size={48} className="text-blue-500 mb-4 animate-pulse" />
                <button onClick={startGame} className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg">
                  <Play size={18} fill="currentColor" /> Initialize
                </button>
              </div>
            )}

            {gameState === 'gameover' && (
              <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center z-20 p-6 text-center">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-1">Grid Overload</h2>
                <button onClick={startGame} className="w-full py-4 bg-white text-red-600 font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 active:scale-95 shadow-xl">
                  <RotateCcw size={18} /> Reboot
                </button>
              </div>
            )}
          </div>

          <div className="w-16 flex flex-col gap-3">
             <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-2 flex flex-col items-center shadow-sm">
                <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest mb-1">NEXT</span>
                <div className="w-12 h-12 flex items-center justify-center">
                  {nextPiece && <MiniPreview piece={nextPiece} />}
                </div>
             </div>
             <button 
                onClick={() => setGameState(gameState === 'paused' ? 'playing' : 'paused')}
                className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl flex flex-col items-center justify-center active:scale-90 transition-all text-zinc-500"
              >
                <Pause size={20} />
             </button>
          </div>
        </div>

        <div className="mt-4 w-full grid grid-cols-4 gap-3 touch-none">
          <button onTouchStart={() => handleMove(-1)} className="aspect-square bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-blue-500/20 active:scale-90 transition-all shadow-sm">
            <ArrowLeft className="text-zinc-500" />
          </button>
          <div className="grid grid-rows-2 gap-2">
            <button onTouchStart={handleRotate} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-blue-500/20 active:scale-90 transition-all shadow-sm">
              <RotateCcw size={18} className="text-blue-500" />
            </button>
            <button onTouchStart={handleHardDrop} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-orange-500/20 active:scale-90 transition-all shadow-sm">
              <ArrowUp size={18} className="text-orange-500" />
            </button>
          </div>
          <button onTouchStart={() => handleMove(1)} className="aspect-square bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-blue-500/20 active:scale-90 transition-all shadow-sm">
            <ArrowRight className="text-zinc-500" />
          </button>
          <div className="grid grid-rows-2 gap-2">
            <button onTouchStart={handleHold} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-purple-500/20 active:scale-90 transition-all shadow-sm">
              <Zap size={18} className="text-purple-500" />
            </button>
            <button onTouchStart={drop} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-center active:bg-blue-500/20 active:scale-90 transition-all shadow-sm">
              <ArrowDown size={18} className="text-zinc-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const Block = ({ x, y, color, isGhost = false }: any) => (
  <div 
    className="absolute rounded-[4px]"
    style={{
      left: `${x * 10}%`,
      top: `${y * 5}%`,
      width: '10%',
      height: '5%',
      backgroundColor: isGhost ? 'transparent' : color,
      border: isGhost ? `2px dashed ${color}44` : 'none',
      boxShadow: isGhost ? 'none' : `inset 0 0 8px rgba(255,255,255,0.3), 0 0 10px ${color}66`,
      zIndex: isGhost ? 5 : 10
    }}
  />
);

const MiniPreview = ({ piece }: any) => (
  <div className="relative w-10 h-10">
    {piece.tetromino.shape.map((row: any, y: number) => row.map((value: number, x: number) => (
      value !== 0 && (
        <div 
          key={`${x}-${y}`}
          className="absolute rounded-[2px]"
          style={{
            left: `${x * 8}px`,
            top: `${y * 8}px`,
            width: '7px',
            height: '7px',
            backgroundColor: piece.tetromino.color,
            boxShadow: `0 0 4px ${piece.tetromino.color}`
          }}
        />
      )
    )))}
  </div>
);
