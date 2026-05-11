'use client';
import React, { useState, useEffect } from 'react';
import { Calculator, Sparkles, RotateCcw, Target, Zap } from 'lucide-react';

const Frac = ({ n, d }: { n: React.ReactNode, d: React.ReactNode }) => (
  <span className="inline-flex flex-col items-center justify-center align-middle mx-1 font-black italic relative -top-[0.1em]">
    <span className="border-b-[2.5px] border-current px-1 pb-[2px] leading-none">{n}</span>
    <span className="pt-[2px] px-1 leading-none">{d}</span>
  </span>
);

export default function BodmasSolver() {
  const [input, setInput] = useState("24 + 6 x (8 - 5)");
  const [layers, setLayers] = useState<string[]>([]);
  const [isFinal, setIsFinal] = useState(false);

  // Pre-process strings to handle 'x', 'X', '×', '÷' and implicit '6(5)' multiplication
  const cleanExpr = (str: string) => {
    let s = str.replace(/x|X|×|\*/g, '*').replace(/÷|\//g, '/').replace(/\s+/g, '');
    s = s.replace(/(\d)\(/g, '$1*('); 
    s = s.replace(/\)\(/g, ')*(');
    return s;
  };

  // Convert raw math strings into beautiful React Nodes (replacing division with <Frac>)
  const renderMathString = (expr: string) => {
    let parts = [];
    let regex = /([-+]?\d+\.?\d*)\/([-+]?\d+\.?\d*)/g;
    let lastIdx = 0;
    let match;
    
    while ((match = regex.exec(expr)) !== null) {
      let before = expr.substring(lastIdx, match.index);
      if (before) parts.push(before.replace(/\*/g, ' × ').replace(/\+/g, ' + ').replace(/-/g, ' - '));
      parts.push(<Frac key={match.index} n={match[1].replace(/-/g, '')} d={match[2].replace(/-/g, '')} />);
      lastIdx = regex.lastIndex;
    }
    
    let remainder = expr.substring(lastIdx);
    if (remainder) parts.push(remainder.replace(/\*/g, ' × ').replace(/\+/g, ' + ').replace(/-/g, ' - '));
    
    return <span className="flex items-center flex-wrap justify-center">{parts}</span>;
  };

  const solveMathStep = (expr: string): string => {
    // 1. Solve Bracket Internals First
    let bMatch = expr.match(/\(([-+]?\d+\.?\d*)\)/);
    if (bMatch) return expr.replace(bMatch[0], bMatch[1]); // Remove brackets from single numbers
    
    let m = expr.match(/\(([-+]?\d+\.?\d*(?:[-+*/][-+]?\d+\.?\d*)+)\)/);
    if (m) return expr.replace(m[0], `(${solveMathStep(m[1])})`);

    // 2. Division / Multiplication
    m = expr.match(/([-+]?\d+\.?\d*)([*\/])([-+]?\d+\.?\d*)/);
    if (m) {
        let a = parseFloat(m[1]), b = parseFloat(m[3]);
        let res = m[2] === '*' ? a * b : a / b;
        return expr.replace(m[0], res.toString()).replace(/\+-/g, '-').replace(/--/g, '+');
    }

    // 3. Addition / Subtraction
    m = expr.match(/([-+]?\d+\.?\d*)([+-])([-+]?\d+\.?\d*)/);
    if (m) {
        let a = parseFloat(m[1]), b = parseFloat(m[3]);
        let res = m[2] === '+' ? a + b : a - b;
        return expr.replace(m[0], res.toString()).replace(/\+-/g, '-').replace(/--/g, '+');
    }
    return expr;
  };

  const initTower = () => {
    const startExpr = cleanExpr(input);
    setLayers([startExpr]);
    setIsFinal(false);
  };

  useEffect(() => { initTower(); }, []);

  const solveNextStep = () => {
    if (isFinal || layers.length === 0) return;
    let currentExpr = layers[layers.length - 1];
    let newExpr = solveMathStep(currentExpr);
    
    if (newExpr !== currentExpr) {
      setLayers([...layers, newExpr]);
      if (!isNaN(Number(newExpr))) setIsFinal(true);
    }
  };

  return (
    <div className="relative rounded-3xl bg-card border border-border p-5 overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] group">
      <Calculator className="absolute -right-4 -top-4 w-24 h-24 text-blue-500/5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500" />
      
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
        <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-blue-500">Interactive Tool</span>
      </div>

      <h3 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text mb-4">
        BODMAS <span className="text-blue-500">Shrinker</span>
      </h3>

      <div className="flex gap-2 mb-6 relative z-10">
        <div className="flex-1 relative group/input">
          <input 
            type="text" value={input} onChange={(e) => setInput(e.target.value)}
            className="w-full bg-background/50 border-2 border-border rounded-xl px-4 py-3 text-sm font-bold italic uppercase tracking-wider outline-none focus:border-blue-500 transition-colors text-text"
            placeholder="E.g. 24 + 6 x (8 - 5)"
          />
        </div>
        <button onClick={initTower} className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl transition-all active:scale-90 shadow-lg shadow-blue-500/20 flex items-center justify-center">
          <RotateCcw className="w-5 h-5 active:-rotate-180 transition-transform duration-300" />
        </button>
      </div>

      <div className="space-y-2 relative z-10 mb-2">
        {layers.map((layer, index) => {
          const isCurrent = index === layers.length - 1;
          const depth = layers.length - 1 - index;
          const scale = isCurrent ? 1 : Math.max(0.85, 1 - depth * 0.05);
          const opacity = isCurrent ? 1 : Math.max(0.2, 0.6 - depth * 0.15);

          return (
            <div key={index} style={{ transform: `scale(${scale})`, opacity: opacity }}
              className={`flex items-center justify-center p-4 rounded-xl border transition-all duration-500 origin-top
                ${isCurrent ? (isFinal ? 'bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-blue-500/15 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.1)]') : 'bg-background border-border grayscale'}`}
            >
              <div className={`text-xl font-black italic tracking-tight ${isCurrent && isFinal ? 'text-emerald-500' : (isCurrent ? 'text-blue-400' : 'text-text/50')}`}>
                {renderMathString(layer)}
              </div>
              {isCurrent && isFinal && <Sparkles className="w-5 h-5 text-emerald-500 ml-3 animate-bounce" />}
            </div>
          );
        })}
      </div>

      <button disabled={layers.length === 0 || isFinal} onClick={solveNextStep} className={`w-full group/btn relative rounded-2xl py-4 flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 active:scale-[0.98] mt-4 ${isFinal ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-white' : 'bg-blue-500 shadow-[0_4px_0_rgb(29,78,216)] hover:shadow-[0_2px_0_rgb(29,78,216)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] text-white'} disabled:opacity-20 disabled:grayscale disabled:pointer-events-none disabled:shadow-none disabled:translate-y-0`}>
        <span className="text-sm font-black italic uppercase tracking-wider relative z-10 flex items-center gap-2">
          {isFinal ? "Target Shrinked" : "Execute Step"}
          {!isFinal && <Zap className="w-4 h-4 fill-current" />}
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
      </button>
    </div>
  );
}
