'use client';
import React, { useState, useEffect } from 'react';
import { Calculator, Sparkles, ChevronRight, RotateCcw, Target, Zap } from 'lucide-react';

export default function BodmasSolver() {
  const [input, setInput] = useState("12 + 8 ÷ 4 x 3");
  const [layers, setLayers] = useState<string[]>([]);
  const [isFinal, setIsFinal] = useState(false);
  const [nextTarget, setNextTarget] = useState<string | null>(null);

  // Core formatting functions
  const cleanExpr = (str: string) => str.replace(/x/gi, '*').replace(/÷/g, '/').replace(/\s+/g, '');
  const displayExpr = (str: string) => str.replace(/\*/g, ' x ').replace(/\//g, ' ÷ ').replace(/\+/g, ' + ').replace(/-/g, ' - ').trim();

  // Find what the next logical step is (The "Target")
  const findNextTarget = (expr: string) => {
    const cleaned = cleanExpr(expr);
    let match = cleaned.match(/\(([^()]+)\)/) || 
                cleaned.match(/(\d+\.?\d*)([*\/])(\d+\.?\d*)/) || 
                cleaned.match(/(\d+\.?\d*)([+-])(\d+\.?\d*)/);
    
    if (match) {
      setNextTarget(displayExpr(match[0]));
    } else {
      setNextTarget(null);
    }
  };

  const initTower = () => {
    const startExpr = displayExpr(cleanExpr(input));
    setLayers([startExpr]);
    setIsFinal(false);
    findNextTarget(startExpr);
  };

  const solveNextStep = () => {
    if (isFinal || layers.length === 0) return;

    let expr = cleanExpr(layers[layers.length - 1]);
    let match = expr.match(/\(([^()]+)\)/) || 
                expr.match(/(\d+\.?\d*)([*\/])(\d+\.?\d*)/) || 
                expr.match(/(\d+\.?\d*)([+-])(\d+\.?\d*)/);

    if (match) {
      const solved = Number(eval(match[0]).toFixed(2));
      const newExpr = expr.replace(match[0], solved.toString());
      const displayNew = displayExpr(newExpr);
      
      setLayers([...layers, displayNew]);
      
      if (!isNaN(Number(newExpr))) {
        setIsFinal(true);
        setNextTarget(null);
      } else {
        findNextTarget(displayNew);
      }
    }
  };

  // Run once on mount to show empty state nicely
  useEffect(() => {
    if (layers.length > 0 && !isFinal) {
      findNextTarget(layers[layers.length - 1]);
    }
  }, []);

  return (
    <div className="relative rounded-3xl bg-card border border-border p-5 overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] group">
      <Calculator className="absolute -right-4 -top-4 w-24 h-24 text-blue-500/5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500" />
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
        <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-blue-500">
          Interactive Tool
        </span>
      </div>

      <h3 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text mb-4">
        BODMAS <span className="text-blue-500">Shrinker</span>
      </h3>

      {/* Input Section */}
      <div className="flex gap-2 mb-6 relative z-10">
        <div className="flex-1 relative group/input">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full bg-background/50 border-2 border-border rounded-xl px-4 py-3 text-sm font-bold italic uppercase tracking-wider outline-none focus:border-blue-500 transition-colors text-text"
            placeholder="E.g. 10 + 5 x 2"
          />
        </div>
        <button 
          onClick={initTower}
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl transition-all active:scale-90 shadow-lg shadow-blue-500/20 flex items-center justify-center"
        >
          <RotateCcw className="w-5 h-5 active:-rotate-180 transition-transform duration-300" />
        </button>
      </div>

      {/* Solving Layers */}
      <div className="space-y-2 relative z-10 mb-2">
        {layers.length === 0 && (
          <div className="py-8 text-center border-2 border-dashed border-border rounded-2xl bg-background/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text/30">Enter a math problem to start</p>
          </div>
        )}
        
        {layers.map((layer, index) => {
          const isCurrent = index === layers.length - 1;
          // Calculate scale and opacity based on how far back in history the layer is
          const depth = layers.length - 1 - index;
          const scale = isCurrent ? 1 : Math.max(0.85, 1 - depth * 0.05);
          const opacity = isCurrent ? 1 : Math.max(0.2, 0.6 - depth * 0.15);

          return (
            <div 
              key={index}
              style={{ transform: `scale(${scale})`, opacity: opacity }}
              className={`flex items-center justify-center p-4 rounded-xl border transition-all duration-500 origin-top
                ${isCurrent 
                  ? (isFinal ? 'bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-blue-500/15 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.1)]') 
                  : 'bg-background border-border grayscale'
                }`}
            >
              <span className={`text-lg font-black italic uppercase tracking-tight ${isCurrent && isFinal ? 'text-emerald-500' : (isCurrent ? 'text-blue-400' : 'text-text/50')}`}>
                {layer}
              </span>
              {isCurrent && isFinal && <Sparkles className="w-5 h-5 text-emerald-500 ml-2 animate-bounce" />}
            </div>
          );
        })}
      </div>

      {/* Target Scanner UI */}
      {nextTarget && !isFinal && layers.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-3 relative z-10 animate-pulse">
          <Target className="w-4 h-4 text-orange-500" />
          <span className="text-[10px] font-extrabold tracking-[0.15em] uppercase text-orange-500">
            Target Locked: <span className="text-white">[{nextTarget}]</span>
          </span>
        </div>
      )}

      {/* Action Button */}
      <button 
        disabled={layers.length === 0 || isFinal}
        onClick={solveNextStep}
        className={`w-full group/btn relative rounded-2xl py-4 flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 active:scale-[0.98] mt-2
          ${isFinal 
            ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-white' 
            : 'bg-blue-500 shadow-[0_4px_0_rgb(29,78,216)] hover:shadow-[0_2px_0_rgb(29,78,216)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] text-white'
          }
          disabled:opacity-20 disabled:grayscale disabled:pointer-events-none disabled:shadow-none disabled:translate-y-0`}
      >
        <span className="text-sm font-black italic uppercase tracking-wider relative z-10 flex items-center gap-2">
          {isFinal ? "Mission Accomplished" : "Execute Step"}
          {!isFinal && <Zap className="w-4 h-4 fill-current" />}
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
      </button>
    </div>
  );
}
