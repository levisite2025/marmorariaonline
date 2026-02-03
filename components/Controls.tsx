import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, Scissors, Sparkles, Ruler, BoxSelect, User, MapPin, DollarSign, Printer, LayoutDashboard, CheckCircle2, RotateCcw, ArrowRight, AlertCircle } from 'lucide-react';
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

type TabType = 'project' | 'editor' | 'finish';

export const Controls: React.FC<ControlsProps> = ({ slab, setSlab, customer, setCustomer, budget, setBudget, onAutoLayout, onOpenPrint, isGenerating }) => {
  const [activeTab, setActiveTab] = useState<TabType>('project');
  const [newPiece, setNewPiece] = useState<{ w: string, h: string, name: string }>({ w: '', h: '', name: '' });
  const [optimizePrompt, setOptimizePrompt] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Limpar erros ao trocar de aba
  useEffect(() => {
    setErrorMsg(null);
  }, [activeTab]);

  useEffect(() => {
    const currentTexture = TEXTURE_OPTIONS.find(t => t.id === slab.activeTextureId);
    if (!currentTexture || currentTexture.materialType !== slab.material) {
      const firstValid = TEXTURE_OPTIONS.find(t => t.materialType === slab.material);
      if (firstValid) {
        setSlab(prev => ({ ...prev, activeTextureId: firstValid.id }));
      }
    }
  }, [slab.material, slab.activeTextureId, setSlab]);

  const handleDimensionChange = (key: keyof SlabState['dimensions'], value: string) => {
    setErrorMsg(null); // Limpa erro ao digitar
    
    // Permite limpar o campo definindo como 0 internamente, facilitando a edição
    if (value === '') {
      setSlab(prev => ({
        ...prev,
        dimensions: { ...prev.dimensions, [key]: 0 }
      }));
      return;
    }

    const num = parseFloat(value);
    
    // Validação estrita: não aceita negativos
    if (num < 0) {
        return; // Ignora input negativo
    }

    if (!isNaN(num)) {
      setSlab(prev => ({
        ...prev,
        dimensions: { ...prev.dimensions, [key]: num }
      }));
    }
  };

  const handleResetSlab = () => {
    if (window.confirm("Deseja limpar as configurações? Isso zerará as dimensões e removerá todos os cortes.")) {
      setSlab({
        material: MaterialType.GRANITE,
        activeTextureId: 'saogabriel',
        dimensions: { width: 0, height: 0, thickness: 0, curvature: 0, inclination: 0 },
        pieces: []
      });
      setErrorMsg(null);
    }
  };

  const handleImportToEditor = () => {
    if (slab.dimensions.width <= 0 || slab.dimensions.height <= 0) {
      alert("Defina dimensões válidas para a chapa antes de enviar para o editor.");
      return;
    }

    setNewPiece({
      w: slab.dimensions.width.toString(),
      h: slab.dimensions.height.toString(),
      name: 'Peça Base'
    });
    setActiveTab('editor');
  };

  const handleCustomerChange = (key: keyof Customer, value: any) => {
    setCustomer(prev => ({ ...prev, [key]: value }));
  };

  const handleAddressChange = (key: keyof Customer['address'], value: string) => {
    setCustomer(prev => ({
      ...prev,
      address: { ...prev.address, [key]: value }
    }));
  };

  const addPiece = () => {
    setErrorMsg(null);
    const w = parseFloat(newPiece.w);
    const h = parseFloat(newPiece.h);
    
    // 1. Validação Básica de Input
    if (!newPiece.name || !w || !h || w <= 0 || h <= 0) {
        setErrorMsg("Preencha todos os campos com valores válidos maiores que zero.");
        return;
    }

    // 2. Validação Física (Peça > Chapa)
    if (w > slab.dimensions.width || h > slab.dimensions.height) {
        // Tenta ver se cabe girada, se não, erro
        if (h > slab.dimensions.width || w > slab.dimensions.height) {
             setErrorMsg(`A peça (${w}x${h}) é maior que as dimensões da chapa (${slab.dimensions.width}x${slab.dimensions.height}).`);
             return;
        }
    }

    // 3. Validação de Área Total
    const currentUsedArea = slab.pieces.reduce((acc, p) => acc + (p.width * p.height), 0);
    const newPieceArea = w * h;
    const totalSlabArea = slab.dimensions.width * slab.dimensions.height;

    if (totalSlabArea === 0) {
        setErrorMsg("Defina as dimensões da chapa principal na aba Projeto antes de adicionar cortes.");
        return;
    }

    if (currentUsedArea + newPieceArea > totalSlabArea) {
        setErrorMsg("A área total das peças excede o tamanho disponível na chapa.");
        return;
    }

    // Se passar em todas as validações
    const hues = [25, 200, 220, 280, 160]; 
    const randomHue = hues[Math.floor(Math.random() * hues.length)];
    const randomColor = `hsl(${randomHue}, 70%, 55%)`;
    
    const piece: CutPiece = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPiece.name,
      width: w,
      height: h,
      x: 0, 
      y: 0, 
      color: randomColor
    };
    setSlab(prev => ({ ...prev, pieces: [...prev.pieces, piece] }));
    setNewPiece({ w: '', h: '', name: '' });
  };

  const removePiece = (id: string) => {
    if (window.confirm("Tem certeza que deseja remover esta peça da lista de cortes?")) {
      setSlab(prev => ({ ...prev, pieces: prev.pieces.filter(p => p.id !== id) }));
      setErrorMsg(null);
    }
  };

  const totalArea = (slab.dimensions.width * slab.dimensions.height) / 10000;
  const usedArea = slab.pieces.reduce((acc, p) => acc + (p.width * p.height), 0) / 10000;
  const waste = totalArea - usedArea;
  const wastePercent = totalArea > 0 ? ((waste / totalArea) * 100).toFixed(1) : '0.0';
  const availableTextures = TEXTURE_OPTIONS.filter(t => t.materialType === slab.material);
  const estimatedTotal = (totalArea * budget.pricePerMq) + budget.extraCosts;

  // Light Theme Classes
  const inputClass = "w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 hover:border-slate-400 shadow-sm";
  const labelClass = "text-[11px] uppercase tracking-bold text-blue-900 font-bold mb-1.5 block flex items-center gap-1.5";
  const sectionClass = "space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500";
  const cardClass = "bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all";

  return (
    <div className="flex flex-col h-full text-slate-700">
      
      {/* Light Tabs */}
      <div className="flex p-1 gap-2 mx-6 mt-6 mb-2 border-b-2 border-slate-100">
        {[
          { id: 'project', icon: Settings, label: 'Projeto', desc: 'Configurar material e dimensões' },
          { id: 'editor', icon: Scissors, label: 'Editor', desc: 'Adicionar e organizar cortes' },
          { id: 'finish', icon: CheckCircle2, label: 'Finalizar', desc: 'Orçamento e impressão' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            title={tab.desc}
            className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all relative ${
              activeTab === tab.id 
                ? 'text-orange-600' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
               <div className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-orange-500 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 pt-2">
        
        {/* TAB 1: PROJETO */}
        {activeTab === 'project' && (
          <div className={sectionClass}>
            
            <div className={cardClass}>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                  <LayoutDashboard size={18} className="text-orange-500"/> 
                  MATERIAL & BASE
                </h3>
                <button 
                  onClick={handleResetSlab}
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                  title="Limpar todas as configurações e reiniciar projeto"
                >
                  <RotateCcw size={12} /> Limpar
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelClass}>Tipo de Pedra</label>
                  <select 
                    value={slab.material}
                    onChange={(e) => setSlab(prev => ({ ...prev, material: e.target.value as MaterialType }))}
                    className={inputClass}
                    title="Selecione o tipo de material da pedra"
                  >
                    {Object.values(MaterialType).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Textura</label>
                  <select 
                    value={slab.activeTextureId}
                    onChange={(e) => setSlab(prev => ({ ...prev, activeTextureId: e.target.value }))}
                    className={inputClass}
                    title="Escolha o acabamento visual da pedra"
                  >
                    {availableTextures.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <label className={labelClass}><Ruler size={12} /> Dimensões (cm)</label>
                 <div className="grid grid-cols-3 gap-3">
                    <div>
                      <input 
                        type="number" 
                        value={slab.dimensions.width || ''} 
                        onChange={(e) => handleDimensionChange('width', e.target.value)} 
                        className={inputClass} 
                        title="Largura total da chapa em cm"
                      />
                      <span className="text-[10px] text-slate-500 text-center block mt-1 font-medium">Largura</span>
                    </div>
                    <div>
                      <input 
                        type="number" 
                        value={slab.dimensions.height || ''} 
                        onChange={(e) => handleDimensionChange('height', e.target.value)} 
                        className={inputClass} 
                        title="Altura total da chapa em cm"
                      />
                      <span className="text-[10px] text-slate-500 text-center block mt-1 font-medium">Altura</span>
                    </div>
                    <div>
                      <input 
                        type="number" 
                        value={slab.dimensions.thickness || ''} 
                        onChange={(e) => handleDimensionChange('thickness', e.target.value)} 
                        className={inputClass} 
                        title="Espessura da chapa em cm"
                      />
                      <span className="text-[10px] text-slate-500 text-center block mt-1 font-medium">Espessura</span>
                    </div>
                 </div>
              </div>

              <button 
                onClick={handleImportToEditor}
                title="Confirmar dimensões e começar a adicionar cortes"
                className="w-full mt-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-wide hover:shadow-sm"
              >
                <ArrowRight size={14} /> Usar Medidas no Corte
              </button>

              <div className="flex justify-between items-center mt-4 px-1" title="Área total da chapa base calculada">
                 <div className="text-xs font-semibold text-slate-500 uppercase">Área Total</div>
                 <div className="text-xs font-bold font-mono text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-md">{totalArea.toFixed(2)} m²</div>
              </div>
            </div>

            <div className={cardClass}>
              <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                <User size={18} className="text-orange-500"/> 
                DADOS DO CLIENTE
              </h3>
              <div className="space-y-3">
                <input type="text" placeholder="Nome do Cliente" value={customer.name} onChange={(e) => handleCustomerChange('name', e.target.value)} className={inputClass} title="Digite o nome completo do cliente" />
                <input type="text" placeholder="Contato / Telefone" value={customer.phone} onChange={(e) => handleCustomerChange('phone', e.target.value)} className={inputClass} title="Digite o telefone ou contato" />
                <div className="grid grid-cols-3 gap-2 mt-2">
                   <input type="text" placeholder="Endereço" value={customer.address.street} onChange={(e) => handleAddressChange('street', e.target.value)} className={`${inputClass} col-span-2`} title="Rua ou Avenida" />
                   <input type="text" placeholder="Nº" value={customer.address.number} onChange={(e) => handleAddressChange('number', e.target.value)} className={inputClass} title="Número" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EDITOR */}
        {activeTab === 'editor' && (
          <div className={sectionClass}>
            
            <div className={`${cardClass} border-l-4 border-l-orange-500`}>
               <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                 <BoxSelect size={18} className="text-orange-500"/> 
                 NOVA PEÇA
               </h3>
               
               {errorMsg && (
                 <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-bold mb-4 flex items-start gap-2 border border-red-100 animate-in slide-in-from-top-2">
                   <AlertCircle size={16} className="shrink-0 mt-0.5" />
                   <span>{errorMsg}</span>
                 </div>
               )}

               <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Nome da Peça</label>
                    <input type="text" placeholder="Ex: Bancada Ilha" value={newPiece.name} onChange={(e) => setNewPiece(p => ({ ...p, name: e.target.value }))} className={inputClass} title="Nome descritivo da peça" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className={labelClass}>Largura</label>
                       <input type="number" min="0" value={newPiece.w} onChange={(e) => setNewPiece(p => ({ ...p, w: e.target.value }))} className={inputClass} title="Largura da peça em cm" />
                    </div>
                    <div>
                       <label className={labelClass}>Altura</label>
                       <input type="number" min="0" value={newPiece.h} onChange={(e) => setNewPiece(p => ({ ...p, h: e.target.value }))} className={inputClass} title="Altura da peça em cm" />
                    </div>
                  </div>
                  <button 
                    onClick={addPiece}
                    disabled={!newPiece.name || !newPiece.w || !newPiece.h}
                    title="Adicionar nova peça à lista de cortes"
                    className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 
                    ADICIONAR CORTE
                  </button>
               </div>
            </div>

            <div className="space-y-2">
               <div className="flex justify-between items-end px-1 pb-2 border-b border-slate-200 mb-2">
                 <h3 className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Lista de Peças ({slab.pieces.length})</h3>
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${parseFloat(wastePercent) > 20 ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`} title="Porcentagem de material não utilizado">
                    Perda: {wastePercent}%
                 </span>
               </div>
               
               {slab.pieces.length === 0 ? (
                 <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mx-auto mb-2 shadow-sm border border-slate-100">
                        <Scissors size={18} className="text-slate-400" />
                    </div>
                    <p className="text-slate-400 text-xs font-medium">Nenhum corte adicionado</p>
                 </div>
               ) : (
                 <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                    {slab.pieces.map(piece => (
                      <div key={piece.id} className="group bg-white border border-slate-200 hover:border-orange-300 rounded-lg p-3 flex justify-between items-center transition-all shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-sm shadow-sm" style={{backgroundColor: piece.color}} />
                          <div>
                            <div className="font-bold text-slate-800 text-sm">{piece.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 font-medium">
                               {piece.width}cm x {piece.height}cm
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => removePiece(piece.id)}
                          className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Excluir peça do plano de corte"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>
        )}

        {/* TAB 3: FINALIZAR */}
        {activeTab === 'finish' && (
          <div className={sectionClass}>
             
             {/* AI Panel */}
             <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-1 rounded-2xl border border-blue-100 shadow-sm">
                <div className="bg-white/80 p-5 rounded-xl">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 flex items-center gap-2">
                    <Sparkles size={14} className="text-orange-500" /> 
                    Assistente Inteligente
                  </h3>
                  <textarea
                    value={optimizePrompt}
                    onChange={(e) => setOptimizePrompt(e.target.value)}
                    placeholder="Descreva o projeto para a IA organizar os cortes automaticamente..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm min-h-[80px] focus:border-blue-400 outline-none resize-none placeholder:text-slate-400 mb-4 text-slate-700"
                    title="Descreva como você quer que os cortes sejam organizados"
                  />
                  <button
                    onClick={() => onAutoLayout(optimizePrompt)}
                    disabled={isGenerating || !optimizePrompt.trim()}
                    title="Solicitar à IA um layout otimizado para os cortes"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md font-bold text-xs uppercase tracking-wider disabled:bg-slate-300"
                  >
                    {isGenerating ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/> : <Sparkles size={16} />}
                    {isGenerating ? 'Calculando...' : 'Otimizar Layout com IA'}
                  </button>
                </div>
             </div>

             <div className={cardClass}>
                <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <DollarSign size={18} className="text-orange-500"/> 
                  FINANCEIRO
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className={labelClass}>Preço (R$/m²)</label>
                    <input type="number" placeholder="0.00" value={budget.pricePerMq || ''} onChange={(e) => setBudget(prev => ({ ...prev, pricePerMq: parseFloat(e.target.value) || 0 }))} className={inputClass} title="Preço do material por metro quadrado" />
                  </div>
                  <div>
                    <label className={labelClass}>Extras / Frete</label>
                    <input type="number" placeholder="0.00" value={budget.extraCosts || ''} onChange={(e) => setBudget(prev => ({ ...prev, extraCosts: parseFloat(e.target.value) || 0 }))} className={inputClass} title="Custos adicionais de mão de obra e frete" />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                   <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-500 font-medium">Custo Material</span>
                      <span className="text-xs text-slate-600 font-bold">{(totalArea * budget.pricePerMq).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                   </div>
                   <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                      <span className="text-xs text-slate-500 font-medium">Adicionais</span>
                      <span className="text-xs text-slate-600 font-bold">{budget.extraCosts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                   </div>
                   <div className="flex justify-between items-center pt-3">
                      <span className="text-sm font-bold text-slate-800">VALOR TOTAL</span>
                      <span className="text-xl font-black text-blue-700">{estimatedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                   </div>
                </div>

                <button 
                  onClick={onOpenPrint}
                  title="Gerar visualização de impressão e salvar PDF do orçamento"
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg font-bold tracking-wide"
                >
                  <Printer size={18} className="text-orange-400"/> IMPRIMIR ORÇAMENTO
                </button>
             </div>
          </div>
        )}
      </div>

    </div>
  );
};