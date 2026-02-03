import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { ChatMessage, SlabState } from '../types';
import { generateCuttingAdvice } from '../services/gemini';

interface GeminiChatProps {
  slab: SlabState;
}

export const GeminiChat: React.FC<GeminiChatProps> = ({ slab }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Olá! Sou seu especialista StoneCut. Posso sugerir o melhor aproveitamento para este material. Como posso ajudar?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const history = messages.map(m => `${m.role === 'user' ? 'Usuário' : 'IA'}: ${m.text}`);
    
    const responseText = await generateCuttingAdvice(input, slab, history);

    const botMsg: ChatMessage = { 
      id: (Date.now() + 1).toString(), 
      role: 'model', 
      text: responseText 
    };

    setMessages(prev => [...prev, botMsg]);
    setLoading(false);
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
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                msg.role === 'model' ? 'bg-indigo-600' : 'bg-slate-700'
            }`}>
                {msg.role === 'model' ? <Bot size={16} className="text-white" /> : <User size={16} className="text-slate-300" />}
            </div>
            
            <div 
              className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-[#2d3748] text-slate-200 border border-slate-700/50 rounded-tl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-indigo-600/50 flex items-center justify-center">
               <Loader2 size={14} className="animate-spin text-white" />
            </div>
            <div className="bg-[#2d3748] px-4 py-2 rounded-2xl text-xs text-slate-400 border border-slate-700/50 rounded-tl-none flex items-center">
              Digitando...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-[#1e293b] border-t border-slate-700/50">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte sobre cortes..."
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