
import React, { useState, useRef, useEffect } from 'react';
import { ChatIcon } from './icons/ChatIcon';
import { CloseIcon } from './icons/CloseIcon';
import { SendIcon } from './icons/SendIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { StethoscopeIcon } from './icons/StethoscopeIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { chatWithHealthAssistant } from '../services/geminiService';
import type { TimelineEntry, Medication, FamilyMember } from '../types';

interface HealthAssistantProps {
  familyMembers: FamilyMember[];
  timelineEntries: TimelineEntry[];
  medications: Medication[];
  userName: string;
  onViewReport: (entry: TimelineEntry) => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const HealthAssistant: React.FC<HealthAssistantProps> = ({ familyMembers, timelineEntries, medications, userName, onViewReport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: `Hi ${userName}! I can help you find reports or check meds. How can I help?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.slice(1).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await chatWithHealthAssistant(userMessage, history, { familyMembers, timelineEntries, medications });
      
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error: any) {
      console.error("Chat Error:", error);
      const errorMsg = error?.message?.includes("overloaded") 
        ? "The AI is a bit busy right now. I'll be ready in just a few seconds!" 
        : "Sorry, I had trouble checking that. Please try again.";
      setMessages(prev => [...prev, { role: 'model', text: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkClick = (id: string) => {
      const entry = timelineEntries.find(e => e.id === id);
      if (entry) {
          onViewReport(entry);
      } else {
          alert("Could not find the report. It might have been deleted.");
      }
  };

  const renderMessageText = (text: string) => {
    const parts = text.split(/(\[VIEW:.*?:.*?\])/g);
    return parts.map((part, index) => {
        const match = part.match(/\[VIEW:(.*?):(.*?)(?:\|.*?)?\]/); 
        if (match) {
            const title = match[1];
            const id = match[2];
            return (
                <button
                    key={index}
                    onClick={() => handleLinkClick(id)}
                    className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 bg-white text-rose-700 border border-rose-200 rounded text-xs font-semibold hover:bg-rose-50 transition shadow-sm pointer-events-auto"
                >
                    View {title} <ArrowRightIcon className="w-3 h-3" />
                </button>
            );
        }
        return part;
    });
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[500] flex flex-col justify-end items-end p-6">
      {isOpen && (
        <div className="w-full max-w-[360px] h-[500px] max-h-[70vh] bg-white rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-fadeIn pointer-events-auto mb-4">
          <div className="bg-rose-700 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                    <StethoscopeIcon className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-sm leading-tight text-left">Assistant</h3>
                    <p className="text-[10px] text-rose-100 text-left">AI Medical Context</p>
                </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition">
                <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm text-left ${
                  msg.role === 'user' 
                    ? 'bg-rose-700 text-white rounded-br-none' 
                    : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                }`}>
                  {renderMessageText(msg.text)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-slate-200 shadow-sm flex items-center gap-2">
                    <SpinnerIcon className="w-4 h-4 text-rose-700 animate-spin" />
                    <span className="text-xs text-slate-500 font-black uppercase tracking-widest">Thinking...</span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Ask your records..."
                className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2 bg-rose-700 text-white rounded-xl hover:bg-rose-800 disabled:opacity-50 transition"
              >
                <SendIcon className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-5 rounded-full shadow-2xl transition-all duration-300 pointer-events-auto active:scale-90 ${
          isOpen ? 'bg-white text-slate-600' : 'bg-rose-700 text-white hover:bg-rose-800'
        }`}
      >
        {isOpen ? <CloseIcon className="w-7 h-7" /> : <ChatIcon className="w-8 h-8" />}
      </button>
    </div>
  );
};
