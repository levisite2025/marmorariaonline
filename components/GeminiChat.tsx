import React, { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Send, Sparkles, User } from 'lucide-react';
import { ChatMessage, SlabState } from '../types';
import { generateCuttingAdvice } from '../services/gemini';

interface GeminiChatProps {
  slab: SlabState;
}

export const GeminiChat: React.FC<GeminiChatProps> = ({ slab }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: 'Olá! Sou seu assistente técnico. Posso sugerir cortes, aproveitamento e observações comerciais para este projeto.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const history = messages.map((message) => `${message.role === 'user' ? 'Usuário' : 'IA'}: ${message.text}`);
    const userMessage: ChatMessage = { id: `${Date.now()}`, role: 'user', text: userText };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const responseText = await generateCuttingAdvice(userText, slab, history);
      const botMessage: ChatMessage = {
        id: `${Date.now()}-model`,
        role: 'model',
        text: responseText,
      };

      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e293b]">
      <div className="p-4 border-b border-slate-700/50 flex items-center gap-2 bg-[#253045]">
        <div className="p-1.5 bg-indigo-500/20 rounded-md">
          <Sparkles size={16} className="text-indigo-400" />
        </div>
        <h3 className="font-semibold text-slate-200 text-sm">Assistente IA</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5" ref={scrollRef}>
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                message.role === 'model' ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              {message.role === 'model' ? <Bot size={16} className="text-white" /> : <User size={16} className="text-slate-300" />}
            </div>

            <div
              className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-[#2d3748] text-slate-200 border border-slate-700/50 rounded-tl-none'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-indigo-600/50 flex items-center justify-center">
              <Loader2 size={14} className="animate-spin text-white" />
            </div>
            <div className="bg-[#2d3748] px-4 py-2 rounded-2xl text-xs text-slate-400 border border-slate-700/50 rounded-tl-none flex items-center">
              Analisando seu projeto...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-[#1e293b] border-t border-slate-700/50">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSend()}
            placeholder="Pergunte sobre cortes, perdas ou acabamentos..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none pr-12 placeholder:text-slate-500 transition-all shadow-inner"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="absolute right-2 top-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-md"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
