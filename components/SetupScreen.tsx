import React, { useState } from 'react';
import { Ruler, Box, ArrowRight, Move3d, Info } from 'lucide-react';
import { MaterialType, TEXTURE_OPTIONS, SlabState } from '../types';

interface SetupScreenProps {
  onConfirm: (initialSlab: Partial<SlabState>) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onConfirm }) => {
  const [width, setWidth] = useState('280');
  const [height, setHeight] = useState('160');
  const [thickness, setThickness] = useState('2');
  const [material, setMaterial] = useState<MaterialType>(MaterialType.GRANITE);
  const [textureId, setTextureId] = useState('saogabriel');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      material,
      activeTextureId: textureId,
      dimensions: {
        width: parseFloat(width) || 0,
        height: parseFloat(height) || 0,
        thickness: parseFloat(thickness) || 2,
        curvature: 0,
        inclination: 0
      }
    });
  };

  const handleMaterialChange = (m: MaterialType) => {
    setMaterial(m);
    const firstTex = TEXTURE_OPTIONS.find(t => t.materialType === m);
    if (firstTex) setTextureId(firstTex.id);
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full grid md:grid-cols-2 gap-8 items-center">
        
        <div className="space-y-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-200">
            <Move3d size={32} className="text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
              Configuração <span className="text-indigo-600">Inicial</span>
            </h1>
            <p className="text-slate-500 font-medium leading-relaxed">
              Defina as medidas aproximadas da sua chapa master para otimizar o preenchimento e renderização 3D.
            </p>
          </div>
          
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex gap-3">
            <Info className="text-indigo-600 shrink-0" size={20} />
            <p className="text-xs text-indigo-700 font-medium leading-tight">
              Essas medidas servirão como base para o plano de corte. Você poderá ajustá-las a qualquer momento dentro do estúdio.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="glass p-8 rounded-[40px] shadow-2xl border border-white space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Largura (cm)</label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input 
                    type="number" 
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-bold text-slate-700"
                    placeholder="280"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Altura (cm)</label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input 
                    type="number" 
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-bold text-slate-700"
                    placeholder="160"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Material</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(MaterialType).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMaterialChange(m)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      material === m 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Textura / Acabamento</label>
              <select 
                value={textureId}
                onChange={(e) => setTextureId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-700"
              >
                {TEXTURE_OPTIONS.filter(t => t.materialType === material).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-slate-200 active:scale-[0.98] transition-all uppercase text-xs tracking-widest"
          >
            Abrir Estúdio 3D <ArrowRight size={18} className="text-indigo-400" />
          </button>
        </form>
      </div>
    </div>
  );
};