import React, { useMemo } from 'react';
import { AlertCircle, ArrowLeft, Printer, Ruler, Scissors, Share2 } from 'lucide-react';
import { BudgetState, Customer, SlabState, TEXTURE_OPTIONS } from '../types';
import { validateLayout } from '../services/layoutValidation';

interface PrintLayoutProps {
  slab: SlabState;
  customer: Customer;
  budget: BudgetState;
  onBack: () => void;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({ slab, customer, budget, onBack }) => {
  const totalAreaM2 = (slab.dimensions.width * slab.dimensions.height) / 10000;
  const usedAreaM2 = slab.pieces.reduce((acc, piece) => acc + piece.width * piece.height, 0) / 10000;
  const wasteAreaM2 = Math.max(0, totalAreaM2 - usedAreaM2);
  const wastePercent = totalAreaM2 > 0 ? ((wasteAreaM2 / totalAreaM2) * 100).toFixed(1) : '0.0';
  const layoutIssues = useMemo(() => validateLayout(slab), [slab]);

  const materialCost = totalAreaM2 * budget.pricePerMq;
  const totalCost = materialCost + budget.laborCost + budget.transportCost + budget.installationCost + budget.extraCosts;
  const textureName = TEXTURE_OPTIONS.find((texture) => texture.id === slab.activeTextureId)?.name || slab.activeTextureId;

  const handlePrint = () => {
    window.setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleShareWhatsapp = () => {
    const formatBRL = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const message = [
      '*ORÇAMENTO - MARMORARIA ONLINE*',
      `Emitido em: ${dateStr} às ${timeStr}`,
      '',
      `Cliente: ${customer.name || 'Não informado'}`,
      `Contato: ${customer.phone || '-'}`,
      `Projeto: ${budget.projectName || 'Projeto sob medida'}`,
      '',
      '*Especificações*',
      `Material: ${slab.material} - ${textureName}`,
      `Chapa master: ${slab.dimensions.width}x${slab.dimensions.height} cm (${slab.dimensions.thickness} cm)`,
      '',
      `*Cortes (${slab.pieces.length} peças)*`,
      ...slab.pieces.map((piece, index) => `${index + 1}. ${piece.name}: ${piece.width}x${piece.height} cm`),
      '',
      layoutIssues.length > 0 ? '*Atenção: o plano de corte ainda tem conflitos de posicionamento.*' : '',
      ...layoutIssues.slice(0, 5).map((issue) => `- ${issue.message}`),
      '',
      '*Financeiro*',
      `Material: ${formatBRL(materialCost)}`,
      `Mão de obra: ${formatBRL(budget.laborCost)}`,
      `Transporte: ${formatBRL(budget.transportCost)}`,
      `Instalação: ${formatBRL(budget.installationCost)}`,
      `Extras: ${formatBRL(budget.extraCosts)}`,
      `TOTAL: ${formatBRL(totalCost)}`,
      '',
      `Pagamento: ${customer.paymentMethod || 'A combinar'}`,
      `Prazo: ${budget.deadlineDays || 0} dia(s)`,
      `Validade: ${budget.validityDays || 0} dia(s)`,
      budget.notes ? `Observações: ${budget.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8 flex flex-col items-center print:p-0 print:bg-white print:block">
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: white !important;
          }
          html, body {
            height: auto;
            overflow: visible;
          }
        }
      `}</style>

      <div className="w-full max-w-[210mm] flex justify-between items-center mb-8 print:hidden gap-4">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors shadow-sm font-medium">
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="flex gap-3">
          <button
            onClick={handleShareWhatsapp}
            className="flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white rounded transition-colors shadow-sm font-medium"
          >
            <Share2 size={16} /> WhatsApp
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors shadow-lg font-medium"
          >
            <Printer size={16} /> Imprimir / PDF
          </button>
        </div>
      </div>

      <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-[15mm] shadow-xl print:shadow-none print:w-full print:max-w-none print:min-h-0 print:p-[15mm] print:m-0 text-slate-900 border border-slate-200 print:border-none rounded-sm">
        <header className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
              Marmoraria <span className="text-indigo-600">Online</span>
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Orçamento técnico e comercial</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
              {new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-lg font-black text-indigo-600 font-mono">
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">Ref: {Date.now().toString().slice(-8)}</p>
          </div>
        </header>

        {layoutIssues.length > 0 && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-800">Plano de corte com conflitos</p>
                <div className="mt-2 space-y-1">
                  {layoutIssues.slice(0, 6).map((issue, index) => (
                    <p key={`${issue.pieceId}-${index}`} className="text-xs text-red-700">
                      {issue.message}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="space-y-3">
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-1 mb-2">Cliente</h3>
            <p className="font-black text-xl text-slate-800">{customer.name || 'Consumidor final'}</p>
            <div className="text-xs text-slate-500 space-y-1 font-medium">
              <p>{budget.projectName || 'Projeto sob medida'}</p>
              <p>{customer.phone || 'Telefone não informado'}</p>
              <p>{customer.email || 'E-mail não informado'}</p>
              <p>
                {customer.address.street || 'Endereço não informado'}
                {customer.address.number ? `, ${customer.address.number}` : ''}
              </p>
              <p>
                {customer.address.district || ''}
                {customer.address.city ? ` • ${customer.address.city}` : ''}
                {customer.address.zip ? ` • CEP ${customer.address.zip}` : ''}
              </p>
              <p>Pagamento: {customer.paymentMethod || 'A combinar'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-1 mb-2">Especificações técnicas</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
              <div>
                <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider">Material</span>
                <span className="font-black text-slate-700">{slab.material}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider">Acabamento</span>
                <span className="font-black text-slate-700">{textureName}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider">Dimensões master</span>
                <span className="font-black text-slate-700">
                  {slab.dimensions.width} x {slab.dimensions.height} cm
                </span>
              </div>
              <div>
                <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider">Espessura</span>
                <span className="font-black text-slate-700">{slab.dimensions.thickness} cm</span>
              </div>
              {slab.dimensions.curvature > 0 && (
                <div>
                  <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider">Raio de curvatura</span>
                  <span className="font-black text-slate-700">{slab.dimensions.curvature} cm</span>
                </div>
              )}
              {slab.dimensions.inclination > 0 && (
                <div>
                  <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider">Inclinação</span>
                  <span className="font-black text-slate-700">{slab.dimensions.inclination}°</span>
                </div>
              )}
              <div>
                <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider">Prazo</span>
                <span className="font-black text-slate-700">{budget.deadlineDays || 0} dia(s)</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider">Validade da proposta</span>
                <span className="font-black text-slate-700">{budget.validityDays || 0} dia(s)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 border-2 border-slate-100 rounded-[20px] p-6 bg-slate-50 page-break-inside-avoid shadow-inner relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <Scissors size={14} className="text-indigo-600" /> Mapa de otimização de corte
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                <span className="text-[9px] font-bold text-slate-400 uppercase">Peças válidas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-[9px] font-bold text-slate-400 uppercase">Conflitos</span>
              </div>
            </div>
          </div>

          <div
            className="w-full relative flex items-center justify-center bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm"
            style={{ aspectRatio: `${Math.max(1, slab.dimensions.width)}/${Math.max(1, slab.dimensions.height)}` }}
          >
            <svg
              viewBox={`0 0 ${Math.max(1, slab.dimensions.width)} ${Math.max(1, slab.dimensions.height)}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full block"
            >
              <rect x="0" y="0" width={slab.dimensions.width} height={slab.dimensions.height} fill="#fdfdfd" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5,5" />

              {slab.pieces.map((piece, index) => {
                const fontSize = Math.min(piece.width, piece.height) * 0.15;
                const showDetails = piece.width > 25 && piece.height > 15;
                const hasIssue = layoutIssues.some((issue) => issue.pieceId === piece.id);
                const pieceColor = hasIssue ? '#ef4444' : piece.color || '#4f46e5';

                return (
                  <g key={piece.id}>
                    <rect
                      x={piece.x}
                      y={piece.y}
                      width={piece.width}
                      height={piece.height}
                      fill={pieceColor}
                      fillOpacity="0.12"
                      stroke={pieceColor}
                      strokeWidth="1.5"
                    />
                    <text
                      x={piece.x + piece.width / 2}
                      y={piece.y + (showDetails ? piece.height / 2 - fontSize * 0.5 : piece.height / 2)}
                      dominantBaseline="middle"
                      textAnchor="middle"
                      fontSize={Math.max(4, fontSize * 1.2)}
                      fill={pieceColor}
                      className="font-sans font-black"
                    >
                      #{index + 1}
                    </text>
                    {showDetails && (
                      <text
                        x={piece.x + piece.width / 2}
                        y={piece.y + piece.height / 2 + fontSize * 1.1}
                        dominantBaseline="middle"
                        textAnchor="middle"
                        fontSize={Math.max(3, fontSize * 0.7)}
                        fill={pieceColor}
                        className="font-sans font-bold opacity-80"
                      >
                        {piece.width} x {piece.height} cm
                      </text>
                    )}
                  </g>
                );
              })}

              <line x1="0" y1="-5" x2={slab.dimensions.width} y2="-5" stroke="#94a3b8" strokeWidth="1" />
              <line x1="-5" y1="0" x2="-5" y2={slab.dimensions.height} stroke="#94a3b8" strokeWidth="1" />
            </svg>
          </div>

          <div className="flex justify-between mt-4">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1">
              <Ruler size={10} /> Escala proporcional automatizada
            </p>
            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
              Aproveitamento: {(100 - parseFloat(wastePercent)).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-1 mb-4">Detalhamento dos cortes</h3>
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="py-3 px-4 font-black text-slate-500 uppercase tracking-wider border-y border-slate-100 rounded-l-xl">ID</th>
                <th className="py-3 px-4 font-black text-slate-500 uppercase tracking-wider border-y border-slate-100">Descrição</th>
                <th className="py-3 px-4 font-black text-slate-500 uppercase tracking-wider border-y border-slate-100 text-center">Medidas (cm)</th>
                <th className="py-3 px-4 font-black text-slate-500 uppercase tracking-wider border-y border-slate-100 text-right rounded-r-xl">Área (m²)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {slab.pieces.map((piece, index) => {
                const pieceIssues = layoutIssues.filter((issue) => issue.pieceId === piece.id);

                return (
                  <tr key={piece.id} className={`transition-colors ${pieceIssues.length > 0 ? 'bg-red-50/70' : 'hover:bg-slate-50/50'}`}>
                    <td className="py-3 px-4 font-bold text-indigo-600">#{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-700 uppercase tracking-tight">{piece.name}</div>
                      {pieceIssues.map((issue, issueIndex) => (
                        <div key={`${piece.id}-${issueIndex}`} className="text-[10px] text-red-600 mt-1">
                          {issue.message}
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-500 font-bold">
                      {piece.width} x {piece.height}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-700">{((piece.width * piece.height) / 10000).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50/30">
                <td colSpan={3} className="py-4 px-4 font-black text-slate-500 text-right uppercase tracking-widest">
                  Área útil acumulada:
                </td>
                <td className="py-4 px-4 font-black text-xl text-indigo-600 text-right">
                  {usedAreaM2.toFixed(2)} <span className="text-xs">m²</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="border-t-2 border-slate-900 pt-8 mt-auto page-break-inside-avoid">
          <div className="flex justify-between items-start gap-12">
            <div className="flex-1">
              <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-4">Relatório de eficiência</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-bold uppercase">
                  <span className="text-slate-400">Total da chapa:</span>
                  <span className="text-slate-700">{totalAreaM2.toFixed(2)} m²</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold uppercase">
                  <span className="text-slate-400">Desperdício estimado:</span>
                  <span className={parseFloat(wastePercent) > 30 ? 'text-red-500' : 'text-green-600'}>
                    {wastePercent}% ({wasteAreaM2.toFixed(2)} m²)
                  </span>
                </div>
                {layoutIssues.length > 0 && (
                  <div className="flex justify-between text-[11px] font-bold uppercase">
                    <span className="text-slate-400">Conflitos de corte:</span>
                    <span className="text-red-500">{layoutIssues.length}</span>
                  </div>
                )}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000" style={{ width: `${100 - parseFloat(wastePercent)}%` }} />
                </div>
                {budget.notes && (
                  <div className="pt-4 text-xs text-slate-500 leading-relaxed">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Observações</span>
                    {budget.notes}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full max-w-[300px] bg-slate-900 text-white p-6 rounded-[24px] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="text-7xl font-black">R$</span>
              </div>
              <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-4 relative">Resumo financeiro</h3>
              <div className="space-y-3 relative">
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                  <span>Material</span>
                  <span>{materialCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                  <span>Mão de obra</span>
                  <span>{budget.laborCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                  <span>Transporte</span>
                  <span>{budget.transportCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                  <span>Instalação</span>
                  <span>{budget.installationCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                  <span>Extras</span>
                  <span>{budget.extraCosts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="flex justify-between items-end pt-3 border-t border-white/10 mt-2">
                  <span className="text-[10px] font-black uppercase text-indigo-400">Valor total</span>
                  <span className="text-2xl font-black tracking-tighter">{totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">
            <p>Gerado por Marmoraria Online</p>
            <p className="text-slate-200">•</p>
            <p>Aprovação do cliente: ________________________________</p>
          </div>
        </div>
      </div>
    </div>
  );
};
