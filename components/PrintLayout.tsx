import React from 'react';
import { SlabState, Customer, BudgetState, TEXTURE_OPTIONS } from '../types';
import { ArrowLeft, Printer, Scissors, Share2 } from 'lucide-react';

interface PrintLayoutProps {
  slab: SlabState;
  customer: Customer;
  budget: BudgetState;
  onBack: () => void;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({ slab, customer, budget, onBack }) => {
  
  const totalAreaM2 = (slab.dimensions.width * slab.dimensions.height) / 10000;
  const usedAreaM2 = slab.pieces.reduce((acc, p) => acc + (p.width * p.height), 0) / 10000;
  const wasteAreaM2 = totalAreaM2 - usedAreaM2;
  const wastePercent = totalAreaM2 > 0 ? ((wasteAreaM2 / totalAreaM2) * 100).toFixed(1) : '0.0';
  
  const materialCost = totalAreaM2 * budget.pricePerMq;
  const totalCost = materialCost + budget.extraCosts;
  
  const textureName = TEXTURE_OPTIONS.find(t => t.id === slab.activeTextureId)?.name || slab.activeTextureId;

  const handlePrint = () => {
    // Timeout pequeno garante que a renderização do DOM esteja completa antes de chamar o print
    setTimeout(() => {
        window.print();
    }, 100);
  };

  const handleShareWhatsapp = () => {
    const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const message = [
      `📋 *ORÇAMENTO - MARMORE ONLINE*`,
      `📅 Emitido em: ${dateStr} às ${timeStr}`,
      ``,
      `👤 *Cliente:* ${customer.name || 'Não informado'}`,
      `📞 *Contato:* ${customer.phone || '-'}`,
      ``,
      `🪨 *Projeto:*`,
      `Material: ${slab.material} - ${textureName}`,
      `Dimensões: ${slab.dimensions.width}x${slab.dimensions.height} cm (${slab.dimensions.thickness}cm)`,
      ``,
      `✂️ *Cortes (${slab.pieces.length} peças):*`,
      ...slab.pieces.map((p, i) => `  ${i + 1}. ${p.name}: ${p.width}x${p.height} cm`),
      ``,
      `📊 *Métricas:*`,
      `Área Total: ${totalAreaM2.toFixed(2)} m²`,
      `Área Útil: ${usedAreaM2.toFixed(2)} m²`,
      ``,
      `💰 *Financeiro:*`,
      `Material: ${formatBRL(materialCost)}`,
      `Adicionais: ${formatBRL(budget.extraCosts)}`,
      `----------------`,
      `*TOTAL: ${formatBRL(totalCost)}*`
    ].join('\n');

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8 flex flex-col items-center print:p-0 print:bg-white print:block">
      {/* Estilos Globais de Impressão */}
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
          /* Garante que nada mais interfira no layout */
          html, body {
            height: auto;
            overflow: visible;
          }
        }
      `}</style>

      {/* Toolbar - Não aparece na impressão */}
      <div className="w-full max-w-[210mm] flex justify-between items-center mb-8 print:hidden gap-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors shadow-sm"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        
        <div className="flex gap-3">
          <button 
            onClick={handleShareWhatsapp}
            className="flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white rounded transition-colors shadow-sm font-medium"
            title="Enviar resumo para o WhatsApp"
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

      {/* A4 Page Container */}
      <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-[15mm] shadow-xl print:shadow-none print:w-full print:max-w-none print:min-h-0 print:p-[15mm] print:m-0 text-slate-900">
        
        {/* Header */}
        <header className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Marmore Online</h1>
            <p className="text-sm text-slate-500 mt-1">Orçamento & Plano de Corte</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900 uppercase">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-lg font-mono text-slate-700 font-bold">
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-slate-400 mt-1">ID: {Date.now().toString().slice(-6)}</p>
          </div>
        </header>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="space-y-2">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 border-b pb-1 mb-2">Cliente</h3>
            <p className="font-bold text-lg">{customer.name || 'Nome não informado'}</p>
            <div className="text-sm text-slate-600 space-y-1">
              <p>{customer.phone}</p>
              <p>{customer.email}</p>
              <p>{customer.address.street}, {customer.address.number}</p>
              <p>{customer.address.district} - {customer.address.city}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 border-b pb-1 mb-2">Projeto</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
               <div>
                 <span className="block text-slate-500 text-xs">Material</span>
                 <span className="font-medium">{slab.material}</span>
               </div>
               <div>
                 <span className="block text-slate-500 text-xs">Acabamento/Cor</span>
                 <span className="font-medium">{textureName}</span>
               </div>
               <div>
                 <span className="block text-slate-500 text-xs">Dimensões Chapa</span>
                 <span className="font-medium">{slab.dimensions.width} x {slab.dimensions.height} cm</span>
               </div>
               <div>
                 <span className="block text-slate-500 text-xs">Espessura</span>
                 <span className="font-medium">{slab.dimensions.thickness} cm</span>
               </div>
               {(slab.dimensions.curvature > 0 || slab.dimensions.inclination > 0) && (
                 <>
                   <div>
                     <span className="block text-slate-500 text-xs">Curvatura (Raio)</span>
                     <span className="font-medium">{slab.dimensions.curvature} cm</span>
                   </div>
                   <div>
                     <span className="block text-slate-500 text-xs">Inclinação</span>
                     <span className="font-medium">{slab.dimensions.inclination}°</span>
                   </div>
                 </>
               )}
            </div>
          </div>
        </div>

        {/* 2D Diagram */}
        <div className="mb-8 border rounded-lg p-4 bg-slate-50 page-break-inside-avoid print:bg-slate-50 print:border-slate-300">
           <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
             <Scissors size={14} /> Diagrama de Corte
           </h3>
           <div className="w-full aspect-[3/2] relative flex items-center justify-center bg-slate-100/50 border-2 border-slate-300 rounded overflow-hidden print:bg-slate-100">
              {/* SVG Rendering of the Slab */}
              <svg 
                viewBox={`0 0 ${Math.max(1, slab.dimensions.width)} ${Math.max(1, slab.dimensions.height)}`} 
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full block"
              >
                {/* Master Slab */}
                <rect 
                  x="0" y="0" 
                  width={slab.dimensions.width} 
                  height={slab.dimensions.height} 
                  fill="#f8fafc" 
                  stroke="none"
                />
                
                {/* Pieces */}
                {slab.pieces.map((piece, i) => (
                  <g key={piece.id}>
                    <rect
                      x={piece.x}
                      y={piece.y}
                      width={piece.width}
                      height={piece.height}
                      fill="#e2e8f0"
                      stroke="#334155"
                      strokeWidth="1"
                    />
                    {/* Piece Dimensions Text (Only if fits) */}
                    {(piece.width > 20 && piece.height > 20) && (
                      <text
                        x={piece.x + piece.width / 2}
                        y={piece.y + piece.height / 2}
                        dominantBaseline="middle"
                        textAnchor="middle"
                        fontSize={Math.min(piece.width, piece.height) * 0.2}
                        fill="#0f172a"
                        className="font-sans font-bold"
                      >
                        #{i + 1}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
           </div>
           <p className="text-center text-xs text-slate-400 mt-2">Visualização esquemática 2D - Escala Proporcional</p>
        </div>

        {/* Cut List Table */}
        <div className="mb-8">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 border-b pb-1 mb-3">Lista de Cortes</h3>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 font-semibold text-slate-700">#</th>
                <th className="py-2 font-semibold text-slate-700">Descrição</th>
                <th className="py-2 font-semibold text-slate-700 text-right">Largura</th>
                <th className="py-2 font-semibold text-slate-700 text-right">Altura</th>
                <th className="py-2 font-semibold text-slate-700 text-right">Área (m²)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {slab.pieces.map((piece, i) => (
                <tr key={piece.id}>
                  <td className="py-2 text-slate-500">{i + 1}</td>
                  <td className="py-2 font-medium">{piece.name}</td>
                  <td className="py-2 text-right">{piece.width} cm</td>
                  <td className="py-2 text-right">{piece.height} cm</td>
                  <td className="py-2 text-right">{((piece.width * piece.height) / 10000).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td colSpan={4} className="py-3 font-bold text-right">Área Utilizada Total:</td>
                <td className="py-3 font-bold text-right">{usedAreaM2.toFixed(2)} m²</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="border-t-2 border-slate-900 pt-6 mt-auto page-break-inside-avoid">
          <div className="flex justify-between items-start">
            <div className="w-1/2">
               <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-2">Métricas</h3>
               <div className="grid grid-cols-2 gap-y-1 text-sm text-slate-600">
                 <span>Área Chapa:</span>
                 <span>{totalAreaM2.toFixed(2)} m²</span>
                 <span>Desperdício:</span>
                 <span>{wastePercent}% ({wasteAreaM2.toFixed(2)} m²)</span>
               </div>
            </div>
            <div className="w-1/2 max-w-xs">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-2 text-right">Orçamento</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Material ({totalAreaM2.toFixed(2)}m² x {budget.pricePerMq.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>
                  <span>{materialCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Custos Adicionais</span>
                  <span>{budget.extraCosts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t border-slate-300 pt-2 mt-2 text-slate-900">
                  <span>Total</span>
                  <span>{totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
             <p>Orçamento válido por 15 dias. Sujeito a disponibilidade de estoque.</p>
             <p>Gerado por Marmore Online - marmoreonline.com</p>
          </div>
        </div>

      </div>
    </div>
  );
};