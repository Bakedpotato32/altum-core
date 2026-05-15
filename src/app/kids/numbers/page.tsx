'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Volume2, ArrowRight, ArrowLeft, RotateCcw, Sparkles } from 'lucide-react';

const NUMBERS = [
  { num: 0, word: 'Zero', itemWord: 'Nothing here!', emoji: '🧺', color: 'linear-gradient(135deg, #9ca3af, #6b7280)' },
  { num: 1, word: 'One', itemWord: 'Lion', emoji: '🦁', color: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
  { num: 2, word: 'Two', itemWord: 'Dogs', emoji: '🐕', color: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
  { num: 3, word: 'Three', itemWord: 'Cats', emoji: '🐈', color: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { num: 4, word: 'Four', itemWord: 'Frogs', emoji: '🐸', color: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
  { num: 5, word: 'Five', itemWord: 'Apples', emoji: '🍎', color: 'linear-gradient(135deg, #10b981, #059669)' },
  { num: 6, word: 'Six', itemWord: 'Balloons', emoji: '🎈', color: 'linear-gradient(135deg, #ec4899, #be185d)' },
  { num: 7, word: 'Seven', itemWord: 'Stars', emoji: '⭐', color: 'linear-gradient(135deg, #06b6d4, #0284c7)' },
  { num: 8, word: 'Eight', itemWord: 'Cars', emoji: '🚗', color: 'linear-gradient(135deg, #f97316, #c2410c)' },
  { num: 9, word: 'Nine', itemWord: 'Fish', emoji: '🐟', color: 'linear-gradient(135deg, #8e2de2, #4a00e0)' },
  { num: 10, word: 'Ten', itemWord: 'Rockets', emoji: '🚀', color: 'linear-gradient(135deg, #14b8a6, #0f766e)' }
];

export default function NumberCounter() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [tappedItems, setTappedItems] = useState<number[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentData = NUMBERS[currentIndex];

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 1.3;
      window.speechSynthesis.speak(utterance);
    }
  };

  const changeNumber = (index: number) => {
    setTappedItems([]);
    setIsCompleted(false);
    setCurrentIndex(index);
  };

  const handleTap = (index: number) => {
    if (tappedItems.includes(index) || isCompleted) return;

    const newTapped = [...tappedItems, index];
    setTappedItems(newTapped);
    
    const currentCount = newTapped.length;

    if (currentCount === currentData.num) {
      setIsCompleted(true);
      speak(`${currentData.word}! ${currentData.itemWord}!`);
    } else {
      speak(currentCount.toString());
    }
  };

  const handleZeroTap = () => {
    if (isCompleted) return;
    setIsCompleted(true);
    speak("Zero! Nothing here!");
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#fff', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
      
      {/* Clean Ambient Background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', right: '-10%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.03)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '-10%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(236, 72, 153, 0.03)', filter: 'blur(60px)' }} />
      </div>

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
            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8' }}>Tap to count</span>
          </div>
        </div>

        {/* GIANT NUMBER DISPLAY */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '220px' }}>
            {isCompleted && (
              <div className="animate-ping" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', opacity: 0.1 }}>
                <div style={{ width: '160px', height: '160px', borderRadius: '50%', background: currentData.color }} />
              </div>
            )}
            {isCompleted && (
               <Sparkles className="animate-bounce" style={{ position: 'absolute', right: '-16px', top: '16px', color: '#facc15', width: '40px', height: '40px', zIndex: 20 }} />
            )}
            
            <h1 
              style={{
                fontSize: '200px', fontWeight: 900, lineHeight: 1, letterSpacing: '-5px', padding: '0 24px', transition: 'all 0.7s ease',
                transform: isCompleted ? 'scale(1.1)' : 'scale(0.9)',
                ...(isCompleted ? { backgroundImage: currentData.color, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent', filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.1))' } : { color: '#f1f5f9' })
              }}
            >
              {currentData.num}
            </h1>
          </div>

          <h2 style={{ fontSize: '30px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', marginTop: '8px', transition: 'all 0.5s ease', opacity: isCompleted ? 1 : 0, transform: isCompleted ? 'translateY(0)' : 'translateY(8px)', color: '#1e293b' }}>
            {currentData.word} {currentData.itemWord}
          </h2>

          {/* Nav Arrows (Soft Shadows) */}
          <button 
            onClick={() => changeNumber(currentIndex === 0 ? NUMBERS.length - 1 : currentIndex - 1)} 
            style={{ position: 'absolute', top: '100px', left: '-8px', transform: 'translateY(-50%)', width: '56px', height: '56px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.06)', zIndex: 20, color: '#64748b', cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseDown={e => e.currentTarget.style.transform = 'translateY(-50%) scale(0.9)'}
            onMouseUp={e => e.currentTarget.style.transform = 'translateY(-50%) scale(1)'}
          >
            <ArrowLeft size={24} strokeWidth={3} />
          </button>
          <button 
            onClick={() => changeNumber(currentIndex === NUMBERS.length - 1 ? 0 : currentIndex + 1)} 
            style={{ position: 'absolute', top: '100px', right: '-8px', transform: 'translateY(-50%)', width: '56px', height: '56px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.06)', zIndex: 20, color: '#64748b', cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseDown={e => e.currentTarget.style.transform = 'translateY(-50%) scale(0.9)'}
            onMouseUp={e => e.currentTarget.style.transform = 'translateY(-50%) scale(1)'}
          >
            <ArrowRight size={24} strokeWidth={3} />
          </button>

        </div>

        {/* INTERACTIVE PLAY AREA (The Animals/Items) */}
        <div style={{ width: '100%', maxWidth: '450px', background: '#fff', padding: '24px', borderRadius: '48px', border: '1px solid #e2e8f0', boxShadow: '0 15px 40px rgba(0,0,0,0.04)', marginBottom: '32px', minHeight: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          
          {/* Progress Bar (Hidden for Zero) */}
          {currentData.num > 0 && (
            <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 16px', borderRadius: '24px', fontSize: '12px', fontWeight: 900, letterSpacing: '2px', color: '#94a3b8', textTransform: 'uppercase' }}>
              {tappedItems.length} / {currentData.num}
            </div>
          )}

          {/* Refresh Button */}
          {isCompleted && (
            <button 
              onClick={() => changeNumber(currentIndex)} 
              style={{ position: 'absolute', top: '16px', right: '16px', padding: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '50%', color: '#64748b', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'rotate(-180deg) scale(0.9)'}
              onMouseUp={e => e.currentTarget.style.transform = 'rotate(-180deg) scale(1)'}
            >
              <RotateCcw size={18} strokeWidth={2.5} />
            </button>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '32px' }}>
            {currentData.num === 0 ? (
              // ZERO STATE
              <div 
                onClick={handleZeroTap}
                className={isCompleted ? '' : 'animate-pulse'}
                style={{ fontSize: '80px', cursor: 'pointer', transition: 'all 0.5s ease', transform: isCompleted ? 'scale(1.25)' : 'scale(1)', filter: isCompleted ? 'drop-shadow(0 15px 25px rgba(0,0,0,0.15))' : 'grayscale(100%) opacity(0.5)' }}
              >
                {currentData.emoji}
              </div>
            ) : (
              // NUMBER 1-10 STATE
              Array.from({ length: currentData.num }).map((_, index) => {
                const isTapped = tappedItems.includes(index);
                return (
                  <div 
                    key={index}
                    onClick={() => handleTap(index)}
                    className={isCompleted ? 'animate-bounce' : ''}
                    style={{
                      fontSize: '64px', cursor: 'pointer', transition: 'all 0.3s ease', userSelect: 'none',
                      transform: isTapped ? 'scale(1.1)' : 'scale(0.9)',
                      opacity: isTapped ? 1 : 0.4,
                      filter: isTapped ? 'drop-shadow(0 10px 15px rgba(0,0,0,0.1)) grayscale(0%)' : 'grayscale(100%)',
                      ...(isCompleted ? { animationDelay: `${index * 0.1}s`, animationDuration: '1.5s' } : {})
                    }}
                  >
                    {currentData.emoji}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Scrollable Mini-Track at the bottom */}
        <div style={{ width: '100%', maxWidth: '450px', background: '#fff', padding: '16px 8px', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative', zIndex: 20, mt: 'auto' }}>
          <p style={{ margin: '0 0 12px 16px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8' }}>Jump to number</p>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '8px 16px 16px', WebkitOverflowScrolling: 'touch' }} className="hide-scrollbar">
            {NUMBERS.map((item, index) => {
              const isSelected = currentIndex === index;
              return (
                <button
                  key={item.num}
                  onClick={() => changeNumber(index)}
                  style={{
                    flexShrink: 0, width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                  {item.num}
                </button>
              );
            })}
          </div>
        </div>

      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
