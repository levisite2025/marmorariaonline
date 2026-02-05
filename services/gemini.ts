
import { GoogleGenAI, Type } from "@google/genai";
import { SlabState } from '../types';

/**
 * Gera conselhos técnicos para corte de chapas usando o modelo gemini-3-flash-preview.
 */
export const generateCuttingAdvice = async (
  query: string,
  slabState: SlabState,
  chatHistory: string[]
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const context = `
      Você é um motor de IA especializado em marmoraria técnica.
      Material: ${slabState.material}
      Dimensões da Chapa: ${slabState.dimensions.width}cm x ${slabState.dimensions.height}cm
      Peças atuais: ${slabState.pieces.length}
      
      Regras de Corte:
      1. Sempre considere 0.5cm de margem para o disco de corte.
      2. Mármore é mais frágil que Granito; sugira reforços se as peças forem muito longas (>200cm).
      3. Otimize para evitar sobras em 'L' que são difíceis de vender.
    `;

    // Chamada ao Gemini seguindo as diretrizes de prompt e systemInstruction
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Histórico da conversa:\n${chatHistory.join('\n')}\n\nPergunta do usuário: ${query}`,
      config: {
        systemInstruction: context,
      },
    });

    // Acessando .text como propriedade conforme as diretrizes
    return response.text?.trim() || "Operação concluída sem texto de retorno.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Falha na comunicação com o núcleo de IA.";
  }
};

/**
 * Otimiza o layout de corte (Nesting) usando o modelo gemini-3-pro-preview com resposta JSON estruturada.
 */
export const optimizeLayout = async (
  requestDescription: string,
  slabWidth: number,
  slabHeight: number
): Promise<{ pieces: { name: string; width: number; height: number; x: number; y: number }[] }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemInstruction = `
      SISTEMA DE OTIMIZAÇÃO DE CORTE (NESTING)
      Você é um motor de IA especializado em otimizar o corte de chapas de mármore e granito.
      Chapa Master: ${slabWidth}x${slabHeight}cm
      
      Gere um plano de corte otimizado em formato JSON.
      As coordenadas X e Y devem representar o canto inferior esquerdo da peça.
      Garanta que x + width <= ${slabWidth} e y + height <= ${slabHeight}.
      Não deve haver sobreposição de peças.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Pedido do cliente: ${requestDescription}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
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
                  y: { type: Type.NUMBER }
                },
                propertyOrdering: ["name", "width", "height", "x", "y"]
              }
            }
          }
        }
      }
    });

    const jsonText = response.text?.trim() || "{\"pieces\":[]}";
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Layout Optimization Error:", error);
    throw error;
  }
};
