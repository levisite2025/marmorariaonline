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
  scale: number;
}

export const TEXTURE_OPTIONS: TextureDefinition[] = [
  { id: 'carrara', name: 'Branco Carrara', materialType: MaterialType.MARBLE, colorBase: '#f8fafc', colorVein: '#cbd5e1', scale: 1 },
  { id: 'nero', name: 'Nero Marquina', materialType: MaterialType.MARBLE, colorBase: '#1e293b', colorVein: '#ffffff', scale: 1 },
  { id: 'calacatta', name: 'Calacatta Gold', materialType: MaterialType.MARBLE, colorBase: '#ffffff', colorVein: '#fbbf24', scale: 1.2 },
  { id: 'saogabriel', name: 'Preto São Gabriel', materialType: MaterialType.GRANITE, colorBase: '#0f172a', colorVein: '#334155', scale: 0.5 },
  { id: 'itaunas', name: 'Branco Itaúnas', materialType: MaterialType.GRANITE, colorBase: '#f1f5f9', colorVein: '#94a3b8', scale: 0.4 },
  { id: 'uabatuba', name: 'Verde Ubatuba', materialType: MaterialType.GRANITE, colorBase: '#064e3b', colorVein: '#065f46', scale: 0.6 }
];

export interface Dimensions {
  width: number;
  height: number;
  thickness: number;
  curvature: number;
  inclination: number;
}

export interface CutPiece {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
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
  pricePerMq: number;
  extraCosts: number;
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