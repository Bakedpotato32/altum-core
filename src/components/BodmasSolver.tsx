'use client';
import React, { useState, useEffect } from 'react';
import { Calculator, Sparkles, RotateCcw, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Frac = ({ n, d }: { n: React.ReactNode, d: React.ReactNode }) => (
  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle', margin: '0 4px', position: 'relative', top: '-0.1em' }}>
    <span style={{ borderBottom: '2.5px solid currentColor', padding: '0 4px', paddingBottom: '2px', lineHeight: 1 }}>{n}</span>
    <span style={{ paddingTop: '2px', padding: '0 4px', lineHeight: 1 }}>{d}</span>
  </span>
);

export default function BodmasSolver() {
  const [input, setInput] = useState("24 + 6 x (8 - 5)");
  const [layers, setLayers] = useState<string[]>([]);
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState(false);

  const cleanExpr = (str: string) => {
    let s = str.replace(/x|X|×|\*/g, '*').replace(/÷|:/g, '/').replace(/\s+/g, '');
    s = s.replace(/(\d)\(/g, '$1*('); 
    s = s.replace(/\)\(/g, ')*(');
    return s;
  };

  const renderMathString = (expr: string) => {
    let parts: React.ReactNode[] = [];
    let regex = /([-+]?\d+\.?\d*)\/([-+]?\d+\.?\d*)/g;
    let lastIdx = 0;
    let match;
    
    while ((match = regex.exec(expr)) !== null) {
      let before = expr.substring(lastIdx, match.index);
      if (before) parts.push(<span key={`b-${match.index}`}>{before.replace(/\*/g, ' × ').replace(/\+/g, ' + ').replace(/-/g, ' - ')}</span>);
      parts.push(<Frac key={`f-${match.index}`} n={match[1].replace(/-/g, '')} d={match[2].replace(/-/g, '')} />);
      lastIdx = regex.lastIndex;
    }
    
    let remainder = expr.substring(lastIdx);
    if (remainder) parts.push(<span key={`r-${lastIdx}`}>{remainder.replace(/\*/g, ' × ').replace(/\+/g, ' + ').replace(/-/g, ' - ')}</span>);
    
    return <span style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>{parts}</span>;
  };

  const solveMathStep = (expr: string): string => {
    let bMatch = expr.match(/^\(([-+]?\d+\.?\d*)\)$/);
    if (bMatch) return bMatch[1];

    let m = expr.match(/\(([^()]+)\)/);
    if (m) {
      if (/^[-+]?\d+\.?\d*$/.test(m[1])) {
        return expr.replace(m[0], m[1]).replace(/\+-/g, '-').replace(/--/g, '+');
      }
      return expr.replace(m[0], `(${solveMathStep(m[1])})`);
    }

    m = expr.match(/([-+]?\d+\.?\d*)([*\/])([-+]?\d+\.?\d*)/);
    if (m) {
        let a = parseFloat(m[1]), b = parseFloat(m[3]);
        if (b === 0 && m[2] === '/') throw new Error("Div/0");
        let res = m[2] === '*' ? a * b : a / b;
        res = Math.round(res * 100000) / 100000;
        return expr.replace(m[0], res.toString()).replace(/\+-/g, '-').replace(/--/g, '+');
    }

    m = expr.match(/([-+]?\d+\.?\d*)([+-])([-+]?\d+\.?\d*)/);
    if (m) {
        if (m[0] === expr && !m[1]) return expr; 
        
        let a = parseFloat(m[1] || "0"), b = parseFloat(m[3]);
        let res = m[2] === '+' ? a + b : a - b;
        res = Math.round(res * 100000) / 100000;
        return expr.replace(m[0], res.toString()).replace(/\+-/g, '-').replace(/--/g, '+');
    }
    return expr;
  };

  const initTower = () => {
    setError(false);
    const startExpr = cleanExpr(input);
    if (!startExpr) return;
    setLayers([startExpr]);
    setIsFinal(!isNaN(Number(startExpr)));
  };

  useEffect(() => { initTower(); }, []);

  const solveNextStep = () => {
    if (isFinal || layers.length === 0 || error) return;
    
    try {
      let currentExpr = layers[layers.length - 1];
      let newExpr = solveMathStep(currentExpr);
      
      if (newExpr !== currentExpr && newExpr !== "NaN") {
        setLayers([...layers, newExpr]);
        if (!isNaN(Number(newExpr))) setIsFinal(true);
      } else {
        setError(true);
      }
    } catch (e) {
      setError(true);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #00d2ff, #3a7bd5)',
      borderRadius: '32px',
      padding: '24px',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 15px 35px rgba(58, 123, 213, 0.3)',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <span style={{ position: 'absolute', right: '-10px', top: '20px', fontSize: '140px', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }}>
        🧮
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.25)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <Calculator color="#fff" size={26} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1.1, textTransform: 'uppercase' }}>MATH SOLVER</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '10px', fontWeight: 800, opacity: 0.8, letterSpacing: '1px', textTransform: 'uppercase' }}>STEP-BY-STEP BODMAS</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && initTower()}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.15)',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '18px',
            padding: '14px 16px',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 900,
            fontStyle: 'italic',
            outline: 'none',
            letterSpacing: '1px',
            backdropFilter: 'blur(10px)'
          }}
          placeholder="E.g. 24 + 6 x (8 - 5)"
        />
        
        {/* UPDATED RESET BUTTON */}
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={initTower} 
          style={{
            background: '#fff', // Changed to solid white
            border: 'none',
            color: '#3a7bd5', // Changed to match the theme blue
            padding: '0 18px',
            borderRadius: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)' // Added subtle drop shadow
          }}
        >
          <RotateCcw size={22} strokeWidth={3} />
        </motion.button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
        <AnimatePresence>
          {layers.map((layer, index) => {
            const isCurrent = index === layers.length - 1;
            
            return (
              <motion.div 
                key={`${index}-${layer}`}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '16px', 
                  borderRadius: '20px', 
                  background: isCurrent && isFinal ? '#fff' : (isCurrent ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'),
                  color: isCurrent && isFinal ? '#3a7bd5' : '#fff',
                  boxShadow: isCurrent ? '0 8px 20px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.3s ease',
                  border: isCurrent && isFinal ? 'none' : '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <div style={{ fontSize: '22px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '1px' }}>
                  {error && isCurrent ? "INVALID EXPRESSION" : renderMathString(layer)}
                </div>
                {isCurrent && isFinal && !error && (
                  <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring" }}>
                    <Sparkles size={24} color="#f09819" style={{ marginLeft: '12px' }} fill="#f09819" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <motion.button 
        whileTap={!isFinal && !error ? { scale: 0.96 } : {}}
        disabled={layers.length === 0 || isFinal || error} 
        onClick={solveNextStep} 
        style={{
          width: '100%',
          background: isFinal || error ? 'rgba(255,255,255,0.1)' : '#fff',
          color: isFinal || error ? 'rgba(255,255,255,0.5)' : '#3a7bd5',
          border: 'none',
          borderRadius: '20px',
          padding: '18px',
          fontSize: '16px',
          fontWeight: 900,
          fontStyle: 'italic',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          cursor: isFinal || error ? 'not-allowed' : 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          position: 'relative',
          zIndex: 1,
          boxShadow: isFinal || error ? 'none' : '0 10px 20px rgba(0,0,0,0.15)'
        }}
      >
        {isFinal ? "EQUATION SOLVED" : error ? "ERROR" : "SHRINK NEXT STEP"}
        {!isFinal && !error && <Zap size={20} fill="#3a7bd5" />}
      </motion.button>
    </div>
  );
}
