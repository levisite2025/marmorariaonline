import { CutPiece, SlabState } from '../types';

export interface PieceIssue {
  pieceId: string;
  type: 'out_of_bounds' | 'overlap' | 'invalid_size';
  message: string;
  relatedPieceIds?: string[];
}

export const piecesIntersect = (first: CutPiece, second: CutPiece) => {
  const separated =
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + first.height <= second.y ||
    second.y + second.height <= first.y;

  return !separated;
};

export const validateLayout = (slab: SlabState): PieceIssue[] => {
  const issues: PieceIssue[] = [];

  slab.pieces.forEach((piece) => {
    if (piece.width <= 0 || piece.height <= 0) {
      issues.push({
        pieceId: piece.id,
        type: 'invalid_size',
        message: `A peça "${piece.name}" tem medida inválida.`,
      });
    }

    const exceedsBounds =
      piece.x < 0 ||
      piece.y < 0 ||
      piece.x + piece.width > slab.dimensions.width ||
      piece.y + piece.height > slab.dimensions.height;

    if (exceedsBounds) {
      issues.push({
        pieceId: piece.id,
        type: 'out_of_bounds',
        message: `A peça "${piece.name}" está fora dos limites da chapa.`,
      });
    }
  });

  for (let index = 0; index < slab.pieces.length; index += 1) {
    const current = slab.pieces[index];

    for (let compareIndex = index + 1; compareIndex < slab.pieces.length; compareIndex += 1) {
      const target = slab.pieces[compareIndex];

      if (piecesIntersect(current, target)) {
        issues.push({
          pieceId: current.id,
          type: 'overlap',
          message: `As peças "${current.name}" e "${target.name}" estão sobrepostas.`,
          relatedPieceIds: [target.id],
        });
        issues.push({
          pieceId: target.id,
          type: 'overlap',
          message: `As peças "${target.name}" e "${current.name}" estão sobrepostas.`,
          relatedPieceIds: [current.id],
        });
      }
    }
  }

  return issues;
};
