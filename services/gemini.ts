import { GoogleGenAI, Type } from '@google/genai';
import { SlabState } from '../types';

const getApiKey = () => {
  const processEnv =
    typeof globalThis !== 'undefined' && 'process' in globalThis
      ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
      : undefined;

  const key =
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.GEMINI_API_KEY ||
    processEnv?.GEMINI_API_KEY ||
    processEnv?.API_KEY;

  if (!key) {
    throw new Error('Configure a chave Gemini em VITE_GEMINI_API_KEY ou GEMINI_API_KEY.');
  }

  return key;
};

export const generateCuttingAdvice = async (
  query: string,
  slabState: SlabState,
  chatHistory: string[]
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const context = `
      Você é um assistente especializado em marmoraria técnica e orçamentos.
      Material: ${slabState.material}
      Dimensões da chapa: ${slabState.dimensions.width} cm x ${slabState.dimensions.height} cm
      Espessura: ${slabState.dimensions.thickness} cm
      Peças atuais: ${slabState.pieces.length}

      Regras:
      1. Considere margem de 0,5 cm para disco de corte.
      2. Mármore exige mais cuidado estrutural do que granito.
      3. Prefira orientações objetivas, comerciais e fáceis de aplicar.
      4. Alerte quando houver risco de desperdício elevado.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Histórico:\n${chatHistory.join('\n')}\n\nPergunta do usuário: ${query}`,
      config: {
        systemInstruction: context,
      },
    });

    return response.text?.trim() || 'Operação concluída sem texto de retorno.';
  } catch (error) {
    console.error('Gemini Error:', error);
    return 'Não consegui consultar a IA agora. Verifique a chave da API e tente novamente.';
  }
};

export const optimizeLayout = async (
  requestDescription: string,
  slabWidth: number,
  slabHeight: number
): Promise<{ pieces: { name: string; width: number; height: number; x: number; y: number }[] }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const systemInstruction = `
      SISTEMA DE OTIMIZAÇÃO DE CORTE
      Você é um motor especializado em otimizar o corte de chapas de mármore e granito.
      Chapa master: ${slabWidth} x ${slabHeight} cm

      Regras obrigatórias:
      1. Gere um plano de corte em JSON.
      2. As coordenadas x e y representam o canto inferior esquerdo da peça.
      3. Garanta que x + width <= ${slabWidth} e y + height <= ${slabHeight}.
      4. Não permita sobreposição entre peças.
      5. Prefira layouts com menor desperdício e leitura simples para produção.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Pedido do cliente: ${requestDescription}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pieces: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  width: { type: Type.NUMBER },
                  height: { type: Type.NUMBER },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                },
                propertyOrdering: ['name', 'width', 'height', 'x', 'y'],
              },
            },
          },
        },
      },
    });

    const jsonText = response.text?.trim() || '{"pieces":[]}';
    const parsed = JSON.parse(jsonText);
    return {
      pieces: Array.isArray(parsed?.pieces) ? parsed.pieces : [],
    };
  } catch (error) {
    console.error('Layout Optimization Error:', error);
    throw error;
  }
};
