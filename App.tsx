import React, { useState } from 'react';
import { Scene3D } from './components/Scene3D';
import { Controls } from './components/Controls';
import { PrintLayout } from './components/PrintLayout';
import { LoginScreen } from './components/LoginScreen';
import { SetupScreen } from './components/SetupScreen';
import { SlabState, MaterialType, Customer, BudgetState } from './types';
import { optimizeLayout } from './services/gemini';
import { Box, Cpu } from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  
  const [slab, setSlab] = useState<SlabState>({
    material: MaterialType.GRANITE,
    activeTextureId: 'saogabriel',
    dimensions: { width: 280, height: 160, thickness: 2, curvature: 0, inclination: 0 },
    pieces: []
  });

  const [customer, setCustomer] = useState<Customer>({
    name: '', phone: '', email: '',
    address: { street: '', number: '', district: '', city: '', zip: '' },
    paymentMethod: ''
  });

  const [budget, setBudget] = useState<BudgetState>({ pricePerMq: 0, extraCosts: 0 });
  const [isGeneratingLayout, setIsGeneratingLayout] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);

  if (!isAuthenticated) return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  
  if (!isSetupComplete) {
    return (
      <SetupScreen 
        onConfirm={(initialData) => {
          setSlab(prev => ({
            ...prev,
            ...initialData,
            dimensions: { ...prev.dimensions, ...initialData.dimensions }
          }));
          setIsSetupComplete(true);
        }} 
      />
    );
  }

  if (showPrintView) return <PrintLayout slab={slab} customer={customer} budget={budget} onBack={() => setShowPrintView(false)} />;

  return (
    <div className="h-screen w-screen relative bg-[#f8fafc] flex flex-col md:flex-row overflow-hidden">
      <main className="flex-1 relative z-0">
        <Scene3D slab={slab} setSlab={setSlab} />
        <div className="absolute top-8 left-8 flex items-center gap-4 pointer-events-none select-none">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl shadow-xl flex items-center justify-center transform -rotate-6">
            <Box size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tighter leading-none">Marmore <span className="text-indigo-600">Online</span></h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1">
              <Cpu size={10} /> Machine Render 3.0
            </p>
          </div>
        </div>
      </main>

      <aside className="w-full md:w-[420px] h-[50vh] md:h-auto glass md:m-6 md:rounded-[32px] shadow-2xl z-20 flex flex-col overflow-hidden border border-white/40">
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-sky-400" />
        <Controls 
          slab={slab} setSlab={setSlab} 
          customer={customer} setCustomer={setCustomer}
          budget={budget} setBudget={setBudget}
          onAutoLayout={async (d) => {
            setIsGeneratingLayout(true);
            try {
              const res = await optimizeLayout(d, slab.dimensions.width, slab.dimensions.height);
              setSlab(p => ({ ...p, pieces: res.pieces.map((pc, i) => ({ ...pc, id: `ai-${i}-${Date.now()}`, color: '#6366f1' })) }));
            } catch (err) {
              console.error("AutoLayout Error", err);
            } finally { setIsGeneratingLayout(false); }
          }}
          onOpenPrint={() => setShowPrintView(true)}
          isGenerating={isGeneratingLayout}
        />
      </aside>
    </div>
  );
};

export default App;