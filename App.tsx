import React, { useState } from 'react';
import { Scene3D } from './components/Scene3D';
import { Controls } from './components/Controls';
import { PrintLayout } from './components/PrintLayout';
import { LoginScreen } from './components/LoginScreen';
import { SlabState, MaterialType, CutPiece, Customer, BudgetState } from './types';
import { optimizeLayout } from './services/gemini';
import { Box } from 'lucide-react';

const App: React.FC = () => {
  // Estado de Autenticação
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [slab, setSlab] = useState<SlabState>({
    material: MaterialType.GRANITE,
    activeTextureId: 'saogabriel',
    dimensions: { width: 300, height: 180, thickness: 2, curvature: 0, inclination: 0 },
    pieces: []
  });

  const [customer, setCustomer] = useState<Customer>({
    name: '',
    phone: '',
    email: '',
    address: {
      street: '',
      number: '',
      district: '',
      city: '',
      zip: ''
    },
    paymentMethod: ''
  });

  const [budget, setBudget] = useState<BudgetState>({
    pricePerMq: 0,
    extraCosts: 0
  });
  
  const [isGeneratingLayout, setIsGeneratingLayout] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);

  const handleAutoLayout = async (description: string) => {
    setIsGeneratingLayout(true);
    try {
      const result = await optimizeLayout(description, slab.dimensions.width, slab.dimensions.height);
      
      const newPieces: CutPiece[] = result.pieces.map((p, index) => ({
        id: `auto-${Date.now()}-${index}`,
        name: p.name,
        width: p.width,
        height: p.height,
        x: p.x,
        y: p.y,
        color: `hsl(${(index * 30) % 360}, 70%, 50%)` // Cores mais sólidas para o tema claro
      }));

      setSlab(prev => ({
        ...prev,
        pieces: newPieces
      }));
    } catch (e) {
      alert("Erro ao gerar layout. Tente novamente ou verifique sua API Key.");
    } finally {
      setIsGeneratingLayout(false);
    }
  };

  // Se não estiver autenticado, mostra a tela de login
  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  // Se estiver em modo de impressão
  if (showPrintView) {
    return (
      <PrintLayout 
        slab={slab} 
        customer={customer} 
        budget={budget} 
        onBack={() => setShowPrintView(false)} 
      />
    );
  }

  // Aplicação Principal
  return (
    <div className="h-screen w-screen relative bg-slate-50 text-slate-900 overflow-hidden font-sans selection:bg-orange-200 selection:text-orange-900">
      
      {/* 3D Viewport - Takes full screen */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-100 to-slate-200">
        <Scene3D slab={slab} setSlab={setSlab} />
      </div>

      {/* Floating Header - Clean White */}
      <header className="absolute top-4 left-0 right-0 h-20 px-8 z-20 pointer-events-none flex justify-between items-start">
        <div className="bg-white/90 backdrop-blur-md p-2 pr-6 rounded-2xl shadow-lg border border-slate-200 flex items-center gap-4 pointer-events-auto">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20">
             <Box size={24} className="text-white" />
          </div>
          <div>
             <h1 className="font-bold text-xl tracking-tight text-slate-800 leading-none">
               Marmore <span className="text-blue-600">Online</span>
             </h1>
             <div className="flex items-center gap-2 mt-1">
               <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
               <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">Studio Professional</p>
             </div>
          </div>
        </div>
      </header>

      {/* Light Theme Sidebar */}
      <aside className="absolute top-28 left-8 bottom-8 w-[380px] bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-2xl shadow-slate-300/50 z-20 flex flex-col overflow-hidden">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-orange-500" />
        
        <Controls 
          slab={slab} 
          setSlab={setSlab} 
          customer={customer}
          setCustomer={setCustomer}
          budget={budget}
          setBudget={setBudget}
          onAutoLayout={handleAutoLayout}
          onOpenPrint={() => setShowPrintView(true)}
          isGenerating={isGeneratingLayout}
        />
      </aside>

    </div>
  );
};

export default App;