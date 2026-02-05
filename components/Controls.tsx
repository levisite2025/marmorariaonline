import React, { useState, useEffect, useCallback } from 'react';
import { 
  Ruler, LayoutGrid, DollarSign, Printer, Sparkles, Plus, Trash2, 
  Box, Move3d, FileText, RotateCw, Trash, Keyboard, AlertCircle, MessageSquare
} from 'lucide-react';
import { SlabState, MaterialType, TEXTURE_OPTIONS, Customer, BudgetState } from '../types';
import { GeminiChat } from './GeminiChat';

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
  const [activeTab, setActiveTab] = useState<'base' | 'cuts' | 'chat' | 'final'>('base');
  const [newPiece, setNewPiece] = useState({ w: '', h: '', name: '' });

  const totalArea = (slab.dimensions.width * slab.dimensions.height) / 10000;
  const usedArea = slab.pieces.reduce((acc, p) => acc + (p.width * p.height), 0) / 10000;
  const waste = totalArea - usedArea;

  const inputStyle = "w-full bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700";
  const errorInputStyle = "w-full bg-red-50 border border-red-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder:text-red-300 font-medium text-red-700";
  const labelStyle = "text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5";

  const handleClearDimensions = useCallback(() => {
    setSlab(prev => ({
      ...prev,
      dimensions: {
        width: 0,
        height: 0,
        thickness: 2,
        curvature: 0,
        inclination: 0
      }
    }));
  }, [setSlab]);

  const handleAddPiece = useCallback(() => {
    const w = parseFloat(newPiece.w);
    const h = parseFloat(newPiece.h);
    if (!newPiece.name || !w || !h) return;
    setSlab(p => ({ 
      ...p, 
      pieces: [...p.pieces, { 
        id: Date.now().toString(), 
        name: newPiece.name, 
        width: w, 
        height: h, 
        x: 0, 
        y: 0, 
        color: '#4f46e5' 
      }] 
    }));
    setNewPiece({ name: '', w: '', h: '' });
  }, [newPiece, setSlab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
      if (e.altKey) {
        if (e.key === '1') setActiveTab('base');
        if (e.key === '2') setActiveTab('cuts');
        if (e.key === '3') setActiveTab('chat');
        if (e.key === '4') setActiveTab('final');
      }
      if (e.key === 'Escape' && activeTab === 'base') {
        handleClearDimensions();
      }
      if (e.key === 'Enter' && activeTab === 'cuts' && isInput) {
        handleAddPiece();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleClearDimensions, handleAddPiece]);

  return (
    <div className="flex flex-col h-full bg-white/40 backdrop-blur-md">
      <div className="flex p-4 gap-2 border-b border-slate-100 overflow-x-auto no-scrollbar">
        {[
          { id: 'base', icon: Move3d, label: 'Chapa', desc: 'Configurações da Chapa Master (Alt+1) - Defina material, dimensões e acabamento.' },
          { id: 'cuts', icon: LayoutGrid, label: 'Cortes', desc: 'Gerenciamento de Cortes (Alt+2) - Adicione e organize as peças a serem produzidas.' },
          { id: 'chat', icon: MessageSquare, label: 'IA', desc: 'Assistente Inteligente (Alt+3) - Receba orientações técnicas e dicas de aproveitamento.' },
          { id: 'final', icon: FileText, label: 'Venda', desc: 'Finalização e Custos (Alt+4) - Configure preços, extras e gere o orçamento.' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            title={tab.desc}
            className={`flex-none px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
          >
            <tab.icon size={12} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {activeTab === 'chat' ? (
          <GeminiChat slab={slab} />
        ) : (
          <div className="p-6 space-y-6">
            {activeTab === 'base' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <section>
                  <label className={labelStyle}><Box size={10} /> Material & Textura</label>
                  <div className="grid grid-cols-2 gap-3">
                    <select 
                      className={inputStyle} 
                      value={slab.material} 
                      onChange={e => setSlab(p => ({ ...p, material: e.target.value as any }))}
                      title="Selecione o tipo de material da chapa."
                    >
                      {Object.values(MaterialType).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select 
                      className={inputStyle} 
                      value={slab.activeTextureId} 
                      onChange={e => setSlab(p => ({ ...p, activeTextureId: e.target.value }))}
                      title="Selecione o acabamento visual da chapa."
                    >
                      {TEXTURE_OPTIONS.filter(t => t.materialType === slab.material).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </section>

                <section>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className={labelStyle}><Ruler size={10} /> Dimensões da Chapa (cm)</label>
                    <button 
                      onClick={handleClearDimensions} 
                      title="Resetar Dimensões (Esc) - Limpa todos os campos de medidas da chapa master."
                      className="text-[9px] font-black text-red-500 uppercase flex items-center gap-1 hover:underline"
                    >
                      <Trash size={10} /> Limpar
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {['width', 'height', 'thickness'].map(key => (
                      <div key={key}>
                        <input 
                          type="number" 
                          className={inputStyle} 
                          value={(slab.dimensions as any)[key] || ''} 
                          onChange={e => setSlab(p => ({ ...p, dimensions: { ...p.dimensions, [key]: parseFloat(e.target.value) || 0 } }))} 
                          title={`${key === 'width' ? 'Largura' : key === 'height' ? 'Altura' : 'Espessura'} da chapa em centímetros.`}
                        />
                        <span className="text-[9px] font-bold text-slate-300 uppercase mt-1 block text-center">{key}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <label className={labelStyle}><RotateCw size={10} /> Curvatura & Inclinação</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <input 
                        type="number" 
                        className={slab.dimensions.curvature < 0 ? errorInputStyle : inputStyle} 
                        value={slab.dimensions.curvature || ''} 
                        onChange={e => setSlab(p => ({ ...p, dimensions: { ...p.dimensions, curvature: parseFloat(e.target.value) || 0 } }))} 
                        title="Raio de curvatura da chapa para peças boleadas."
                      />
                      <span className="text-[9px] font-bold text-slate-300 uppercase mt-1 block text-center">Raio (cm)</span>
                      {slab.dimensions.curvature < 0 && <div className="absolute -bottom-5 text-[8px] font-bold text-red-500 uppercase">Inválido</div>}
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        className={slab.dimensions.inclination < 0 ? errorInputStyle : inputStyle} 
                        value={slab.dimensions.inclination || ''} 
                        onChange={e => setSlab(p => ({ ...p, dimensions: { ...p.dimensions, inclination: parseFloat(e.target.value) || 0 } }))} 
                        title="Ângulo de inclinação lateral da chapa em graus."
                      />
                      <span className="text-[9px] font-bold text-slate-300 uppercase mt-1 block text-center">Graus (°)</span>
                      {slab.dimensions.inclination < 0 && <div className="absolute -bottom-5 text-[8px] font-bold text-red-500 uppercase">Inválido</div>}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'cuts' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <section className="bg-slate-50 p-5 rounded-[24px] border border-slate-100">
                  <label className={labelStyle}><Plus size={10} /> Novo Corte</label>
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Nome da peça" 
                      className={inputStyle} 
                      value={newPiece.name} 
                      onChange={e => setNewPiece(p => ({ ...p, name: e.target.value }))}
                      title="Dê um nome para identificar a peça no orçamento."
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="number" 
                        placeholder="Larg (cm)" 
                        className={inputStyle} 
                        value={newPiece.w} 
                        onChange={e => setNewPiece(p => ({ ...p, w: e.target.value }))} 
                        title="Largura da peça individual em centímetros."
                      />
                      <input 
                        type="number" 
                        placeholder="Alt (cm)" 
                        className={inputStyle} 
                        value={newPiece.h} 
                        onChange={e => setNewPiece(p => ({ ...p, h: e.target.value }))} 
                        title="Altura da peça individual em centímetros."
                      />
                    </div>
                    <button 
                      onClick={handleAddPiece} 
                      title="Confirmar Adição (Enter) - Inclui a peça informada na lista de cortes e plano 3D."
                      className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                    >
                      <Plus size={14} /> Adicionar Peça
                    </button>
                  </div>
                </section>
                <div className="space-y-2">
                   {slab.pieces.map(piece => (
                      <div key={piece.id} className="bg-white border p-3 rounded-xl flex justify-between items-center shadow-sm">
                        <div>
                          <h4 className="text-xs font-bold text-slate-700">{piece.name}</h4>
                          <p className="text-[10px] font-mono text-slate-400">{piece.width}x{piece.height}cm</p>
                        </div>
                        <button 
                          onClick={() => setSlab(p => ({ ...p, pieces: p.pieces.filter(pc => pc.id !== piece.id) }))} 
                          className="text-slate-300 hover:text-red-500 transition-colors p-2"
                          title="Remover esta peça do plano de corte."
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                   ))}
                </div>
              </div>
            )}

            {activeTab === 'final' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <section className="bg-indigo-50 p-5 rounded-[24px] border border-indigo-100 text-center">
                  <Sparkles size={24} className="text-indigo-600 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Otimização Profissional</p>
                  <button 
                    onClick={() => onAutoLayout("Otimizar")} 
                    disabled={isGenerating} 
                    title="Otimização Inteligente - Organiza automaticamente as peças para o melhor aproveitamento e menor desperdício de material."
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg disabled:opacity-50 hover:bg-indigo-500 transition-colors"
                  >
                    {isGenerating ? "Processando..." : "Nesting Automático IA"}
                  </button>
                </section>
                <button 
                  onClick={onOpenPrint} 
                  title="Gerar Documento (Ctrl+P) - Abre a visualização de impressão e compartilhamento do orçamento detalhado."
                  className="w-full bg-slate-900 text-white py-4 rounded-[20px] font-black text-xs uppercase flex items-center justify-center gap-3 shadow-xl hover:bg-slate-800 transition-all hover:scale-[1.02]"
                >
                  <Printer size={18} /> Orçamento Final
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sobra: {waste.toFixed(2)} m²</span>
          <span className="text-[11px] font-black text-indigo-600">Total: {(totalArea * budget.pricePerMq + budget.extraCosts).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div className="flex items-center gap-1 opacity-40">
          <Keyboard size={10} className="text-slate-400" />
          <span className="text-[8px] font-medium text-slate-500 uppercase">Dica: Alt + 1/2/3/4 para navegar rapidamente</span>
        </div>
      </div>
    </div>
  );
};