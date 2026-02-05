import React, { useState } from 'react';
import { 
  Ruler, LayoutGrid, DollarSign, Printer, Sparkles, Plus, Trash2, 
  ChevronRight, Box, Move3d, FileText, Info
} from 'lucide-react';
import { SlabState, MaterialType, CutPiece, TEXTURE_OPTIONS, Customer, BudgetState } from '../types';

interface ControlsProps {
  slab: SlabState;
  setSlab: React.Dispatch<React.SetStateAction<SlabState>>;
  customer: Customer;
  setCustomer: React.Dispatch<React.SetStateAction<Customer>>;
  budget: BudgetState;
  setBudget: React.Dispatch<React.SetStateAction<BudgetState>>;
  onAutoLayout: (desc: string) => Promise<void>;
  onOpenPrint: () => void;
  isGenerating: boolean;
}

export const Controls: React.FC<ControlsProps> = ({ 
  slab, setSlab, customer, setCustomer, budget, setBudget, onAutoLayout, onOpenPrint, isGenerating 
}) => {
  const [activeTab, setActiveTab] = useState<'base' | 'cuts' | 'final'>('base');
  const [newPiece, setNewPiece] = useState({ w: '', h: '', name: '' });

  const totalArea = (slab.dimensions.width * slab.dimensions.height) / 10000;
  const usedArea = slab.pieces.reduce((acc, p) => acc + (p.width * p.height), 0) / 10000;
  const waste = totalArea - usedArea;

  const inputStyle = "w-full bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700";
  const labelStyle = "text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5";

  return (
    <div className="flex flex-col h-full bg-white/40 backdrop-blur-md">
      
      {/* Dynamic Tabs */}
      <div className="flex p-4 gap-2 border-b border-slate-100">
        {[
          { id: 'base', icon: Move3d, label: 'Chapa' },
          { id: 'cuts', icon: LayoutGrid, label: 'Cortes' },
          { id: 'final', icon: FileText, label: 'Venda' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
          >
            <tab.icon size={12} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {activeTab === 'base' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <section>
              <label className={labelStyle}><Box size={10} /> Material & Textura</label>
              <div className="grid grid-cols-2 gap-3">
                <select 
                  className={inputStyle}
                  value={slab.material}
                  onChange={e => setSlab(p => ({ ...p, material: e.target.value as any }))}
                >
                  {Object.values(MaterialType).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select 
                  className={inputStyle}
                  value={slab.activeTextureId}
                  onChange={e => setSlab(p => ({ ...p, activeTextureId: e.target.value }))}
                >
                  {TEXTURE_OPTIONS.filter(t => t.materialType === slab.material).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </section>

            <section>
              <label className={labelStyle}><Ruler size={10} /> Dimensões da Chapa (cm)</label>
              <div className="grid grid-cols-3 gap-3">
                {['width', 'height', 'thickness'].map(dim => (
                  <div key={dim}>
                    <input 
                      type="number" 
                      className={inputStyle} 
                      placeholder={dim === 'width' ? 'Larg' : dim === 'height' ? 'Alt' : 'Esp'}
                      value={(slab.dimensions as any)[dim] || ''}
                      onChange={e => setSlab(p => ({ ...p, dimensions: { ...p.dimensions, [dim]: parseFloat(e.target.value) || 0 } }))}
                    />
                    <span className="text-[9px] font-bold text-slate-300 uppercase mt-1 block text-center">
                      {dim === 'width' ? 'Largura' : dim === 'height' ? 'Altura' : 'Espessura'}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <div className="bg-indigo-600 p-4 rounded-[24px] shadow-xl shadow-indigo-100 text-white">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Área Total</p>
                  <h4 className="text-2xl font-black">{totalArea.toFixed(2)} <span className="text-sm font-normal">m²</span></h4>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Peças</p>
                  <h4 className="text-xl font-black">{slab.pieces.length}</h4>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cuts' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <section className="bg-slate-50 p-5 rounded-[24px] border border-slate-100">
              <label className={labelStyle}><Plus size={10} /> Novo Corte</label>
              <div className="space-y-3">
                <input 
                  type="text" placeholder="Nome da peça (ex: Pia Banheiro)" 
                  className={inputStyle} 
                  value={newPiece.name}
                  onChange={e => setNewPiece(p => ({ ...p, name: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="Larg (cm)" className={inputStyle} value={newPiece.w} onChange={e => setNewPiece(p => ({ ...p, w: e.target.value }))} />
                  <input type="number" placeholder="Alt (cm)" className={inputStyle} value={newPiece.h} onChange={e => setNewPiece(p => ({ ...p, h: e.target.value }))} />
                </div>
                <button 
                  onClick={() => {
                    const w = parseFloat(newPiece.w);
                    const h = parseFloat(newPiece.h);
                    if (!newPiece.name || !w || !h) return;
                    setSlab(p => ({ ...p, pieces: [...p.pieces, { id: Date.now().toString(), name: newPiece.name, width: w, height: h, x: 0, y: 0, color: '#4f46e5' }] }));
                    setNewPiece({ name: '', w: '', h: '' });
                  }}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800"
                >
                  <Plus size={14} /> Adicionar Peça
                </button>
              </div>
            </section>

            <section className="space-y-2">
              <label className={labelStyle}>Lista de Peças</label>
              {slab.pieces.length === 0 ? (
                <div className="text-center py-10 opacity-30">
                  <LayoutGrid size={32} className="mx-auto mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">Vazio</p>
                </div>
              ) : (
                slab.pieces.map(piece => (
                  <div key={piece.id} className="bg-white border border-slate-100 p-3 rounded-xl flex justify-between items-center shadow-sm">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700">{piece.name}</h4>
                      <p className="text-[10px] font-mono text-slate-400">{piece.width} x {piece.height} cm</p>
                    </div>
                    <button 
                      onClick={() => setSlab(p => ({ ...p, pieces: p.pieces.filter(pc => pc.id !== piece.id) }))}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </section>
          </div>
        )}

        {activeTab === 'final' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <section className="bg-indigo-50 p-5 rounded-[24px] border border-indigo-100">
              <label className={labelStyle}><Sparkles size={10} className="text-indigo-600" /> Inteligência Artificial</label>
              <p className="text-[10px] text-indigo-400 mb-4 font-medium uppercase tracking-tighter">Otimize o aproveitamento da chapa em segundos.</p>
              <button 
                onClick={() => onAutoLayout("Otimizar para menor desperdício")}
                disabled={isGenerating}
                className="w-full bg-white border-2 border-indigo-500 text-indigo-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-50 disabled:opacity-50"
              >
                {isGenerating ? "Processando..." : "Nesting Automático IA"}
              </button>
            </section>

            <section className="space-y-3">
              <label className={labelStyle}><DollarSign size={10} /> Custos</label>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="number" placeholder="Valor m²" className={inputStyle} 
                  value={budget.pricePerMq || ''}
                  onChange={e => setBudget(p => ({ ...p, pricePerMq: parseFloat(e.target.value) || 0 }))}
                />
                <input 
                  type="number" placeholder="Extras" className={inputStyle} 
                  value={budget.extraCosts || ''}
                  onChange={e => setBudget(p => ({ ...p, extraCosts: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </section>

            <button 
              onClick={onOpenPrint}
              className="w-full bg-slate-900 text-white py-4 rounded-[20px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02]"
            >
              <Printer size={18} /> Gerar Orçamento Final
            </button>
          </div>
        )}

      </div>

      {/* Mini Stats Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
         <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${waste > (totalArea * 0.3) ? 'bg-red-500' : 'bg-green-500'}`} />
           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sobra: {waste.toFixed(2)} m²</span>
         </div>
         <span className="text-[11px] font-black text-indigo-600">Total: {(totalArea * budget.pricePerMq + budget.extraCosts).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
      </div>
    </div>
  );
};