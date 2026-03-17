import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Info, Move3d, Ruler } from 'lucide-react';
import { MaterialType, SlabState, TEXTURE_OPTIONS } from '../types';

interface SetupScreenProps {
  onConfirm: (initialSlab: Partial<SlabState>) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onConfirm }) => {
  const [width, setWidth] = useState('280');
  const [height, setHeight] = useState('160');
  const [thickness, setThickness] = useState('2');
  const [material, setMaterial] = useState<MaterialType>(MaterialType.GRANITE);
  const [textureId, setTextureId] = useState('saogabriel');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const nextWidth = parseFloat(width) || 0;
    const nextHeight = parseFloat(height) || 0;
    const nextThickness = parseFloat(thickness) || 0;

    if (nextWidth <= 0 || nextHeight <= 0 || nextThickness <= 0) {
      setError('Informe largura, altura e espessura maiores que zero.');
      return;
    }

    setError('');
    onConfirm({
      material,
      activeTextureId: textureId,
      dimensions: {
        width: nextWidth,
        height: nextHeight,
        thickness: nextThickness,
        curvature: 0,
        inclination: 0,
      },
    });
  };

  const handleMaterialChange = (selectedMaterial: MaterialType) => {
    setMaterial(selectedMaterial);
    const firstTexture = TEXTURE_OPTIONS.find((texture) => texture.materialType === selectedMaterial);
    if (firstTexture) setTextureId(firstTexture.id);
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
              Defina as medidas aproximadas da sua chapa master para otimizar o preenchimento, o corte e a renderização 3D.
            </p>
          </div>

          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex gap-3">
            <Info className="text-indigo-600 shrink-0" size={20} />
            <p className="text-xs text-indigo-700 font-medium leading-tight">
              Essas medidas servem como base para o plano de corte. Depois você pode refiná-las dentro do estúdio.
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
                    min="1"
                    value={width}
                    onChange={(event) => setWidth(event.target.value)}
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
                    min="1"
                    value={height}
                    onChange={(event) => setHeight(event.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-bold text-slate-700"
                    placeholder="160"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Espessura (cm)</label>
              <div className="relative">
                <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input
                  type="number"
                  min="1"
                  value={thickness}
                  onChange={(event) => setThickness(event.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-bold text-slate-700"
                  placeholder="2"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Material</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(MaterialType).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleMaterialChange(option)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      material === option
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Textura / acabamento</label>
              <select
                value={textureId}
                onChange={(event) => setTextureId(event.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-700"
              >
                {TEXTURE_OPTIONS.filter((texture) => texture.materialType === material).map((texture) => (
                  <option key={texture.id} value={texture.id}>
                    {texture.name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-slate-200 active:scale-[0.98] transition-all uppercase text-xs tracking-widest"
          >
            Abrir estúdio 3D <ArrowRight size={18} className="text-indigo-400" />
          </button>
        </form>
      </div>
    </div>
  );
};
