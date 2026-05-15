'use client';
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Eraser, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

const STROKE_COLORS = [
  '#0EA5E9', // Sky Blue
  '#FF416C', // Pink/Red
  '#10B981', // Emerald Green
  '#8E2DE2', // Purple
  '#F59E0B', // Amber/Orange
  '#EC008C', // Magenta
  '#36D1DC'  // Cyan
];

// --- OUR DATASETS ---
const TRACE_DATA = {
  numbers: { label: '1 2 3', items: Array.from({ length: 101 }, (_, i) => i) },
  uppercase: { label: 'A B C', items: Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)) },
  lowercase: { label: 'a b c', items: Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)) },
  hindi: { label: 'अ आ इ', items: ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ', 'क', 'ख', 'ग', 'घ', 'च', 'छ', 'ज', 'झ', 'ट', 'ठ', 'ड', 'ढ', 'ण', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह', 'क्ष', 'त्र', 'ज्ञ'] }
};

type CategoryType = keyof typeof TRACE_DATA;

export default function TraceIt() {
  const router = useRouter();
  
  // States for category and index
  const [category, setCategory] = useState<CategoryType>('numbers');
  const [currentIndex, setCurrentIndex] = useState(1); 

  // States for drawing
  const [paths, setPaths] = useState<{ x: number; y: number }[][]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[] | null>(null);
  const [showSparkles, setShowSparkles] = useState(false);
  const [strokeColor, setStrokeColor] = useState(STROKE_COLORS[0]);

  const svgRef = useRef<SVGSVGElement>(null);

  const currentList = TRACE_DATA[category].items;
  const currentCharacter = currentList[currentIndex];

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
    if (coords) setCurrentPath([coords]);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (currentPath && e.buttons === 1) { 
      const coords = getCoordinates(e);
      if (coords) setCurrentPath([...currentPath, coords]);
    }
  };

  const handlePointerUp = () => {
    if (currentPath) {
      setPaths([...paths, currentPath]);
      setCurrentPath(null);
    }
  };

  // --- CONTROLS ---
  const handleClear = () => setPaths([]);
  
  const getRandomColor = () => STROKE_COLORS[Math.floor(Math.random() * STROKE_COLORS.length)];

  const handleNext = () => {
    setPaths([]);
    setShowSparkles(true);
    setTimeout(() => setShowSparkles(false), 1000);
    setCurrentIndex((prev) => (prev < currentList.length - 1 ? prev + 1 : 0));
    setStrokeColor(getRandomColor());
  };

  const handlePrev = () => {
    setPaths([]);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : currentList.length - 1));
    setStrokeColor(getRandomColor());
  };

  const handleCategoryChange = (newCategory: CategoryType) => {
    if (newCategory === category) return;
    setCategory(newCategory);
    setCurrentIndex(0); // Reset to the first item of the new category
    setPaths([]);
    setStrokeColor(getRandomColor());
  };

  const createSvgPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    const start = `M ${points[0].x} ${points[0].y}`;
    const lines = points.map((p) => `L ${p.x} ${p.y}`).join(' ');
    return `${start} ${lines}`;
  };

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
      {/* Background Blobs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', borderRadius: '50%', background: `${strokeColor}1A`, filter: 'blur(80px)', transition: 'background 0.5s ease' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: '300px', height: '300px', borderRadius: '50%', background: `${strokeColor}1A`, filter: 'blur(80px)', transition: 'background 0.5s ease' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '0 20px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100svh - 120px)' }}>
        
        {/* Top Nav & Clear */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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
          
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={handleClear}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              padding: '10px 20px', background: '#fee2e2', border: 'none', 
              borderRadius: '20px', fontSize: '12px', fontWeight: 900, 
              color: '#ef4444', cursor: 'pointer'
            }}
          >
            <Eraser size={16} strokeWidth={3} /> CLEAR
          </motion.button>
        </div>

        {/* Header - Fixed the Solid Block Bug Here */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 900, textTransform: 'uppercase', margin: 0, letterSpacing: '-1px', lineHeight: 1, color: strokeColor, transition: 'color 0.5s ease' }}>
            TRACE IT
          </h1>
        </div>

        {/* --- CATEGORY SELECTOR PILLS --- */}
        <div style={{ 
          display: 'flex', gap: '8px', marginBottom: '16px', 
          overflowX: 'auto', paddingBottom: '8px', 
          WebkitOverflowScrolling: 'touch', // Smooth scroll on iOS
          scrollbarWidth: 'none' // Hide scrollbar Firefox
        }}>
          {(Object.keys(TRACE_DATA) as CategoryType[]).map((cat) => {
            const isActive = category === cat;
            return (
              <motion.button
                key={cat}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCategoryChange(cat)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '20px',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  fontWeight: 900,
                  fontSize: '14px',
                  cursor: 'pointer',
                  background: isActive ? strokeColor : '#ffffff',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  boxShadow: isActive ? `0 4px 15px ${strokeColor}66` : '0 2px 8px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease'
                }}
              >
                {TRACE_DATA[cat].label}
              </motion.button>
            );
          })}
        </div>

        {/* The Tracing Canvas Area */}
        <div style={{ 
          flex: 1, 
          position: 'relative', 
          background: '#ffffff', 
          borderRadius: '40px', 
          boxShadow: `0 20px 40px ${strokeColor}1A`,
          border: `4px solid ${strokeColor}1A`,
          overflow: 'hidden',
          marginBottom: '20px',
          transition: 'box-shadow 0.5s ease, border 0.5s ease'
        }}>
          
          {showSparkles && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [1, 1.5, 1], opacity: [1, 1, 0] }}
              transition={{ duration: 0.8 }}
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 20, pointerEvents: 'none' }}
            >
              <Sparkles size={100} color="#FFD200" fill="#FFD200" />
            </motion.div>
          )}

          <svg
            ref={svgRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ 
              width: '100%', 
              height: '100%', 
              touchAction: 'none', 
              cursor: 'crosshair'
            }}
          >
            {/* The Stencil Background Character */}
            <text
              x="50%"
              y="55%"
              dominantBaseline="middle"
              textAnchor="middle"
              fontSize={String(currentCharacter).length > 1 ? "200" : "280"} // Dynamically shrink font for double digits!
              fontWeight="900"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="6"
              strokeDasharray="15 20"
              strokeLinecap="round"
              style={{ userSelect: 'none' }}
            >
              {currentCharacter}
            </text>

            {/* The Drawn Paths */}
            {paths.map((path, i) => (
              <path
                key={i}
                d={createSvgPath(path)}
                fill="none"
                stroke={strokeColor}
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0px 0px 8px ${strokeColor}66)`, transition: 'stroke 0.3s ease' }}
              />
            ))}

            {/* The Path Currently Being Drawn */}
            {currentPath && (
              <path
                d={createSvgPath(currentPath)}
                fill="none"
                stroke={strokeColor}
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0px 0px 8px ${strokeColor}66)` }}
              />
            )}
          </svg>
        </div>

        {/* Previous / Next Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={handlePrev}
            style={{ 
              flex: 1, padding: '20px', background: '#f1f5f9', color: '#64748b', 
              border: 'none', borderRadius: '24px', fontWeight: 900, cursor: 'pointer', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <ArrowLeft size={24} strokeWidth={3} /> PREV
          </motion.button>

          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            style={{ 
              flex: 2, padding: '20px', background: `linear-gradient(135deg, ${strokeColor}, ${strokeColor}CC)`, 
              color: '#fff', border: 'none', borderRadius: '24px', fontSize: '18px', 
              fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', gap: '12px', boxShadow: `0 10px 25px ${strokeColor}66`,
              transition: 'background 0.5s ease, box-shadow 0.5s ease'
            }}
          >
            DONE! <ArrowRight size={24} strokeWidth={3} />
          </motion.button>
        </div>

      </div>
    </div>
  );
}
