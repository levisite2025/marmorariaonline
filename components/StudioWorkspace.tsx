import React, { useState } from 'react';
import { Controls } from './Controls';
import { Scene3D } from './Scene3D';
import { BudgetState, Customer, SlabState } from '../types';
import { optimizeLayout } from '../services/gemini';

interface StudioWorkspaceProps {
  slab: SlabState;
  setSlab: React.Dispatch<React.SetStateAction<SlabState>>;
  customer: Customer;
  setCustomer: React.Dispatch<React.SetStateAction<Customer>>;
  budget: BudgetState;
  setBudget: React.Dispatch<React.SetStateAction<BudgetState>>;
  onOpenPrint: () => void;
  onNotify: (message: string) => void;
  onSave: () => void;
  onReset: () => void;
  workspaceTotal: number;
}

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  slab,
  setSlab,
  customer,
  setCustomer,
  budget,
  setBudget,
  onOpenPrint,
  onNotify,
  onSave,
  onReset,
  workspaceTotal,
}) => {
  const [isGeneratingLayout, setIsGeneratingLayout] = useState(false);

  return (
    <section className="space-y-5 min-h-0">
      <div className="bg-white rounded-3xl border border-slate-200 p-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">Projeto ativo</p>
          <h3 className="mt-2 text-2xl font-black">{budget.projectName}</h3>
          <p className="text-sm text-slate-500">
            {customer.name || 'Cliente nao definido'} • {workspaceTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onReset} className="px-4 py-3 rounded-2xl bg-slate-100 font-bold">Novo projeto</button>
          <button onClick={onSave} className="px-4 py-3 rounded-2xl bg-slate-900 text-white font-bold">Salvar</button>
        </div>
      </div>

      <div className="min-h-[760px] h-[calc(100vh-220px)] bg-white rounded-[36px] border border-slate-200 overflow-hidden flex">
        <div className="flex-1 relative min-h-0">
          <Scene3D slab={slab} setSlab={setSlab} />
        </div>
        <div className="w-[460px] min-w-[460px] border-l border-slate-200 overflow-hidden">
          <Controls
            slab={slab}
            setSlab={setSlab}
            customer={customer}
            setCustomer={setCustomer}
            budget={budget}
            setBudget={setBudget}
            onAutoLayout={async (description) => {
              setIsGeneratingLayout(true);
              try {
                const fallbackDescription = slab.pieces.length
                  ? slab.pieces.map((piece) => `${piece.name}: ${piece.width}x${piece.height} cm`).join('; ')
                  : 'Organizar cortes respeitando as medidas da chapa.';
                const response = await optimizeLayout(description.trim() || fallbackDescription, slab.dimensions.width, slab.dimensions.height);
                setSlab((prev) => ({
                  ...prev,
                  pieces: response.pieces.map((piece, index) => ({
                    id: `ai-${index}-${Date.now()}`,
                    name: piece.name?.trim() || `Peça ${index + 1}`,
                    width: Math.max(0, Number(piece.width) || 0),
                    height: Math.max(0, Number(piece.height) || 0),
                    x: Math.max(0, Number(piece.x) || 0),
                    y: Math.max(0, Number(piece.y) || 0),
                    color: '#6366f1',
                  })),
                }));
              } catch (error) {
                console.error('AutoLayout Error', error);
                onNotify('Nao foi possivel gerar o nesting automatico.');
              } finally {
                setIsGeneratingLayout(false);
              }
            }}
            onOpenPrint={onOpenPrint}
            isGenerating={isGeneratingLayout}
          />
        </div>
      </div>
    </section>
  );
};
