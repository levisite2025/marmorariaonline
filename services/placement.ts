import { CutPiece, SlabState } from '../types';
import { piecesIntersect } from './layoutValidation';

interface PlacementResult {
  x: number;
  y: number;
}

export const findAvailablePlacement = (
  slab: SlabState,
  piece: Pick<CutPiece, 'width' | 'height' | 'id'>
): PlacementResult | null => {
  if (
    piece.width <= 0 ||
    piece.height <= 0 ||
    piece.width > slab.dimensions.width ||
    piece.height > slab.dimensions.height
  ) {
    return null;
  }

  const maxX = Math.floor(slab.dimensions.width - piece.width);
  const maxY = Math.floor(slab.dimensions.height - piece.height);

  for (let y = 0; y <= maxY; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      const candidate = { ...piece, x, y, name: '' as string, color: '' };
      const intersects = slab.pieces.some((otherPiece) => piecesIntersect(candidate, otherPiece));
      if (!intersects) return { x, y };
    }
  }

  return null;
};
