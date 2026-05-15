'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Eraser, Undo, Search } from 'lucide-react';

const PALETTE = [
  '#0f172a', '#ef4444', '#f97316', '#eab308', 
  '#22c55e', '#0ea5e9', '#a855f7', '#ec4899', '#ffffff'
];

// 6 Distinct Brush Sizes (From fine pen to huge marker)
const BRUSH_SIZES = [4, 8, 12, 18, 24, 36];

// The expanded library of templates!
const TEMPLATES = [
  { id: 'blank', label: 'BLANK PAGE' },
  { id: 'altu', label: 'ALTU ROBOT' },
  { id: 'rocket', label: 'SPACE ROCKET' },
  { id: 'apple', label: 'BIG APPLE' },
  { id: 'cat', label: 'CUTE CAT' },
  { id: 'sun', label: 'HAPPY SUN' },
  { id: 'car', label: 'RACE CAR' },
  { id: 'house', label: 'MY HOUSE' },
  { id: 'butterfly', label: 'BUTTERFLY' },
];

type TemplateType = typeof TEMPLATES[number]['id'];

interface DrawPath {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export default function DrawAnything() {
  const router = useRouter();

  // Drawing State
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[] | null>(null);
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null);
  const [center, setCenter] = useState({ x: 180, y: 220 }); // Auto-updates on mount
  
  // Tools State
  const [activeColor, setActiveColor] = useState(PALETTE[5]); 
  const [strokeWidth, setStrokeWidth] = useState(BRUSH_SIZES[2]); 
  const [template, setTemplate] = useState<TemplateType>('blank');

  const svgRef = useRef<SVGSVGElement>(null);

  // Automatically find the dead-center of the canvas on load
  useEffect(() => {
    if (svgRef.current) {
      setCenter({
        x: svgRef.current.clientWidth / 2,
        y: svgRef.current.clientHeight / 2,
      });
    }
  }, [template]); // Recalculate if template changes just in case

  // --- DRAWING LOGIC ---
  const getCoordinates = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const coords = getCoordinates(e);
    if (coords) {
      setCurrentPath([coords]);
      setTouchPos(coords);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const coords = getCoordinates(e);
    if (coords) {
      if (e.buttons === 1 && currentPath) { 
        setCurrentPath([...currentPath, coords]);
      }
      if (e.buttons === 1) setTouchPos(coords);
    }
  };

  const handlePointerUp = () => {
    if (currentPath) {
      setPaths([...paths, { points: currentPath, color: activeColor, width: strokeWidth }]);
      setCurrentPath(null);
    }
    setTouchPos(null); 
  };

  // --- CONTROLS ---
  const handleClear = () => setPaths([]);
  const handleUndo = () => setPaths((prev) => prev.slice(0, -1));

  const handleTemplateChange = (newTemplate: TemplateType) => {
    if (newTemplate === template) return;
    setTemplate(newTemplate);
    setPaths([]); 
  };

  const createSvgPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    const start = `M ${points[0].x} ${points[0].y}`;
    const lines = points.map((p) => `L ${p.x} ${p.y}`).join(' ');
    return `${start} ${lines}`;
  };

  // All figures are drawn relative to 0,0 so they can be perfectly centered
  const renderStencils = () => (
    <g transform={`translate(${center.x}, ${center.y}) scale(2.8)`} stroke="#cbd5e1" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
      
      {template === 'altu' && (
        <>
          <rect x="-30" y="-25" width="60" height="50" rx="10" />
          <circle cx="-15" cy="-5" r="6" />
          <circle cx="15" cy="-5" r="6" />
          <path d="M -10 10 Q 0 20 10 10" />
          <line x1="0" y1="-25" x2="0" y2="-45" />
          <circle cx="0" cy="-50" r="4" />
        </>
      )}

      {template === 'rocket' && (
        <>
          <path d="M 0 -50 L 30 0 L 30 50 L -30 50 L -30 0 Z" />
          <circle cx="0" cy="10" r="12" />
          <path d="M -30 50 L -50 80 L -20 60 Z" />
          <path d="M 30 50 L 50 80 L 20 60 Z" />
          <path d="M -10 50 L 0 70 L 10 50 Z" />
        </>
      )}

      {template === 'apple' && (
        <>
          <path d="M 0 -30 C -50 -30 -60 10 -60 30 C -60 60 -20 80 0 80 C 20 80 60 60 60 30 C 60 10 50 -30 0 -30 Z" />
          <path d="M 0 -30 Q 10 -60 30 -60" />
          <path d="M 30 -60 Q 40 -50 10 -40" />
        </>
      )}

      {template === 'cat' && (
        <>
          <circle cx="0" cy="10" r="40" />
          <path d="M -35 -10 L -40 -60 L -10 -25" />
          <path d="M 35 -10 L 40 -60 L 10 -25" />
          <circle cx="-15" cy="5" r="4" />
          <circle cx="15" cy="5" r="4" />
          <path d="M -5 15 Q 0 20 5 15" />
          <line x1="-40" y1="10" x2="-60" y2="5" />
          <line x1="-40" y1="20" x2="-60" y2="25" />
          <line x1="40" y1="10" x2="60" y2="5" />
          <line x1="40" y1="20" x2="60" y2="25" />
        </>
      )}

      {template === 'sun' && (
        <>
          <circle cx="0" cy="0" r="30" />
          <line x1="0" y1="-40" x2="0" y2="-60" />
          <line x1="0" y1="40" x2="0" y2="60" />
          <line x1="-40" y1="0" x2="-60" y2="0" />
          <line x1="40" y1="0" x2="60" y2="0" />
          <line x1="-30" y1="-30" x2="-45" y2="-45" />
          <line x1="30" y1="30" x2="45" y2="45" />
          <line x1="-30" y1="30" x2="-45" y2="45" />
          <line x1="30" y1="-30" x2="45" y2="-45" />
          <circle cx="-10" cy="-5" r="3" />
          <circle cx="10" cy="-5" r="3" />
          <path d="M -10 10 Q 0 20 10 10" />
        </>
      )}

      {template === 'car' && (
        <>
          <path d="M -60 20 L -60 0 L -30 0 L -10 -20 L 30 -20 L 50 0 L 70 0 L 70 20 Z" />
          <circle cx="-30" cy="20" r="12" />
          <circle cx="40" cy="20" r="12" />
          <path d="M -25 0 L -10 -15 L 10 -15 L 10 0 Z" />
          <path d="M 15 0 L 15 -15 L 25 -15 L 45 0 Z" />
        </>
      )}

      {template === 'house' && (
        <>
          <rect x="-40" y="-10" width="80" height="70" />
          <path d="M -50 -10 L 0 -60 L 50 -10 Z" />
          <rect x="-10" y="20" width="20" height="40" />
          <rect x="-30" y="0" width="15" height="15" />
          <rect x="15" y="0" width="15" height="15" />
          <circle cx="5" cy="40" r="2" />
        </>
      )}

      {template === 'butterfly' && (
        <>
          <ellipse cx="0" cy="0" rx="8" ry="40" />
          <path d="M -8 -20 C -60 -60 -80 -20 -50 0 C -80 20 -60 60 -8 -20 Z" />
          <path d="M 8 -20 C 60 -60 80 -20 50 0 C 80 20 60 60 8 -20 Z" />
          <path d="M -5 -40 Q -20 -60 -10 -70" />
          <path d="M 5 -40 Q 20 -60 10 -70" />
        </>
      )}
    </g>
  );

  const renderPaths = () => (
    <g>
      {paths.map((path, i) => (
        <path key={i} d={createSvgPath(path.points)} fill="none" stroke={path.color} strokeWidth={path.width} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {currentPath && (
        <path d={createSvgPath(currentPath)} fill="none" stroke={activeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </g>
  );

  return (
    <div style={{ 
      minHeight: '100svh', 
      width: '100vw', 
      background: '#f8fafc', 
      color: '#0f172a', 
      position: 'relative', 
      overflowX: 'hidden',
      paddingTop: '60px',
      paddingBottom: '20px',
      boxSizing: 'border-box',
    }}>
      <div style={{ position: 'relative', zIndex: 1, padding: '0 20px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100svh - 80px)' }}>
        
        {/* Navigation & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/kids')} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              padding: '10px 16px', background: '#ffffff', border: '1px solid #e2e8f0', 
              borderRadius: '20px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', 
              color: '#94a3b8', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer'
            }}
          >
            <ChevronLeft size={18} strokeWidth={3} /> BACK
          </motion.button>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={handleUndo}
              disabled={paths.length === 0}
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                width: '40px', height: '40px', background: paths.length === 0 ? '#f1f5f9' : '#e0e7ff', 
                border: 'none', borderRadius: '50%', color: paths.length === 0 ? '#cbd5e1' : '#4f46e5', cursor: 'pointer'
              }}
            >
              <Undo size={18} strokeWidth={3} />
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={handleClear}
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                width: '40px', height: '40px', background: '#fee2e2', border: 'none', 
                borderRadius: '50%', color: '#ef4444', cursor: 'pointer'
              }}
            >
              <Eraser size={18} strokeWidth={3} />
            </motion.button>
          </div>
        </div>

        {/* --- TEMPLATE SELECTOR PILLS --- */}
        <div style={{ 
          display: 'flex', gap: '8px', marginBottom: '16px', 
          overflowX: 'auto', paddingBottom: '8px', 
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none'
        }}>
          {TEMPLATES.map((t) => {
            const isActive = template === t.id;
            return (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTemplateChange(t.id)}
                style={{
                  padding: '10px 20px', borderRadius: '20px', border: 'none',
                  whiteSpace: 'nowrap', fontWeight: 900, fontSize: '12px', cursor: 'pointer',
                  background: isActive ? 'linear-gradient(135deg, #F43F5E, #FB923C)' : '#ffffff',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  boxShadow: isActive ? `0 4px 15px rgba(244, 63, 94, 0.4)` : '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                {t.label}
              </motion.button>
            );
          })}
        </div>

        {/* --- THE CANVAS AREA --- */}
        <div style={{ 
          flex: 1, position: 'relative', background: '#ffffff', 
          borderRadius: '32px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
          border: '4px solid #f8fafc', overflow: 'hidden', marginBottom: '16px'
        }}>
          
          {/* THE MAGNIFIER (Touch Display) */}
          {touchPos && (
            <div style={{
              position: 'absolute',
              top: '16px',
              // Flips to the other side based on where their finger is!
              left: touchPos.x > center.x ? '16px' : 'auto',
              right: touchPos.x > center.x ? 'auto' : '16px',
              width: '120px', height: '120px',
              borderRadius: '50%', border: '4px solid #e2e8f0', background: '#ffffff',
              boxShadow: '0 15px 35px rgba(0,0,0,0.15)', overflow: 'hidden',
              zIndex: 50, pointerEvents: 'none'
            }}>
              {/* Shows a 100x100 box cropped right around their finger */}
              <svg viewBox={`${touchPos.x - 50} ${touchPos.y - 50} 100 100`} style={{ width: '100%', height: '100%' }}>
                {renderStencils()}
                {renderPaths()}
              </svg>
              {/* Crosshair target in the middle */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: '8px', height: '8px', background: activeColor === '#ffffff' ? '#cbd5e1' : activeColor, borderRadius: '50%', transform: 'translate(-50%, -50%)', border: '1.5px solid #fff', boxShadow: '0 0 5px rgba(0,0,0,0.2)' }} />
            </div>
          )}

          {/* Main Drawing Layer */}
          <svg
            ref={svgRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair', position: 'relative', zIndex: 1 }}
          >
            {renderStencils()}
            {renderPaths()}
          </svg>
        </div>

        {/* --- BOTTOM TOOLBAR (Colors & Brushes) --- */}
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Color Palette */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {PALETTE.map((color) => (
              <motion.button
                key={color}
                whileTap={{ scale: 0.8 }}
                onClick={() => setActiveColor(color)}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%', background: color, cursor: 'pointer',
                  border: color === '#ffffff' ? '2px solid #e2e8f0' : 'none',
                  boxShadow: activeColor === color ? `0 0 0 4px #ffffff, 0 0 0 7px ${color}66` : 'none',
                  transition: 'box-shadow 0.2s ease'
                }}
              />
            ))}
          </div>

          {/* 6 Brush Sizes */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
            {BRUSH_SIZES.map((size) => (
              <motion.button
                key={size}
                whileTap={{ scale: 0.9 }}
                onClick={() => setStrokeWidth(size)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', border: 'none',
                  background: strokeWidth === size ? '#f1f5f9' : 'transparent',
                }}
              >
                <div style={{ 
                  width: `${Math.min(size, 24)}px`, height: `${Math.min(size, 24)}px`, // Visual cap so the huge brushes don't break the UI
                  borderRadius: '50%', 
                  background: strokeWidth === size ? '#0f172a' : '#cbd5e1' 
                }} />
              </motion.button>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}
