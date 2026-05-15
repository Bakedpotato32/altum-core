'use client';
import React, { useState, useEffect } from 'react';
import { Calculator, Sparkles, RotateCcw, Target, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Custom Vertical Fraction Component
const Frac = ({ n, d }: { n: React.ReactNode, d: React.ReactNode }) => (
  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle', margin: '0 4px', position: 'relative', top: '-0.1em' }}>
    <span style={{ borderBottom: '2.5px solid currentColor', padding: '0 4px', paddingBottom: '2px', lineHeight: 1 }}>{n}</span>
    <span style={{ paddingTop: '2px', padding: '0 4px', lineHeight: 1 }}>{d}</span>
  </span>
);

export default function AlgebraSolver() {
  const [input, setInput] = useState("x/5 + 3 = 11");
  const [steps, setSteps] = useState<{ eq: React.ReactNode, exp: string }[]>([]);
  const [engine, setEngine] = useState<any>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState(false);
  const [nextTarget, setNextTarget] = useState<string | null>(null);

  // --- MATH ENGINE: PARSER & FORMATTER (Hardened) ---
  const parseSide = (str: string) => {
    let terms = { x2: 0, x: 0, c: 0 };
    // Clean string: remove spaces, asterisks, make lowercase, replace x^2
    let s = str.replace(/\s+/g, '').replace(/\*/g, '').toLowerCase().replace(/x\^2/g, 'x²');
    
    // Safely handle subtraction by converting to addition of negative terms
    s = s.replace(/-/g, '+-');
    if (s.startsWith('+-')) s = s.substring(1);
    
    let parts = s.split('+');
    parts.forEach(p => {
      if (!p) return;
      let isX2 = p.includes('x²');
      let isX = !isX2 && p.includes('x');

      if (isX2 || isX) {
        let val = p.replace(isX2 ? 'x²' : 'x', '');
        if (val === '' || val === '+') val = '1';
        if (val === '-') val = '-1';
        if (val.startsWith('/')) val = '1' + val;
        if (val.startsWith('-/')) val = '-1/' + val.substring(2);
        
        let numValue = 0;
        if (val.includes('/')) {
            let [num, den] = val.split('/');
            numValue = parseFloat(num) / parseFloat(den);
        } else {
            numValue = parseFloat(val);
        }

        if (isX2) terms.x2 += numValue;
        else terms.x += numValue;
      } else {
        let numValue = 0;
        if (p.includes('/')) {
            let [num, den] = p.split('/');
            numValue = parseFloat(num) / parseFloat(den);
        } else {
            numValue = parseFloat(p);
        }
        terms.c += numValue;
      }
    });
    return terms;
  };

  const formatTerm = (coeff: number, v: string) => {
    if (coeff === 0) return '';
    let c: string | number = Math.abs(coeff);
    if (c % 1 !== 0) c = Number(c.toFixed(2)); // Clean decimals
    let s = coeff < 0 ? '-' : '+';
    if (v !== '' && c === 1) c = ''; 
    return `${s} ${c}${v}`;
  };

  const printSide = (t: { x2: number, x: number, c: number }) => {
    let res = `${formatTerm(t.x2, 'x²')} ${formatTerm(t.x, 'x')} ${formatTerm(t.c, '')}`.trim();
    if (res.startsWith('+')) res = res.substring(1).trim();
    if (res === '') return '0';
    return res;
  };

  const printEq = (l: any, r: any) => <>{printSide(l)} = {printSide(r)}</>;

  const getTargetText = (task: string, r: any, l: any) => {
    if (task === 'move_x2') return `Shift ${Math.abs(Number(r.x2.toFixed(2)))}x² to the left`;
    if (task === 'move_x') return `Shift ${Math.abs(Number(r.x.toFixed(2)))}x to the left`;
    if (task === 'move_c_to_lhs') return `Set to 0 by moving ${Math.abs(Number(r.c.toFixed(2)))}`;
    if (task === 'move_c_to_rhs') return `Isolate x by moving ${Math.abs(Number(l.c.toFixed(2)))} to right`;
    if (task === 'solve_quad') return `Apply Quadratic Formula`;
    if (task === 'solve_linear') return `Calculate final x`;
    return null;
  };

  const initTower = () => {
    setError(false);
    let parts = input.split('=');
    
    // Safety check for valid formatting
    if (parts.length !== 2 || parts[0].trim() === '' || parts[1].trim() === '') {
      setError(true);
      setIsFinal(true);
      setSteps([{ eq: "INVALID EQUATION", exp: "MISSING '=' OR TERMS" }]);
      setNextTarget(null);
      return;
    }

    try {
      let lhs = parseSide(parts[0]);
      let rhs = parseSide(parts[1]);

      let initialSteps = [{ eq: printEq(lhs, rhs), exp: "EQUATION SCANNED" }];

      let q = [];
      if (rhs.x2 !== 0) q.push('move_x2');
      if (rhs.x !== 0) q.push('move_x');

      let isQuad = (lhs.x2 - rhs.x2) !== 0;

      if (isQuad) {
        if (rhs.c !== 0) q.push('move_c_to_lhs');
        q.push('solve_quad');
      } else {
        if (lhs.c !== 0) q.push('move_c_to_rhs');
        q.push('solve_linear');
      }

      setEngine({ lhs, rhs, queue: q });
      setSteps(initialSteps);
      setIsFinal(false);
      setNextTarget(getTargetText(q[0], rhs, lhs));
    } catch (err) {
      setError(true);
      setIsFinal(true);
      setSteps([{ eq: "PARSE ERROR", exp: "CHECK YOUR MATH" }]);
      setNextTarget(null);
    }
  };

  useEffect(() => { initTower(); }, []);

  const solveNextStep = () => {
    if (!engine || engine.queue.length === 0 || error) return;

    let { lhs, rhs, queue } = engine;
    let task = queue.shift();
    let exp = '';
    let resultEq: React.ReactNode = <></>;
    let finalStep = false;

    let nL = { ...lhs };
    let nR = { ...rhs };

    if (task === 'move_x2') {
      let val = nR.x2; nL.x2 -= val; nR.x2 = 0;
      exp = `${val > 0 ? 'SUBTRACT' : 'ADD'} ${Math.abs(Number(val.toFixed(2)))}x² BOTH SIDES`;
      resultEq = printEq(nL, nR);
    } 
    else if (task === 'move_x') {
      let val = nR.x; nL.x -= val; nR.x = 0;
      exp = `${val > 0 ? 'SUBTRACT' : 'ADD'} ${Math.abs(Number(val.toFixed(2)))}x BOTH SIDES`;
      resultEq = printEq(nL, nR);
    } 
    else if (task === 'move_c_to_lhs') {
      let val = nR.c; nL.c -= val; nR.c = 0;
      exp = `${val > 0 ? 'SUBTRACT' : 'ADD'} ${Math.abs(Number(val.toFixed(2)))} TO SET TO ZERO`;
      resultEq = printEq(nL, nR);
    } 
    else if (task === 'move_c_to_rhs') {
      let val = nL.c; nR.c -= val; nL.c = 0;
      exp = `${val > 0 ? 'SUBTRACT' : 'ADD'} ${Math.abs(Number(val.toFixed(2)))} TO ISOLATE X`;
      resultEq = printEq(nL, nR);
    } 
    else if (task === 'solve_linear') {
      finalStep = true;
      if (nL.x === 0) {
        resultEq = <>{nR.c === 0 ? "INFINITE SOLUTIONS" : "NO SOLUTION"}</>;
        exp = "CHECKED LOGIC STATES";
      } else {
        let ans = nR.c / nL.x;
        resultEq = <>x = <Frac n={Number(nR.c.toFixed(2))} d={Number(nL.x.toFixed(2))} /> = {Number(ans.toFixed(2))}</>;
        exp = `DIVIDE BOTH SIDES BY ${Number(nL.x.toFixed(2))}`;
      }
    } 
    else if (task === 'solve_quad') {
      finalStep = true;
      let a = nL.x2, b = nL.x, c = nL.c;
      let d = (b * b) - (4 * a * c);
      if (d < 0) {
        exp = `DISCRIMINANT NEGATIVE`;
        resultEq = <>NO REAL SOLUTIONS</>;
      } else if (d === 0) {
        let root = -b / (2 * a);
        exp = `ONE REAL ROOT`;
        resultEq = <>x = <Frac n={Number(-b.toFixed(2))} d={Number((2*a).toFixed(2))} /> = {Number(root.toFixed(2))}</>;
      } else {
        let r1 = (-b + Math.sqrt(d)) / (2 * a);
        let r2 = (-b - Math.sqrt(d)) / (2 * a);
        exp = `APPLIED QUADRATIC FORMULA`;
        resultEq = <>x &approx; {Number(r1.toFixed(2))} <span style={{ opacity: 0.5, margin: '0 10px' }}>OR</span> x &approx; {Number(r2.toFixed(2))}</>;
      }
    }

    setSteps([...steps, { eq: resultEq, exp }]);
    setEngine({ lhs: nL, rhs: nR, queue });
    
    if (finalStep) {
      setIsFinal(true);
      setNextTarget(null);
    } else {
      setNextTarget(getTargetText(queue[0], nR, nL));
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #10b981, #047857)', // Vibrant Emerald gradient
      borderRadius: '32px',
      padding: '24px',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 15px 35px rgba(16, 185, 129, 0.3)',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      {/* Background Watermark */}
      <span style={{ position: 'absolute', right: '-10px', top: '20px', fontSize: '140px', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }}>
        ⚖️
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.25)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <Calculator color="#fff" size={26} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1.1, textTransform: 'uppercase' }}>ALGEBRA SOLVER</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '10px', fontWeight: 800, opacity: 0.8, letterSpacing: '1px', textTransform: 'uppercase' }}>ISOLATE & SOLVE</p>
        </div>
      </div>

      {/* Input Section */}
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
          placeholder="E.g. x/5 + 3 = 11"
        />
        
        {/* White Reset Button */}
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={initTower} 
          style={{
            background: '#fff', 
            border: 'none',
            color: '#10b981', // Matching theme color
            padding: '0 18px',
            borderRadius: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }}
        >
          <RotateCcw size={22} strokeWidth={3} />
        </motion.button>
      </div>

      {/* Dynamic Target Locked Banner */}
      <AnimatePresence>
        {nextTarget && !isFinal && !error && steps.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.15)', padding: '10px', borderRadius: '14px', backdropFilter: 'blur(5px)' }}
          >
            <Target size={16} color="#fbbf24" strokeWidth={3} />
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#fbbf24', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              TARGET: <span style={{ color: '#fff' }}>{nextTarget}</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tower Layers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
        <AnimatePresence>
          {steps.map((step, index) => {
            const isCurrent = index === steps.length - 1;
            
            return (
              <motion.div 
                key={`${index}-${step.exp}`}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '16px', 
                  borderRadius: '20px', 
                  background: isCurrent && isFinal && !error ? '#fff' : (isCurrent ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'),
                  color: isCurrent && isFinal && !error ? '#047857' : '#fff',
                  boxShadow: isCurrent ? '0 8px 20px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.3s ease',
                  border: isCurrent && isFinal ? 'none' : '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', opacity: isCurrent && isFinal && !error ? 0.6 : 0.8 }}>
                  {step.exp}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '1px', color: error ? '#fca5a5' : 'inherit' }}>
                    {step.eq}
                  </div>
                  {isCurrent && isFinal && !error && (
                    <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring" }}>
                      <Sparkles size={24} color="#f09819" fill="#f09819" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Action Button */}
      <motion.button 
        whileTap={!isFinal && !error ? { scale: 0.96 } : {}}
        disabled={steps.length === 0 || isFinal || error} 
        onClick={solveNextStep} 
        style={{
          width: '100%',
          background: isFinal || error ? 'rgba(255,255,255,0.1)' : '#fff',
          color: isFinal || error ? 'rgba(255,255,255,0.5)' : '#047857',
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
        {isFinal && !error ? "MISSION ACCOMPLISHED" : error ? "ERROR DETECTED" : "EXECUTE NEXT STEP"}
        {!isFinal && !error && <Zap size={20} fill="#047857" />}
      </motion.button>
    </div>
  );
}
