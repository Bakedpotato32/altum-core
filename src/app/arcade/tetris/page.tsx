'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Trophy, Play, RotateCcw, LayoutGrid, 
  ArrowDown, ArrowLeft, ArrowRight, Zap, Pause, FastForward 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [flash, setFlash] = useState(false); // Screen flash for line clears

  const speedRef = useRef(INITIAL_SPEED);
  const scoreRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gameLoopRef = useRef<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('tetrisHighScore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // --- FULLSCREEN LOGIC ---
  const requestFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => console.log(err));
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) {
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

  // --- AUDIO & HAPTICS ---
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

  const vibrate = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
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
    vibrate([200, 100, 200, 100, 400]);
    
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
      pos: { x: Math.floor(COLS / 2) - 2, y: 0 }, 
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

  const handleRotate = (e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
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
    vibrate(15);
  };

  const handleMove = (dir: number, e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!activePiece || gameState !== 'playing') return;
    const newPos = { ...activePiece.pos, x: activePiece.pos.x + dir };
    if (!isCollision(newPos, activePiece.tetromino.shape, board)) {
      setActivePiece({ ...activePiece, pos: newPos });
      playSound('move');
      vibrate(10);
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
        filteredBoard.unshift(Array(COLS).fill(0));
      }

      if (linesCleared > 0) {
        const points = [0, 100, 300, 500, 800][linesCleared];
        scoreRef.current += points;
        setScore(scoreRef.current);
        speedRef.current = Math.max(100, INITIAL_SPEED - (Math.floor(scoreRef.current / 1000) * 100));
        playSound('clear');
        vibrate([50, 50, 50]);
        
        setFlash(true);
        setTimeout(() => setFlash(false), 150);
      }

      return filteredBoard;
    });

    setCanHold(true);
    spawnPiece(nextPiece?.type);
  }, [nextPiece, spawnPiece]);

  const drop = useCallback((e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!activePiece || gameState !== 'playing') return;
    const newPos = { ...activePiece.pos, y: activePiece.pos.y + 1 };
    
    if (!isCollision(newPos, activePiece.tetromino.shape, board)) {
      setActivePiece({ ...activePiece, pos: newPos });
    } else {
      performLock(activePiece);
      vibrate(20);
    }
  }, [activePiece, board, gameState, isCollision, performLock]);

  const handleHardDrop = (e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!activePiece || gameState !== 'playing') return;
    let newY = activePiece.pos.y;
    while (!isCollision({ x: activePiece.pos.x, y: newY + 1 }, activePiece.tetromino.shape, board)) {
      newY++;
    }
    const finalPiece = { ...activePiece, pos: { ...activePiece.pos, y: newY } };
    setActivePiece(finalPiece);
    performLock(finalPiece);
    vibrate(40);
  };

  const handleHold = (e?: React.SyntheticEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!canHold || gameState !== 'playing' || !activePiece) return;
    const currentType = activePiece.type;
    if (holdPiece) {
      spawnPiece(holdPiece.type, true);
    } else {
      spawnPiece(nextPiece.type);
    }
    setHoldPiece({ type: currentType, tetromino: TETROMINOS[currentType] });
    setCanHold(false);
    vibrate(15);
  };

  const startGame = () => {
    requestFullscreen();
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
    setActivePiece({ pos: { x: 3, y: 0 }, tetromino: TETROMINOS[t1], type: t1 });
    setNextPiece({ type: t2, tetromino: TETROMINOS[t2] });
  };

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(() => drop(), speedRef.current);
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
    <div style={{
      minHeight: '100dvh',
      background: flash ? 'rgba(59, 130, 246, 0.1)' : '#fff',
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
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', filter: 'blur(80px)' }} />
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
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#3b82f6' }}>Tetris Core</h1>
          </div>
        </div>

        {/* Game Layout Wrapper */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', width: '100%', height: '460px' }}>
          
          {/* Left Column: Hold & Score */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '80px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '9px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>HOLD</span>
              <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {holdPiece && <MiniPreview piece={holdPiece} />}
              </div>
            </div>
            <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '9px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>SCORE</span>
              <span style={{ fontSize: '24px', fontWeight: 900, fontStyle: 'italic', color: '#3b82f6', lineHeight: 1 }}>{score}</span>
              <div style={{ height: '1px', width: '32px', background: '#cbd5e1', margin: '12px 0' }} />
              <Trophy size={14} color="#f59e0b" style={{ marginBottom: '4px' }} />
              <span style={{ fontSize: '14px', fontWeight: 900, fontStyle: 'italic', color: '#f59e0b' }}>{highScore}</span>
            </div>
          </div>

          {/* Main Board */}
          <div style={{ 
            position: 'relative', flex: 1, background: '#050505', borderRadius: '24px', 
            border: flash ? '2px solid #60a5fa' : '2px solid rgba(59, 130, 246, 0.3)', 
            transition: 'all 0.1s', overflow: 'hidden', 
            boxShadow: flash ? '0 0 30px rgba(59,130,246,0.6)' : '0 10px 30px rgba(59,130,246,0.15)' 
          }}>
            {/* Grid Lines */}
            <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)`, opacity: 0.08, pointerEvents: 'none' }}>
              {Array.from({ length: COLS * ROWS }).map((_, i) => <div key={i} style={{ border: '0.5px solid #fff' }} />)}
            </div>
            
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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

            {/* Overlays */}
            <AnimatePresence>
              {gameState === 'idle' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', zIndex: 20 }}>
                  <LayoutGrid size={48} color="#3b82f6" style={{ marginBottom: '16px', filter: 'drop-shadow(0 0 15px rgba(59,130,246,0.6))' }} className="animate-pulse" />
                  <button 
                    onClick={startGame} 
                    style={{ width: '100%', padding: '16px', background: '#3b82f6', color: '#fff', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '16px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 0 20px rgba(59,130,246,0.5)' }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <Play size={18} fill="currentColor" /> Initialize
                  </button>
                  <p style={{ margin: '16px 0 0 0', fontSize: '8px', fontWeight: 900, color: 'rgba(147, 197, 253, 0.6)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Engages Fullscreen</p>
                </motion.div>
              )}

              {gameState === 'gameover' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(69, 10, 10, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', zIndex: 20 }}>
                  <h2 style={{ margin: '0 0 16px 0', fontSize: '28px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-1px', color: '#fff', textShadow: '0 0 15px rgba(239,68,68,0.8)' }}>Grid Overload</h2>
                  <div style={{ height: '20px', marginBottom: '16px' }}>
                    {isSyncing && <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }} className="animate-pulse">Syncing...</p>}
                  </div>
                  <button 
                    onClick={startGame} 
                    style={{ width: '100%', padding: '16px', background: '#fff', color: '#dc2626', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '16px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 10px 15px rgba(0,0,0,0.3)' }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <RotateCcw size={18} /> Reboot
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Next & Pause */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '64px' }}>
             <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '9px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>NEXT</span>
                <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {nextPiece && <MiniPreview piece={nextPiece} />}
                </div>
             </div>
             <button 
                onPointerDown={(e) => { e.preventDefault(); setGameState(gameState === 'paused' ? 'playing' : 'paused'); }}
                style={{ flex: 1, background: gameState === 'paused' ? 'rgba(245, 158, 11, 0.1)' : '#f8fafc', border: gameState === 'paused' ? '2px solid rgba(245, 158, 11, 0.3)' : '1px solid #e2e8f0', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: gameState === 'paused' ? '#f59e0b' : '#64748b', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.02)', transition: 'all 0.2s ease' }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {gameState === 'paused' ? <Play size={24} /> : <Pause size={24} />}
             </button>
          </div>
        </div>

        {/* OVERHAULED D-PAD CONTROLS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', width: '100%', maxWidth: '340px', margin: '0 auto', touchAction: 'none', userSelect: 'none' }}>
          <button 
            onPointerDown={(e) => handleMove(-1, e)} 
            style={{ height: '80px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
            onMouseDown={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.transform = 'scale(0.85)'; }}
            onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <ArrowLeft size={36} strokeWidth={2.5} />
          </button>
          
          <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '8px', height: '80px' }}>
            <button 
              onPointerDown={(e) => handleRotate(e)} 
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
              onMouseDown={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)'; e.currentTarget.style.transform = 'scale(0.85)'; }}
              onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <RotateCcw size={26} color="#3b82f6" strokeWidth={2.5} />
            </button>
            <button 
              onPointerDown={(e) => handleHardDrop(e)} 
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
              onMouseDown={e => { e.currentTarget.style.background = 'rgba(249, 115, 22, 0.2)'; e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.5)'; e.currentTarget.style.transform = 'scale(0.85)'; }}
              onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <FastForward size={26} color="#f97316" className="rotate-90" strokeWidth={2.5} />
            </button>
          </div>

          <button 
            onPointerDown={(e) => handleMove(1, e)} 
            style={{ height: '80px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
            onMouseDown={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.transform = 'scale(0.85)'; }}
            onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <ArrowRight size={36} strokeWidth={2.5} />
          </button>
          
          <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '8px', height: '80px' }}>
            <button 
              onPointerDown={(e) => handleHold(e)} 
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
              onMouseDown={e => { e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)'; e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.5)'; e.currentTarget.style.transform = 'scale(0.85)'; }}
              onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Zap size={22} color="#a855f7" strokeWidth={2.5} />
            </button>
            <button 
              onPointerDown={(e) => drop(e)} 
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.1s' }}
              onMouseDown={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)'; e.currentTarget.style.transform = 'scale(0.85)'; }}
              onMouseUp={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <ArrowDown size={26} color="#64748b" strokeWidth={2.5} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

const Block = ({ x, y, color, isGhost = false }: any) => (
  <div 
    style={{
      position: 'absolute',
      borderRadius: '3px',
      transition: 'all 0.075s',
      left: `${x * 10}%`,
      top: `${y * 5}%`,
      width: '10%',
      height: '5%',
      backgroundColor: isGhost ? 'transparent' : color,
      border: isGhost ? `2px dashed ${color}66` : '1px solid rgba(0,0,0,0.3)',
      boxShadow: isGhost ? 'none' : `inset 2px 2px 4px rgba(255,255,255,0.4), inset -2px -2px 4px rgba(0,0,0,0.4), 0 0 8px ${color}44`,
      zIndex: isGhost ? 5 : 10
    }}
  />
);

const MiniPreview = ({ piece }: any) => (
  <div style={{ position: 'relative', width: '48px', height: '48px' }}>
    {piece.tetromino.shape.map((row: any, y: number) => row.map((value: number, x: number) => (
      value !== 0 && (
        <div 
          key={`${x}-${y}`}
          style={{
            position: 'absolute',
            borderRadius: '2px',
            left: `${x * 9}px`,
            top: `${y * 9}px`,
            width: '8px',
            height: '8px',
            backgroundColor: piece.tetromino.color,
            boxShadow: `inset 1px 1px 2px rgba(255,255,255,0.4), 0 0 4px ${piece.tetromino.color}`
          }}
        />
      )
    )))}
  </div>
);
