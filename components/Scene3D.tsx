import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { OrbitControls, Stage, Text, Grid, Center, Html, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';
import { SlabState, CutPiece, MaterialType, TEXTURE_OPTIONS } from '../types';
import { MousePointer2, Move, ZoomIn, Loader2 } from 'lucide-react';

interface Scene3DProps {
  slab: SlabState;
  setSlab?: React.Dispatch<React.SetStateAction<SlabState>>;
}

// "Virtual Texture Machine" - Sistema de Cache de Texturas para evitar re-renderizações pesadas
const textureCache: Record<string, THREE.CanvasTexture> = {};

const getOptimizedTexture = (textureId: string) => {
  if (textureCache[textureId]) return textureCache[textureId];

  const def = TEXTURE_OPTIONS.find(t => t.id === textureId) || TEXTURE_OPTIONS[0];
  const canvas = document.createElement('canvas');
  canvas.width = 512; // Resolução otimizada para performance
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = def.colorBase;
    ctx.fillRect(0, 0, 512, 512);

    if (def.materialType === MaterialType.MARBLE) {
      ctx.strokeStyle = def.colorVein;
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        ctx.globalAlpha = Math.random() * 0.4 + 0.1;
        ctx.beginPath();
        ctx.moveTo(Math.random() * 512, Math.random() * 512);
        ctx.bezierCurveTo(Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512);
        ctx.stroke();
      }
    } else if (def.materialType === MaterialType.GRANITE) {
      for (let i = 0; i < 20000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? def.colorVein : '#000000';
        ctx.globalAlpha = 0.15;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4; // Qualidade sem peso excessivo
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  textureCache[textureId] = texture;
  return texture;
};

const PieceMesh: React.FC<{ piece: CutPiece, thickness: number, isSelected: boolean, onSelect: (id: string) => void, onUpdate: (id: string, x: number, y: number) => void }> = ({ piece, thickness, isSelected, onSelect, onUpdate }) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const intersection = new THREE.Vector3();

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect(piece.id);
    setIsDragging(true);
    (e.target as any).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    e.ray.intersectPlane(dragPlane, intersection);
    // Atualiza com lógica de snap/grid opcional no futuro
    onUpdate(piece.id, intersection.x - piece.width / 2, intersection.y - piece.height / 2);
  };

  return (
    <group position={[piece.x + piece.width / 2, piece.y + piece.height / 2, thickness / 2 + 0.1]}>
      <mesh 
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => setIsDragging(false)}
      >
        <boxGeometry args={[piece.width, piece.height, thickness + 0.2]} />
        <meshStandardMaterial 
          color={isSelected ? "#3b82f6" : "#ffffff"} 
          transparent 
          opacity={isSelected ? 0.6 : 0.3} 
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>
      <mesh>
        <boxGeometry args={[piece.width, piece.height, thickness + 0.22]} />
        <meshBasicMaterial color={isSelected ? "#2563eb" : "#94a3b8"} wireframe />
      </mesh>
      
      {isSelected && (
        <Html center position={[0, 0, thickness + 5]}>
          <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border border-blue-200 shadow-xl text-[10px] font-bold text-blue-600 uppercase tracking-tighter whitespace-nowrap">
            {piece.name} ({piece.width}x{piece.height})
          </div>
        </Html>
      )}
    </group>
  );
};

export const Scene3D: React.FC<Scene3DProps> = ({ slab, setSlab }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const texture = useMemo(() => getOptimizedTexture(slab.activeTextureId), [slab.activeTextureId]);

  const updatePiece = (id: string, x: number, y: number) => {
    if (!setSlab) return;
    setSlab(prev => ({
      ...prev,
      pieces: prev.pieces.map(p => p.id === id ? { ...p, x, y } : p)
    }));
  };

  return (
    <div className="w-full h-full relative">
      <Canvas 
        shadows 
        dpr={[1, 1.5]} // Performance balance
        camera={{ position: [200, -200, 400], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={['#f8fafc']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[100, 100, 100]} intensity={1} castShadow />
        
        <Center top>
          <group rotation={[0, 0, 0]}>
            {/* Main Slab */}
            <mesh receiveShadow castShadow onClick={() => setSelectedId(null)}>
              <boxGeometry args={[slab.dimensions.width, slab.dimensions.height, slab.dimensions.thickness]} />
              <meshStandardMaterial map={texture} roughness={0.3} metalness={0.2} />
            </mesh>

            {/* Dimension Lines */}
            <Text position={[0, -slab.dimensions.height / 2 - 20, 0]} fontSize={12} color="#64748b">
              {slab.dimensions.width} cm
            </Text>
            <Text position={[-slab.dimensions.width / 2 - 20, 0, 0]} rotation={[0, 0, Math.PI / 2]} fontSize={12} color="#64748b">
              {slab.dimensions.height} cm
            </Text>

            {/* Pieces */}
            {slab.pieces.map(piece => (
              <PieceMesh 
                key={piece.id} 
                piece={piece} 
                thickness={slab.dimensions.thickness} 
                isSelected={selectedId === piece.id}
                onSelect={setSelectedId}
                onUpdate={updatePiece}
              />
            ))}
          </group>
        </Center>

        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
        <Grid infiniteGrid fadeDistance={1500} sectionSize={100} cellSize={20} cellColor="#cbd5e1" sectionColor="#94a3b8" />
        <Environment preset="city" />
      </Canvas>

      {/* Floating UI Hints */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 pointer-events-none">
        <div className="glass px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm border-white/50">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">GPU Acelerada</span>
        </div>
      </div>
    </div>
  );
};