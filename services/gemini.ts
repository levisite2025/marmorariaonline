import { GoogleGenAI, Type } from "@google/genai";
import { SlabState } from '../types';

// Refactored to initialize the client within each service function to ensure the most up-to-date API key is used.

export const generateCuttingAdvice = async (
  query: string,
  slabState: SlabState,
  chatHistory: string[]
): Promise<string> => {
  try {
    // Initializing Gemini client right before use
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const context = `
      Você é um especialista sênior em corte de pedras (mármore e granito).
      O usuário está planejando cortes em uma chapa inteira (Slab).
      
      Dados Atuais do Projeto:
      - Material: ${slabState.material}
      - Dimensões da Chapa Inteira: ${slabState.dimensions.width}cm x ${slabState.dimensions.height}cm (Espessura: ${slabState.dimensions.thickness}cm)
      - Peças já planejadas: ${slabState.pieces.map(p => `${p.name} (${p.width}x${p.height}cm)`).join(', ') || 'Nenhuma peça definida ainda.'}
      
      Histórico da conversa:
      ${chatHistory.join('\n')}

      Objetivo: Responda a pergunta do usuário. Se ele pedir sugestões de corte, sugira como aproveitar melhor a chapa.
      Forneça respostas curtas, técnicas e diretas em Português do Brasil.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Optimized for fast technical advice
      contents: context + "\n\nPergunta do usuário: " + query,
      config: {
        systemInstruction: "Você é um assistente técnico para marmorarias. Foque em otimização de material e segurança no manuseio.",
      }
    });

    // Accessing .text property directly
    return response.text || "Desculpe, não consegui analisar o pedido.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com a IA. Verifique sua chave API.";
  }
};

export const optimizeLayout = async (
  requestDescription: string,
  slabWidth: number,
  slabHeight: number
): Promise<{ pieces: { name: string; width: number; height: number; x: number; y: number }[] }> => {
  try {
    // Initializing Gemini client right before use
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Eu tenho uma chapa de ${slabWidth}cm x ${slabHeight}cm.
      O cliente quer: "${requestDescription}".
      Gere uma lista de peças retangulares para cortar desta chapa.
      Tente organizar (nesting) as peças para caber dentro da chapa (x + width <= ${slabWidth} e y + height <= ${slabHeight}).
      Retorne apenas JSON válido.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Higher reasoning capability for nesting/optimization logic
      contents: prompt,
      config: {
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
                  x: { type: Type.NUMBER, description: "Coordenada X inicial (canto inferior esquerdo)" },
                  y: { type: Type.NUMBER, description: "Coordenada Y inicial (canto inferior esquerdo)" }
                },
                required: ["name", "width", "height", "x", "y"]
              }
            }
          }
        }
      }
    });

    // Accessing .text property directly
    const jsonText = response.text || "{}";
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Layout Optimization Error:", error);
    throw error;
  }
};