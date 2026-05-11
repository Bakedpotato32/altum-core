'use client';
import React, { useState } from 'react';
import { Triangle, Crosshair, Zap, RotateCcw, Target, Sparkles } from 'lucide-react';

export default function TrigSniper() {
  const [p, setP] = useState('');
  const [b, setB] = useState('');
  const [h, setH] = useState('');
  const [theta, setTheta] = useState('');
  
  const [steps, setSteps] = useState<{ title: string, math: string }[]>([]);
  const [ratios, setRatios] = useState<{ sin: string, cos: string, tan: string, csc: string, sec: string, cot: string } | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const reset = () => {
    setP(''); setB(''); setH(''); setTheta('');
    setSteps([]);
    setRatios(null);
    setIsFinal(false);
    setErrorMsg('');
  };

  const snipeTarget = () => {
    setErrorMsg('');
    setSteps([]);
    setRatios(null);
    setIsFinal(false);

    let valP = parseFloat(p);
    let valB = parseFloat(b);
    let valH = parseFloat(h);
    let valT = parseFloat(theta);

    const isP = !isNaN(valP) && valP > 0;
    const isB = !isNaN(valB) && valB > 0;
    const isH = !isNaN(valH) && valH > 0;
    const isT = !isNaN(valT) && valT > 0 && valT < 90;

    const sideCount = [isP, isB, isH].filter(Boolean).length;

    if (sideCount === 0 || (sideCount === 1 && !isT) || sideCount === 3) {
      setErrorMsg("Target Error: Input 2 sides, OR 1 side + 1 angle (θ).");
      return;
    }
    if (!isNaN(valT) && (valT <= 0 || valT >= 90)) {
        setErrorMsg("Geometry Error: Angle θ must be between 1° and 89°.");
        return;
    }
    if ((isH && isP && valH <= valP) || (isH && isB && valH <= valB)) {
      setErrorMsg("Physics Error: Hypotenuse must be the longest side!");
      return;
    }

    let newSteps: { title: string, math: string }[] = [];
    let finalP = valP, finalB = valB, finalH = valH, finalT = valT;

    // ==========================================
    // MODE 1: 1 SIDE + 1 ANGLE (TRIGONOMETRY)
    // ==========================================
    if (sideCount === 1 && isT) {
        let rad = valT * (Math.PI / 180); // Convert degrees to radians for JS Math
        newSteps.push({ title: "SOH CAH TOA Engine Activated", math: `θ = ${valT}°` });

        if (isH) {
            finalP = valH * Math.sin(rad);
            finalB = valH * Math.cos(rad);
            newSteps.push({ title: "SOH: Find Perpendicular", math: `sin(${valT}°) = P / ${valH}` });
            newSteps.push({ title: "Solve for P", math: `P = ${valH} × ${Math.sin(rad).toFixed(4)} = ${finalP.toFixed(2)}` });
            
            newSteps.push({ title: "CAH: Find Base", math: `cos(${valT}°) = B / ${valH}` });
            newSteps.push({ title: "Solve for B", math: `B = ${valH} × ${Math.cos(rad).toFixed(4)} = ${finalB.toFixed(2)}` });
        } 
        else if (isP) {
            finalH = valP / Math.sin(rad);
            finalB = valP / Math.tan(rad);
            newSteps.push({ title: "SOH: Find Hypotenuse", math: `sin(${valT}°) = ${valP} / H` });
            newSteps.push({ title: "Solve for H", math: `H = ${valP} ÷ ${Math.sin(rad).toFixed(4)} = ${finalH.toFixed(2)}` });
            
            newSteps.push({ title: "TOA: Find Base", math: `tan(${valT}°) = ${valP} / B` });
            newSteps.push({ title: "Solve for B", math: `B = ${valP} ÷ ${Math.tan(rad).toFixed(4)} = ${finalB.toFixed(2)}` });
        }
        else if (isB) {
            finalH = valB / Math.cos(rad);
            finalP = valB * Math.tan(rad);
            newSteps.push({ title: "CAH: Find Hypotenuse", math: `cos(${valT}°) = ${valB} / H` });
            newSteps.push({ title: "Solve for H", math: `H = ${valB} ÷ ${Math.cos(rad).toFixed(4)} = ${finalH.toFixed(2)}` });
            
            newSteps.push({ title: "TOA: Find Perpendicular", math: `tan(${valT}°) = P / ${valB}` });
            newSteps.push({ title: "Solve for P", math: `P = ${valB} × ${Math.tan(rad).toFixed(4)} = ${finalP.toFixed(2)}` });
        }
    } 
    // ==========================================
    // MODE 2: 2 SIDES (PYTHAGORAS)
    // ==========================================
    else if (sideCount === 2) {
        newSteps.push({ title: "Pythagoras Engine Activated", math: `H² = P² + B²` });

        if (!isH) {
            newSteps.push({ title: "Substitute Knowns", math: `H² = (${valP})² + (${valB})²` });
            finalH = Math.sqrt(valP * valP + valB * valB);
            newSteps.push({ title: "Target Locked (Hypotenuse)", math: `H = ${Number(finalH.toFixed(2))}` });
        } else if (!isP) {
            newSteps.push({ title: "Rearrange for Perpendicular", math: `P² = (${valH})² - (${valB})²` });
            finalP = Math.sqrt(valH * valH - valB * valB);
            newSteps.push({ title: "Target Locked (Perpendicular)", math: `P = ${Number(finalP.toFixed(2))}` });
        } else if (!isB) {
            newSteps.push({ title: "Rearrange for Base", math: `B² = (${valH})² - (${valP})²` });
            finalB = Math.sqrt(valH * valH - valP * valP);
            newSteps.push({ title: "Target Locked (Base)", math: `B = ${Number(finalB.toFixed(2))}` });
        }

        // Calculate missing angle!
        finalT = Math.asin(finalP / finalH) * (180 / Math.PI);
        newSteps.push({ title: "Inverse Trig: Find Angle θ", math: `θ = sin⁻¹(${Number(finalP.toFixed(2))} / ${Number(finalH.toFixed(2))})` });
        newSteps.push({ title: "Target Locked (Angle)", math: `θ ≈ ${Number(finalT.toFixed(2))}°` });
    }

    // Auto-fill the missing input boxes for UX
    setP(Number(finalP.toFixed(2)).toString());
    setB(Number(finalB.toFixed(2)).toString());
    setH(Number(finalH.toFixed(2)).toString());
    setTheta(Number(finalT.toFixed(2)).toString());

    // Generate Ratios
    const safeFormat = (num: number, den: number) => {
        let val = num / den;
        return `${Number(val.toFixed(4))}`;
    };

    const generatedRatios = {
        sin: safeFormat(finalP, finalH),
        cos: safeFormat(finalB, finalH),
        tan: safeFormat(finalP, finalB),
        csc: safeFormat(finalH, finalP),
        sec: safeFormat(finalH, finalB),
        cot: safeFormat(finalB, finalP),
    };

    // Staggered Animation
    setSteps([]);
    newSteps.forEach((step, index) => {
      setTimeout(() => {
        setSteps(prev => [...prev, step]);
        if (index === newSteps.length - 1) {
            setRatios(generatedRatios);
            setIsFinal(true);
        }
      }, (index + 1) * 600);
    });
  };

  return (
    <div className="relative rounded-3xl bg-card border border-border p-5 overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] group">
      <Target className="absolute -right-4 -top-4 w-24 h-24 text-emerald-500/5 group-hover:scale-110 group-hover:rotate-45 transition-all duration-700" />
      
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
        <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-emerald-500">Ratio Engine</span>
      </div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <h3 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text">
          Trig-Target <span className="text-emerald-500">Sniper</span>
        </h3>
        <button onClick={reset} className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors active:scale-95">
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* SVG Triangle Visualizer */}
      <div className="mb-6 relative z-10 bg-background/50 rounded-2xl border border-border p-6 flex justify-center items-center h-48">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100">
            <polygon points="10,90 90,90 90,10" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="3" strokeLinejoin="round" />
            <polyline points="80,90 80,80 90,80" fill="none" stroke="#10b981" strokeWidth="2" />
            <path d="M 30 90 A 20 20 0 0 0 25 75" fill="none" stroke="#10b981" strokeWidth="2" />
            <text x="35" y="85" fill="#10b981" fontSize="12" fontWeight="bold" fontStyle="italic">{theta ? `${theta}°` : 'θ'}</text>
          </svg>
          
          <div className="absolute top-1/2 -right-12 -translate-y-1/2 text-xs font-black italic text-emerald-500 bg-card px-2 py-1 rounded border border-border">P</div>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-black italic text-emerald-500 bg-card px-2 py-1 rounded border border-border">B</div>
          <div className="absolute top-1/3 -left-6 -translate-x-1/2 text-xs font-black italic text-emerald-500 bg-card px-2 py-1 rounded border border-border">H</div>
        </div>
      </div>

      {/* Input Grid (Now 2x2) */}
      <div className="grid grid-cols-2 gap-3 mb-2 relative z-10">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-text/50 pl-1">Perpendicular (P)</label>
          <input type="number" placeholder="?" value={p} onChange={(e) => setP(e.target.value)} className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 font-black italic outline-none focus:border-emerald-500 text-text transition-colors" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-text/50 pl-1">Base (B)</label>
          <input type="number" placeholder="?" value={b} onChange={(e) => setB(e.target.value)} className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 font-black italic outline-none focus:border-emerald-500 text-text transition-colors" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-text/50 pl-1">Hypotenuse (H)</label>
          <input type="number" placeholder="?" value={h} onChange={(e) => setH(e.target.value)} className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 font-black italic outline-none focus:border-emerald-500 text-text transition-colors" />
        </div>
        <div className="flex flex-col gap-1 relative">
          <label className="text-[10px] font-bold uppercase text-emerald-500 pl-1">Angle (θ°)</label>
          <input type="number" placeholder="e.g. 45" value={theta} onChange={(e) => setTheta(e.target.value)} className="w-full bg-emerald-500/10 border-2 border-emerald-500/50 rounded-xl px-4 py-3 font-black italic outline-none focus:border-emerald-500 text-emerald-500 transition-colors" />
        </div>
      </div>

      {errorMsg && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center mt-3 animate-bounce relative z-10">{errorMsg}</p>}

      <button onClick={snipeTarget} className="w-full mt-6 mb-6 group/btn relative rounded-2xl bg-emerald-500 py-4 flex items-center justify-center gap-2 overflow-hidden transition-all active:scale-[0.98] shadow-[0_4px_0_rgb(4,120,87)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]">
        <span className="text-sm font-black italic uppercase tracking-wider text-white relative z-10 flex items-center gap-2">
           <Crosshair className="w-5 h-5" /> Snipe Missing Values
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
      </button>

      {/* Dynamic Steps */}
      <div className="space-y-3 relative z-10">
        {steps.map((step, index) => {
          const isCurrent = index === steps.length - 1;
          return (
            <div key={index} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-500 animate-in fade-in slide-in-from-top-4
                ${isCurrent && !isFinal ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-background border-border grayscale-[0.5]'}`}
            >
              <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 text-center ${isCurrent && !isFinal ? 'text-emerald-500' : 'text-text/40'}`}>
                {step.title}
              </span>
              <span className={`text-lg font-black italic tracking-tight ${isCurrent && !isFinal ? 'text-emerald-500' : 'text-text'}`}>
                {step.math}
              </span>
            </div>
          );
        })}
      </div>

      {/* Ratio Dashboard */}
      {ratios && (
        <div className="mt-6 p-4 rounded-2xl bg-card border-2 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-in zoom-in duration-500 relative z-10">
            <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                <h4 className="text-sm font-black italic uppercase tracking-widest text-text">All 6 Trig Ratios</h4>
                <Sparkles className="w-5 h-5 text-emerald-500" />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-background border border-border p-2 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-text/40 uppercase mb-1">Sin θ</p>
                    <p className="text-sm font-black italic text-emerald-500">{ratios.sin}</p>
                </div>
                <div className="bg-background border border-border p-2 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-text/40 uppercase mb-1">Cos θ</p>
                    <p className="text-sm font-black italic text-emerald-500">{ratios.cos}</p>
                </div>
                <div className="bg-background border border-border p-2 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-text/40 uppercase mb-1">Tan θ</p>
                    <p className="text-sm font-black italic text-emerald-500">{ratios.tan}</p>
                </div>
                <div className="bg-background border border-border p-2 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-text/40 uppercase mb-1">Csc θ</p>
                    <p className="text-sm font-black italic text-text">{ratios.csc}</p>
                </div>
                <div className="bg-background border border-border p-2 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-text/40 uppercase mb-1">Sec θ</p>
                    <p className="text-sm font-black italic text-text">{ratios.sec}</p>
                </div>
                <div className="bg-background border border-border p-2 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-text/40 uppercase mb-1">Cot θ</p>
                    <p className="text-sm font-black italic text-text">{ratios.cot}</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
