
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
  userId: string;
  onViewReport: (entry: TimelineEntry) => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

// Added React import above and using React.FC here
export const HealthAssistant: React.FC<HealthAssistantProps> = ({ familyMembers, timelineEntries, medications, userName, userId, onViewReport }) => {
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

  // Using React.FormEvent here
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

      const response = await chatWithHealthAssistant(userMessage, history, { familyMembers, timelineEntries, medications }, userId);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I had trouble with that query." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkClick = (rawId: string) => {
      // REGISTRY LOCK: Aggressively clean any AI formatting artifacts
      const cleanId = rawId
          .replace(/DOC_ID:|DATABASE_ID:|ID:|\[|\]/gi, '')
          .trim();

      // Attempt exact match first
      let entry = timelineEntries.find(e => e.id === cleanId);
      
      // Fuzzy fallback for UUID truncation
      if (!entry && cleanId.length > 8) {
          entry = timelineEntries.find(e => e.id.includes(cleanId) || cleanId.includes(e.id));
      }
      
      if (entry) {
          onViewReport(entry);
      } else {
          alert("Record link expired. Please find it manually in the timeline.");
      }
  };

  const renderMessageText = (text: string) => {
    const parts = text.split(/(\[VIEW:[^\]]*?:[^\]]*?\])/g);
    return parts.map((part, index) => {
        const match = part.match(/\[VIEW:(.*?):(.*?)(?:\|.*?)?\]/); 
        if (match) {
            const title = match[1].trim();
            const id = match[2].trim();
            return (
                <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); handleLinkClick(id); }}
                    className="inline-flex items-center gap-1.5 mx-1 px-3 py-1.5 bg-white text-rose-700 border-2 border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 hover:text-white hover:border-rose-700 transition-all shadow-sm active:scale-95 mb-1"
                >
                    View {title} <ArrowRightIcon className="w-3.5 h-3.5" />
                </button>
            );
        }
        return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[500] flex flex-col justify-end items-end p-6">
      {isOpen && (
        <div className="w-full max-w-[360px] h-[500px] bg-white rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-fadeIn pointer-events-auto mb-4">
          <div className="bg-rose-700 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
                <StethoscopeIcon className="w-5 h-5" />
                <h3 className="font-bold text-sm">Assistant</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition">
                <CloseIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm text-left ${
                  msg.role === 'user' ? 'bg-rose-700 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                }`}>
                  {renderMessageText(msg.text)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
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
                placeholder="Ask records..."
                className="w-full pl-4 pr-12 py-3 bg-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-rose-500 transition"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button type="submit" className="absolute right-2 p-2 bg-rose-700 text-white rounded-xl">
                <SendIcon className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)} className="p-5 rounded-full shadow-2xl pointer-events-auto bg-rose-700 text-white hover:bg-rose-800 transition active:scale-95">
        {isOpen ? <CloseIcon className="w-7 h-7" /> : <ChatIcon className="w-8 h-8" />}
      </button>
    </div>
  );
};
