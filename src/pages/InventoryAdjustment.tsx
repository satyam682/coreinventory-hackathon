import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, ChevronRight, ClipboardCheck, Package, MapPin,
  AlertTriangle, Trash2, Search, Filter
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import axios from '../utils/axios';

interface Product {
  id: string;
  name: string;
  sku: string;
  on_hand: number;
  unit_of_measure: string;
}

interface Adjustment {
  id: string;
  reference: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  unit_of_measure: string;
  location: string;
  recorded_qty: number;
  counted_qty: number;
  difference: number;
  reason: string;
  created_at: string;
}

export default function InventoryAdjustment() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    product_id: '',
    location: '',
    counted_qty: 0,
    reason: ''
  });

  const selectedProduct = products.find(p => p.id === form.product_id);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adjRes, prodRes] = await Promise.all([
        axios.get('/adjustments'),
        axios.get('/products')
      ]);
      setAdjustments(adjRes.data.data);
      setProducts(prodRes.data.data);
    } catch (error) {
      setToast({ message: 'Failed to fetch data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id) {
      setToast({ message: 'Please select a product', type: 'error' });
      return;
    }
    try {
      await axios.post('/adjustments', form);
      setToast({ message: 'Stock adjustment applied successfully', type: 'success' });
      setShowNewModal(false);
      setForm({ product_id: '', location: '', counted_qty: 0, reason: '' });
      fetchData();
    } catch (error: any) {
      setToast({ message: error.response?.data?.error || 'Failed to create adjustment', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/adjustments/${deleteId}`);
      setToast({ message: 'Adjustment deleted', type: 'success' });
      fetchData();
    } catch (error) {
      setToast({ message: 'Failed to delete', type: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = adjustments.filter(a =>
    a.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.reference?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--primary-bg)] font-['DM_Sans']">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-[var(--muted-text)] mb-1">
              <span>Operations</span>
              <ChevronRight size={14} />
              <span className="text-[var(--primary-orange)] font-medium">Inventory Adjustment</span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--dark-text)] font-['Sora']">Inventory Adjustments</h1>
          </div>
          <button 
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 bg-[var(--primary-orange)] text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-all shadow-lg shadow-[var(--card-shadow)]"
          >
            <Plus size={20} />
            New Adjustment
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Adjustments', value: adjustments.length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Positive Adjustments', value: adjustments.filter(a => a.difference > 0).length, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Negative Adjustments', value: adjustments.filter(a => a.difference < 0).length, color: 'text-red-600', bg: 'bg-red-50' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`${stat.bg} p-5 rounded-2xl flex items-center gap-4`}
            >
              <div className={`p-3 rounded-xl bg-white shadow-sm ${stat.color}`}>
                <ClipboardCheck size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-0.5">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-xl border border-[var(--input-border)] mb-6 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search adjustments..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[var(--input-border)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Recorded</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Counted</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Difference</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length > 0 ? (
                  filtered.map((adj, index) => (
                    <motion.tr 
                      key={adj.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-6 py-4 font-medium text-[var(--primary-orange)]">{adj.reference}</td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-medium text-[var(--dark-text)]">{adj.product_name}</span>
                          <span className="block text-xs text-[var(--muted-text)]">{adj.product_sku}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[var(--muted-text)]">{adj.location || '—'}</td>
                      <td className="px-6 py-4 text-[var(--muted-text)]">{adj.recorded_qty}</td>
                      <td className="px-6 py-4 font-medium">{adj.counted_qty}</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${adj.difference > 0 ? 'text-green-600' : adj.difference < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          {adj.difference > 0 ? '+' : ''}{adj.difference}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--muted-text)] text-sm max-w-[150px] truncate">{adj.reason || '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setDeleteId(adj.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <ClipboardCheck size={48} className="mx-auto text-gray-200 mb-4" />
                      <p className="text-[var(--muted-text)] font-medium">No adjustments found</p>
                      <p className="text-sm text-[var(--muted-text)]">Create an adjustment to fix stock mismatches</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* New Adjustment Modal */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-[var(--dark-text)] font-['Sora']">Stock Adjustment</h2>
                <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2">
                    <Package size={14} /> Product
                  </label>
                  <select
                    required
                    value={form.product_id}
                    onChange={e => {
                      const p = products.find(p => p.id === e.target.value);
                      setForm({...form, product_id: e.target.value, counted_qty: p?.on_hand || 0 });
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] bg-white"
                  >
                    <option value="">Select a product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku}) — {p.on_hand} {p.unit_of_measure}</option>
                    ))}
                  </select>
                </div>

                {selectedProduct && (
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <p className="text-sm text-blue-800">
                      <span className="font-bold">Current Stock:</span> {selectedProduct.on_hand} {selectedProduct.unit_of_measure}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2">
                    <MapPin size={14} /> Location (optional)
                  </label>
                  <input 
                    type="text"
                    value={form.location}
                    onChange={e => setForm({...form, location: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)]"
                    placeholder="e.g. WH/Stock Room 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">
                    Counted (Physical) Quantity
                  </label>
                  <input 
                    type="number"
                    required
                    min="0"
                    value={form.counted_qty}
                    onChange={e => setForm({...form, counted_qty: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)]"
                  />
                </div>

                {selectedProduct && (
                  <div className={`p-4 rounded-xl flex items-center gap-3 ${
                    form.counted_qty - selectedProduct.on_hand > 0 ? 'bg-green-50 text-green-800' :
                    form.counted_qty - selectedProduct.on_hand < 0 ? 'bg-red-50 text-red-800' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    <AlertTriangle size={18} />
                    <div>
                      <p className="text-sm font-bold">
                        Difference: {form.counted_qty - selectedProduct.on_hand > 0 ? '+' : ''}
                        {form.counted_qty - selectedProduct.on_hand} {selectedProduct.unit_of_measure}
                      </p>
                      <p className="text-xs">Stock will be updated from {selectedProduct.on_hand} → {form.counted_qty}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">Reason</label>
                  <textarea
                    value={form.reason}
                    onChange={e => setForm({...form, reason: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] min-h-[80px]"
                    placeholder="e.g. Physical count mismatch, damaged items..."
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--input-border)] text-[var(--muted-text)] font-medium hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--primary-orange)] text-white font-medium hover:opacity-90 transition-all shadow-lg shadow-[var(--card-shadow)]"
                  >
                    Apply Adjustment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmDialog 
        isOpen={!!deleteId}
        title="Delete Adjustment"
        message="Are you sure you want to delete this adjustment record?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
