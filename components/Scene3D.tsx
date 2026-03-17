import React, { useMemo, useState } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { Center, Environment, Grid, Html, OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { AlertCircle, MousePointer2, Move, Ruler } from 'lucide-react';
import { CutPiece, MaterialType, SlabState, TEXTURE_OPTIONS } from '../types';
import { piecesIntersect, validateLayout } from '../services/layoutValidation';

interface Scene3DProps {
  slab: SlabState;
  setSlab?: React.Dispatch<React.SetStateAction<SlabState>>;
}

const textureCache: Record<string, THREE.CanvasTexture> = {};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const generateSlabTexture = (textureId: string) => {
  if (textureCache[textureId]) return textureCache[textureId];

  const definition = TEXTURE_OPTIONS.find((texture) => texture.id === textureId) || TEXTURE_OPTIONS[0];
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');

  if (context) {
    context.fillStyle = definition.colorBase;
    context.fillRect(0, 0, 512, 512);
    context.globalAlpha = 0.3;

    if (definition.materialType === MaterialType.MARBLE) {
      context.strokeStyle = definition.colorVein;
      for (let index = 0; index < 8; index += 1) {
        context.beginPath();
        context.lineWidth = Math.random() * 4;
        context.moveTo(Math.random() * 512, Math.random() * 512);
        context.lineTo(Math.random() * 512, Math.random() * 512);
        context.stroke();
      }
    } else {
      for (let index = 0; index < 5000; index += 1) {
        context.fillStyle = definition.colorVein;
        context.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  textureCache[textureId] = texture;
  return texture;
};

const Piece: React.FC<{
  piece: CutPiece;
  slab: SlabState;
  thickness: number;
  isSelected: boolean;
  hasIssue: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, x: number, y: number) => void;
}> = ({ piece, slab, thickness, isSelected, hasIssue, onSelect, onUpdate }) => {
  const [dragging, setDragging] = useState(false);
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const point = useMemo(() => new THREE.Vector3(), []);

  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;

    event.ray.intersectPlane(dragPlane, point);
    const maxX = Math.max(0, slab.dimensions.width - piece.width);
    const maxY = Math.max(0, slab.dimensions.height - piece.height);
    const nextX = clamp(point.x - piece.width / 2 + slab.dimensions.width / 2, 0, maxX);
    const nextY = clamp(point.y - piece.height / 2 + slab.dimensions.height / 2, 0, maxY);

    onUpdate(piece.id, nextX, nextY);
  };

  const fillColor = hasIssue ? '#ef4444' : isSelected ? '#6366f1' : '#ffffff';
  const wireColor = hasIssue ? '#dc2626' : isSelected ? '#4f46e5' : '#94a3b8';

  return (
    <group position={[piece.x - slab.dimensions.width / 2 + piece.width / 2, piece.y - slab.dimensions.height / 2 + piece.height / 2, thickness / 2 + 0.1]}>
      <mesh
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect(piece.id);
          setDragging(true);
          (event.target as Element & { setPointerCapture(pointerId: number): void }).setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => {
          setDragging(false);
          (event.target as Element & { releasePointerCapture(pointerId: number): void }).releasePointerCapture(event.pointerId);
        }}
        onPointerMove={handleMove}
      >
        <boxGeometry args={[piece.width, piece.height, thickness + 0.2]} />
        <meshStandardMaterial color={fillColor} transparent opacity={hasIssue ? 0.8 : isSelected ? 0.72 : 0.45} metalness={0.45} roughness={0.15} />
      </mesh>

      <mesh>
        <boxGeometry args={[piece.width + 0.5, piece.height + 0.5, thickness + 0.25]} />
        <meshBasicMaterial color={wireColor} wireframe />
      </mesh>

      {isSelected && (
        <Html position={[0, piece.height / 2 + 5, 0]} center>
          <div className={`text-white text-[9px] px-2 py-1 rounded-md font-bold whitespace-nowrap shadow-xl ${hasIssue ? 'bg-red-600' : 'bg-slate-900'}`}>
            {piece.name}: {piece.width} x {piece.height} cm
          </div>
        </Html>
      )}
    </group>
  );
};

export const Scene3D: React.FC<Scene3DProps> = ({ slab, setSlab }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const texture = useMemo(() => generateSlabTexture(slab.activeTextureId), [slab.activeTextureId]);
  const issues = useMemo(() => validateLayout(slab), [slab]);
  const issuePieceIds = useMemo(() => new Set(issues.map((issue) => issue.pieceId)), [issues]);

  const handleUpdate = (id: string, x: number, y: number) => {
    if (!setSlab) return;

    setSlab((prev) => ({
      ...prev,
      pieces: prev.pieces.map((piece) => {
        if (piece.id !== id) return piece;

        const candidate = { ...piece, x, y };
        const overlapsAnotherPiece = prev.pieces.some((otherPiece) => {
          if (otherPiece.id === id) return false;
          return piecesIntersect(candidate, otherPiece);
        });

        return overlapsAnotherPiece ? piece : candidate;
      }),
    }));
  };

  return (
    <div className="w-full h-full bg-slate-100 relative">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, -300, 400], fov: 45 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.8} />
        <pointLight position={[100, 100, 150]} intensity={1} castShadow />

        <Center top>
          <group>
            <mesh receiveShadow castShadow onClick={() => setSelectedId(null)}>
              <boxGeometry args={[Math.max(1, slab.dimensions.width), Math.max(1, slab.dimensions.height), Math.max(0.5, slab.dimensions.thickness)]} />
              <meshStandardMaterial map={texture} roughness={0.2} metalness={0.1} />
            </mesh>

            <Text position={[0, -Math.max(1, slab.dimensions.height) / 2 - 20, 0]} fontSize={14} color="#1e293b" fontWeight="bold">
              {slab.dimensions.width} cm
            </Text>
            <Text position={[-Math.max(1, slab.dimensions.width) / 2 - 20, 0, 0]} rotation={[0, 0, Math.PI / 2]} fontSize={14} color="#1e293b" fontWeight="bold">
              {slab.dimensions.height} cm
            </Text>

            {slab.pieces.map((piece) => (
              <Piece
                key={piece.id}
                piece={piece}
                slab={slab}
                thickness={Math.max(0.5, slab.dimensions.thickness)}
                isSelected={selectedId === piece.id}
                hasIssue={issuePieceIds.has(piece.id)}
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

      {issues.length > 0 && (
        <div className="absolute top-24 right-6 max-w-sm bg-white/90 backdrop-blur border border-red-200 rounded-2xl shadow-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-800">Plano com conflitos</p>
              <p className="text-xs text-slate-500 mt-1">As peças em vermelho precisam de ajuste para caber na chapa sem sobreposição.</p>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-none">
        <div className="glass px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
          <MousePointer2 size={12} className="text-indigo-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Selecionar</span>
        </div>
        <div className="glass px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
          <Move size={12} className="text-indigo-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mover peças</span>
        </div>
        <div className="glass px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
          <Ruler size={12} className="text-indigo-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Medição automática</span>
        </div>
      </div>
    </div>
  );
};
