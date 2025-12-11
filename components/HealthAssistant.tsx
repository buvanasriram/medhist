
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
  }, [messages, isOpen]);

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
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I had trouble checking that. Please try again." }]);
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
    // Regex to match [VIEW:Title:ID]
    const parts = text.split(/(\[VIEW:.*?:.*?\])/g);
    
    return parts.map((part, index) => {
        const match = part.match(/\[VIEW:(.*?):(.*?)(?:\|.*?)?\]/); // Handles potential variations
        if (match) {
            const title = match[1];
            const id = match[2];
            return (
                <button
                    key={index}
                    onClick={() => handleLinkClick(id)}
                    className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 bg-white text-brand-blue-600 border border-brand-blue-200 rounded text-xs font-semibold hover:bg-brand-blue-50 transition shadow-sm"
                >
                    View {title} <ArrowRightIcon className="w-3 h-3" />
                </button>
            );
        }
        return part;
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-xl transition-all duration-300 z-40 ${
          isOpen ? 'bg-slate-200 text-slate-600 rotate-90' : 'bg-brand-blue-600 text-white hover:bg-brand-blue-700'
        }`}
      >
        {isOpen ? <CloseIcon className="w-6 h-6" /> : <ChatIcon className="w-7 h-7" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-4 md:right-6 w-[90vw] md:w-80 h-[50vh] md:h-[450px] bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 z-40 overflow-hidden animate-fadeIn">
          <div className="bg-brand-blue-600 p-3 text-white flex items-center gap-3">
            <div className="bg-white/20 p-1.5 rounded-lg">
                <StethoscopeIcon className="w-4 h-4" />
            </div>
            <div>
                <h3 className="font-bold text-sm leading-tight">medHist Assistant</h3>
                <p className="text-[10px] text-blue-100">Private • AI Powered</p>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-3 space-y-3 bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-brand-blue-600 text-white rounded-br-none' 
                    : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                }`}>
                  {renderMessageText(msg.text)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="bg-white p-2 rounded-2xl rounded-bl-none border border-slate-200 shadow-sm flex items-center gap-2">
                    <SpinnerIcon className="w-3 h-3 text-brand-blue-600 animate-spin" />
                    <span className="text-xs text-slate-500">Processing...</span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-2 bg-white border-t border-slate-200">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Ask a question..."
                className="w-full pl-3 pr-10 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-blue-500 focus:bg-white transition placeholder-slate-400"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                className="absolute right-1 p-1.5 bg-brand-blue-600 text-white rounded-lg hover:bg-brand-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <SendIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
