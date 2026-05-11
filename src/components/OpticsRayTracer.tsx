'use client';
import React, { useState } from 'react';
import { Lightbulb, RotateCcw, Sparkles, Info, Target, Eye } from 'lucide-react';

// Custom Vertical Fraction Component
const Frac = ({ n, d }: { n: React.ReactNode, d: React.ReactNode }) => (
  <span className="inline-flex flex-col items-center justify-center align-middle mx-1 font-black italic relative -top-[0.1em]">
    <span className="border-b-[2.5px] border-current px-1 pb-[2px] leading-none">{n}</span>
    <span className="pt-[2px] px-1 leading-none">{d}</span>
  </span>
);

export default function OpticsRayTracer() {
  const [deviceType, setDeviceType] = useState<'mirror' | 'lens'>('mirror');
  const [deviceShape, setDeviceShape] = useState<'concave' | 'convex'>('concave');
  
  const [inputs, setInputs] = useState({ u: '', f: '', h: '5' }); // Default height to 5 for simplicity
  const [steps, setSteps] = useState<{ title: string, math: React.ReactNode }[]>([]);
  const [nature, setNature] = useState<{ real: boolean, erect: boolean, magSize: string } | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const reset = () => {
    setSteps([]);
    setNature(null);
    setIsFinal(false);
    setErrorMsg('');
  };

  const updateInput = (key: string, val: string) => {
    setInputs(prev => ({ ...prev, [key]: val }));
    reset();
  };

  const traceRays = () => {
    reset();
    let u_mag = parseFloat(inputs.u);
    let f_mag = parseFloat(inputs.f);
    let h_obj = parseFloat(inputs.h);

    if (isNaN(u_mag) || u_mag <= 0 || isNaN(f_mag) || f_mag <= 0) {
      setErrorMsg("Input Error: Object distance (u) and Focal length (f) must be > 0.");
      return;
    }

    let newSteps: { title: string, math: React.ReactNode }[] = [];
    const add = (title: string, math: React.ReactNode) => newSteps.push({ title, math });

    // Step 1: Sign Convention
    let U = -Math.abs(u_mag); // Object is always on the left
    let F = deviceShape === 'concave' ? -Math.abs(f_mag) : Math.abs(f_mag);
    
    add("Apply Cartesian Sign Convention", (
        <div className="flex flex-col gap-1 text-sm">
            <span>Object is always left: <strong className="text-orange-500">u = {U} cm</strong></span>
            <span>{deviceShape.charAt(0).toUpperCase() + deviceShape.slice(1)} {deviceType}: <strong className="text-orange-500">f = {F} cm</strong></span>
        </div>
    ));

    let V = 0;
    let M = 0;

    // Step 2 & 3: Mirror or Lens Formula
    try {
        if (deviceType === 'mirror') {
            add("Mirror Formula", <> <Frac n="1" d="v" /> + <Frac n="1" d="u" /> = <Frac n="1" d="f" /> </>);
            add("Rearrange for Image (v)", <> <Frac n="1" d="v" /> = <Frac n="1" d="f" /> - <Frac n="1" d="u" /> </>);
            add("Substitute Values", <> <Frac n="1" d="v" /> = <Frac n="1" d={F} /> - <Frac n="1" d={U} /> </>);
            
            let inv_f = 1 / F;
            let inv_u = 1 / U;
            let inv_v = inv_f - inv_u;
            
            add("Calculate Decimal Inverse", <> <Frac n="1" d="v" /> = {inv_f.toFixed(4)} - ({inv_u.toFixed(4)}) </>);
            add("Sum Inverses", <> <Frac n="1" d="v" /> = {inv_v.toFixed(4)} </>);
            
            if (inv_v === 0) throw new Error("Image forms at infinity.");
            V = 1 / inv_v;
            add("Image Distance Locked", <>v = {V.toFixed(2)} cm</>);

            // Magnification for Mirror: m = -v/u
            add("Magnification Formula", <>m = <Frac n="-v" d="u" /></>);
            add("Substitute Values", <>m = <Frac n={`-(${V.toFixed(2)})`} d={U} /></>);
            M = -V / U;
            add("Magnification Locked", <>m = {M.toFixed(2)}</>);

        } else {
            // Lens Formula
            add("Lens Formula", <> <Frac n="1" d="v" /> - <Frac n="1" d="u" /> = <Frac n="1" d="f" /> </>);
            add("Rearrange for Image (v)", <> <Frac n="1" d="v" /> = <Frac n="1" d="f" /> + <Frac n="1" d="u" /> </>);
            add("Substitute Values", <> <Frac n="1" d="v" /> = <Frac n="1" d={F} /> + <Frac n="1" d={U} /> </>);
            
            let inv_f = 1 / F;
            let inv_u = 1 / U;
            let inv_v = inv_f + inv_u;
            
            add("Calculate Decimal Inverse", <> <Frac n="1" d="v" /> = {inv_f.toFixed(4)} + ({inv_u.toFixed(4)}) </>);
            add("Sum Inverses", <> <Frac n="1" d="v" /> = {inv_v.toFixed(4)} </>);
            
            if (inv_v === 0) throw new Error("Image forms at infinity.");
            V = 1 / inv_v;
            add("Image Distance Locked", <>v = {V.toFixed(2)} cm</>);

            // Magnification for Lens: m = v/u
            add("Magnification Formula", <>m = <Frac n="v" d="u" /></>);
            add("Substitute Values", <>m = <Frac n={V.toFixed(2)} d={U} /></>);
            M = V / U;
            add("Magnification Locked", <>m = {M.toFixed(2)}</>);
        }

        // Determine Nature
        let isReal = false;
        if (deviceType === 'mirror') {
            isReal = V < 0; // Front of mirror
        } else {
            isReal = V > 0; // Other side of lens
        }
        
        let isErect = M > 0;
        let magSize = Math.abs(M) > 1 ? 'Magnified' : (Math.abs(M) < 1 ? 'Diminished' : 'Same Size');

        let H_prime = isNaN(h_obj) ? 0 : M * h_obj;
        if (!isNaN(h_obj) && h_obj > 0) {
             add("Image Height (h')", <>h' = m &times; h = {M.toFixed(2)} &times; {h_obj} = {H_prime.toFixed(2)} cm</>);
        }

        setNature({ real: isReal, erect: isErect, magSize });

    } catch (e: any) {
        setErrorMsg(e.message);
        return;
    }

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
      <Lightbulb className="absolute -right-4 -top-4 w-24 h-24 text-orange-500/5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" />
      
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-pulse" />
        <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-orange-500">Optics Engine</span>
      </div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <h3 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text">
          Ray <span className="text-orange-500">Tracer</span>
        </h3>
        <button onClick={() => { setInputs({u: '', f: '', h: '5'}); reset(); }} className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:bg-orange-500/10 hover:text-orange-500 transition-colors active:scale-95">
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
        <div className="bg-background/50 p-1.5 rounded-2xl border border-border flex gap-1">
            <button onClick={() => { setDeviceType('mirror'); reset(); }} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${deviceType === 'mirror' ? 'bg-orange-500 text-white shadow-md' : 'text-text/50 hover:bg-orange-500/10 hover:text-orange-500'}`}>Mirror</button>
            <button onClick={() => { setDeviceType('lens'); reset(); }} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${deviceType === 'lens' ? 'bg-orange-500 text-white shadow-md' : 'text-text/50 hover:bg-orange-500/10 hover:text-orange-500'}`}>Lens</button>
        </div>
        <div className="bg-background/50 p-1.5 rounded-2xl border border-border flex gap-1">
            <button onClick={() => { setDeviceShape('concave'); reset(); }} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${deviceShape === 'concave' ? 'bg-orange-500 text-white shadow-md' : 'text-text/50 hover:bg-orange-500/10 hover:text-orange-500'}`}>Concave</button>
            <button onClick={() => { setDeviceShape('convex'); reset(); }} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${deviceShape === 'convex' ? 'bg-orange-500 text-white shadow-md' : 'text-text/50 hover:bg-orange-500/10 hover:text-orange-500'}`}>Convex</button>
        </div>
      </div>

      {/* Interactive Visualizer Map (Abstract) */}
      <div className="mb-6 relative z-10 bg-background/50 rounded-2xl border border-border p-4 flex flex-col justify-center items-center h-28 overflow-hidden">
         <div className="w-full relative h-0.5 bg-text/20">
             {/* Device Center */}
             <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                 {deviceType === 'lens' ? (
                     <div className={`w-3 h-16 border-2 border-orange-500 rounded-[50%] bg-orange-500/20`} />
                 ) : (
                     <div className={`w-1 h-16 bg-orange-500 ${deviceShape === 'concave' ? 'rounded-l-full' : 'rounded-r-full'} shadow-[0_0_10px_rgba(249,115,22,0.8)]`} />
                 )}
                 <span className="text-[8px] font-bold text-orange-500 mt-1 uppercase tracking-widest absolute -bottom-5 whitespace-nowrap">{deviceShape} {deviceType}</span>
             </div>
             {/* Object (Always left) */}
             <div className="absolute left-[15%] bottom-0 flex flex-col items-center animate-bounce">
                <span className="text-[10px] font-black italic text-emerald-500 absolute -top-4">Obj</span>
                <div className="w-0.5 h-8 bg-emerald-500 rounded-t-full relative">
                    <div className="absolute -top-1 -left-1 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[6px] border-b-emerald-500" />
                </div>
             </div>
             {/* Abstract Ray lines */}
             <div className="absolute left-[15%] top-[-30px] w-[35%] h-[0.5px] bg-emerald-500/40 border-t border-dashed border-emerald-500/50" />
         </div>
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-2 gap-3 mb-2 relative z-10">
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-[10px] font-bold uppercase text-text/50 pl-1 flex items-center justify-between">
              <span>Object Distance <strong className="text-orange-500">(u)</strong></span>
              <span className="text-[8px] text-emerald-500">Keep positive, engine adds (-)</span>
          </label>
          <div className="relative">
            <input type="number" placeholder="e.g. 20" value={inputs.u} onChange={(e) => updateInput('u', e.target.value)} className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 font-black italic outline-none focus:border-orange-500 text-text transition-colors" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">cm</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-text/50 pl-1">Focal L. <strong className="text-orange-500">(f)</strong></label>
          <div className="relative">
            <input type="number" placeholder="e.g. 15" value={inputs.f} onChange={(e) => updateInput('f', e.target.value)} className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 font-black italic outline-none focus:border-orange-500 text-text transition-colors" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">cm</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-text/50 pl-1">Obj. Height <strong className="text-orange-500">(h)</strong></label>
          <div className="relative">
            <input type="number" placeholder="opt." value={inputs.h} onChange={(e) => updateInput('h', e.target.value)} className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 font-black italic outline-none focus:border-orange-500 text-text transition-colors" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text/30">cm</span>
          </div>
        </div>
      </div>

      {errorMsg && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center mt-3 animate-bounce relative z-10">{errorMsg}</p>}

      <button onClick={traceRays} className="w-full mt-6 mb-6 group/btn relative rounded-2xl bg-orange-500 py-4 flex items-center justify-center gap-2 overflow-hidden transition-all active:scale-[0.98] shadow-[0_4px_0_rgb(194,65,12)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]">
        <span className="text-sm font-black italic uppercase tracking-wider text-white relative z-10 flex items-center gap-2">
           <Target className="w-5 h-5" /> Trace Rays
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
      </button>

      {/* Steps List */}
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
              <div className="flex flex-col items-center justify-center w-full text-center">
                <div className={`text-lg font-black italic tracking-tight flex items-center justify-center ${isCurrent && isFinal ? 'text-orange-500 w-full' : 'text-text'}`}>
                  {step.math}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nature of Image Dashboard */}
      {nature && (
        <div className="mt-4 p-5 rounded-2xl bg-card border-2 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.15)] animate-in zoom-in duration-500 relative z-10">
            <div className="flex items-center justify-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-orange-500" />
                <h4 className="text-sm font-black italic uppercase tracking-widest text-text">Nature of Image</h4>
                <Eye className="w-5 h-5 text-orange-500" />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
                <div className={`border p-2 rounded-xl text-center ${nature.real ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-blue-500/10 border-blue-500/50 text-blue-500'}`}>
                    <p className="text-[9px] font-bold uppercase mb-1 opacity-70">Type</p>
                    <p className="text-xs font-black italic tracking-wider">{nature.real ? 'REAL' : 'VIRTUAL'}</p>
                </div>
                <div className={`border p-2 rounded-xl text-center ${nature.erect ? 'bg-blue-500/10 border-blue-500/50 text-blue-500' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'}`}>
                    <p className="text-[9px] font-bold uppercase mb-1 opacity-70">Orientation</p>
                    <p className="text-xs font-black italic tracking-wider">{nature.erect ? 'ERECT' : 'INVERTED'}</p>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/50 text-orange-500 p-2 rounded-xl text-center">
                    <p className="text-[9px] font-bold uppercase mb-1 opacity-70">Size</p>
                    <p className="text-[10px] font-black italic tracking-wider uppercase">{nature.magSize}</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
