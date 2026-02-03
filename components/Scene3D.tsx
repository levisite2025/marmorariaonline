import React, { useMemo, useState, useRef } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stage, Text, Grid, Center, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SlabState, CutPiece, MaterialType, TEXTURE_OPTIONS } from '../types';
import { MousePointer2, Move, ZoomIn, Info } from 'lucide-react';

interface Scene3DProps {
  slab: SlabState;
  setSlab?: React.Dispatch<React.SetStateAction<SlabState>>;
}

// Procedural Texture Generator
const useProceduralTexture = (textureId: string) => {
  return useMemo(() => {
    const def = TEXTURE_OPTIONS.find(t => t.id === textureId) || TEXTURE_OPTIONS[0];
    
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Base Color
      ctx.fillStyle = def.colorBase;
      ctx.fillRect(0, 0, 1024, 1024);

      if (def.materialType === MaterialType.MARBLE) {
        // Marble Veins Generation
        ctx.strokeStyle = def.colorVein;
        ctx.lineCap = 'round';
        ctx.filter = 'blur(2px)';
        
        for (let i = 0; i < 15; i++) {
          ctx.lineWidth = Math.random() * 5 + 1;
          ctx.globalAlpha = Math.random() * 0.5 + 0.2;
          ctx.beginPath();
          const startX = Math.random() * 1024;
          const startY = Math.random() * 1024;
          ctx.moveTo(startX, startY);
          
          let currentX = startX;
          let currentY = startY;
          
          for (let j = 0; j < 5; j++) {
             const cp1x = currentX + (Math.random() - 0.5) * 400;
             const cp1y = currentY + (Math.random() - 0.5) * 400;
             const cp2x = currentX + (Math.random() - 0.5) * 400;
             const cp2y = currentY + (Math.random() - 0.5) * 400;
             const endX = Math.random() * 1024;
             const endY = Math.random() * 1024;
             
             ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
             currentX = endX;
             currentY = endY;
          }
          ctx.stroke();
        }
      } else if (def.materialType === MaterialType.GRANITE) {
        // Granite Speckles Generation
        for (let i = 0; i < 50000; i++) {
           const isVeinColor = Math.random() > 0.4;
           ctx.fillStyle = isVeinColor ? def.colorVein : '#000000';
           ctx.globalAlpha = Math.random() * 0.4 + 0.1;
           const x = Math.random() * 1024;
           const y = Math.random() * 1024;
           const size = Math.random() * 3 + 0.5;
           ctx.fillRect(x, y, size, size);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    // Repeat texture based on scale/slab size approximation
    texture.repeat.set(2, 2); 
    return texture;
  }, [textureId]);
};

const MaterialMesh: React.FC<{ slab: SlabState; width: number; height: number }> = ({ slab, width, height }) => {
  const texture = useProceduralTexture(slab.activeTextureId);
  const def = TEXTURE_OPTIONS.find(t => t.id === slab.activeTextureId);
  
  // Adjust roughness/metalness based on material type
  const materialProps = def?.materialType === MaterialType.MARBLE 
    ? { roughness: 0.1, metalness: 0.1 } // Polished Marble
    : { roughness: 0.4, metalness: 0.2 }; // Polished Granite

  return (
    <meshStandardMaterial 
      map={texture}
      {...materialProps}
      side={THREE.DoubleSide}
    />
  );
};

interface PieceMeshProps {
  piece: CutPiece;
  thickness: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  readOnly: boolean;
}

const PieceMesh: React.FC<PieceMeshProps> = ({ piece, thickness, isSelected, onSelect, onUpdatePosition, readOnly }) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef(new THREE.Vector3());

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (readOnly) return;
    
    e.stopPropagation(); // Previne que o OrbitControls capture o evento e gire a câmera
    onSelect(piece.id);
    
    // Cria um plano matemático na altura da superfície da chapa para calcular onde o mouse está
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(thickness / 2));
    const intersectPoint = new THREE.Vector3();
    e.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint) {
      // Calcula o offset entre onde clicamos e o centro da peça
      // Isso impede que a peça "pule" para o centro do mouse
      const pieceCenterX = piece.x + piece.width / 2;
      const pieceCenterY = piece.y + piece.height / 2;
      
      dragOffset.current.set(pieceCenterX - intersectPoint.x, pieceCenterY - intersectPoint.y, 0);
      
      setIsDragging(true);
      // Captura o ponteiro para continuarmos recebendo eventos mesmo se o mouse sair da peça
      (e.target as Element).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || readOnly) return;
    
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(thickness / 2));
    const intersectPoint = new THREE.Vector3();
    e.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint) {
       // Novo centro = Ponto do Mouse + Offset Inicial
       const newCenterX = intersectPoint.x + dragOffset.current.x;
       const newCenterY = intersectPoint.y + dragOffset.current.y;
       
       // Converte de volta para coordenadas (x,y) do canto inferior esquerdo
       const newX = newCenterX - piece.width / 2;
       const newY = newCenterY - piece.height / 2;
       
       // Atualiza em tempo real
       onUpdatePosition(piece.id, newX, newY);
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
  };

  return (
    <group 
      position={[piece.x + piece.width / 2, piece.y + piece.height / 2, thickness / 2 + (isDragging ? 0.2 : 0.05)]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Visual representation of the piece overlaying the slab */}
      <mesh>
        <boxGeometry args={[piece.width - 0.2, piece.height - 0.2, thickness + 0.1]} />
        <meshStandardMaterial 
          color={isSelected ? '#f97316' : piece.color} 
          emissive={isSelected ? '#f97316' : '#000000'}
          emissiveIntensity={isSelected ? 0.2 : 0}
          opacity={isSelected ? 0.9 : 0.7} 
          transparent 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Wireframe Outline */}
      <mesh>
        <boxGeometry args={[piece.width, piece.height, thickness + 0.12]} />
        <meshBasicMaterial color={isSelected ? '#ea580c' : "#1e3a8a"} wireframe />
      </mesh>
      
      {/* Label (3D Text) - Hidden if selected or dragging to avoid clutter */}
      {!isSelected && !isDragging && (
        <Text
          position={[0, 0, thickness / 2 + 0.2]}
          fontSize={Math.min(piece.width, piece.height) * 0.15}
          color="#1e3a8a"
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
        >
          {`${piece.name}\n${piece.width}x${piece.height}`}
        </Text>
      )}

      {/* HTML Tooltip Overlay - Mostra coordenadas enquanto arrasta */}
      {isSelected && (
        <Html position={[0, 0, thickness + 2]} center zIndexRange={[100, 0]}>
          <div className={`bg-white/95 backdrop-blur-md p-3 rounded-lg shadow-xl border border-orange-200 text-slate-800 min-w-[140px] transform transition-all duration-75 pointer-events-none select-none ${isDragging ? 'scale-110 shadow-2xl' : ''}`}>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5 mb-1.5">
              <div className={`w-2 h-2 rounded-full ${isDragging ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`} />
              <span className="font-bold text-xs uppercase tracking-wide text-orange-600">
                {isDragging ? 'Movendo...' : 'Selecionado'}
              </span>
            </div>
            <h4 className="font-bold text-sm text-slate-900 leading-tight mb-1">{piece.name}</h4>
            <div className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100 mt-1 text-center">
               {piece.width}cm x {piece.height}cm
            </div>
            {isDragging && (
              <div className="grid grid-cols-2 gap-1 mt-2 text-[10px] font-mono text-slate-400 border-t border-slate-100 pt-1">
                 <div>X: {piece.x.toFixed(1)}</div>
                 <div>Y: {piece.y.toFixed(1)}</div>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

const SlabMesh: React.FC<{ slab: SlabState; selectedId: string | null; onSelect: (id: string | null) => void; onPieceUpdate?: (id: string, x: number, y: number) => void }> = ({ slab, selectedId, onSelect, onPieceUpdate }) => {
  const { width, height, thickness } = slab.dimensions;

  return (
    <group>
      {/* The Master Slab with Texture - Click on slab background deselects */}
      <mesh 
        position={[width / 2, height / 2, 0]} 
        receiveShadow 
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect(null);
        }}
      >
        <boxGeometry args={[width, height, thickness]} />
        <MaterialMesh slab={slab} width={width} height={height} />
      </mesh>
      
      {/* Slab Dimensions Indicators - Professional Blue Lines */}
      <group>
        {/* Width Line */}
        <mesh position={[width / 2, -10, 0]}>
           <boxGeometry args={[width, 0.4, 0.4]} />
           <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <Text position={[width / 2, -18, 0]} fontSize={8} color="#1e40af" anchorX="center" anchorY="middle" fontWeight={700}>
          {width} cm
        </Text>

        {/* Height Line */}
        <mesh position={[-10, height / 2, 0]}>
           <boxGeometry args={[0.4, height, 0.4]} />
           <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <Text position={[-18, height / 2, 0]} rotation={[0, 0, Math.PI / 2]} fontSize={8} color="#1e40af" anchorX="center" anchorY="middle" fontWeight={700}>
          {height} cm
        </Text>
      </group>

      {/* Cut Pieces */}
      {slab.pieces.map((piece) => (
        <PieceMesh 
          key={piece.id} 
          piece={piece} 
          thickness={thickness} 
          isSelected={selectedId === piece.id}
          onSelect={onSelect}
          onUpdatePosition={onPieceUpdate || (() => {})}
          readOnly={!onPieceUpdate}
        />
      ))}
    </group>
  );
};

export const Scene3D: React.FC<Scene3DProps> = ({ slab, setSlab }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handlePieceUpdate = (id: string, x: number, y: number) => {
    if (setSlab) {
      setSlab(prev => ({
        ...prev,
        pieces: prev.pieces.map(p => 
          p.id === id ? { ...p, x, y } : p
        )
      }));
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-transparent">
      
      <Canvas 
        shadows 
        camera={{ position: [slab.dimensions.width * 0.5, slab.dimensions.height * -0.5, Math.max(slab.dimensions.width, slab.dimensions.height) * 1.5], fov: 45 }}
        onClick={() => setSelectedId(null)} // Click on void deselects
      >
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.5} />
        
        {/* Lighting setup - Bright Studio Light */}
        <Stage environment="city" intensity={0.8} adjustCamera={false} shadows="contact">
          <Center top>
             <SlabMesh 
                slab={slab} 
                selectedId={selectedId} 
                onSelect={setSelectedId} 
                onPieceUpdate={setSlab ? handlePieceUpdate : undefined}
             />
          </Center>
        </Stage>
        <ambientLight intensity={0.7} color="#ffffff" />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        
        {/* Technical Grid - Subtle Grey/Blue */}
        <Grid 
          infiniteGrid 
          fadeDistance={3000} 
          sectionSize={100} 
          cellSize={10} 
          position={[0, 0, -slab.dimensions.thickness * 4]} 
          cellColor="#cbd5e1" 
          sectionColor="#94a3b8" 
          cellThickness={0.8}
          sectionThickness={1.5}
        />
      </Canvas>
      
      {/* Floating Instructions Control Panel - Clean Look */}
      <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full px-6 py-3 flex items-center gap-6 shadow-lg z-10 pointer-events-none select-none text-slate-600">
        <div className="flex items-center gap-2">
           <MousePointer2 size={14} className="text-orange-500" />
           <span className="text-[10px] font-bold uppercase tracking-wider">Selecionar</span>
        </div>
        <div className="w-px h-3 bg-slate-300" />
        <div className="flex items-center gap-2">
           <Move size={14} className="text-orange-500" />
           <span className="text-[10px] font-bold uppercase tracking-wider">Arrastar (Mover)</span>
        </div>
        <div className="w-px h-3 bg-slate-300" />
        <div className="flex items-center gap-2">
           <ZoomIn size={14} className="text-orange-500" />
           <span className="text-[10px] font-bold uppercase tracking-wider">Zoom</span>
        </div>
      </div>
    </div>
  );
};