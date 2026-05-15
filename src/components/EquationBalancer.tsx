'use client';
import React, { useState } from 'react';
import { Beaker, RotateCcw, Sparkles, AlertTriangle, CheckCircle2, TestTube2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to convert normal numbers in formulas to subscripts (e.g. H2O -> H₂O)
const toSub = (str: string) => {
  const subs: Record<string, string> = { '0':'₀', '1':'₁', '2':'₂', '3':'₃', '4':'₄', '5':'₅', '6':'₆', '7':'₇', '8':'₈', '9':'₉' };
  return str.replace(/[0-9]/g, m => subs[m]);
};

// Chemical Parser: Handles brackets like Ca(OH)2 and extracts atom counts
const parseFormula = (formula: string) => {
  let f = formula;
  let regex = /\(([^()]+)\)(\d+)/;
  let match;
  while ((match = regex.exec(f))) {
      let inner = match[1];
      let mult = parseInt(match[2]);
      let expanded = inner.replace(/([A-Z][a-z]*)(\d*)/g, (m, el, num) => {
          return el + (parseInt(num || '1') * mult);
      });
      f = f.replace(match[0], expanded);
  }
  let counts: Record<string, number> = {};
  f.replace(/([A-Z][a-z]*)(\d*)/g, (m, el, num) => {
      counts[el] = (counts[el] || 0) + parseInt(num || '1');
  });
  return counts;
};

export default function EquationBalancer() {
  const [input, setInput] = useState("H2 + O2 = H2O");
  const [steps, setSteps] = useState<{ title: string, content: React.ReactNode }[]>([]);
  const [isFinal, setIsFinal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCalculated, setIsCalculated] = useState(false);

  const reset = () => {
    setSteps([]);
    setIsFinal(false);
    setIsCalculated(false);
    setErrorMsg('');
  };

  const balanceEquation = () => {
    reset();
    let eq = input.replace(/\s+/g, '');

    // Catch lowercase typos immediately
    if (!/[A-Z]/.test(eq) && /[a-z]/.test(eq)) {
        setErrorMsg("CHEMISTRY ERROR: Elements must start with a Capital letter! (e.g., 'CO2' not 'co2').");
        return;
    }

    let sides = eq.split(/=|-&gt;|->|=>/);
    
    if (sides.length !== 2 || sides[0].trim() === '' || sides[1].trim() === '') {
      setErrorMsg("INPUT ERROR: Ensure there is an '=' or '->' between reactants and products.");
      return;
    }

    let leftStrs = sides[0].split('+');
    let rightStrs = sides[1].split('+');

    let leftParsed = leftStrs.map(parseFormula);
    let rightParsed = rightStrs.map(parseFormula);
    let allParsed = [...leftParsed, ...rightParsed];

    let elements = Array.from(new Set(allParsed.flatMap(obj => Object.keys(obj)))).sort();

    // Verification check: Make sure no magic elements appeared on one side only
    for (let el of elements) {
      let inLeft = leftParsed.some(comp => comp[el]);
      let inRight = rightParsed.some(comp => comp[el]);
      if (!inLeft || !inRight) {
        setErrorMsg(`CHEMISTRY ERROR: Element '${el}' is missing on one side! Check for typos.`);
        return;
      }
    }

    if (allParsed.length > 8) {
      setErrorMsg("COMPLEXITY LIMIT: Engine handles up to 8 total compounds to prevent freezing.");
      return;
    }

    let newSteps: { title: string, content: React.ReactNode }[] = [];
    const add = (title: string, content: React.ReactNode) => newSteps.push({ title, content });

    // Step 1: Show Initial Unbalanced State
    const getCounts = (parsedSide: Record<string, number>[], coeffs: number[]) => {
      let totals: Record<string, number> = {};
      parsedSide.forEach((comp, i) => {
        for (let el in comp) totals[el] = (totals[el] || 0) + comp[el] * coeffs[i];
      });
      return totals;
    };

    let initLeft = getCounts(leftParsed, Array(leftParsed.length).fill(1));
    let initRight = getCounts(rightParsed, Array(rightParsed.length).fill(1));
    let isAlreadyBalanced = elements.every(el => initLeft[el] === initRight[el]);

    // Enhanced dark-mode table renderer
    const renderTable = (lCounts: Record<string, number>, rCounts: Record<string, number>) => (
      <div style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '16px', overflow: 'hidden', marginTop: '8px' }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ flex: 1, padding: '10px', textAlign: 'center', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#fff', opacity: 0.8 }}>Element</div>
          <div style={{ flex: 1, padding: '10px', textAlign: 'center', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#fff', opacity: 0.8 }}>LHS</div>
          <div style={{ flex: 1, padding: '10px', textAlign: 'center', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#fff', opacity: 0.8 }}>RHS</div>
        </div>
        {elements.map(el => {
          let match = lCounts[el] === rCounts[el];
          return (
            <div key={el} style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', background: match ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
              <div style={{ flex: 1, padding: '10px', textAlign: 'center', fontSize: '14px', fontWeight: 900, fontStyle: 'italic', color: '#fff' }}>{el}</div>
              <div style={{ flex: 1, padding: '10px', textAlign: 'center', fontSize: '14px', fontWeight: 900, fontStyle: 'italic', color: match ? '#34d399' : '#fca5a5' }}>{lCounts[el] || 0}</div>
              <div style={{ flex: 1, padding: '10px', textAlign: 'center', fontSize: '14px', fontWeight: 900, fontStyle: 'italic', color: match ? '#34d399' : '#fca5a5' }}>{rCounts[el] || 0}</div>
            </div>
          )
        })}
      </div>
    );

    add("Scan: Initial Atom Count", renderTable(initLeft, initRight));

    if (isAlreadyBalanced) {
        add("Result", <div style={{ color: '#34d399', fontWeight: 900, fontStyle: 'italic', textAlign: 'center', marginTop: '8px', fontSize: '16px' }}>Equation is already balanced!</div>);
    } else {
        // Balancer Engine (Iterative Deepening Search for lowest coefficients)
        add("Engine Protocol", <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', padding: '10px' }}>Matrix permutations initialized. Hunting for lowest whole-number coefficients...</div>);
        
        let bestCoeffs: number[] | null = null;
        let numCompounds = allParsed.length;

        const check = (coeffs: number[]) => {
            for (let el of elements) {
                let lSum = 0, rSum = 0;
                for (let i = 0; i < leftParsed.length; i++) lSum += (leftParsed[i][el] || 0) * coeffs[i];
                for (let i = 0; i < rightParsed.length; i++) rSum += (rightParsed[i][el] || 0) * coeffs[leftParsed.length + i];
                if (lSum !== rSum) return false;
            }
            return true;
        };

        for (let maxC = 1; maxC <= 15; maxC++) {
            const search = (depth: number, currentCoeffs: number[], hasMax: boolean) => {
                if (bestCoeffs) return;
                if (depth === numCompounds) {
                    if (hasMax && check(currentCoeffs)) bestCoeffs = [...currentCoeffs];
                    return;
                }
                for (let i = 1; i <= maxC; i++) {
                    currentCoeffs[depth] = i;
                    search(depth + 1, currentCoeffs, hasMax || i === maxC);
                }
            };
            search(0, [], false);
            if (bestCoeffs) break;
        }

        if (!bestCoeffs) {
            setErrorMsg("MATH ERROR: Could not balance within normal limits (Coefficients > 15). Check equation for typos.");
            return;
        }

        let lCoeffs = bestCoeffs.slice(0, leftParsed.length);
        let rCoeffs = bestCoeffs.slice(leftParsed.length);
        
        let finalLeftCounts = getCounts(leftParsed, lCoeffs);
        let finalRightCounts = getCounts(rightParsed, rCoeffs);

        add("Scan: Final Atom Count", renderTable(finalLeftCounts, finalRightCounts));

        const formatSide = (strs: string[], coeffs: number[]) => {
            return strs.map((str, i) => {
                let c = coeffs[i] === 1 ? '' : `<span style="color: #fde047; margin-right: 4px;">${coeffs[i]}</span>`;
                return `${c}${toSub(str)}`;
            }).join(' <span style="opacity: 0.5; margin: 0 8px;">+</span> ');
        };

        let finalEqHTML = `${formatSide(leftStrs, lCoeffs)} <span style="color: #fde047; margin: 0 12px;">➔</span> ${formatSide(rightStrs, rCoeffs)}`;

        add("Mission Accomplished", (
            <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', padding: '24px 16px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', marginTop: '8px' }}>
                <div dangerouslySetInnerHTML={{ __html: finalEqHTML }} style={{ fontSize: '22px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', color: '#fff' }} />
            </div>
        ));
    }

    setSteps(newSteps);
    setIsCalculated(true);
    setIsFinal(true);
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      borderRadius: '32px',
      padding: '24px',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 15px 35px rgba(139, 92, 246, 0.3)',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      {/* Background Watermark */}
      <span style={{ position: 'absolute', right: '-10px', top: '20px', fontSize: '140px', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }}>
        ⚗️
      </span>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.25)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
            <Beaker color="#fff" size={26} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1.1, textTransform: 'uppercase' }}>EQUATION BALANCER</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '10px', fontWeight: 800, opacity: 0.8, letterSpacing: '1px', textTransform: 'uppercase' }}>CHEMISTRY ENGINE</p>
          </div>
        </div>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => { setInput(''); reset(); }} 
          style={{ background: '#fff', border: 'none', color: '#6d28d9', width: '45px', height: '45px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
        >
          <RotateCcw size={22} strokeWidth={3} />
        </motion.button>
      </div>

      {/* Input Section */}
      <div style={{ marginBottom: '16px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', letterSpacing: '1px', paddingLeft: '4px' }}>Chemical Equation</label>
          <input 
              type="text" 
              placeholder="e.g. H2 + O2 = H2O" 
              value={input} 
              onChange={(e) => { setInput(e.target.value); reset(); }} 
              style={{
                boxSizing: 'border-box',
                width: '100%', 
                background: 'rgba(255,255,255,0.15)', 
                border: '2px solid rgba(255,255,255,0.3)', 
                borderRadius: '20px', 
                padding: '16px', 
                color: '#fff', 
                fontSize: '20px', 
                fontWeight: 900, 
                fontStyle: 'italic', 
                textAlign: 'center', 
                outline: 'none', 
                letterSpacing: '2px',
                backdropFilter: 'blur(5px)'
              }}
          />
          <p style={{ fontSize: '9px', fontWeight: 900, color: '#fde047', textAlign: 'center', margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ⚠️ Elements MUST start with a Capital Letter (e.g. CO2, Fe)
          </p>
        </div>
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <p style={{ margin: '0 0 16px 0', padding: '12px', background: 'rgba(239, 68, 68, 0.4)', borderLeft: '4px solid #ef4444', borderRadius: '8px', fontSize: '10px', fontWeight: 900, color: '#fee2e2', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center', backdropFilter: 'blur(5px)' }}>
              {errorMsg}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        whileTap={{ scale: 0.96 }}
        onClick={balanceEquation} 
        style={{ width: '100%', background: '#fff', color: '#6d28d9', border: 'none', borderRadius: '20px', padding: '18px', fontSize: '16px', fontWeight: 900, fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', position: 'relative', zIndex: 1, boxShadow: '0 10px 20px rgba(0,0,0,0.15)', marginBottom: '24px' }}
      >
        SYNTHESIZE FORMULA <TestTube2 size={20} color="#6d28d9" strokeWidth={3} />
      </motion.button>

      {/* Dynamic Steps (Tables and Output) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 1 }}>
        <AnimatePresence>
          {isCalculated && steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.4 }}
                style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', borderRadius: '24px', 
                  background: isLast && isFinal ? '#fff' : 'rgba(255,255,255,0.15)',
                  color: isLast && isFinal ? '#6d28d9' : '#fff',
                  boxShadow: isLast && isFinal ? '0 10px 25px rgba(0,0,0,0.2)' : 'none',
                  border: isLast && isFinal ? 'none' : '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  {isLast && isFinal && <Sparkles size={14} color="#6d28d9" />}
                  <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', opacity: isLast && isFinal ? 1 : 0.8, textAlign: 'center' }}>
                    {step.title}
                  </span>
                  {isLast && isFinal && <Sparkles size={14} color="#6d28d9" />}
                </div>
                
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    {step.content}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
