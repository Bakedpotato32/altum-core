'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Sparkles, RotateCcw } from 'lucide-react';

// The items we want kids to match. Using emojis from the other cards for familiarity!
const MATCH_ITEMS = ['🍎', '🚀', '📺', '🎨', '🧩', '🌿'];

interface CardData {
  id: number;
  content: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MemoryMatch() {
  const router = useRouter();
  const [cards, setCards] = useState<CardData[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // Initialize and shuffle the deck
  const initializeGame = () => {
    const shuffledCards = [...MATCH_ITEMS, ...MATCH_ITEMS]
      .sort(() => Math.random() - 0.5)
      .map((content, index) => ({
        id: index,
        content,
        isFlipped: false,
        isMatched: false,
      }));
    
    setCards(shuffledCards);
    setFlippedIndices([]);
    setMoves(0);
    setIsLocked(false);
  };

  useEffect(() => {
    initializeGame();
  }, []);

  const handleCardClick = (index: number) => {
    // Prevent clicking if locked, already flipped, or matched
    if (isLocked || cards[index].isFlipped || cards[index].isMatched) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlippedIndices = [...flippedIndices, index];
    setFlippedIndices(newFlippedIndices);

    if (newFlippedIndices.length === 2) {
      setIsLocked(true);
      setMoves((m) => m + 1);

      const [firstIndex, secondIndex] = newFlippedIndices;

      if (newCards[firstIndex].content === newCards[secondIndex].content) {
        // It's a match!
        setTimeout(() => {
          const matchedCards = [...newCards];
          matchedCards[firstIndex].isMatched = true;
          matchedCards[secondIndex].isMatched = true;
          setCards(matchedCards);
          setFlippedIndices([]);
          setIsLocked(false);
        }, 500);
      } else {
        // Not a match, flip back
        setTimeout(() => {
          const resetCards = [...newCards];
          resetCards[firstIndex].isFlipped = false;
          resetCards[secondIndex].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
          setIsLocked(false);
        }, 1000);
      }
    }
  };

  const isWin = cards.length > 0 && cards.every((card) => card.isMatched);

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
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(236, 0, 140, 0.1)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(252, 103, 103, 0.1)', filter: 'blur(80px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '0 20px', maxWidth: '500px', margin: '0 auto' }}>
        
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

          <div style={{ fontSize: '14px', fontWeight: 900, color: '#ec4899', background: '#fce7f3', padding: '8px 16px', borderRadius: '20px' }}>
            MOVES: {moves}
          </div>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 900, textTransform: 'uppercase', margin: 0, letterSpacing: '-1px', lineHeight: 1, background: 'linear-gradient(135deg, #EC008C, #FC6767)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            FIND THE PAIR
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', fontWeight: 900, opacity: 0.4, letterSpacing: '2px' }}>
            TEST YOUR MEMORY
          </p>
        </div>

        {/* Win State Overlay */}
        {isWin && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ textAlign: 'center', marginBottom: '30px', background: '#fff', padding: '24px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(236, 0, 140, 0.2)', border: '2px solid #fce7f3' }}
          >
            <Sparkles size={40} color="#EC008C" fill="#EC008C" style={{ margin: '0 auto 10px' }} />
            <h2 style={{ margin: '0 0 10px 0', fontSize: '24px', color: '#EC008C', fontWeight: 900 }}>YOU DID IT!</h2>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={initializeGame}
              style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #EC008C, #FC6767)', color: '#fff', border: 'none', borderRadius: '20px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
            >
              <RotateCcw size={18} /> PLAY AGAIN
            </motion.button>
          </motion.div>
        )}

        {/* Game Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '16px',
          perspective: '1000px' // Crucial for 3D flip effect
        }}>
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              onClick={() => handleCardClick(index)}
              style={{
                width: '100%',
                aspectRatio: '1/1',
                position: 'relative',
                transformStyle: 'preserve-3d',
                cursor: 'pointer'
              }}
              animate={{ rotateY: card.isFlipped || card.isMatched ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              {/* Front of Card (Question Mark) */}
              <div style={{
                position: 'absolute', width: '100%', height: '100%',
                backfaceVisibility: 'hidden',
                background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
                border: '2px solid #fce7f3',
                borderRadius: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(0,0,0,0.05)',
                fontSize: '32px', color: '#fbcfe8', fontWeight: 900
              }}>
                ?
              </div>

              {/* Back of Card (Emoji) */}
              <div style={{
                position: 'absolute', width: '100%', height: '100%',
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: card.isMatched ? 'linear-gradient(135deg, #11998E, #38EF7D)' : 'linear-gradient(135deg, #EC008C, #FC6767)',
                borderRadius: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: card.isMatched ? '0 8px 20px rgba(56, 239, 125, 0.3)' : '0 8px 20px rgba(236, 0, 140, 0.3)',
                fontSize: '40px'
              }}>
                {card.content}
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}
