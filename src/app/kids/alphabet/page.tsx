'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Volume2, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

const ALPHABET = [
  { letter: 'A', word: 'Apple', emoji: '🍎', color: 'linear-gradient(135deg, #FF416C, #FF4B2B)' },
  { letter: 'B', word: 'Ball', emoji: '⚾', color: 'linear-gradient(135deg, #36D1DC, #5B86E5)' },
  { letter: 'C', word: 'Cat', emoji: '🐈', color: 'linear-gradient(135deg, #F7971E, #FFD200)' },
  { letter: 'D', word: 'Dog', emoji: '🐕', color: 'linear-gradient(135deg, #8E2DE2, #4A00E0)' },
  { letter: 'E', word: 'Elephant', emoji: '🐘', color: 'linear-gradient(135deg, #11998e, #38ef7d)' },
  { letter: 'F', word: 'Fish', emoji: '🐟', color: 'linear-gradient(135deg, #FF416C, #FF4B2B)' },
  { letter: 'G', word: 'Goat', emoji: '🐐', color: 'linear-gradient(135deg, #36D1DC, #5B86E5)' },
  { letter: 'H', word: 'Hen', emoji: '🐓', color: 'linear-gradient(135deg, #F7971E, #FFD200)' },
  { letter: 'I', word: 'Ice Cream', emoji: '🍦', color: 'linear-gradient(135deg, #8E2DE2, #4A00E0)' },
  { letter: 'J', word: 'Jar', emoji: '🫙', color: 'linear-gradient(135deg, #11998e, #38ef7d)' },
  { letter: 'K', word: 'Kite', emoji: '🪁', color: 'linear-gradient(135deg, #FF416C, #FF4B2B)' },
  { letter: 'L', word: 'Lion', emoji: '🦁', color: 'linear-gradient(135deg, #36D1DC, #5B86E5)' },
  { letter: 'M', word: 'Mango', emoji: '🥭', color: 'linear-gradient(135deg, #F7971E, #FFD200)' },
  { letter: 'N', word: 'Nest', emoji: '🪺', color: 'linear-gradient(135deg, #8E2DE2, #4A00E0)' },
  { letter: 'O', word: 'Orange', emoji: '🍊', color: 'linear-gradient(135deg, #11998e, #38ef7d)' },
  { letter: 'P', word: 'Parrot', emoji: '🦜', color: 'linear-gradient(135deg, #8E2DE2, #4A00E0)' },
  { letter: 'Q', word: 'Queen', emoji: '👸', color: 'linear-gradient(135deg, #36D1DC, #5B86E5)' },
  { letter: 'R', word: 'Rose', emoji: '🌹', color: 'linear-gradient(135deg, #F7971E, #FFD200)' },
  { letter: 'S', word: 'Ship', emoji: '🛳️', color: 'linear-gradient(135deg, #8E2DE2, #4A00E0)' },
  { letter: 'T', word: 'Truck', emoji: '🚚', color: 'linear-gradient(135deg, #11998e, #38ef7d)' },
  { letter: 'U', word: 'Umbrella', emoji: '☂️', color: 'linear-gradient(135deg, #FF416C, #FF4B2B)' },
  { letter: 'V', word: 'Van', emoji: '🚐', color: 'linear-gradient(135deg, #36D1DC, #5B86E5)' },
  { letter: 'W', word: 'Watch', emoji: '⌚', color: 'linear-gradient(135deg, #F7971E, #FFD200)' },
  { letter: 'X', word: 'X-mas Tree', emoji: '🎄', color: 'linear-gradient(135deg, #8E2DE2, #4A00E0)' },
  { letter: 'Y', word: 'Yak', emoji: '🐂', color: 'linear-gradient(135deg, #11998e, #38ef7d)' },
  { letter: 'Z', word: 'Zebra', emoji: '🦓', color: 'linear-gradient(135deg, #FF416C, #FF4B2B)' }
];

export default function AlphabetFlashcards() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentItem = ALPHABET[currentIndex];

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 1.2;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (!isFlipped) {
      speak(`${currentItem.letter}... is for ${currentItem.word}`);
    } else {
      speak(currentItem.letter);
    }
  };

  const nextLetter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    setTimeout(() => {
        setCurrentIndex((prev) => (prev === ALPHABET.length - 1 ? 0 : prev + 1));
    }, 150);
  };

  const prevLetter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    setTimeout(() => {
        setCurrentIndex((prev) => (prev === 0 ? ALPHABET.length - 1 : prev - 1));
    }, 150);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Clean Ambient Background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '5%', left: '-10%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255, 65, 108, 0.04)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(54, 209, 220, 0.04)', filter: 'blur(60px)' }} />
      </div>

      {/* TOP NAVIGATION */}
      <div style={{ width: '100%', maxWidth: '450px', padding: '32px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10, flexShrink: 0 }}>
        <button 
          onClick={() => router.push('/kids')} 
          style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', transition: 'transform 0.2s' }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <ChevronLeft size={26} strokeWidth={2.5} />
        </button>
        
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <Volume2 size={16} color="#94a3b8" />
          <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8' }}>Tap card to hear</span>
        </div>
      </div>

      {/* MIDDLE AREA: 3D CARD CONTAINER */}
      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10 }}>
        
        {/* Perspective Wrapper */}
        <div style={{ position: 'relative', width: '260px', height: '340px', perspective: '1200px' }}>
          
          {/* Inner Rotating Container (This fixes the offset bug) */}
          <div 
            onClick={handleFlip}
            style={{
              position: 'relative', width: '100%', height: '100%', cursor: 'pointer',
              transition: 'transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1)',
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            {/* FRONT FACE */}
            <div 
              style={{ 
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#fff', borderRadius: '40px', border: '1px solid #e2e8f0', 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
                backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                boxShadow: '0 15px 40px rgba(0,0,0,0.06)'
              }}
            >
              <div style={{ position: 'absolute', top: '24px', right: '24px', color: '#f1f5f9' }}>
                <Sparkles size={28} />
              </div>
              
              <h1 
                style={{ 
                  fontSize: '150px', fontWeight: 900, lineHeight: 1, margin: 0, textAlign: 'center', letterSpacing: '-4px',
                  backgroundImage: currentItem.color, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' 
                }}
              >
                {currentItem.letter}
              </h1>
              
              <p style={{ position: 'absolute', bottom: '24px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: '#cbd5e1', margin: 0 }}>Tap to flip</p>
            </div>

            {/* BACK FACE */}
            <div 
              style={{ 
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '40px', boxSizing: 'border-box',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)', backgroundImage: currentItem.color, boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
              }}
            >
              <div className="animate-bounce" style={{ fontSize: '100px', filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.2))', animationDuration: '2s' }}>
                {currentItem.emoji}
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '-1px', margin: '20px 0 0 0', textShadow: '0 4px 12px rgba(0,0,0,0.2)', textAlign: 'center' }}>
                {currentItem.word}
              </h2>
            </div>
          </div>

          {/* Nav Arrows (Positioned safely outside the flipping math) */}
          <button 
            onClick={prevLetter} 
            style={{ position: 'absolute', top: '50%', left: '-24px', transform: 'translateY(-50%)', width: '56px', height: '56px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', zIndex: 20, color: '#64748b', cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseDown={e => e.currentTarget.style.transform = 'translateY(-50%) scale(0.9)'}
            onMouseUp={e => e.currentTarget.style.transform = 'translateY(-50%) scale(1)'}
          >
            <ArrowLeft size={24} strokeWidth={3} />
          </button>
          
          <button 
            onClick={nextLetter} 
            style={{ position: 'absolute', top: '50%', right: '-24px', transform: 'translateY(-50%)', width: '56px', height: '56px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', zIndex: 20, color: '#64748b', cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseDown={e => e.currentTarget.style.transform = 'translateY(-50%) scale(0.9)'}
            onMouseUp={e => e.currentTarget.style.transform = 'translateY(-50%) scale(1)'}
          >
            <ArrowRight size={24} strokeWidth={3} />
          </button>

        </div>
      </div>

      {/* BOTTOM NAVIGATION */}
      <div style={{ width: '100%', maxWidth: '450px', padding: '0 24px 32px', zIndex: 10, flexShrink: 0 }}>
        <div style={{ width: '100%', background: '#fff', padding: '16px 8px', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <p style={{ margin: '0 0 12px 16px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8' }}>Jump to letter</p>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '8px 16px 16px', WebkitOverflowScrolling: 'touch' }} className="hide-scrollbar">
            {ALPHABET.map((item, index) => {
              const isSelected = currentIndex === index;
              return (
                <button
                  key={item.letter}
                  onClick={() => { setIsFlipped(false); setCurrentIndex(index); }}
                  style={{
                    flexShrink: 0, width: '52px', height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', fontWeight: 900, transition: 'all 0.3s ease', cursor: 'pointer',
                    background: isSelected ? item.color : '#f8fafc',
                    color: isSelected ? '#fff' : '#94a3b8',
                    border: isSelected ? 'none' : '1px solid #e2e8f0',
                    boxShadow: isSelected ? '0 10px 20px rgba(0,0,0,0.1)' : 'none',
                    transform: isSelected ? 'scale(1.15)' : 'scale(1)'
                  }}
                  onMouseDown={e => { if(!isSelected) e.currentTarget.style.transform = 'scale(0.95)' }}
                  onMouseUp={e => { if(!isSelected) e.currentTarget.style.transform = 'scale(1)' }}
                >
                  {item.letter}
                </button>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
