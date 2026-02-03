export enum MaterialType {
  MARBLE = 'Mármore',
  GRANITE = 'Granito',
  QUARTZ = 'Quartzo',
  SOAPSTONE = 'Pedra Sabão'
}

export interface TextureDefinition {
  id: string;
  name: string;
  materialType: MaterialType;
  colorBase: string;
  colorVein: string;
  scale: number; // Scale of the texture pattern
}

export const TEXTURE_OPTIONS: TextureDefinition[] = [
  // Mármores
  { id: 'carrara', name: 'Branco Carrara', materialType: MaterialType.MARBLE, colorBase: '#f0f0f0', colorVein: '#cbd5e1', scale: 1 },
  { id: 'nero', name: 'Nero Marquina', materialType: MaterialType.MARBLE, colorBase: '#1a1a1a', colorVein: '#ffffff', scale: 1 },
  { id: 'calacatta', name: 'Calacatta Gold', materialType: MaterialType.MARBLE, colorBase: '#fafafa', colorVein: '#d4af37', scale: 1.2 },
  // Granitos
  { id: 'saogabriel', name: 'Preto São Gabriel', materialType: MaterialType.GRANITE, colorBase: '#111111', colorVein: '#333333', scale: 0.5 },
  { id: 'itaunas', name: 'Branco Itaúnas', materialType: MaterialType.GRANITE, colorBase: '#e2e8f0', colorVein: '#94a3b8', scale: 0.4 },
  { id: 'samoa', name: 'Samoa Light', materialType: MaterialType.GRANITE, colorBase: '#f1f5f9', colorVein: '#64748b', scale: 0.6 },
  // Quartzo
  { id: 'purewhite', name: 'Branco Puro', materialType: MaterialType.QUARTZ, colorBase: '#ffffff', colorVein: '#ffffff', scale: 0 },
  { id: 'concrete', name: 'Concrete Grey', materialType: MaterialType.QUARTZ, colorBase: '#94a3b8', colorVein: '#64748b', scale: 0.1 },
];

export interface Dimensions {
  width: number; // cm
  height: number; // cm
  thickness: number; // cm
  curvature: number; // cm (raio)
  inclination: number; // graus (ou cm de desnível)
}

export interface CutPiece {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number; // Position on master slab
  y: number; // Position on master slab
  color: string;
}

export interface Customer {
  name: string;
  phone: string;
  email: string;
  address: {
    street: string;
    number: string;
    district: string;
    city: string;
    zip: string;
  };
  paymentMethod: string;
}

export interface BudgetState {
  pricePerMq: number; // Preço por metro quadrado do material
  extraCosts: number; // Custos extras (acabamento, frete, mão de obra)
}

export interface SlabState {
  material: MaterialType;
  activeTextureId: string;
  dimensions: Dimensions;
  pieces: CutPiece[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}