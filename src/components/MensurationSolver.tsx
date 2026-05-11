'use client';
import React, { useState } from 'react';
import { Box, Cylinder, Cone, Globe, Square, RectangleHorizontal, Circle, Triangle, Sparkles, Zap, RotateCcw } from 'lucide-react';

type Shape3D = 'cube' | 'cylinder' | 'cone' | 'sphere';
type Shape2D = 'square' | 'rectangle' | 'circle' | 'triangle';
type Shape = Shape3D | Shape2D;
type CalcType = 'vol' | 'csa' | 'tsa' | 'area' | 'perimeter';
type UnitType = 'mm' | 'cm' | 'm' | 'km' | 'in' | 'ft';

export default function MensurationSolver() {
  const [shape, setShape] = useState<Shape>('cylinder');
  const [calcType, setCalcType] = useState<CalcType>('vol');
  const [selectedUnit, setSelectedUnit] = useState<UnitType>('cm');
  const [inputs, setInputs] = useState({ r: '', h: '', l: '', w: '', a: '', b: '', c: '' });
  const [steps, setSteps] = useState<{ title: string, math: string }[]>([]);
  const [isFinal, setIsFinal] = useState(false);

  const is3D = ['cube', 'cylinder', 'cone', 'sphere'].includes(shape);

  const reset = () => {
    setSteps([]);
    setIsFinal(false);
  };

  const handleShapeChange = (s: Shape) => {
    setShape(s);
    setInputs({ r: '', h: '', l: '', w: '', a: '', b: '', c: '' });
    
    // Auto-switch calc types when crossing dimensions
    if (['cube', 'cylinder', 'cone', 'sphere'].includes(s)) {
      setCalcType('vol');
    } else {
      setCalcType('area');
    }
    reset();
  };

  const generateSteps = () => {
    reset();
    let r = parseFloat(inputs.r) || 0;
    let h = parseFloat(inputs.h) || 0;
    let l = parseFloat(inputs.l) || 0;
    let w = parseFloat(inputs.w) || 0;
    let a = parseFloat(inputs.a) || 0;
    let b = parseFloat(inputs.b) || 0;
    let c = parseFloat(inputs.c) || 0;
    const pi = 3.14;

    let newSteps: { title: string, math: string }[] = [];
    let ans = 0;
    
    let unitStr = selectedUnit;
    if (calcType === 'vol') unitStr = `${selectedUnit}³`;
    else if (calcType === 'area' || calcType === 'csa' || calcType === 'tsa') unitStr = `${selectedUnit}²`;

    // --- 3D SHAPES ---
    if (shape === 'cube') {
      if (a <= 0) return alert("Enter a valid side length (a).");
      if (calcType === 'vol') {
        newSteps.push({ title: "Volume of a Cube", math: `V = a³` });
        newSteps.push({ title: "Substitute", math: `V = (${a})³` });
        ans = a * a * a;
      } else if (calcType === 'csa') {
        newSteps.push({ title: "Lateral Surface Area", math: `LSA = 4a²` });
        newSteps.push({ title: "Substitute", math: `LSA = 4 × (${a})²` });
        ans = 4 * a * a;
      } else {
        newSteps.push({ title: "Total Surface Area", math: `TSA = 6a²` });
        newSteps.push({ title: "Substitute", math: `TSA = 6 × (${a})²` });
        ans = 6 * a * a;
      }
    } 
    else if (shape === 'cylinder') {
      if (r <= 0 || h <= 0) return alert("Enter valid radius and height.");
      if (calcType === 'vol') {
        newSteps.push({ title: "Volume of a Cylinder", math: `V = πr²h` });
        newSteps.push({ title: "Substitute (π ≈ 3.14)", math: `V = 3.14 × (${r})² × (${h})` });
        ans = Math.PI * r * r * h;
      } else if (calcType === 'csa') {
        newSteps.push({ title: "Curved Surface Area", math: `CSA = 2πrh` });
        newSteps.push({ title: "Substitute", math: `CSA = 2 × 3.14 × ${r} × ${h}` });
        ans = 2 * Math.PI * r * h;
      } else {
        newSteps.push({ title: "Total Surface Area", math: `TSA = 2πr(r + h)` });
        newSteps.push({ title: "Substitute", math: `TSA = 2 × 3.14 × ${r}(${r} + ${h})` });
        ans = 2 * Math.PI * r * (r + h);
      }
    }
    else if (shape === 'sphere') {
      if (r <= 0) return alert("Enter a valid radius.");
      if (calcType === 'vol') {
        newSteps.push({ title: "Volume of a Sphere", math: `V = 4/3 πr³` });
        newSteps.push({ title: "Substitute", math: `V = (4/3) × 3.14 × (${r})³` });
        ans = (4 / 3) * Math.PI * Math.pow(r, 3);
      } else {
        newSteps.push({ title: "Surface Area", math: `SA = 4πr²` });
        newSteps.push({ title: "Substitute", math: `SA = 4 × 3.14 × (${r})²` });
        ans = 4 * Math.PI * r * r;
      }
    }
    else if (shape === 'cone') {
      if (r <= 0 || h <= 0) return alert("Enter valid radius and vertical height.");
      if (l <= 0) {
        l = Math.sqrt((r * r) + (h * h));
        newSteps.push({ title: "Find Slant Height (l) via Pythagoras", math: `l = √(${r}² + ${h}²)` });
        newSteps.push({ title: "Slant Height", math: `l ≈ ${l.toFixed(2)}` });
      }
      if (calcType === 'vol') {
        newSteps.push({ title: "Volume of a Cone", math: `V = 1/3 πr²h` });
        newSteps.push({ title: "Substitute", math: `V = (1/3) × 3.14 × (${r})² × ${h}` });
        ans = (1 / 3) * Math.PI * r * r * h;
      } else if (calcType === 'csa') {
        newSteps.push({ title: "Curved Surface Area", math: `CSA = πrl` });
        newSteps.push({ title: "Substitute", math: `CSA = 3.14 × ${r} × ${Number(l.toFixed(2))}` });
        ans = Math.PI * r * l;
      } else {
        newSteps.push({ title: "Total Surface Area", math: `TSA = πr(r + l)` });
        newSteps.push({ title: "Substitute", math: `TSA = 3.14 × ${r}(${r} + ${Number(l.toFixed(2))})` });
        ans = Math.PI * r * (r + l);
      }
    }
    // --- 2D SHAPES ---
    else if (shape === 'square') {
      if (a <= 0) return alert("Enter a valid side length.");
      if (calcType === 'area') {
        newSteps.push({ title: "Area of a Square", math: `A = a²` });
        newSteps.push({ title: "Substitute", math: `A = (${a})²` });
        ans = a * a;
      } else {
        newSteps.push({ title: "Perimeter of a Square", math: `P = 4a` });
        newSteps.push({ title: "Substitute", math: `P = 4 × ${a}` });
        ans = 4 * a;
      }
    }
    else if (shape === 'rectangle') {
      if (l <= 0 || w <= 0) return alert("Enter valid length and width.");
      if (calcType === 'area') {
        newSteps.push({ title: "Area of a Rectangle", math: `A = l × w` });
        newSteps.push({ title: "Substitute", math: `A = ${l} × ${w}` });
        ans = l * w;
      } else {
        newSteps.push({ title: "Perimeter of a Rectangle", math: `P = 2(l + w)` });
        newSteps.push({ title: "Substitute", math: `P = 2(${l} + ${w})` });
        ans = 2 * (l + w);
      }
    }
    else if (shape === 'circle') {
      if (r <= 0) return alert("Enter a valid radius.");
      if (calcType === 'area') {
        newSteps.push({ title: "Area of a Circle", math: `A = πr²` });
        newSteps.push({ title: "Substitute", math: `A = 3.14 × (${r})²` });
        ans = Math.PI * r * r;
      } else {
        newSteps.push({ title: "Circumference of a Circle", math: `C = 2πr` });
        newSteps.push({ title: "Substitute", math: `C = 2 × 3.14 × ${r}` });
        ans = 2 * Math.PI * r;
      }
    }
    else if (shape === 'triangle') {
      if (calcType === 'area') {
        if (b <= 0 || h <= 0) return alert("Enter valid base and height.");
        newSteps.push({ title: "Area of a Triangle", math: `A = 1/2 × b × h` });
        newSteps.push({ title: "Substitute", math: `A = 0.5 × ${b} × ${h}` });
        ans = 0.5 * b * h;
      } else {
        if (a <= 0 || b <= 0 || c <= 0) return alert("Enter all 3 sides (a, b, c).");
        newSteps.push({ title: "Perimeter of a Triangle", math: `P = a + b + c` });
        newSteps.push({ title: "Substitute", math: `P = ${a} + ${b} + ${c}` });
        ans = a + b + c;
      }
    }

    newSteps.push({ title: "Final Calculation", math: `Ans ≈ ${ans.toFixed(2)} ${unitStr}` });
    
    setSteps([]);
    newSteps.forEach((step, index) => {
      setTimeout(() => {
        setSteps(prev => [...prev, step]);
        if (index === newSteps.length - 1) setIsFinal(true);
      }, (index + 1) * 600);
    });
  };

  return (
    <div className="relative rounded-3xl bg-card border border-border p-5 overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] group">
      <Box className="absolute -right-4 -top-4 w-24 h-24 text-emerald-500/5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500" />
      
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
        <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-emerald-500">Geometry Engine</span>
      </div>
      <h3 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text mb-6">
        Shape <span className="text-emerald-500">Mensuration</span>
      </h3>

      {/* --- SHAPE SELECTORS --- */}
      <div className="space-y-2 mb-4 relative z-10">
        <p className="text-[9px] font-bold tracking-widest uppercase text-text/40 pl-1">3D Shapes (Vol, SA)</p>
        <div className="flex gap-2 bg-background/50 p-1.5 rounded-2xl border border-border">
          {(['cube', 'cylinder', 'cone', 'sphere'] as const).map(s => (
            <button 
              key={s} onClick={() => handleShapeChange(s)}
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all ${shape === s ? 'bg-emerald-500 text-white shadow-md' : 'text-text/50 hover:bg-emerald-500/10 hover:text-emerald-500'}`}
            >
              {s === 'cube' && <Box className="w-4 h-4 mb-1" />}
              {s === 'cylinder' && <Cylinder className="w-4 h-4 mb-1" />}
              {s === 'cone' && <Cone className="w-4 h-4 mb-1" />}
              {s === 'sphere' && <Globe className="w-4 h-4 mb-1" />}
              <span className="text-[8px] font-black uppercase tracking-wider">{s}</span>
            </button>
          ))}
        </div>

        <p className="text-[9px] font-bold tracking-widest uppercase text-text/40 pl-1 mt-2">2D Shapes (Area, Perim)</p>
        <div className="flex gap-2 bg-background/50 p-1.5 rounded-2xl border border-border">
          {(['square', 'rectangle', 'circle', 'triangle'] as const).map(s => (
            <button 
              key={s} onClick={() => handleShapeChange(s)}
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all ${shape === s ? 'bg-emerald-500 text-white shadow-md' : 'text-text/50 hover:bg-emerald-500/10 hover:text-emerald-500'}`}
            >
              {s === 'square' && <Square className="w-4 h-4 mb-1" />}
              {s === 'rectangle' && <RectangleHorizontal className="w-4 h-4 mb-1" />}
              {s === 'circle' && <Circle className="w-4 h-4 mb-1" />}
              {s === 'triangle' && <Triangle className="w-4 h-4 mb-1" />}
              <span className="text-[8px] font-black uppercase tracking-wider">{s}</span>
            </button>
          ))}
        </div>
      </div>

      {/* --- CALC TYPE SELECTOR --- */}
      <div className="flex gap-2 mb-4 relative z-10">
        {is3D ? (
          (['vol', 'csa', 'tsa'] as const).map(c => (
            <button 
              key={c} onClick={() => { setCalcType(c); reset(); }}
              disabled={shape === 'cube' && c === 'csa' ? false : false} // Kept enabled, labeled as LSA
              className={`flex-1 py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all 
                ${calcType === c ? 'bg-card border-emerald-500 text-emerald-500' : 'bg-background border-border text-text/40'}`}
            >
              {c === 'vol' ? 'Volume' : c === 'csa' ? (shape === 'cube' ? 'LSA' : 'Curved SA') : 'Total SA'}
            </button>
          ))
        ) : (
          (['area', 'perimeter'] as const).map(c => (
            <button 
              key={c} onClick={() => { setCalcType(c); reset(); }}
              className={`flex-1 py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all 
                ${calcType === c ? 'bg-card border-emerald-500 text-emerald-500' : 'bg-background border-border text-text/40'}`}
            >
              {c === 'area' ? 'Area' : (shape === 'circle' ? 'Circumference' : 'Perimeter')}
            </button>
          ))
        )}
      </div>

      {/* --- UNIT SELECTOR --- */}
      <div className="flex gap-2 mb-6 relative z-10 overflow-x-auto pb-2 scrollbar-hide">
        {(['mm', 'cm', 'm', 'km', 'in', 'ft'] as const).map(u => (
          <button 
            key={u} onClick={() => { setSelectedUnit(u); reset(); }}
            className={`shrink-0 px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all 
              ${selectedUnit === u ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-background border-border text-text/40 hover:bg-emerald-500/5 hover:text-emerald-500'}`}
          >
            {u}
          </button>
        ))}
      </div>

      {/* --- DYNAMIC INPUTS --- */}
      <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
        
        {/* Single Side (Square, Cube) */}
        {(shape === 'cube' || shape === 'square') && (
          <div className="col-span-2 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black italic text-emerald-500">Side (a)</span>
            <input type="number" placeholder="0" value={inputs.a} onChange={e => setInputs({...inputs, a: e.target.value})} className="w-full bg-background border-2 border-border rounded-xl pl-20 pr-12 py-3 text-lg font-black italic text-right outline-none focus:border-emerald-500 text-text" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">{selectedUnit}</span>
          </div>
        )}

        {/* Radius (Cylinder, Cone, Sphere, Circle) */}
        {['cylinder', 'cone', 'sphere', 'circle'].includes(shape) && (
          <div className="col-span-2 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black italic text-emerald-500">Radius (r)</span>
            <input type="number" placeholder="0" value={inputs.r} onChange={e => setInputs({...inputs, r: e.target.value})} className="w-full bg-background border-2 border-border rounded-xl pl-24 pr-12 py-3 text-lg font-black italic text-right outline-none focus:border-emerald-500 text-text" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">{selectedUnit}</span>
          </div>
        )}

        {/* Height (Cylinder, Cone, Triangle Area) */}
        {(shape === 'cylinder' || shape === 'cone' || (shape === 'triangle' && calcType === 'area')) && (
          <div className="col-span-2 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black italic text-emerald-500">Height (h)</span>
            <input type="number" placeholder="0" value={inputs.h} onChange={e => setInputs({...inputs, h: e.target.value})} className="w-full bg-background border-2 border-border rounded-xl pl-24 pr-12 py-3 text-lg font-black italic text-right outline-none focus:border-emerald-500 text-text" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">{selectedUnit}</span>
          </div>
        )}

        {/* Length & Width (Rectangle) */}
        {shape === 'rectangle' && (
          <>
            <div className="col-span-2 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black italic text-emerald-500">Length (l)</span>
              <input type="number" placeholder="0" value={inputs.l} onChange={e => setInputs({...inputs, l: e.target.value})} className="w-full bg-background border-2 border-border rounded-xl pl-24 pr-12 py-3 text-lg font-black italic text-right outline-none focus:border-emerald-500 text-text" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">{selectedUnit}</span>
            </div>
            <div className="col-span-2 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black italic text-emerald-500">Width (w)</span>
              <input type="number" placeholder="0" value={inputs.w} onChange={e => setInputs({...inputs, w: e.target.value})} className="w-full bg-background border-2 border-border rounded-xl pl-24 pr-12 py-3 text-lg font-black italic text-right outline-none focus:border-emerald-500 text-text" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">{selectedUnit}</span>
            </div>
          </>
        )}

        {/* Triangle Base & Perimeter Sides */}
        {shape === 'triangle' && (
          <>
            <div className="col-span-2 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black italic text-emerald-500">Base (b)</span>
              <input type="number" placeholder="0" value={inputs.b} onChange={e => setInputs({...inputs, b: e.target.value})} className="w-full bg-background border-2 border-border rounded-xl pl-20 pr-12 py-3 text-lg font-black italic text-right outline-none focus:border-emerald-500 text-text" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">{selectedUnit}</span>
            </div>
            {calcType === 'perimeter' && (
              <>
                <div className="col-span-2 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black italic text-emerald-500">Side 1 (a)</span>
                  <input type="number" placeholder="0" value={inputs.a} onChange={e => setInputs({...inputs, a: e.target.value})} className="w-full bg-background border-2 border-border rounded-xl pl-24 pr-12 py-3 text-lg font-black italic text-right outline-none focus:border-emerald-500 text-text" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">{selectedUnit}</span>
                </div>
                <div className="col-span-2 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black italic text-emerald-500">Side 3 (c)</span>
                  <input type="number" placeholder="0" value={inputs.c} onChange={e => setInputs({...inputs, c: e.target.value})} className="w-full bg-background border-2 border-border rounded-xl pl-24 pr-12 py-3 text-lg font-black italic text-right outline-none focus:border-emerald-500 text-text" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">{selectedUnit}</span>
                </div>
              </>
            )}
          </>
        )}

        {/* Cone Slant Height */}
        {shape === 'cone' && (
          <div className="col-span-2 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black italic text-emerald-500/50">Slant (l) opt.</span>
            <input type="number" placeholder="Auto-calc" value={inputs.l} onChange={e => setInputs({...inputs, l: e.target.value})} className="w-full bg-background border-2 border-border rounded-xl pl-32 pr-12 py-3 text-lg font-black italic text-right outline-none focus:border-emerald-500 text-text" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">{selectedUnit}</span>
          </div>
        )}
      </div>

      <button onClick={generateSteps} className="w-full mb-6 group/btn relative rounded-2xl bg-emerald-500 py-4 flex items-center justify-center gap-2 overflow-hidden transition-all active:scale-[0.98] shadow-[0_4px_0_rgb(4,120,87)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]">
        <span className="text-sm font-black italic uppercase tracking-wider text-white relative z-10 flex items-center gap-2">Unravel Formula <Zap className="w-4 h-4 fill-current" /></span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
      </button>

      {/* --- STEP-BY-STEP DISPLAY --- */}
      <div className="space-y-3 relative z-10">
        {steps.map((step, index) => {
          const isCurrent = index === steps.length - 1;
          return (
            <div key={index} className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-500 animate-in fade-in slide-in-from-top-4
                ${isCurrent && isFinal ? 'bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-background border-border'}`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider mb-2 text-center ${isCurrent && isFinal ? 'text-emerald-500' : 'text-text/40'}`}>
                {step.title}
              </span>
              <div className="flex items-center">
                <span className={`text-xl font-black italic tracking-tight ${isCurrent && isFinal ? 'text-emerald-500 text-2xl' : 'text-text'}`}>
                  {step.math}
                </span>
                {isCurrent && isFinal && <Sparkles className="w-6 h-6 text-emerald-500 ml-2 animate-bounce" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
