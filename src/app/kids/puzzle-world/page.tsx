'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useAnimation } from 'framer-motion';
import { 
  ChevronLeft, Sparkles, Circle, Triangle, Square, Star, Heart, ArrowRight,
  Hexagon, Cloud, Moon, Sun, Diamond, Droplet, Zap
} from 'lucide-react';

// Expanded library of shapes!
const SHAPES = [
  { id: 'circle', component: Circle, color: '#FF416C' },
  { id: 'triangle', component: Triangle, color: '#36D1DC' },
  { id: 'square', component: Square, color: '#F7971E' },
  { id: 'star', component: Star, color: '#8E2DE2' },
  { id: 'heart', component: Heart, color: '#ec4899' },
  { id: 'hexagon', component: Hexagon, color: '#10b981' }, // Emerald
  { id: 'cloud', component: Cloud, color: '#3b82f6' },     // Blue
  { id: 'moon', component: Moon, color: '#6366f1' },       // Indigo
  { id: 'sun', component: Sun, color: '#f59e0b' },         // Amber
  { id: 'diamond', component: Diamond, color: '#06b6d4' }, // Cyan
  { id: 'droplet', component: Droplet, color: '#0ea5e9' }, // Sky
  { id: 'zap', component: Zap, color: '#eab308' }          // Yellow
];

export default function PuzzleWorld() {
  const router = useRouter();
  const [targetShape, setTargetShape] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [isMatched, setIsMatched] = useState(false);
  const [score, setScore] = useState(0);

  // Animation controls for the shadow target
  const targetControls = useAnimation();

  const generateRound = () => {
    setIsMatched(false);
    
    // Pick a random target shape
    const targetIndex = Math.floor(Math.random() * SHAPES.length);
    const target = SHAPES[targetIndex];
    setTargetShape(target);

    // Pick 2 other random shapes for options
    const remainingShapes = SHAPES.filter(s => s.id !== target.id);
    const shuffledRemaining = remainingShapes.sort(() => Math.random() - 0.5);
    
    // Combine and shuffle the 3 options
    const roundOptions = [target, shuffledRemaining[0], shuffledRemaining[1]]
      .sort(() => Math.random() - 0.5);
    
    setOptions(roundOptions);
  };

  // Initialize first round safely on client side
  useEffect(() => {
    generateRound();
  }, []);

  const handleDragEnd = async (event: any, info: any, shapeId: string) => {
    // If they dragged the shape upwards significantly (towards the target)
    if (info.offset.y < -50) {
      if (shapeId === targetShape?.id) {
        // Correct Match!
        setIsMatched(true);
        setScore(s => s + 1);
        await targetControls.start({
          scale: [1, 1.2, 1],
          transition: { duration: 0.5, ease: 'easeInOut' } // Fixed animation type
        });
      } else {
        // Wrong Match - shake the target area
        targetControls.start({
          x: [-10, 10, -10, 10, 0],
          transition: { duration: 0.4 }
        });
      }
    }
  };

  if (!targetShape) return null; // Wait for client mount

  const TargetIcon = targetShape.component;

  return (
    <div style={{ 
      minHeight: '100svh', 
      width: '100vw', 
      background: '#f8fafc', 
      color: '#0f172a', 
      position: 'relative', 
      overflowX: 'hidden',
      paddingTop: '80px',
      paddingBottom: '40px',
      boxSizing: 'border-box',
    }}>
      {/* Background Gradient */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(17, 153, 142, 0.1)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(56, 239, 125, 0.1)', filter: 'blur(80px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '0 20px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100svh - 120px)' }}>
        
        {/* Navigation & Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/kids')} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              padding: '10px 20px', background: '#ffffff', border: '1px solid #e2e8f0', 
              borderRadius: '20px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', 
              color: '#94a3b8', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer'
            }}
          >
            <ChevronLeft size={18} strokeWidth={3} /> BACK
          </motion.button>

          <div style={{ fontSize: '14px', fontWeight: 900, color: '#11998E', background: '#e6fcf5', padding: '8px 16px', borderRadius: '20px' }}>
            SCORE: {score}
          </div>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 900, textTransform: 'uppercase', margin: 0, letterSpacing: '-1px', lineHeight: 1, background: 'linear-gradient(135deg, #11998E, #38EF7D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            DRAG & MATCH
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', fontWeight: 900, opacity: 0.4, letterSpacing: '2px' }}>
            FIND THE RIGHT SHADOW
          </p>
        </div>

        {/* The Target Area (Shadow) */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          
          {isMatched && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ position: 'absolute', top: '-40px', zIndex: 10 }}
            >
              <Sparkles size={48} color="#FFD200" fill="#FFD200" />
            </motion.div>
          )}

          <motion.div 
            animate={targetControls}
            style={{ 
              width: '180px', height: '180px', 
              border: isMatched ? 'none' : '4px dashed #cbd5e1',
              background: isMatched ? targetShape.color : 'transparent',
              borderRadius: '40px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isMatched ? `0 20px 40px ${targetShape.color}66` : 'none',
              transition: 'background 0.3s ease'
            }}
          >
            <TargetIcon 
              size={100} 
              color={isMatched ? '#ffffff' : '#cbd5e1'} 
              fill={isMatched ? '#ffffff' : 'transparent'}
              strokeWidth={2}
            />
          </motion.div>
        </div>

        {/* The Draggable Options Area */}
        <div style={{ paddingBottom: '20px' }}>
          {isMatched ? (
             <motion.button 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               whileTap={{ scale: 0.95 }}
               onClick={generateRound}
               style={{ 
                 width: '100%', padding: '20px', 
                 background: 'linear-gradient(135deg, #11998E, #38EF7D)', 
                 color: '#fff', border: 'none', borderRadius: '24px', 
                 fontSize: '18px', fontWeight: 900, cursor: 'pointer', 
                 display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                 boxShadow: '0 10px 25px rgba(56, 239, 125, 0.4)'
               }}
             >
               NEXT SHAPE <ArrowRight size={24} strokeWidth={3} />
             </motion.button>
          ) : (
            <>
              <p style={{ textAlign: 'center', fontSize: '14px', fontWeight: 900, color: '#94a3b8', marginBottom: '20px' }}>
                DRAG A SHAPE UP ⬆️
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-around', gap: '16px' }}>
                {options.map((shape) => {
                  const Icon = shape.component;
                  return (
                    <motion.div
                      key={shape.id}
                      drag
                      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                      dragElastic={0.8}
                      onDragEnd={(e, info) => handleDragEnd(e, info, shape.id)}
                      whileDrag={{ scale: 1.2, zIndex: 50 }}
                      style={{ 
                        width: '80px', height: '80px', 
                        background: '#ffffff', 
                        borderRadius: '24px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 8px 20px ${shape.color}33`,
                        border: `2px solid ${shape.color}22`,
                        cursor: 'grab',
                        touchAction: 'none' // Prevents scrolling while dragging
                      }}
                    >
                      <Icon size={40} color={shape.color} fill={shape.color} />
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
