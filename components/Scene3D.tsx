
import React, { useMemo, useState, useRef } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stage, Text, Grid, Center, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { SlabState, CutPiece, MaterialType, TEXTURE_OPTIONS } from '../types';
import { MousePointer2, Move, Ruler } from 'lucide-react';

// Aliases para elementos intrínsecos do Three.js para resolver erros de tipos JSX
const group = 'group' as any;
const mesh = 'mesh' as any;
const boxGeometry = 'boxGeometry' as any;
const meshStandardMaterial = 'meshStandardMaterial' as any;
const meshBasicMaterial = 'meshBasicMaterial' as any;
const ambientLight = 'ambientLight' as any;
const pointLight = 'pointLight' as any;

interface Scene3DProps {
  slab: SlabState;
  setSlab?: React.Dispatch<React.SetStateAction<SlabState>>;
}

const textureCache: Record<string, THREE.CanvasTexture> = {};

const generateSlabTexture = (textureId: string) => {
  if (textureCache[textureId]) return textureCache[textureId];

  const def = TEXTURE_OPTIONS.find(t => t.id === textureId) || TEXTURE_OPTIONS[0];
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = def.colorBase;
    ctx.fillRect(0, 0, 512, 512);

    ctx.globalAlpha = 0.3;
    if (def.materialType === MaterialType.MARBLE) {
      ctx.strokeStyle = def.colorVein;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.lineWidth = Math.random() * 4;
        ctx.moveTo(Math.random() * 512, Math.random() * 512);
        ctx.lineTo(Math.random() * 512, Math.random() * 512);
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < 5000; i++) {
        ctx.fillStyle = def.colorVein;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  textureCache[textureId] = tex;
  return tex;
};

const Piece: React.FC<{ 
  piece: CutPiece, 
  thickness: number, 
  isSelected: boolean, 
  onSelect: (id: string) => void,
  onUpdate: (id: string, x: number, y: number) => void
}> = ({ piece, thickness, isSelected, onSelect, onUpdate }) => {
  const [dragging, setDragging] = useState(false);
  // Otimização: Evita criar novos objetos THREE a cada renderização
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const point = useMemo(() => new THREE.Vector3(), []);

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;
    e.ray.intersectPlane(dragPlane, point);
    // Offset para centralizar o mouse na peça durante o arrasto
    onUpdate(piece.id, point.x - piece.width / 2, point.y - piece.height / 2);
  };

  return (
    <group position={[piece.x + piece.width / 2, piece.y + piece.height / 2, thickness / 2 + 0.1]}>
      <mesh 
        onPointerDown={(e: ThreeEvent<PointerEvent>) => { 
          e.stopPropagation(); 
          onSelect(piece.id); 
          setDragging(true); 
          (e.target as any).setPointerCapture(e.pointerId); 
        }}
        onPointerUp={(e: ThreeEvent<PointerEvent>) => { 
          setDragging(false); 
          (e.target as any).releasePointerCapture(e.pointerId); 
        }}
        onPointerMove={handleMove}
      >
        <boxGeometry args={[piece.width, piece.height, thickness + 0.2]} />
        <meshStandardMaterial 
          color={isSelected ? "#6366f1" : "#ffffff"} 
          transparent 
          opacity={isSelected ? 0.7 : 0.4} 
          metalness={0.6}
          roughness={0.1}
        />
      </mesh>
      
      {/* Bordas de Medição */}
      <mesh>
        <boxGeometry args={[piece.width + 0.5, piece.height + 0.5, thickness + 0.25]} />
        <meshBasicMaterial color={isSelected ? "#4f46e5" : "#94a3b8"} wireframe />
      </mesh>

      {isSelected && (
        <Html position={[0, piece.height / 2 + 5, 0]} center>
          <div className="bg-slate-900 text-white text-[9px] px-2 py-1 rounded-md font-bold whitespace-nowrap shadow-xl">
            {piece.width} x {piece.height} cm
          </div>
        </Html>
      )}
    </group>
  );
};

export const Scene3D: React.FC<Scene3DProps> = ({ slab, setSlab }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const texture = useMemo(() => generateSlabTexture(slab.activeTextureId), [slab.activeTextureId]);

  const handleUpdate = (id: string, x: number, y: number) => {
    if (!setSlab) return;
    setSlab(prev => ({
      ...prev,
      pieces: prev.pieces.map(p => p.id === id ? { ...p, x, y } : p)
    }));
  };

  return (
    <div className="w-full h-full bg-slate-100">
      <Canvas 
        shadows 
        dpr={[1, 2]} 
        camera={{ position: [0, -300, 400], fov: 45 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.8} />
        <pointLight position={[100, 100, 150]} intensity={1} castShadow />
        
        <Center top>
          <group>
            {/* Chapa Master */}
            <mesh receiveShadow castShadow onClick={() => setSelectedId(null)}>
              <boxGeometry args={[slab.dimensions.width, slab.dimensions.height, slab.dimensions.thickness]} />
              <meshStandardMaterial map={texture} roughness={0.2} metalness={0.1} />
            </mesh>

            {/* Medições da Chapa */}
            <Text position={[0, -slab.dimensions.height / 2 - 20, 0]} fontSize={14} color="#1e293b" fontWeight="bold">
              {slab.dimensions.width} cm
            </Text>
            <Text position={[-slab.dimensions.width / 2 - 20, 0, 0]} rotation={[0, 0, Math.PI / 2]} fontSize={14} color="#1e293b" fontWeight="bold">
              {slab.dimensions.height} cm
            </Text>

            {/* Peças de Corte */}
            {slab.pieces.map(p => (
              <Piece 
                key={p.id} 
                piece={p} 
                thickness={slab.dimensions.thickness} 
                isSelected={selectedId === p.id} 
                onSelect={setSelectedId}
                onUpdate={handleUpdate}
              />
            ))}
          </group>
        </Center>

        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
        <Environment preset="studio" />
        <Grid infiniteGrid sectionSize={100} cellSize={10} cellColor="#cbd5e1" sectionColor="#94a3b8" />
      </Canvas>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-none">
        <div className="glass px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
          <MousePointer2 size={12} className="text-indigo-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Selecionar</span>
        </div>
        <div className="glass px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
          <Move size={12} className="text-indigo-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mover Peças</span>
        </div>
        <div className="glass px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
          <Ruler size={12} className="text-indigo-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Medição Automática</span>
        </div>
      </div>
    </div>
  );
};
