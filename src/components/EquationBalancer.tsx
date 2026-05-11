'use client';
import React, { useState } from 'react';
import { Beaker, RotateCcw, Sparkles, AlertTriangle, ArrowRight, CheckCircle2, TestTube2 } from 'lucide-react';

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

  const reset = () => {
    setSteps([]);
    setIsFinal(false);
    setErrorMsg('');
  };

  const balanceEquation = () => {
    reset();
    let eq = input.replace(/\s+/g, '');

    // Catch lowercase typos immediately!
    if (!/[A-Z]/.test(eq) && /[a-z]/.test(eq)) {
        setErrorMsg("Chemistry Error: Elements must start with a Capital letter! (e.g., 'CO2' not 'co2', 'Co' for Cobalt).");
        return;
    }

    let sides = eq.split(/=|-&gt;|->|=>/);
    
    if (sides.length !== 2) {
      setErrorMsg("Input Error: Ensure there is an '=' or '->' between reactants and products.");
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
        setErrorMsg(`Chemistry Error: Element '${el}' is missing on one side! Did you forget a capital letter?`);
        return;
      }
    }

    if (allParsed.length > 8) {
      setErrorMsg("Complexity Limit: Engine handles up to 8 total compounds to prevent browser freezing.");
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

    const renderTable = (lCounts: Record<string, number>, rCounts: Record<string, number>) => (
      <div className="w-full bg-background border border-border rounded-xl overflow-hidden mt-2">
        <div className="flex bg-violet-500/10 border-b border-border">
          <div className="flex-1 p-2 text-center text-[10px] font-black uppercase text-violet-500">Element</div>
          <div className="flex-1 p-2 text-center text-[10px] font-black uppercase text-violet-500">Reactants (LHS)</div>
          <div className="flex-1 p-2 text-center text-[10px] font-black uppercase text-violet-500">Products (RHS)</div>
        </div>
        {elements.map(el => {
          let match = lCounts[el] === rCounts[el];
          return (
            <div key={el} className={`flex border-b last:border-b-0 border-border/50 ${match ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
              <div className="flex-1 p-2 text-center text-sm font-black italic">{el}</div>
              <div className={`flex-1 p-2 text-center text-sm font-black italic ${match ? 'text-emerald-500' : 'text-red-500'}`}>{lCounts[el] || 0}</div>
              <div className={`flex-1 p-2 text-center text-sm font-black italic ${match ? 'text-emerald-500' : 'text-red-500'}`}>{rCounts[el] || 0}</div>
            </div>
          )
        })}
      </div>
    );

    add("Scan: Initial Atom Count", renderTable(initLeft, initRight));

    if (isAlreadyBalanced) {
        add("Result", <div className="text-emerald-500 font-black italic text-center mt-2">Equation is already balanced!</div>);
    } else {
        // Balancer Engine (Iterative Deepening Search for lowest coefficients)
        add("Engine Protocol", <div className="text-center text-xs font-bold text-text/60 italic">Matrix permutations initialized. Hunting for lowest whole-number coefficients...</div>);
        
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
            setErrorMsg("Math Error: Could not balance within normal limits (Coefficients > 15). Check equation for typos.");
            return;
        }

        let lCoeffs = bestCoeffs.slice(0, leftParsed.length);
        let rCoeffs = bestCoeffs.slice(leftParsed.length);
        
        let finalLeftCounts = getCounts(leftParsed, lCoeffs);
        let finalRightCounts = getCounts(rightParsed, rCoeffs);

        add("Scan: Final Atom Count", renderTable(finalLeftCounts, finalRightCounts));

        const formatSide = (strs: string[], coeffs: number[]) => {
            return strs.map((str, i) => {
                let c = coeffs[i] === 1 ? '' : `<span class="text-violet-500 mr-1">${coeffs[i]}</span>`;
                return `${c}${toSub(str)}`;
            }).join(' <span class="text-text/30 mx-2">+</span> ');
        };

        let finalEqHTML = `${formatSide(leftStrs, lCoeffs)} <span class="text-violet-500 mx-3">➔</span> ${formatSide(rightStrs, rCoeffs)}`;

        add("Mission Accomplished", (
            <div className="w-full bg-violet-500/10 border border-violet-500/40 p-5 rounded-xl text-center shadow-[0_0_20px_rgba(139,92,246,0.2)] mt-2">
                <div dangerouslySetInnerHTML={{ __html: finalEqHTML }} className="text-2xl font-black italic tracking-wider flex items-center justify-center flex-wrap" />
            </div>
        ));
    }

    setSteps([]);
    newSteps.forEach((step, index) => {
      setTimeout(() => {
        setSteps(prev => [...prev, step]);
        if (index === newSteps.length - 1) setIsFinal(true);
      }, (index + 1) * 800); 
    });
  };

  return (
    <div className="relative rounded-3xl bg-card border border-border p-5 overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.1)] group">
      <Beaker className="absolute -right-4 -top-4 w-24 h-24 text-violet-500/5 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500" />
      
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)] animate-pulse" />
        <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-violet-500">Chemistry Engine</span>
      </div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <h3 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text">
          Equation <span className="text-violet-500">Balancer</span>
        </h3>
        <button onClick={() => { setInput(''); reset(); }} className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:bg-violet-500/10 hover:text-violet-500 transition-colors active:scale-95">
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Input Section */}
      <div className="mb-4 relative z-10">
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-[10px] font-bold uppercase text-text/50 pl-1">Chemical Equation</label>
          <div className="relative">
            <input 
                type="text" 
                placeholder="e.g. H2 + O2 = H2O" 
                value={input} 
                onChange={(e) => { setInput(e.target.value); reset(); }} 
                className="w-full bg-background/50 border-2 border-border rounded-xl px-4 py-4 text-center font-black italic outline-none focus:border-violet-500 text-text transition-colors tracking-widest text-lg" 
            />
          </div>
          <p className="text-[9px] font-bold text-text/30 text-center mt-1">⚠️ Elements MUST start with a Capital Letter (e.g. CO2, Fe, Na)</p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 relative z-10 animate-in slide-in-from-top-2">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest leading-relaxed">{errorMsg}</p>
        </div>
      )}

      <button onClick={balanceEquation} className="w-full mt-2 mb-6 group/btn relative rounded-2xl bg-violet-500 py-4 flex items-center justify-center gap-2 overflow-hidden transition-all active:scale-[0.98] shadow-[0_4px_0_rgb(109,40,217)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]">
        <span className="text-sm font-black italic uppercase tracking-wider text-white relative z-10 flex items-center gap-2">
           <TestTube2 className="w-5 h-5" /> Synthesize Formula
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
      </button>

      {/* Dynamic Steps (Tables and Output) */}
      <div className="space-y-4 relative z-10 mb-2">
        {steps.map((step, index) => {
          const isCurrent = index === steps.length - 1;
          return (
            <div key={index} className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-500 animate-in fade-in slide-in-from-top-4
                ${isCurrent && isFinal ? 'bg-violet-500/10 border-violet-500/40' : 'bg-card border-border'}`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider mb-2 text-center flex items-center gap-2 ${isCurrent && isFinal ? 'text-violet-500' : 'text-text/40'}`}>
                {isCurrent && isFinal && <CheckCircle2 className="w-4 h-4" />} {step.title}
              </span>
              <div className="w-full flex justify-center">
                  {step.content}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
