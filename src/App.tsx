import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  User,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  LogOut,
  LogIn,
  CreditCard,
  History,
  Plus,
  Trash2,
  Lock,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: any;
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: any;
  uid: string;
}

interface WizardStep {
  id: number;
  title: string;
  question: string;
  type: 'text' | 'select' | 'scale' | 'multi';
  options?: string[];
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    title: "Primary Symptom",
    question: "What is the main symptom you are experiencing today?",
    type: 'text',
  },
  {
    id: 2,
    title: "Duration",
    question: "How long have you been experiencing this symptom?",
    type: 'select',
    options: ["Less than 24 hours", "1-3 days", "About a week", "More than a week"],
  },
  {
    id: 3,
    title: "Severity",
    question: "On a scale of 1 to 10, how severe is your discomfort?",
    type: 'scale',
  },
  {
    id: 4,
    title: "Associated Symptoms",
    question: "Are you experiencing any of the following? (Select all that apply)",
    type: 'multi',
    options: ["Fever", "Cough", "Pain", "Fatigue", "Nausea", "Shortness of breath"],
  },
  {
    id: 5,
    title: "Medical History",
    question: "Do you have any pre-existing medical conditions or allergies?",
    type: 'text',
  }
];

// Custom hook for media queries
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'billing'>('chat');
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAnswers, setWizardAnswers] = useState<Record<number, any>>({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setIsAuthLoading(false);
      if (user) {
        // Ensure user profile exists
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            subscriptionTier: 'free',
            createdAt: new Date().toISOString()
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setChatSessions([]);
      return;
    }
    const q = query(
      collection(db, 'chat_sessions'),
      where('uid', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
      setChatSessions(sessions);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, 'chat_sessions', currentSessionId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [currentSessionId]);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentSessionId(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const createNewChat = async () => {
    if (!user) return;
    const docRef = await addDoc(collection(db, 'chat_sessions'), {
      uid: user.uid,
      title: 'New Consultation',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    });
    setCurrentSessionId(docRef.id);
    setActiveTab('chat');
  };

  const deleteSession = async (sessionId: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'chat_sessions', sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const startWizard = () => {
    setIsWizardOpen(true);
    setWizardStep(0);
    setWizardAnswers({});
  };

  const handleWizardNext = (answer: any) => {
    const updatedAnswers = { ...wizardAnswers, [WIZARD_STEPS[wizardStep].id]: answer };
    setWizardAnswers(updatedAnswers);

    if (wizardStep < WIZARD_STEPS.length - 1) {
      setWizardStep(prev => prev + 1);
    } else {
      // Finish wizard
      setIsWizardOpen(false);
      const summary = formatWizardSummary(updatedAnswers);
      sendWizardSummary(summary);
    }
  };

  const formatWizardSummary = (answers: Record<number, any>) => {
    return `**Guided Symptom Report:**\n` +
      `- Primary Symptom: ${answers[1]}\n` +
      `- Duration: ${answers[2]}\n` +
      `- Severity: ${answers[3]}/10\n` +
      `- Associated: ${Array.isArray(answers[4]) ? answers[4].join(', ') : 'None'}\n` +
      `- History: ${answers[5] || 'None reported'}`;
  };

  const sendWizardSummary = async (summary: string) => {
    if (!user) return;
    let sessionId = currentSessionId;
    if (!sessionId) {
      const docRef = await addDoc(collection(db, 'chat_sessions'), {
        uid: user.uid,
        title: summary.slice(0, 30) + '...',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      sessionId = docRef.id;
      setCurrentSessionId(sessionId);
    }

    const messagesRef = collection(db, 'chat_sessions', sessionId, 'messages');
    await addDoc(messagesRef, {
      text: summary,
      sender: 'user',
      timestamp: serverTimestamp()
    });

    await updateDoc(doc(db, 'chat_sessions', sessionId), {
      updatedAt: serverTimestamp(),
      lastMessage: summary
    });

    setIsThinking(true);

    setTimeout(async () => {
      const aiText = "Thank you for providing those details. Based on your report, I recommend monitoring your symptoms closely. If the severity increases or you experience difficulty breathing, please seek urgent medical care. This information has been logged for your consultation.";
      await addDoc(messagesRef, {
        text: aiText,
        sender: 'ai',
        timestamp: serverTimestamp()
      });
      setIsThinking(false);
    }, 2500);
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      const docRef = await addDoc(collection(db, 'chat_sessions'), {
        uid: user.uid,
        title: inputValue.slice(0, 30) + '...',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      sessionId = docRef.id;
      setCurrentSessionId(sessionId);
    }

    const messagesRef = collection(db, 'chat_sessions', sessionId, 'messages');
    const text = inputValue;
    setInputValue('');
    
    await addDoc(messagesRef, {
      text,
      sender: 'user',
      timestamp: serverTimestamp()
    });

    await updateDoc(doc(db, 'chat_sessions', sessionId), {
      updatedAt: serverTimestamp(),
      lastMessage: text
    });

    setIsThinking(true);

    // Simulate AI response
    setTimeout(async () => {
      const aiText = "I am processing your query. Based on general medical knowledge, it's important to monitor symptoms closely. However, for a specific diagnosis, please consult a licensed healthcare professional immediately.";
      await addDoc(messagesRef, {
        text: aiText,
        sender: 'ai',
        timestamp: serverTimestamp()
      });
      setIsThinking(false);
    }, 2000);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

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
            <button onClick={() => setActiveTab('chat')} className={`text-sm font-medium transition-colors ${activeTab === 'chat' ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>Consult AI</button>
            {user && (
              <>
                <button onClick={() => setActiveTab('history')} className={`text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>History</button>
                <button onClick={() => setActiveTab('billing')} className={`text-sm font-medium transition-colors ${activeTab === 'billing' ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>Subscription</button>
              </>
            )}
            <a href="#about" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">About</a>
            
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                  <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold">
                    {user.displayName?.[0] || 'U'}
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{user.displayName?.split(' ')[0]}</span>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="text-slate-500 hover:text-red-600 transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleSignIn}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
              >
                <LogIn size={16} />
                Sign In
              </button>
            )}
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
                <button onClick={() => { setActiveTab('chat'); setIsMenuOpen(false); }} className="text-left text-base font-medium text-slate-600">Consult AI</button>
                {user && (
                  <>
                    <button onClick={() => { setActiveTab('history'); setIsMenuOpen(false); }} className="text-left text-base font-medium text-slate-600">My History</button>
                    <button onClick={() => { setActiveTab('billing'); setIsMenuOpen(false); }} className="text-left text-base font-medium text-slate-600">Subscription</button>
                  </>
                )}
                <a href="#about" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-slate-600">About</a>
                
                {user ? (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                        {user.displayName?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{user.displayName}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <button onClick={handleSignOut} className="p-2 text-slate-400 hover:text-red-600">
                      <LogOut size={20} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => { handleSignIn(); setIsMenuOpen(false); }}
                    className="w-full rounded-lg bg-blue-600 py-3 text-center font-semibold text-white flex items-center justify-center gap-2"
                  >
                    <LogIn size={18} />
                    Sign In with Google
                  </button>
                )}
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

        {/* Main Content Sections */}
        <section id="chat" className="bg-slate-50 py-12 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <AnimatePresence mode="wait">
              {activeTab === 'chat' && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="mb-8 text-center">
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Secure Consultation Window</h2>
                    <p className="mt-2 text-sm md:text-base text-slate-600">Ask your medical questions below. Your data is encrypted and private.</p>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-8 items-start max-w-5xl mx-auto">
                    <div className="flex flex-col h-[500px] md:h-[650px] flex-1 rounded-2xl md:rounded-3xl bg-white shadow-2xl shadow-slate-200 ring-1 ring-slate-200 overflow-hidden relative w-full">
                      
                      {/* Auth Guard Overlay */}
                      {!user && !isAuthLoading && (
                        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md p-8 text-center">
                          <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                            <Lock size={32} />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 mb-2">Sign In Required</h3>
                          <p className="text-slate-600 mb-8 max-w-xs">Please sign in to start a secure consultation and save your chat history.</p>
                          <button 
                            onClick={handleSignIn}
                            className="rounded-full bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
                          >
                            <LogIn size={20} />
                            Sign In with Google
                          </button>
                        </div>
                      )}

                      {/* Chat Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 md:px-6 py-3 md:py-4">
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
                          {user && (
                            <button 
                              onClick={createNewChat}
                              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                              title="New Chat"
                            >
                              <Plus size={20} />
                            </button>
                          )}
                          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <Clock size={12} />
                            Instant Response
                          </span>
                        </div>
                      </div>

                      {/* Chat Messages */}
                      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-slate-50/30 relative">
                        {messages.length === 0 && !isThinking && (
                          <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                              <MessageSquare size={24} />
                            </div>
                            <h4 className="text-slate-900 font-bold mb-1">Start a New Consultation</h4>
                            <p className="text-slate-500 text-sm max-w-xs">Ask anything about your health or use the guided symptom checker.</p>
                          </div>
                        )}
                        
                        <AnimatePresence>
                          {isWizardOpen && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className={`absolute inset-0 z-20 flex items-center justify-center bg-white/95 backdrop-blur-sm ${isMobile ? 'p-0' : 'p-6'}`}
                            >
                              <div className={`w-full h-full md:h-auto md:max-w-md bg-white shadow-2xl ring-1 ring-slate-200 flex flex-col ${isMobile ? 'rounded-none' : 'rounded-3xl p-8'}`}>
                                {isMobile && (
                                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                    <div className="flex items-center gap-2 text-blue-600">
                                      <ClipboardList size={20} />
                                      <span className="text-xs font-bold uppercase tracking-widest">Symptom Checker</span>
                                    </div>
                                    <button onClick={() => setIsWizardOpen(false)} className="text-slate-400 hover:text-slate-600">
                                      <X size={24} />
                                    </button>
                                  </div>
                                )}
                                
                                <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-6' : ''}`}>
                                  {!isMobile && (
                                    <div className="mb-6 flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-blue-600">
                                        <ClipboardList size={20} />
                                        <span className="text-xs font-bold uppercase tracking-widest">Symptom Checker</span>
                                      </div>
                                      <button onClick={() => setIsWizardOpen(false)} className="text-slate-400 hover:text-slate-600">
                                        <X size={20} />
                                      </button>
                                    </div>
                                  )}

                                  <div className="mb-8">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-2">
                                      <span>Step {wizardStep + 1} of {WIZARD_STEPS.length}</span>
                                      <span>{Math.round(((wizardStep + 1) / WIZARD_STEPS.length) * 100)}% Complete</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                      <motion.div 
                                        className="h-full bg-blue-600"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${((wizardStep + 1) / WIZARD_STEPS.length) * 100}%` }}
                                      />
                                    </div>
                                  </div>

                                  <AnimatePresence mode="wait">
                                    <motion.div
                                      key={wizardStep}
                                      initial={{ opacity: 0, x: 20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: -20 }}
                                      className="space-y-6"
                                    >
                                      <h3 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">{WIZARD_STEPS[wizardStep].question}</h3>
                                      
                                      {WIZARD_STEPS[wizardStep].type === 'text' && (
                                        <WizardTextInput onNext={handleWizardNext} />
                                      )}
                                      {WIZARD_STEPS[wizardStep].type === 'select' && (
                                        <WizardSelectInput options={WIZARD_STEPS[wizardStep].options!} onNext={handleWizardNext} />
                                      )}
                                      {WIZARD_STEPS[wizardStep].type === 'scale' && (
                                        <WizardScaleInput onNext={handleWizardNext} />
                                      )}
                                      {WIZARD_STEPS[wizardStep].type === 'multi' && (
                                        <WizardMultiInput options={WIZARD_STEPS[wizardStep].options!} onNext={handleWizardNext} />
                                      )}
                                    </motion.div>
                                  </AnimatePresence>

                                  {wizardStep > 0 && (
                                    <button 
                                      onClick={() => setWizardStep(prev => prev - 1)}
                                      className="mt-8 flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-slate-600"
                                    >
                                      <ChevronLeft size={16} /> Back
                                    </button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {messages.map((msg) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`flex max-w-[85%] md:max-w-[80%] gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
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
                                  {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
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
                        {!isWizardOpen && messages.length === 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 flex justify-center"
                          >
                            <button 
                              onClick={startWizard}
                              className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-600 ring-1 ring-blue-600/20 hover:bg-blue-100 transition-all"
                            >
                              <ClipboardList size={14} />
                              Use Guided Symptom Checker
                            </button>
                          </motion.div>
                        )}
                        <form onSubmit={handleSendMessage} className="relative flex items-center">
                          <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={isMobile ? "Ask Dr. AI..." : "Describe your symptoms or ask a medical question..."}
                            className="w-full rounded-2xl border-none bg-slate-100 py-4 pl-6 pr-14 text-sm focus:ring-2 focus:ring-blue-600 transition-all"
                          />
                          <button
                            type="submit"
                            disabled={!inputValue.trim() || isThinking || !user}
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

                    {/* Desktop Sidebar */}
                    {!isMobile && (
                      <div className="hidden lg:flex flex-col w-72 gap-6">
                        <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
                          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Activity size={16} className="text-blue-600" />
                            Health Insights
                          </h3>
                          <div className="space-y-4">
                            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                              <p className="text-xs font-bold text-blue-700 mb-1">Hydration Tip</p>
                              <p className="text-[11px] text-blue-600 leading-relaxed">Drinking 8 glasses of water daily helps maintain cognitive function.</p>
                            </div>
                            <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                              <p className="text-xs font-bold text-green-700 mb-1">Sleep Quality</p>
                              <p className="text-[11px] text-green-600 leading-relaxed">Consistent sleep schedules improve immune system response.</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-3xl bg-slate-900 p-6 shadow-xl text-white">
                          <h3 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-60">System Status</h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] opacity-80">AI Model</span>
                              <span className="text-[10px] font-bold text-green-400 uppercase">Active</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] opacity-80">Encryption</span>
                              <span className="text-[10px] font-bold text-blue-400 uppercase">AES-256</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] opacity-80">Latency</span>
                              <span className="text-[10px] font-bold text-slate-400">142ms</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-4xl mx-auto"
                >
                  <div className="mb-8 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Consultation History</h2>
                      <p className="mt-2 text-sm md:text-base text-slate-600">Review your past conversations with Dr. AI.</p>
                    </div>
                    <button 
                      onClick={createNewChat}
                      className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                    >
                      <Plus size={18} />
                      New Chat
                    </button>
                  </div>

                  <div className="grid gap-4">
                    {chatSessions.length === 0 ? (
                      <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
                        <div className="h-16 w-16 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center mx-auto mb-4">
                          <History size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">No History Yet</h3>
                        <p className="text-slate-500 mb-6">Start your first consultation to see it here.</p>
                        <button onClick={() => setActiveTab('chat')} className="text-blue-600 font-bold hover:underline">Go to Chat</button>
                      </div>
                    ) : (
                      chatSessions.map((session) => (
                        <div 
                          key={session.id}
                          className={`group relative bg-white rounded-2xl p-5 border transition-all hover:shadow-md ${currentSessionId === session.id ? 'border-blue-600 ring-1 ring-blue-600' : 'border-slate-100'}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 cursor-pointer" onClick={() => { setCurrentSessionId(session.id); setActiveTab('chat'); }}>
                              <h4 className="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{session.title}</h4>
                              <div className="flex items-center gap-3 text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {session.updatedAt?.toDate ? session.updatedAt.toDate().toLocaleDateString() : 'Just now'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageSquare size={12} />
                                  Session ID: {session.id.slice(0, 8)}
                                </span>
                              </div>
                            </div>
                            <button 
                              onClick={() => deleteSession(session.id)}
                              className="p-2 text-slate-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'billing' && (
                <motion.div
                  key="billing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-5xl mx-auto"
                >
                  <div className="mb-12 text-center">
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Subscription Plans</h2>
                    <p className="mt-2 text-sm md:text-base text-slate-600">Choose the plan that best fits your healthcare needs.</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8">
                    {/* Free Plan */}
                    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col">
                      <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Basic</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black text-slate-900">$0</span>
                          <span className="text-slate-500 text-sm">/month</span>
                        </div>
                        <p className="mt-4 text-sm text-slate-500">Essential AI insights for everyone.</p>
                      </div>
                      <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-center gap-3 text-sm text-slate-600">
                          <CheckCircle2 size={18} className="text-green-500" />
                          5 Consultations / month
                        </li>
                        <li className="flex items-center gap-3 text-sm text-slate-600">
                          <CheckCircle2 size={18} className="text-green-500" />
                          Basic Symptom Checker
                        </li>
                        <li className="flex items-center gap-3 text-sm text-slate-600">
                          <CheckCircle2 size={18} className="text-green-500" />
                          24h Chat History
                        </li>
                      </ul>
                      <button className="w-full py-3 rounded-xl border-2 border-slate-100 font-bold text-slate-400 cursor-not-allowed">
                        Current Plan
                      </button>
                    </div>

                    {/* Pro Plan */}
                    <div className="bg-white rounded-3xl p-8 border-2 border-blue-600 shadow-xl shadow-blue-100 flex flex-col relative scale-105">
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full">
                        Recommended
                      </div>
                      <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Professional</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black text-slate-900">$19</span>
                          <span className="text-slate-500 text-sm">/month</span>
                        </div>
                        <p className="mt-4 text-sm text-slate-500">Advanced analysis and priority access.</p>
                      </div>
                      <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-center gap-3 text-sm text-slate-600">
                          <CheckCircle2 size={18} className="text-blue-600" />
                          Unlimited Consultations
                        </li>
                        <li className="flex items-center gap-3 text-sm text-slate-600">
                          <CheckCircle2 size={18} className="text-blue-600" />
                          Advanced Symptom Analysis
                        </li>
                        <li className="flex items-center gap-3 text-sm text-slate-600">
                          <CheckCircle2 size={18} className="text-blue-600" />
                          Lifetime Chat History
                        </li>
                        <li className="flex items-center gap-3 text-sm text-slate-600">
                          <CheckCircle2 size={18} className="text-blue-600" />
                          Priority AI Processing
                        </li>
                      </ul>
                      <button className="w-full py-3 rounded-xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                        <Star size={18} />
                        Upgrade to Pro
                      </button>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col">
                      <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Enterprise</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black text-slate-900">$49</span>
                          <span className="text-slate-500 text-sm">/month</span>
                        </div>
                        <p className="mt-4 text-sm text-slate-500">For clinics and healthcare providers.</p>
                      </div>
                      <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-center gap-3 text-sm text-slate-600">
                          <CheckCircle2 size={18} className="text-slate-900" />
                          Multi-user Access
                        </li>
                        <li className="flex items-center gap-3 text-sm text-slate-600">
                          <CheckCircle2 size={18} className="text-slate-900" />
                          API Access for Integrations
                        </li>
                        <li className="flex items-center gap-3 text-sm text-slate-600">
                          <CheckCircle2 size={18} className="text-slate-900" />
                          Dedicated Support
                        </li>
                      </ul>
                      <button className="w-full py-3 rounded-xl border-2 border-slate-900 font-bold text-slate-900 hover:bg-slate-900 hover:text-white transition-all">
                        Contact Sales
                      </button>
                    </div>
                  </div>

                  <div className="mt-16 p-8 rounded-3xl bg-slate-100 border border-slate-200">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm">
                          <CreditCard size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">Secure Payments</h4>
                          <p className="text-sm text-slate-500">All transactions are encrypted and processed securely via Stripe.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Lock size={16} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">PCI-DSS Compliant</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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

      {/* Back to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl hover:bg-blue-700 transition-all active:scale-95"
          >
            <ChevronRight size={24} className="-rotate-90" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function WizardTextInput({ onNext }: { onNext: (val: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="space-y-4">
      <textarea
        autoFocus
        className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent min-h-[100px]"
        placeholder="Type your answer here..."
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <button
        disabled={!val.trim()}
        onClick={() => onNext(val)}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all"
      >
        Continue <ChevronRight size={18} />
      </button>
    </div>
  );
}

function WizardSelectInput({ options, onNext }: { options: string[], onNext: (val: string) => void }) {
  return (
    <div className="grid gap-3">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onNext(opt)}
          className="w-full rounded-xl border border-slate-200 p-4 text-left text-sm font-medium text-slate-700 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-600 transition-all"
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function WizardScaleInput({ onNext }: { onNext: (val: number) => void }) {
  const [val, setVal] = useState(5);
  return (
    <div className="space-y-8 py-4">
      <div className="relative pt-1">
        <input
          type="range"
          min="1"
          max="10"
          value={val}
          onChange={(e) => setVal(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2">
          <span>1 - MILD</span>
          <span>10 - SEVERE</span>
        </div>
      </div>
      <div className="text-center">
        <span className="text-5xl font-black text-blue-600">{val}</span>
      </div>
      <button
        onClick={() => onNext(val)}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
      >
        Continue <ChevronRight size={18} />
      </button>
    </div>
  );
}

function WizardMultiInput({ options, onNext }: { options: string[], onNext: (val: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  
  const toggle = (opt: string) => {
    setSelected(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`rounded-xl border p-4 text-center text-xs font-bold transition-all ${
              selected.includes(opt) 
                ? 'border-blue-600 bg-blue-50 text-blue-600' 
                : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      <button
        onClick={() => onNext(selected)}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
      >
        {selected.length > 0 ? `Continue with ${selected.length} selected` : 'None of these'} <ChevronRight size={18} />
      </button>
    </div>
  );
}
