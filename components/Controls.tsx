import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Box,
  DollarSign,
  FileText,
  Keyboard,
  LayoutGrid,
  MessageSquare,
  Move3d,
  Plus,
  Printer,
  RotateCw,
  Ruler,
  Sparkles,
  Trash,
  Trash2,
  User,
} from 'lucide-react';
import { BudgetState, Customer, MaterialType, SlabState, TEXTURE_OPTIONS } from '../types';
import { validateLayout } from '../services/layoutValidation';
import { findAvailablePlacement } from '../services/placement';
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
  slab,
  setSlab,
  customer,
  setCustomer,
  budget,
  setBudget,
  onAutoLayout,
  onOpenPrint,
  isGenerating,
}) => {
  const [activeTab, setActiveTab] = useState<'base' | 'cuts' | 'chat' | 'final'>('base');
  const [newPiece, setNewPiece] = useState({ w: '', h: '', name: '' });
  const [autoLayoutPrompt, setAutoLayoutPrompt] = useState('');
  const [pieceFormError, setPieceFormError] = useState('');

  const totalArea = useMemo(() => (slab.dimensions.width * slab.dimensions.height) / 10000, [slab.dimensions.width, slab.dimensions.height]);
  const usedArea = useMemo(() => slab.pieces.reduce((acc, piece) => acc + piece.width * piece.height, 0) / 10000, [slab.pieces]);
  const waste = Math.max(0, totalArea - usedArea);
  const materialCost = totalArea * budget.pricePerMq;
  const totalCost = materialCost + budget.laborCost + budget.transportCost + budget.installationCost + budget.extraCosts;
  const layoutIssues = useMemo(() => validateLayout(slab), [slab]);
  const issuesByPieceId = useMemo(() => {
    const map = new Map<string, string[]>();
    layoutIssues.forEach((issue) => {
      map.set(issue.pieceId, [...(map.get(issue.pieceId) || []), issue.message]);
    });
    return map;
  }, [layoutIssues]);

  const inputStyle =
    'w-full bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700';
  const textareaStyle = `${inputStyle} min-h-[96px] resize-y`;
  const errorInputStyle =
    'w-full bg-red-50 border border-red-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder:text-red-300 font-medium text-red-700';
  const labelStyle = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5';

  const handleClearDimensions = useCallback(() => {
    setSlab((prev) => ({
      ...prev,
      dimensions: {
        width: 0,
        height: 0,
        thickness: 2,
        curvature: 0,
        inclination: 0,
      },
    }));
  }, [setSlab]);

  const handleAddPiece = useCallback(() => {
    const width = parseFloat(newPiece.w);
    const height = parseFloat(newPiece.h);

    if (!newPiece.name.trim() || !width || !height) {
      setPieceFormError('Preencha nome, largura e altura da peça.');
      return;
    }

    if (width <= 0 || height <= 0) {
      setPieceFormError('As medidas da peça precisam ser maiores que zero.');
      return;
    }

    const placement = findAvailablePlacement(slab, {
      id: 'draft-piece',
      width,
      height,
    });

    if (!placement) {
      setPieceFormError('Não encontrei espaço livre para essa peça dentro da chapa atual.');
      return;
    }

    setSlab((prev) => ({
      ...prev,
      pieces: [
        ...prev.pieces,
        {
          id: Date.now().toString(),
          name: newPiece.name.trim(),
          width,
          height,
          x: placement.x,
          y: placement.y,
          color: '#4f46e5',
        },
      ],
    }));
    setPieceFormError('');
    setNewPiece({ name: '', w: '', h: '' });
  }, [newPiece, setSlab, slab]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isInput =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement;

      if (event.altKey) {
        if (event.key === '1') setActiveTab('base');
        if (event.key === '2') setActiveTab('cuts');
        if (event.key === '3') setActiveTab('chat');
        if (event.key === '4') setActiveTab('final');
      }

      if (event.key === 'Escape' && activeTab === 'base') {
        handleClearDimensions();
      }

      if (event.key === 'Enter' && activeTab === 'cuts' && isInput) {
        event.preventDefault();
        handleAddPiece();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleAddPiece, handleClearDimensions]);

  const updateAddress = (field: keyof Customer['address'], value: string) => {
    setCustomer((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));
  };

  return (
    <div className="flex flex-col h-full bg-white/40 backdrop-blur-md">
      <div className="flex p-4 gap-2 border-b border-slate-100 overflow-x-auto no-scrollbar">
        {[
          { id: 'base', icon: Move3d, label: 'Chapa', desc: 'Defina material, dimensões e acabamento.' },
          { id: 'cuts', icon: LayoutGrid, label: 'Cortes', desc: 'Cadastre e organize as peças do projeto.' },
          { id: 'chat', icon: MessageSquare, label: 'IA', desc: 'Receba orientações técnicas e operacionais.' },
          { id: 'final', icon: FileText, label: 'Venda', desc: 'Preencha cliente, custos e gere a proposta.' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
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
                  <label className={labelStyle}>
                    <Box size={10} /> Material e textura
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      className={inputStyle}
                      value={slab.material}
                      onChange={(event) => setSlab((prev) => ({ ...prev, material: event.target.value as MaterialType }))}
                    >
                      {Object.values(MaterialType).map((material) => (
                        <option key={material} value={material}>
                          {material}
                        </option>
                      ))}
                    </select>
                    <select
                      className={inputStyle}
                      value={slab.activeTextureId}
                      onChange={(event) => setSlab((prev) => ({ ...prev, activeTextureId: event.target.value }))}
                    >
                      {TEXTURE_OPTIONS.filter((texture) => texture.materialType === slab.material).map((texture) => (
                        <option key={texture.id} value={texture.id}>
                          {texture.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>

                <section>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className={labelStyle}>
                      <Ruler size={10} /> Dimensões da chapa (cm)
                    </label>
                    <button
                      onClick={handleClearDimensions}
                      className="text-[9px] font-black text-red-500 uppercase flex items-center gap-1 hover:underline"
                    >
                      <Trash size={10} /> Limpar
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'width', label: 'Largura' },
                      { key: 'height', label: 'Altura' },
                      { key: 'thickness', label: 'Espessura' },
                    ].map((field) => (
                      <div key={field.key}>
                        <input
                          type="number"
                          className={inputStyle}
                          value={(slab.dimensions as Record<string, number>)[field.key] || ''}
                          onChange={(event) =>
                            setSlab((prev) => ({
                              ...prev,
                              dimensions: {
                                ...prev.dimensions,
                                [field.key]: Math.max(0, parseFloat(event.target.value) || 0),
                              },
                            }))
                          }
                        />
                        <span className="text-[9px] font-bold text-slate-300 uppercase mt-1 block text-center">{field.label}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <label className={labelStyle}>
                    <RotateCw size={10} /> Curvatura e inclinação
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type="number"
                        className={slab.dimensions.curvature < 0 ? errorInputStyle : inputStyle}
                        value={slab.dimensions.curvature || ''}
                        onChange={(event) =>
                          setSlab((prev) => ({
                            ...prev,
                            dimensions: { ...prev.dimensions, curvature: Math.max(0, parseFloat(event.target.value) || 0) },
                          }))
                        }
                      />
                      <span className="text-[9px] font-bold text-slate-300 uppercase mt-1 block text-center">Raio (cm)</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        className={slab.dimensions.inclination < 0 ? errorInputStyle : inputStyle}
                        value={slab.dimensions.inclination || ''}
                        onChange={(event) =>
                          setSlab((prev) => ({
                            ...prev,
                            dimensions: { ...prev.dimensions, inclination: Math.max(0, parseFloat(event.target.value) || 0) },
                          }))
                        }
                      />
                      <span className="text-[9px] font-bold text-slate-300 uppercase mt-1 block text-center">Graus</span>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'cuts' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <section className="bg-slate-50 p-5 rounded-[24px] border border-slate-100">
                  <label className={labelStyle}>
                    <Plus size={10} /> Novo corte
                  </label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Nome da peça"
                      className={inputStyle}
                      value={newPiece.name}
                      onChange={(event) => {
                        setPieceFormError('');
                        setNewPiece((prev) => ({ ...prev, name: event.target.value }));
                      }}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        placeholder="Largura (cm)"
                        className={inputStyle}
                        value={newPiece.w}
                        onChange={(event) => {
                          setPieceFormError('');
                          setNewPiece((prev) => ({ ...prev, w: event.target.value }));
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Altura (cm)"
                        className={inputStyle}
                        value={newPiece.h}
                        onChange={(event) => {
                          setPieceFormError('');
                          setNewPiece((prev) => ({ ...prev, h: event.target.value }));
                        }}
                      />
                    </div>
                    {pieceFormError && <p className="text-xs text-red-600 font-medium">{pieceFormError}</p>}
                    <button
                      onClick={handleAddPiece}
                      className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                    >
                      <Plus size={14} /> Adicionar peça
                    </button>
                  </div>
                </section>

                {layoutIssues.length > 0 && (
                  <section className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-amber-800">Ajustes necessários no plano de corte</p>
                        <div className="mt-2 space-y-1">
                          {layoutIssues.slice(0, 4).map((issue, index) => (
                            <p key={`${issue.pieceId}-${index}`} className="text-xs text-amber-700">
                              {issue.message}
                            </p>
                          ))}
                          {layoutIssues.length > 4 && (
                            <p className="text-xs text-amber-700">Há mais inconsistências listadas nas peças abaixo.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                <div className="space-y-2">
                  {slab.pieces.length === 0 && (
                    <div className="bg-slate-50 border border-dashed border-slate-200 p-4 rounded-xl text-center text-sm text-slate-400">
                      Nenhuma peça cadastrada ainda.
                    </div>
                  )}
                  {slab.pieces.map((piece) => (
                    <div key={piece.id} className="bg-white border p-3 rounded-xl flex justify-between items-center shadow-sm">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-700">{piece.name}</h4>
                          {issuesByPieceId.has(piece.id) && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">
                              Revisar
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-slate-400">
                          {piece.width} x {piece.height} cm
                        </p>
                        {issuesByPieceId.get(piece.id)?.map((message, index) => (
                          <p key={`${piece.id}-${index}`} className="text-[10px] text-amber-600 mt-1">
                            {message}
                          </p>
                        ))}
                      </div>
                      <button
                        onClick={() => setSlab((prev) => ({ ...prev, pieces: prev.pieces.filter((current) => current.id !== piece.id) }))}
                        className="text-slate-300 hover:text-red-500 transition-colors p-2"
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
                <section className="space-y-4">
                  <label className={labelStyle}>
                    <User size={10} /> Cliente e projeto
                  </label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Nome do cliente"
                      className={inputStyle}
                      value={customer.name}
                      onChange={(event) => setCustomer((prev) => ({ ...prev, name: event.target.value }))}
                    />
                    <input
                      type="text"
                      placeholder="Nome do projeto"
                      className={inputStyle}
                      value={budget.projectName}
                      onChange={(event) => setBudget((prev) => ({ ...prev, projectName: event.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Telefone / WhatsApp"
                        className={inputStyle}
                        value={customer.phone}
                        onChange={(event) => setCustomer((prev) => ({ ...prev, phone: event.target.value }))}
                      />
                      <input
                        type="email"
                        placeholder="E-mail"
                        className={inputStyle}
                        value={customer.email}
                        onChange={(event) => setCustomer((prev) => ({ ...prev, email: event.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Rua"
                        className={inputStyle}
                        value={customer.address.street}
                        onChange={(event) => updateAddress('street', event.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Número"
                        className={inputStyle}
                        value={customer.address.number}
                        onChange={(event) => updateAddress('number', event.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Bairro"
                        className={inputStyle}
                        value={customer.address.district}
                        onChange={(event) => updateAddress('district', event.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Cidade"
                        className={inputStyle}
                        value={customer.address.city}
                        onChange={(event) => updateAddress('city', event.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="CEP"
                        className={inputStyle}
                        value={customer.address.zip}
                        onChange={(event) => updateAddress('zip', event.target.value)}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Forma de pagamento"
                      className={inputStyle}
                      value={customer.paymentMethod}
                      onChange={(event) => setCustomer((prev) => ({ ...prev, paymentMethod: event.target.value }))}
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <label className={labelStyle}>
                    <DollarSign size={10} /> Custos e condições
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      placeholder="Valor por m²"
                      className={inputStyle}
                      value={budget.pricePerMq || ''}
                      onChange={(event) => setBudget((prev) => ({ ...prev, pricePerMq: Math.max(0, parseFloat(event.target.value) || 0) }))}
                    />
                    <input
                      type="number"
                      placeholder="Mão de obra"
                      className={inputStyle}
                      value={budget.laborCost || ''}
                      onChange={(event) => setBudget((prev) => ({ ...prev, laborCost: Math.max(0, parseFloat(event.target.value) || 0) }))}
                    />
                    <input
                      type="number"
                      placeholder="Transporte"
                      className={inputStyle}
                      value={budget.transportCost || ''}
                      onChange={(event) => setBudget((prev) => ({ ...prev, transportCost: Math.max(0, parseFloat(event.target.value) || 0) }))}
                    />
                    <input
                      type="number"
                      placeholder="Instalação"
                      className={inputStyle}
                      value={budget.installationCost || ''}
                      onChange={(event) => setBudget((prev) => ({ ...prev, installationCost: Math.max(0, parseFloat(event.target.value) || 0) }))}
                    />
                    <input
                      type="number"
                      placeholder="Extras"
                      className={inputStyle}
                      value={budget.extraCosts || ''}
                      onChange={(event) => setBudget((prev) => ({ ...prev, extraCosts: Math.max(0, parseFloat(event.target.value) || 0) }))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        placeholder="Prazo (dias)"
                        className={inputStyle}
                        value={budget.deadlineDays || ''}
                        onChange={(event) => setBudget((prev) => ({ ...prev, deadlineDays: Math.max(0, parseFloat(event.target.value) || 0) }))}
                      />
                      <input
                        type="number"
                        placeholder="Validade (dias)"
                        className={inputStyle}
                        value={budget.validityDays || ''}
                        onChange={(event) => setBudget((prev) => ({ ...prev, validityDays: Math.max(0, parseFloat(event.target.value) || 0) }))}
                      />
                    </div>
                  </div>
                  <textarea
                    placeholder="Observações comerciais, acabamento, recortes, cubas, rodabanca e garantias..."
                    className={textareaStyle}
                    value={budget.notes}
                    onChange={(event) => setBudget((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </section>

                <section className="bg-indigo-50 p-5 rounded-[24px] border border-indigo-100 text-center space-y-3">
                  <Sparkles size={24} className="text-indigo-600 mx-auto" />
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Otimização profissional</p>
                  <textarea
                    placeholder="Ex.: priorizar menos desperdício, manter peças alinhadas e respeitar veios."
                    className={textareaStyle}
                    value={autoLayoutPrompt}
                    onChange={(event) => setAutoLayoutPrompt(event.target.value)}
                  />
                  <button
                    onClick={() => onAutoLayout(autoLayoutPrompt)}
                    disabled={isGenerating || slab.dimensions.width <= 0 || slab.dimensions.height <= 0}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg disabled:opacity-50 hover:bg-indigo-500 transition-colors"
                  >
                    {isGenerating ? 'Processando...' : 'Nesting automático IA'}
                  </button>
                </section>

                <section className="bg-slate-50 border border-slate-100 rounded-[24px] p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                      <AlertCircle size={16} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-700">Resumo comercial</p>
                      <p className="text-xs text-slate-500">O material considera a área total da chapa master. Ajuste os extras conforme transporte e instalação.</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {layoutIssues.length > 0 && (
                      <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-amber-700 text-xs font-medium">
                        Corrija {layoutIssues.length} problema(s) no plano de corte antes de fechar a proposta.
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500">
                      <span>Área total</span>
                      <span>{totalArea.toFixed(2)} m²</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Área útil</span>
                      <span>{usedArea.toFixed(2)} m²</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal material</span>
                      <span>{materialCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-black text-base">
                      <span>Total final</span>
                      <span>{totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  </div>
                </section>

                <button
                  onClick={onOpenPrint}
                  disabled={slab.dimensions.width <= 0 || slab.dimensions.height <= 0}
                  className="w-full bg-slate-900 text-white py-4 rounded-[20px] font-black text-xs uppercase flex items-center justify-center gap-3 shadow-xl hover:bg-slate-800 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:bg-slate-900 disabled:hover:scale-100"
                >
                  <Printer size={18} /> Gerar orçamento final
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sobra: {waste.toFixed(2)} m²</span>
          <span className="text-[11px] font-black text-indigo-600">
            Total: {totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-40">
          <Keyboard size={10} className="text-slate-400" />
          <span className="text-[8px] font-medium text-slate-500 uppercase">Dica: Alt + 1/2/3/4 para navegar rapidamente</span>
        </div>
      </div>
    </div>
  );
};
