'use client';
import React, { useState, useEffect } from 'react';
import { Calculator, Sparkles, RotateCcw, Target, Zap } from 'lucide-react';

// Custom Vertical Fraction Component
const Frac = ({ n, d }: { n: React.ReactNode, d: React.ReactNode }) => (
  <span className="inline-flex flex-col items-center justify-center align-middle mx-1 font-black italic relative -top-[0.1em]">
    <span className="border-b-[2.5px] border-current px-1 pb-[2px] leading-none">{n}</span>
    <span className="pt-[2px] px-1 leading-none">{d}</span>
  </span>
);

export default function AlgebraSolver() {
  const [input, setInput] = useState("x/5 + 3 = 11");
  const [steps, setSteps] = useState<{ eq: React.ReactNode, exp: string }[]>([]);
  const [engine, setEngine] = useState<any>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [nextTarget, setNextTarget] = useState<string | null>(null);

  // --- MATH ENGINE: PARSER & FORMATTER ---
  const parseSide = (str: string) => {
    let terms = { x2: 0, x: 0, c: 0 };
    let s = str.replace(/\s+/g, '').replace(/-/g, '+-').replace(/x\^2/gi, 'x²').replace(/X/g, 'x');
    if (s.startsWith('+-')) s = s.substring(1);
    
    let parts = s.split('+');
    parts.forEach(p => {
      if (!p) return;
      if (p.includes('x²')) {
        let val = p.replace('x²', '');
        if (val === '' || val === '+') val = '1';
        if (val === '-') val = '-1';
        if (val.startsWith('/')) val = '1' + val;
        
        if (val.includes('/')) {
            let [num, den] = val.split('/');
            terms.x2 += parseFloat(num) / parseFloat(den);
        } else {
            terms.x2 += parseFloat(val);
        }
      } else if (p.includes('x')) {
        let val = p.replace('x', '');
        if (val === '' || val === '+') val = '1';
        if (val === '-') val = '-1';
        if (val.startsWith('/')) val = '1' + val; // Handles x/5 -> 1/5
        
        if (val.includes('/')) {
            let [num, den] = val.split('/');
            terms.x += parseFloat(num) / parseFloat(den);
        } else {
            terms.x += parseFloat(val);
        }
      } else {
        if (p.includes('/')) {
            let [num, den] = p.split('/');
            terms.c += parseFloat(num) / parseFloat(den);
        } else {
            terms.c += parseFloat(p);
        }
      }
    });
    return terms;
  };

  const formatTerm = (coeff: number, v: string) => {
    if (coeff === 0) return '';
    let c: string | number = Math.abs(coeff);
    // If it's a messy decimal from a fraction like 1/5 = 0.2, show it nicely
    if (c % 1 !== 0) c = Number(c.toFixed(2));
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
    let parts = input.split('=');
    if (parts.length !== 2) {
      alert("Please enter a valid equation with an '=' sign!");
      return;
    }

    let lhs = parseSide(parts[0]);
    let rhs = parseSide(parts[1]);

    let initialSteps = [{ eq: printEq(lhs, rhs), exp: "Equation scanned and terms parsed." }];

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
  };

  useEffect(() => { initTower(); }, []);

  const solveNextStep = () => {
    if (!engine || engine.queue.length === 0) return;

    let { lhs, rhs, queue } = engine;
    let task = queue.shift();
    let exp = '';
    let resultEq: React.ReactNode = <></>;
    let finalStep = false;

    let nL = { ...lhs };
    let nR = { ...rhs };

    if (task === 'move_x2') {
      let val = nR.x2; nL.x2 -= val; nR.x2 = 0;
      exp = `${val > 0 ? 'Subtract' : 'Add'} ${Math.abs(Number(val.toFixed(2)))}x² ${val > 0 ? 'from' : 'to'} both sides.`;
      resultEq = printEq(nL, nR);
    } 
    else if (task === 'move_x') {
      let val = nR.x; nL.x -= val; nR.x = 0;
      exp = `${val > 0 ? 'Subtract' : 'Add'} ${Math.abs(Number(val.toFixed(2)))}x ${val > 0 ? 'from' : 'to'} both sides.`;
      resultEq = printEq(nL, nR);
    } 
    else if (task === 'move_c_to_lhs') {
      let val = nR.c; nL.c -= val; nR.c = 0;
      exp = `${val > 0 ? 'Subtract' : 'Add'} ${Math.abs(Number(val.toFixed(2)))} to set equation to zero.`;
      resultEq = printEq(nL, nR);
    } 
    else if (task === 'move_c_to_rhs') {
      let val = nL.c; nR.c -= val; nL.c = 0;
      exp = `${val > 0 ? 'Subtract' : 'Add'} ${Math.abs(Number(val.toFixed(2)))} to isolate x.`;
      resultEq = printEq(nL, nR);
    } 
    else if (task === 'solve_linear') {
      finalStep = true;
      if (nL.x === 0) {
        resultEq = <>{nR.c === 0 ? "Infinite Solutions" : "No Solution"}</>;
        exp = "Checked for impossible logic states.";
      } else {
        let ans = nR.c / nL.x;
        resultEq = <>x = <Frac n={Number(nR.c.toFixed(2))} d={Number(nL.x.toFixed(2))} /> = {Number(ans.toFixed(2))}</>;
        exp = `Divide both sides by ${Number(nL.x.toFixed(2))} to solve for x.`;
      }
    } 
    else if (task === 'solve_quad') {
      finalStep = true;
      let a = nL.x2, b = nL.x, c = nL.c;
      let d = (b * b) - (4 * a * c);
      if (d < 0) {
        exp = `Discriminant is negative. No real roots.`;
        resultEq = <>No Real Solutions</>;
      } else if (d === 0) {
        let root = -b / (2 * a);
        exp = `Discriminant is 0. One real root.`;
        resultEq = <>x = <Frac n={Number(-b.toFixed(2))} d={Number((2*a).toFixed(2))} /> = {Number(root.toFixed(2))}</>;
      } else {
        let r1 = (-b + Math.sqrt(d)) / (2 * a);
        let r2 = (-b - Math.sqrt(d)) / (2 * a);
        exp = `Applied Quadratic Formula.`;
        resultEq = <>x &approx; {Number(r1.toFixed(2))} <span className="text-text/40 mx-2">OR</span> x &approx; {Number(r2.toFixed(2))}</>;
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
    <div className="relative rounded-3xl bg-card border border-border p-5 overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] group">
      <Calculator className="absolute -right-4 -top-4 w-24 h-24 text-emerald-500/5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500" />
      
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
        <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-emerald-500">Smart Solver Engine</span>
      </div>

      <h3 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text mb-4">
        Algebra <span className="text-emerald-500">Solver</span>
      </h3>

      <div className="flex gap-2 mb-6 relative z-10">
        <div className="flex-1 relative group/input">
          <input 
            type="text" value={input} onChange={(e) => setInput(e.target.value)}
            className="w-full bg-background/50 border-2 border-border rounded-xl px-4 py-3 text-sm font-bold italic tracking-wider outline-none focus:border-emerald-500 transition-colors text-text"
            placeholder="e.g. x/5 + 3 = 11"
          />
        </div>
        <button onClick={initTower} className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-xl transition-all active:scale-90 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
          <RotateCcw className="w-5 h-5 active:-rotate-180 transition-transform duration-300" />
        </button>
      </div>

      <div className="space-y-3 relative z-10 mb-2">
        {steps.map((step, index) => {
          const isCurrent = index === steps.length - 1;
          const depth = steps.length - 1 - index;
          const scale = isCurrent ? 1 : Math.max(0.85, 1 - depth * 0.05);
          const opacity = isCurrent ? 1 : Math.max(0.2, 0.6 - depth * 0.15);

          return (
            <div key={index} style={{ transform: `scale(${scale})`, opacity: opacity }}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-500 origin-top
                ${isCurrent ? (isFinal ? 'bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-emerald-500/10 border-emerald-500/30') : 'bg-background border-border grayscale'}`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider mb-2 text-center ${isCurrent ? 'text-emerald-500' : 'text-text/40'}`}>
                {step.exp}
              </span>
              <div className="flex items-center text-center">
                <div className={`text-xl font-black italic tracking-tight flex items-center ${isCurrent && isFinal ? 'text-emerald-500 text-2xl' : (isCurrent ? 'text-text' : 'text-text/50')}`}>
                  {step.eq}
                </div>
                {isCurrent && isFinal && <Sparkles className="w-6 h-6 text-emerald-500 ml-2 animate-bounce" />}
              </div>
            </div>
          );
        })}
      </div>

      {nextTarget && !isFinal && steps.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-3 relative z-10 animate-pulse mt-2">
          <Target className="w-4 h-4 text-orange-500" />
          <span className="text-[10px] font-extrabold tracking-[0.15em] uppercase text-orange-500">
            Target Locked: <span className="text-white">[{nextTarget}]</span>
          </span>
        </div>
      )}

      <button disabled={steps.length === 0 || isFinal} onClick={solveNextStep} className={`w-full mt-4 group/btn relative rounded-2xl py-4 flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 active:scale-[0.98] ${isFinal ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-white' : 'bg-emerald-500 shadow-[0_4px_0_rgb(4,120,87)] hover:shadow-[0_2px_0_rgb(4,120,87)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] text-white'} disabled:opacity-20 disabled:grayscale disabled:pointer-events-none disabled:shadow-none disabled:translate-y-0`}>
        <span className="text-sm font-black italic uppercase tracking-wider relative z-10 flex items-center gap-2">
          {isFinal ? "Mission Accomplished" : "Execute Step"}
          {!isFinal && <Zap className="w-4 h-4 fill-current" />}
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
      </button>
    </div>
  );
}
