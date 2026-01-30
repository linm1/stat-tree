
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, Minimize2, Maximize2, Terminal, Globe, User, Bot, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { DecisionNode } from '../types';

interface Message {
  role: 'user' | 'model';
  text: string;
  sources?: { title: string; uri: string }[];
}

interface ChatPanelProps {
  currentNode: DecisionNode;
  history: string[];
  breadcrumbs: string[];
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ currentNode, history, breadcrumbs }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: "I'm your SAS Programming Agent. I'm monitoring your selection path and can help customize scripts or verify statistical assumptions using real-time documentation.",
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Prepare context from current app state
      const contextStr = `
        Current Decision Path: ${breadcrumbs.join(' > ')}
        Current Step: ${currentNode.question}
        ${currentNode.result ? `Recommended Procedures: ${currentNode.result.procedures.join(', ')}
        Sample Code: ${currentNode.result.examples.map(e => e.code).join('\n')}` : ''}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [
          {
            role: 'user',
            parts: [{
              text: `You are a World-Class SAS Clinical Programmer and Statistician. 
              Use the following context to help the user:
              [CONTEXT]
              ${contextStr}
              [/CONTEXT]
              
              User Question: ${userMessage}
              
              If they ask for code, provide production-ready SAS scripts following CDISC standards where applicable. 
              Use your web search tool if you need to verify latest FDA guidance or SAS documentation.`
            }]
          }
        ],
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "I'm sorry, I couldn't generate a response.";
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter(chunk => chunk.web)
        ?.map(chunk => ({
          title: chunk.web?.title || 'Source',
          uri: chunk.web?.uri || '#'
        })) || [];

      setMessages(prev => [...prev, { role: 'model', text, sources }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "An error occurred while connecting to the SAS Intelligence engine. Please check your connection." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 brutal-btn bg-ink text-primary p-4 z-40 flex items-center gap-3 hover:bg-primary hover:text-ink transition-all shadow-brutal-lg"
      >
        <Sparkles size={20} />
        <span className="font-mono font-bold text-xs uppercase tracking-tight">AI Programmer</span>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex flex-col transition-all duration-300 ${isMinimized ? 'h-14' : 'h-[600px]'} w-full max-w-[400px] bg-white border-1 border-ink shadow-brutal-lg`}>
      {/* Header */}
      <div className="bg-ink p-3 flex items-center justify-between border-b-1 border-ink">
        <div className="flex items-center gap-2 text-primary">
          <Terminal size={16} />
          <span className="font-mono font-bold text-[10px] uppercase tracking-widest">SAS-AGENT.LOG</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 text-white hover:text-primary transition-colors">
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1 text-white hover:text-primary transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Status Bar */}
          <div className="bg-soft border-b-1 border-ink px-3 py-1.5 flex items-center justify-between overflow-hidden">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-mono text-[9px] font-bold text-ink/60 uppercase truncate">
                Context: {currentNode.id}
              </span>
            </div>
            {currentNode.result && (
              <span className="font-mono text-[9px] font-bold text-primary bg-ink px-1 border-1 border-ink uppercase">
                Code Loaded
              </span>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-canvas custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] p-3 border-1 border-ink shadow-brutal ${msg.role === 'user' ? 'bg-primary text-ink' : 'bg-white text-ink'}`}>
                  <div className="flex items-center gap-2 mb-1 opacity-40">
                    {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                    <span className="font-mono text-[8px] font-bold uppercase">{msg.role === 'user' ? 'Analyst' : 'SAS_AI'}</span>
                  </div>
                  <div className="text-xs font-medium leading-relaxed whitespace-pre-wrap break-words">
                    {msg.text}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t-1 border-ink/10">
                      <div className="flex items-center gap-1 mb-1 text-[8px] font-mono font-bold uppercase text-ink/40">
                        <Globe size={10} /> Sources:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {msg.sources.map((s, si) => (
                          <a 
                            key={si} 
                            href={s.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[8px] bg-soft px-1 border-1 border-ink/20 hover:border-ink transition-colors"
                          >
                            {s.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border-1 border-ink p-3 shadow-brutal flex items-center gap-3">
                  <Loader2 size={14} className="animate-spin text-primary" />
                  <span className="font-mono text-[10px] uppercase font-bold text-ink/40 italic">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t-1 border-ink flex gap-2">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about SAS syntax or stats..."
              className="flex-1 bg-soft border-1 border-ink px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white transition-colors"
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="brutal-btn bg-primary p-2 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </>
      )}
    </div>
  );
};
