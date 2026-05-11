'use client';
import React, { useState } from 'react';
import { Zap, Battery, Activity, RotateCcw, Plus, Minus, Cpu, Sparkles, Info } from 'lucide-react';

type CircuitType = 'series' | 'parallel';

export default function CircuitForge() {
  const [circuitType, setCircuitType] = useState<CircuitType>('series');
  const [voltage, setVoltage] = useState('12');
  const [resistors, setResistors] = useState<string[]>(['5', '10']);
  const [steps, setSteps] = useState<{ title: string, math: string }[]>([]);
  const [isFinal, setIsFinal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const reset = () => {
    setSteps([]);
    setIsFinal(false);
    setErrorMsg('');
  };

  const addResistor = () => {
    if (resistors.length >= 4) return; // Cap at 4 for UI sanity
    setResistors([...resistors, '']);
    reset();
  };

  const removeResistor = (index: number) => {
    if (resistors.length <= 2) return; // Minimum 2 resistors
    const newR = [...resistors];
    newR.splice(index, 1);
    setResistors(newR);
    reset();
  };

  const updateResistor = (index: number, val: string) => {
    const newR = [...resistors];
    newR[index] = val;
    setResistors(newR);
    reset();
  };

  const handleTypeChange = (type: CircuitType) => {
    setCircuitType(type);
    reset();
  };

  const forgeCircuit = () => {
    reset();
    let v = parseFloat(voltage);
    let rVals = resistors.map(r => parseFloat(r));

    if (isNaN(v) || v <= 0) {
      setErrorMsg("Input Error: Battery voltage must be greater than 0.");
      return;
    }
    if (rVals.some(r => isNaN(r) || r <= 0)) {
      setErrorMsg("Input Error: All resistors must have a value greater than 0 Ω.");
      return;
    }

    let newSteps: { title: string, math: string }[] = [];
    let req = 0;

    if (circuitType === 'series') {
      newSteps.push({ title: "Equivalent Resistance (Series)", math: `Rₑq = R₁ + R₂ ${rVals.length > 2 ? '+ ...' : ''}` });
      newSteps.push({ title: "Substitute Values", math: `Rₑq = ${rVals.join(' + ')}` });
      req = rVals.reduce((a, b) => a + b, 0);
      newSteps.push({ title: "Total Resistance Locked", math: `Rₑq = ${Number(req.toFixed(2))} Ω` });
    } else {
      newSteps.push({ title: "Equivalent Resistance (Parallel)", math: `1/Rₑq = 1/R₁ + 1/R₂ ${rVals.length > 2 ? '+ ...' : ''}` });
      newSteps.push({ title: "Substitute Values", math: `1/Rₑq = ${rVals.map(r => `1/${r}`).join(' + ')}` });
      
      let invSum = rVals.reduce((a, b) => a + (1 / b), 0);
      newSteps.push({ title: "Sum of Inverses", math: `1/Rₑq ≈ ${Number(invSum.toFixed(4))}` });
      
      req = 1 / invSum;
      newSteps.push({ title: "Total Resistance Locked (Reciprocal)", math: `Rₑq = ${Number(req.toFixed(2))} Ω` });
    }

    newSteps.push({ title: "Ohm's Law", math: `V = I × Rₑq` });
    newSteps.push({ title: "Rearrange for Current (I)", math: `I = V ÷ Rₑq` });
    newSteps.push({ title: "Substitute Values", math: `I = ${v} ÷ ${Number(req.toFixed(2))}` });
    
    let current = v / req;
    newSteps.push({ title: "Circuit Forged (Total Current)", math: `I ≈ ${Number(current.toFixed(2))} A` });

    setSteps([]);
    newSteps.forEach((step, index) => {
      setTimeout(() => {
        setSteps(prev => [...prev, step]);
        if (index === newSteps.length - 1) setIsFinal(true);
      }, (index + 1) * 600);
    });
  };

  return (
    <div className="relative rounded-3xl bg-card border border-border p-5 overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(249,115,22,0.1)] group">
      <Zap className="absolute -right-4 -top-4 w-24 h-24 text-orange-500/5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" />
      
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-pulse" />
        <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-orange-500">Physics Engine</span>
      </div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <h3 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text">
          The Circuit <span className="text-orange-500">Forge</span>
        </h3>
        <button onClick={() => { setVoltage(''); setResistors(['', '']); reset(); }} className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:bg-orange-500/10 hover:text-orange-500 transition-colors active:scale-95">
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Circuit Type Selector */}
      <div className="flex gap-2 mb-6 relative z-10 bg-background/50 p-1.5 rounded-2xl border border-border">
        <button onClick={() => handleTypeChange('series')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${circuitType === 'series' ? 'bg-orange-500 text-white shadow-md' : 'text-text/50 hover:bg-orange-500/10 hover:text-orange-500'}`}>
          <Activity className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-wider">Series</span>
        </button>
        <button onClick={() => handleTypeChange('parallel')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${circuitType === 'parallel' ? 'bg-orange-500 text-white shadow-md' : 'text-text/50 hover:bg-orange-500/10 hover:text-orange-500'}`}>
          <Cpu className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-wider">Parallel</span>
        </button>
      </div>

      {/* Abstract Circuit Visualizer */}
      <div className="mb-6 relative z-10 bg-background/50 rounded-2xl border border-border p-6 flex justify-center items-center h-24 overflow-hidden">
        <div className="flex items-center w-full justify-between px-4">
            <Battery className={`w-10 h-10 ${isFinal ? 'text-orange-500' : 'text-text/20'} transition-colors duration-500 -rotate-90`} />
            <div className={`flex-1 h-1 mx-4 ${isFinal ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]' : 'bg-border'} transition-all duration-1000 relative flex ${circuitType === 'parallel' ? 'flex-col justify-between h-16 bg-transparent shadow-none' : 'items-center justify-center'}`}>
                {circuitType === 'parallel' && (
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isFinal ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]' : 'bg-border'} transition-all duration-1000`} />
                )}
                {resistors.map((_, i) => (
                    <div key={i} className={`${circuitType === 'parallel' ? 'w-full h-1' : 'w-8 h-8'} ${isFinal ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]' : 'bg-border'} transition-all duration-1000 z-10 flex items-center justify-center`}>
                       {circuitType === 'series' && <Activity className="w-5 h-5 text-card" />}
                    </div>
                ))}
                {circuitType === 'parallel' && (
                    <div className={`absolute right-0 top-0 bottom-0 w-1 ${isFinal ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]' : 'bg-border'} transition-all duration-1000`} />
                )}
            </div>
            <Zap className={`w-8 h-8 ${isFinal ? 'text-orange-500 animate-pulse' : 'text-text/20'} transition-colors duration-500`} />
        </div>
      </div>

      {/* Input Grid */}
      <div className="mb-4 relative z-10">
        <div className="mb-4 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black italic text-orange-500">Voltage (V)</span>
          <input type="number" placeholder="12" value={voltage} onChange={(e) => setVoltage(e.target.value)} className="w-full bg-background border-2 border-border rounded-xl pl-28 pr-12 py-3 text-lg font-black italic text-right outline-none focus:border-orange-500 text-text transition-colors" />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">V</span>
        </div>

        <div className="space-y-2">
            {resistors.map((res, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black italic text-orange-500/70">R{i + 1}</span>
                        <input type="number" placeholder="0" value={res} onChange={(e) => updateResistor(i, e.target.value)} className="w-full bg-background border-2 border-border rounded-xl pl-16 pr-12 py-3 text-lg font-black italic text-right outline-none focus:border-orange-500 text-text transition-colors" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">Ω</span>
                    </div>
                    {resistors.length > 2 && (
                        <button onClick={() => removeResistor(i)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 active:scale-95 transition-all">
                            <Minus className="w-5 h-5" />
                        </button>
                    )}
                </div>
            ))}
        </div>

        {resistors.length < 4 && (
            <button onClick={addResistor} className="w-full mt-2 py-3 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-text/40 hover:text-orange-500 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all font-bold text-xs uppercase tracking-widest">
                <Plus className="w-4 h-4" /> Add Resistor
            </button>
        )}
      </div>

      {errorMsg && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center mt-3 animate-bounce relative z-10">{errorMsg}</p>}

      <button onClick={forgeCircuit} className="w-full mt-6 mb-6 group/btn relative rounded-2xl bg-orange-500 py-4 flex items-center justify-center gap-2 overflow-hidden transition-all active:scale-[0.98] shadow-[0_4px_0_rgb(194,65,12)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]">
        <span className="text-sm font-black italic uppercase tracking-wider text-white relative z-10 flex items-center gap-2">
           <Zap className="w-5 h-5" /> Forge Circuit
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
      </button>

      {/* Physics Steps */}
      <div className="space-y-3 relative z-10 mb-6">
        {steps.map((step, index) => {
          const isCurrent = index === steps.length - 1;
          return (
            <div key={index} className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-500 animate-in fade-in slide-in-from-top-4
                ${isCurrent && isFinal ? 'bg-orange-500/10 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.15)]' : 'bg-background border-border'}`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider mb-2 text-center ${isCurrent && isFinal ? 'text-orange-500' : 'text-text/40'}`}>
                {step.title}
              </span>
              <div className="flex items-center">
                <span className={`text-xl font-black italic tracking-tight ${isCurrent && isFinal ? 'text-orange-500 text-2xl' : 'text-text'}`}>
                  {step.math}
                </span>
                {isCurrent && isFinal && <Sparkles className="w-6 h-6 text-orange-500 ml-2 animate-bounce" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Physics Glossary / Legend */}
      <div className="mt-2 p-5 rounded-2xl bg-orange-500/5 border border-orange-500/20 relative z-10">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-3 flex items-center gap-2">
          <Info className="w-4 h-4" /> Physics Glossary
        </h4>
        <div className="grid grid-cols-2 gap-3 text-xs font-bold text-text/60">
          <div><span className="text-orange-500 italic text-sm">V</span> = Voltage (Volts)</div>
          <div><span className="text-orange-500 italic text-sm">I</span> = Current (Amperes)</div>
          <div><span className="text-orange-500 italic text-sm">R</span> = Resistance (Ohms)</div>
          <div><span className="text-orange-500 italic text-sm">Rₑq</span> = Equivalent Resistance</div>
          <div><span className="text-orange-500 italic text-sm">Ω</span> = Ohm (Unit of R)</div>
          <div><span className="text-orange-500 italic text-sm">A</span> = Ampere (Unit of I)</div>
        </div>
      </div>
    </div>
  );
}
