import React, { useState, useRef, useEffect } from 'react';
import { 
  Stethoscope, 
  Send, 
  ShieldCheck, 
  Info, 
  Menu, 
  X, 
  MessageSquare, 
  Activity, 
  Clock, 
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm Dr. AI. How can I assist you with your medical queries today? Please remember that I am an AI and not a replacement for professional medical advice.",
      sender: 'ai',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I am processing your query. Based on general medical knowledge, it's important to monitor symptoms closely. However, for a specific diagnosis, please consult a licensed healthcare professional immediately.",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsThinking(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <Stethoscope size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Dr.<span className="text-blue-600">AI</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex md:items-center md:gap-8">
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Home</a>
            <a href="#about" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">About</a>
            <a href="#chat" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Consult AI</a>
            <button className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition-all active:scale-95">
              Get Started
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-slate-600"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-100 bg-white px-4 py-4"
            >
              <div className="flex flex-col gap-4">
                <a href="#" className="text-base font-medium text-slate-600">Home</a>
                <a href="#about" className="text-base font-medium text-slate-600">About</a>
                <a href="#chat" className="text-base font-medium text-slate-600">Consult AI</a>
                <button className="w-full rounded-lg bg-blue-600 py-3 text-center font-semibold text-white">
                  Get Started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-white py-20 lg:py-32">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(59,130,246,0.05)_0%,transparent_100%)]"></div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 mb-6">
                  <ShieldCheck size={16} />
                  <span>Secure & Private Medical Queries</span>
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
                  Your Health, <br />
                  <span className="text-blue-600">AI-Powered Insights.</span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-slate-600 max-w-xl">
                  Dr. AI provides instant, data-driven answers to your medical questions. 
                  Experience the future of healthcare consultation with our secure, 
                  clinical-grade artificial intelligence.
                </p>
                <div className="mt-10 flex items-center gap-x-6">
                  <a
                    href="#chat"
                    className="rounded-full bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all hover:-translate-y-1"
                  >
                    Start Consultation
                  </a>
                  <a href="#about" className="text-sm font-semibold leading-6 text-slate-900 flex items-center gap-1 group">
                    Learn more <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </a>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <div className="relative rounded-2xl bg-slate-100 p-2 shadow-2xl ring-1 ring-slate-900/5">
                  <img
                    src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1000"
                    alt="Medical Professional"
                    className="rounded-xl shadow-inner w-full h-auto object-cover aspect-[4/3]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-6 -left-6 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-900/5 hidden sm:block">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <Activity size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Real-time Analysis</p>
                        <p className="text-xs text-slate-500">99.9% System Uptime</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Chat Interface */}
        <section id="chat" className="bg-slate-50 py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Secure Consultation Window</h2>
              <p className="mt-2 text-slate-600">Ask your medical questions below. Your data is encrypted and private.</p>
            </div>

            <div className="flex flex-col h-[600px] rounded-3xl bg-white shadow-2xl shadow-slate-200 ring-1 ring-slate-200 overflow-hidden">
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <Stethoscope size={20} />
                    </div>
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500"></div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Dr. AI Assistant</p>
                    <p className="text-xs text-slate-500">Online & Ready to Help</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <Clock size={12} />
                    Instant Response
                  </span>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex max-w-[80%] gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${msg.sender === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`}>
                        {msg.sender === 'user' ? <User size={16} /> : <Stethoscope size={16} />}
                      </div>
                      <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        msg.sender === 'user' 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                      }`}>
                        {msg.text}
                        <p className={`mt-1 text-[10px] ${msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {isThinking && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-white">
                        <Stethoscope size={16} />
                      </div>
                      <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3 shadow-sm rounded-tl-none">
                        <div className="flex gap-1">
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1] }} 
                            transition={{ repeat: Infinity, duration: 1 }}
                            className="h-2 w-2 rounded-full bg-blue-400" 
                          />
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1] }} 
                            transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                            className="h-2 w-2 rounded-full bg-blue-400" 
                          />
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1] }} 
                            transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                            className="h-2 w-2 rounded-full bg-blue-400" 
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400 italic">Dr. AI is thinking...</p>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="border-t border-slate-100 bg-white p-4">
                <form onSubmit={handleSendMessage} className="relative flex items-center">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Describe your symptoms or ask a medical question..."
                    className="w-full rounded-2xl border-none bg-slate-100 py-4 pl-6 pr-14 text-sm focus:ring-2 focus:ring-blue-600 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isThinking}
                    className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
                  >
                    <Send size={18} />
                  </button>
                </form>
                <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest">
                  <ShieldCheck size={12} />
                  End-to-End Encrypted
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Disclaimer Section */}
        <section className="bg-white py-12 border-t border-slate-100">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-amber-50 p-6 ring-1 ring-inset ring-amber-600/10">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <Info size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider">Important Medical Disclaimer</h3>
                  <p className="mt-2 text-sm leading-6 text-amber-700">
                    Dr. AI is an artificial intelligence platform designed to provide general information and educational insights. 
                    <strong> It is not a substitute for professional medical advice, diagnosis, or treatment.</strong> 
                    Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. 
                    Never disregard professional medical advice or delay in seeking it because of something you have read on this platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-4">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                  <Stethoscope size={18} />
                </div>
                <span className="text-xl font-bold tracking-tight">
                  Dr.<span className="text-blue-400">AI</span>
                </span>
              </div>
              <p className="text-slate-400 max-w-sm">
                Empowering individuals with instant medical insights through advanced artificial intelligence. 
                Bridging the gap between curiosity and clinical knowledge.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-widest mb-6">Platform</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">How it Works</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-widest mb-6">Resources</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Health Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community Forum</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Research Papers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Documentation</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-slate-800 pt-8 text-center text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Dr. AI Medical Query Platform. All rights reserved.</p>
            <p className="mt-2">Designed for educational purposes only.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
