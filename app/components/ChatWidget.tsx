'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Bot, User } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'bot' | 'user';
  options?: { label: string; next: string }[];
}

const RULES: Record<string, { text: string; options?: { label: string; next: string }[] }> = {
  start: {
    text: "Hello! I'm CareAssist. How can I help you today?",
    options: [
      { label: "Device Offline / Not Syncing", next: "device_offline" },
      { label: "How does SOS work?", next: "sos_info" },
      { label: "Update My Profile", next: "profile_help" },
      { label: "Contact Human Support", next: "contact_human" },
    ],
  },
  device_offline: {
    text: "If your device is offline: \n1. Check if the battery is charged (Green LED).\n2. Ensure the device is within WiFi range.\n3. A spinning Blue LED means it's trying to reconnect.",
    options: [
      { label: "Still not working", next: "hard_reset" },
      { label: "Go Back", next: "start" }
    ]
  },
  hard_reset: {
    text: "Try a hard reset: Hold the main button for 10 seconds until all lights flash red. Then release.",
    options: [{ label: "Back to Menu", next: "start" }]
  },
  sos_info: {
    text: "When the SOS button is pressed (or a fall is detected), we instantly alert all Admins, Family Members, and Volunteers paired with that Elder. Location tracking starts immediately.",
    options: [{ label: "Back to Menu", next: "start" }]
  },
  profile_help: {
    text: "Admins can edit account details in the 'Account Settings' page. If you are a Family member or Volunteer, please ask your Admin to update your details.",
    options: [{ label: "Back to Menu", next: "start" }]
  },
  contact_human: {
    text: "You can email our engineering team directly at maheshwarisuresh220@gmail.com and faizanmasood009@gmail.com for urgent technical assistance.",
    options: [{ label: "Back to Menu", next: "start" }]
  }
};

export default function ChatWidget({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: RULES['start'].text, sender: 'bot', options: RULES['start'].options }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleOptionClick = (label: string, nextKey: string) => {
    // Add User Choice
    const userMsg: Message = { id: Date.now(), text: label, sender: 'user' };
    
    // Add Bot Response
    const rule = RULES[nextKey];
    const botMsg: Message = { 
      id: Date.now() + 1, 
      text: rule.text, 
      sender: 'bot', 
      options: rule.options 
    };

    setMessages(prev => [...prev, userMsg, botMsg]);
  };

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 p-2 rounded-full"><Bot size={20} /></div>
          <div>
            <h3 className="font-bold text-sm">CareAssist</h3>
            <p className="text-[10px] text-blue-100 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Online</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition"><X size={18} /></button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
              msg.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
            }`}>
              <p className="whitespace-pre-line">{msg.text}</p>
            </div>
            
            {/* Options Buttons */}
            {msg.sender === 'bot' && msg.options && (
              <div className="mt-2 flex flex-wrap gap-2">
                {msg.options.map((opt, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleOptionClick(opt.label, opt.next)}
                    className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 transition active:scale-95 font-medium"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div className="p-3 bg-white border-t border-slate-100 text-center">
        <p className="text-[10px] text-slate-400">Automated Support System • v1.0</p>
      </div>
    </div>
  );
}