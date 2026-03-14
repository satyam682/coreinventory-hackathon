import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, MessageCircle, Bot, User, Loader2, CheckCircle, XCircle, AlertTriangle, Package, Truck, Inbox } from 'lucide-react';
import axios from '../utils/axios';

interface Message {
  id: number;
  role: 'user' | 'bot';
  text?: string;
  typing?: boolean;
  intent?: string;
  extractedData?: any;
  needsConfirmation?: boolean;
  confirmationTitle?: string;
  missingFields?: string[];
  stockData?: any[];
  pendingReceipts?: any[];
  pendingDeliveries?: any[];
  quickReplies?: string[];
  confirming?: boolean;
  confirmed?: boolean;
  confirmResult?: string;
  cancelled?: boolean;
  timestamp?: Date;
}

const QUICK_DEFAULTS = ['Add a new receipt', 'Create delivery order', 'Add new product', 'Check stock levels', 'Show pending operations'];

const FIELD_LABELS: Record<string,string> = {
  from_location: 'From', to_location: 'To', contact: 'Contact',
  product_name: 'Product', quantity: 'Quantity', schedule_date: 'Date',
  per_unit_cost: 'Unit Cost', on_hand: 'Initial Stock', free: 'Free Qty'
};

interface ChatBotProps { isOpen: boolean; onClose: () => void; }

export default function ChatBot({ isOpen, onClose }: ChatBotProps) {
  const loadSaved = (key: string, fallback: any) => {
    try { const saved = sessionStorage.getItem(key); return saved ? JSON.parse(saved) : fallback; }
    catch { return fallback; }
  };

  const initialMsg: Message = {
    id: 1, role: 'bot',
    text: "Hi! 👋 I'm your Sanchay AI assistant. I can help you manage your warehouse using natural language.\n\nTry saying things like:\n• \"Add receipt for 50 steel rods from Supplier A\"\n• \"Create delivery for 10 chairs to Customer B\"\n• \"Check stock levels\"",
    quickReplies: QUICK_DEFAULTS, timestamp: new Date()
  };

  const [messages, setMessages] = useState<Message[]>(() => loadSaved('sanchay_chat_msgs', [initialMsg]));
  const [history, setHistory] = useState<any[]>(() => loadSaved('sanchay_chat_hist', []));
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { sessionStorage.setItem('sanchay_chat_msgs', JSON.stringify(messages)); }, [messages]);
  useEffect(() => { sessionStorage.setItem('sanchay_chat_hist', JSON.stringify(history)); }, [history]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 200); }, [isOpen]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Message = { id: Date.now(), role: 'user', text: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const typingId = Date.now() + 1;
    setMessages(prev => [...prev, { id: typingId, role: 'bot', typing: true }]);

    try {
      const res = await axios.post('/chat/message', { message: msg, conversation_history: history });
      const ai = res.data;

      setHistory(prev => [...prev, { role: 'user', content: msg }, { role: 'assistant', content: JSON.stringify(ai) }]);
      setMessages(prev => prev.filter(m => m.id !== typingId));

      setMessages(prev => [...prev, {
        id: Date.now() + 2, role: 'bot', text: ai.message,
        intent: ai.intent, extractedData: ai.extracted_data,
        needsConfirmation: ai.needs_confirmation, confirmationTitle: ai.confirmation_title,
        missingFields: ai.missing_fields || [], stockData: ai.stock_data || null,
        pendingReceipts: ai.pending_receipts || null, pendingDeliveries: ai.pending_deliveries || null,
        quickReplies: ai.quick_replies || [], timestamp: new Date()
      }]);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== typingId));
      setMessages(prev => [...prev, { id: Date.now() + 2, role: 'bot', text: 'Sorry, something went wrong. Please try again.', quickReplies: QUICK_DEFAULTS, timestamp: new Date() }]);
    } finally { setLoading(false); }
  };

  const handleConfirm = async (intent: string, data: any, msgId: number) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, confirming: true } : m));
    try {
      const res = await axios.post('/chat/execute', { intent, data });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, confirming: false, confirmed: res.data.success, confirmResult: res.data.message } : m));
      setMessages(prev => [...prev, { id: Date.now(), role: 'bot', text: res.data.message, quickReplies: res.data.success ? ['Add another', 'Check stock', 'Show pending'] : ['Try again'], timestamp: new Date() }]);
    } catch {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, confirming: false, confirmed: false, confirmResult: 'Failed to execute.' } : m));
    }
  };

  const handleCancel = (msgId: number) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, cancelled: true } : m));
  };

  return (
    <div style={{ display: isOpen ? 'block' : 'none' }}>
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 w-[400px] h-[560px] bg-white rounded-2xl border border-gray-200 shadow-2xl flex flex-col z-[1000] font-['DM_Sans'] overflow-hidden"
        style={{ borderTop: '4px solid #F97316' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#FFF7ED] border-b border-orange-100">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center text-white text-xs font-bold font-['Sora'] shrink-0 shadow-md">AI</div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-[var(--dark-text)] font-['Sora']">Sanchay Assistant</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <p className="text-[11px] text-[var(--muted-text)]">Powered by Cohere AI</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-orange-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'thin' }}>
          {messages.map(msg => (
            <div key={msg.id}>
              {msg.typing ? (
                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-[#FFF7ED] border border-orange-200 flex items-center justify-center text-[10px] text-orange-500 font-bold shrink-0">AI</div>
                  <div className="bg-gray-100 rounded-xl rounded-bl-sm px-3 py-2 flex gap-1 items-center">
                    {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                  </div>
                </div>
              ) : (
                <div className={`flex gap-2 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${
                    msg.role === 'bot' ? 'bg-[#FFF7ED] border border-orange-200 text-orange-500' : 'bg-[var(--dark-text)] text-white'
                  }`}>{msg.role === 'bot' ? 'AI' : <User size={12} />}</div>

                  <div className="max-w-[80%] flex flex-col gap-1.5">
                    {msg.text && (
                      <div className={`px-3 py-2 text-[13px] leading-relaxed whitespace-pre-line ${
                        msg.role === 'bot'
                          ? 'bg-gray-100 text-[var(--dark-text)] rounded-xl rounded-bl-sm'
                          : 'bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white rounded-xl rounded-br-sm'
                      }`}>{msg.text}</div>
                    )}

                    {msg.stockData && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                        <div className="px-3 py-1.5 bg-[#FFF7ED] font-semibold text-orange-700 text-[11px] flex items-center gap-1"><Package size={12} /> Current Stock</div>
                        {msg.stockData.map((item: any, i: number) => (
                          <div key={i} className={`flex justify-between px-3 py-1.5 border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <span className="text-[var(--dark-text)]">{item.name}</span>
                            <span className={`font-semibold ${item.on_hand < 5 ? 'text-red-500' : item.on_hand < 20 ? 'text-orange-500' : 'text-green-600'}`}>{item.on_hand} units</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {(msg.pendingReceipts || msg.pendingDeliveries) && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                        {msg.pendingReceipts && msg.pendingReceipts.length > 0 && (<>
                          <div className="px-3 py-1.5 bg-[#FFF7ED] font-semibold text-orange-700 text-[11px] flex items-center gap-1"><Inbox size={12} /> Pending Receipts ({msg.pendingReceipts.length})</div>
                          {msg.pendingReceipts.map((r: any, i: number) => (
                            <div key={i} className="flex justify-between px-3 py-1.5 border-t border-gray-100">
                              <span className="text-orange-600 font-semibold">{r.reference}</span>
                              <span className="text-gray-500">{r.from_location}</span>
                            </div>
                          ))}
                        </>)}
                        {msg.pendingDeliveries && msg.pendingDeliveries.length > 0 && (<>
                          <div className="px-3 py-1.5 bg-green-50 font-semibold text-green-700 text-[11px] flex items-center gap-1"><Truck size={12} /> Pending Deliveries ({msg.pendingDeliveries.length})</div>
                          {msg.pendingDeliveries.map((d: any, i: number) => (
                            <div key={i} className="flex justify-between px-3 py-1.5 border-t border-gray-100">
                              <span className="text-green-600 font-semibold">{d.reference}</span>
                              <span className="text-gray-500">{d.to_location}</span>
                            </div>
                          ))}
                        </>)}
                      </div>
                    )}

                    {msg.needsConfirmation && !msg.cancelled && msg.extractedData && (
                      <div className={`border rounded-lg overflow-hidden text-xs ${msg.confirmResult ? (msg.confirmed ? 'border-green-300' : 'border-red-300') : 'border-orange-200'}`}>
                        {msg.confirmResult ? (
                          <><div className={`px-3 py-2 font-semibold text-[11px] flex items-center gap-1 ${msg.confirmed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {msg.confirmed ? <><CheckCircle size={12} /> Success</> : <><XCircle size={12} /> Failed</>}
                          </div><div className="px-3 py-2 text-gray-500">{msg.confirmResult}</div></>
                        ) : (<>
                          <div className="px-3 py-2 bg-[#FFF7ED] border-b border-orange-200 font-semibold text-orange-700 text-[11px]">{msg.confirmationTitle || `Confirm ${msg.intent?.replace(/_/g, ' ')}`}</div>
                          <div className="p-3 space-y-1.5">
                            {Object.entries(msg.extractedData).filter(([_, v]) => v != null && v !== '').map(([k, v]) => (
                              <div key={k} className="flex justify-between items-center">
                                <span className="text-gray-500">{FIELD_LABELS[k] || k}</span>
                                <span className="font-semibold text-[var(--dark-text)]">{k === 'per_unit_cost' ? `₹${v}` : k === 'quantity' || k === 'on_hand' ? `${v} units` : String(v)}</span>
                              </div>
                            ))}
                            {msg.missingFields && msg.missingFields.length > 0 && (
                              <div className="mt-1 p-1.5 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-[11px] flex items-center gap-1"><AlertTriangle size={11} /> Missing: {msg.missingFields.join(', ')}</div>
                            )}
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => handleConfirm(msg.intent!, msg.extractedData, msg.id)} disabled={msg.confirming}
                                className="flex-1 py-1.5 bg-[#F97316] text-white rounded-md text-xs font-semibold hover:bg-[#EA580C] disabled:opacity-50 transition-all">
                                {msg.confirming ? 'Creating...' : '✓ Confirm & Create'}
                              </button>
                              <button onClick={() => handleCancel(msg.id)} className="px-3 py-1.5 border border-gray-200 rounded-md text-xs text-gray-500 hover:bg-gray-50">Cancel</button>
                            </div>
                          </div>
                        </>)}
                      </div>
                    )}

                    {msg.quickReplies && msg.quickReplies.length > 0 && !msg.cancelled && (
                      <div className="flex flex-wrap gap-1">
                        {msg.quickReplies.map((r, i) => (
                          <button key={i} onClick={() => send(r)} className="px-2.5 py-1 border border-gray-200 rounded-full text-[11px] text-gray-500 bg-white hover:border-orange-400 hover:text-orange-500 transition-all">{r}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/80 flex gap-2">
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a command or ask anything..."
            disabled={loading}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent disabled:opacity-50 transition-all"
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="px-4 py-2 bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white rounded-xl text-[13px] font-semibold disabled:opacity-40 hover:opacity-90 transition-all flex items-center gap-1">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
