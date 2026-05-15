'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Volume2, Palette, Sparkles } from 'lucide-react';

const COLORS = [
  { name: 'Red', hex: '#ef4444', bgHex: 'rgba(239, 68, 68, 0.05)', emoji: '🍎', blob: '40% 60% 70% 30% / 40% 50% 60% 50%' },
  { name: 'Blue', hex: '#3b82f6', bgHex: 'rgba(59, 130, 246, 0.05)', emoji: '🌊', blob: '50% 50% 30% 70% / 60% 30% 70% 40%' },
  { name: 'Yellow', hex: '#eab308', bgHex: 'rgba(234, 179, 8, 0.05)', emoji: '☀️', blob: '30% 70% 50% 50% / 50% 40% 60% 50%' },
  { name: 'Green', hex: '#10b981', bgHex: 'rgba(16, 185, 129, 0.05)', emoji: '🐸', blob: '60% 40% 40% 60% / 40% 60% 40% 60%' },
  { name: 'Purple', hex: '#a855f7', bgHex: 'rgba(168, 85, 247, 0.05)', emoji: '🍇', blob: '40% 60% 60% 40% / 60% 30% 70% 40%' },
  { name: 'Orange', hex: '#f97316', bgHex: 'rgba(249, 115, 22, 0.05)', emoji: '🍊', blob: '70% 30% 50% 50% / 30% 50% 50% 70%' },
  { name: 'Pink', hex: '#ec4899', bgHex: 'rgba(236, 72, 153, 0.05)', emoji: '🌸', blob: '50% 50% 70% 30% / 40% 60% 40% 60%' },
  { name: 'Brown', hex: '#8B4513', bgHex: 'rgba(139, 69, 19, 0.05)', emoji: '🐻', blob: '40% 60% 30% 70% / 50% 50% 50% 50%' },
  { name: 'Black', hex: '#1e293b', bgHex: 'rgba(30, 41, 59, 0.03)', emoji: '🐈‍⬛', blob: '60% 40% 70% 30% / 40% 50% 60% 50%' },
  { name: 'White', hex: '#ffffff', bgHex: 'rgba(255, 255, 255, 0.8)', emoji: '☁️', blob: '50% 50% 40% 60% / 60% 40% 60% 40%' },
];

export default function ColorsPage() {
  const router = useRouter();
  const [activeColor, setActiveColor] = useState<typeof COLORS[0] | null>(null);
  const [animateKey, setAnimateKey] = useState(0);

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 1.3;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleColorTap = (color: typeof COLORS[0]) => {
    setActiveColor(color);
    setAnimateKey(prev => prev + 1); 
    speak(color.name);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  return (
    <div 
      style={{ position: 'fixed', inset: 0, zIndex: 9999, overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box', fontFamily: 'sans-serif', transition: 'background-color 0.8s ease', backgroundColor: activeColor ? activeColor.bgHex : '#fff' }}
    >
      <div style={{ position: 'relative', zIndex: 10, padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%' }}>
        
        {/* Consistent Top Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '450px', marginBottom: '24px' }}>
          <button 
            onClick={() => router.push('/kids')} 
            style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', flexShrink: 0, transition: 'transform 0.2s' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <ChevronLeft size={26} strokeWidth={2.5} />
          </button>
          
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <Volume2 size={16} color="#94a3b8" />
            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8' }}>Tap a color</span>
          </div>
        </div>

        {/* MAIN DISPLAY AREA */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '380px', minHeight: '300px', marginBottom: '32px', position: 'relative' }}>
          
          {/* Default State */}
          {!activeColor && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 0.4 }} className="animate-pulse">
              <Palette size={64} color="#cbd5e1" style={{ marginBottom: '16px' }} />
              <h2 style={{ fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: '#94a3b8' }}>Pick a paint blob!</h2>
            </div>
          )}

          {/* Active Color State */}
          {activeColor && (
            <div key={animateKey} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Sparkles className="animate-ping" style={{ position: 'absolute', top: '-40px', right: '-40px', width: '64px', height: '64px', color: activeColor.hex, opacity: 0.6 }} />
              
              <div 
                className="animate-[bounce_1s_ease-out_forwards]"
                style={{ fontSize: '120px', filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.15))' }}
              >
                {activeColor.emoji}
              </div>
              
              <h1 
                className="animate-[scaleIn_0.5s_ease-out_forwards]"
                style={{ fontSize: '80px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-3px', lineHeight: 1, marginTop: '16px', color: activeColor.hex, textShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
              >
                {activeColor.name}
              </h1>
            </div>
          )}

        </div>

        {/* THE PAINT PALETTE (Clean Solid Grid) */}
        <div style={{ width: '100%', maxWidth: '450px', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', padding: '24px', borderRadius: '40px', border: '1px solid #e2e8f0', boxShadow: '0 10px 40px rgba(0,0,0,0.04)', marginTop: 'auto', position: 'relative', zIndex: 20 }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: '#94a3b8', textAlign: 'center' }}>Your Paint Palette</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', justifyItems: 'center' }}>
            {COLORS.map((color) => {
              const isActive = activeColor?.name === color.name;
              return (
                <button
                  key={color.name}
                  onClick={() => handleColorTap(color)}
                  style={{
                    width: '52px', height: '52px', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    backgroundColor: color.hex, borderRadius: color.blob,
                    border: color.name === 'White' ? '2px solid #e2e8f0' : 'none',
                    boxShadow: isActive ? `0 10px 20px ${color.hex}66` : '0 4px 10px rgba(0,0,0,0.08)',
                    transform: isActive ? 'scale(1.2)' : 'scale(1)'
                  }}
                  onMouseDown={e => { if(!isActive) e.currentTarget.style.transform = 'scale(0.85)' }}
                  onMouseUp={e => { if(!isActive) e.currentTarget.style.transform = 'scale(1)' }}
                >
                  {/* Tiny sparkle inside the active blob */}
                  {isActive && (
                    <Sparkles size={18} style={{ color: color.name === 'White' || color.name === 'Yellow' ? '#1e293b' : '#fff' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
