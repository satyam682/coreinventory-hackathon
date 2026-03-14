import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Filter, LayoutGrid, List, MoreVertical, 
  ChevronRight, Download, ArrowUpDown, Calendar, User, MapPin, Inbox, Package, Trash2, X
} from 'lucide-react';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import SearchBar from '../components/SearchBar';
import SkeletonRow from '../components/SkeletonRow';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import axios from '../utils/axios';

interface Product {
  id: string;
  name: string;
  sku: string;
  unit_of_measure: string;
}

interface ReceiptItem {
  product_id: string;
  quantity: number;
}

interface Receipt {
  id: string;
  reference: string;
  from_location: string;
  to_location: string;
  contact: string;
  schedule_date: string;
  status: 'Ready' | 'Done' | 'Late' | 'Draft' | 'Canceled';
  items?: any[];
}

const STATUSES = ['All', 'Draft', 'Ready', 'Done', 'Late', 'Canceled'];

export default function ReceiptList() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showNewModal, setShowNewModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [newReceipt, setNewReceipt] = useState({
    from: '',
    to: 'WH/Stock',
    contact: '',
    schedule_date: new Date().toISOString().split('T')[0],
    items: [{ product_id: '', quantity: 1 }] as ReceiptItem[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, prodRes] = await Promise.all([
        axios.get('/receipts'),
        axios.get('/products')
      ]);
      setReceipts(recRes.data.data);
      setProducts(prodRes.data.data);
    } catch (error) {
      setToast({ message: 'Failed to fetch data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setNewReceipt({...newReceipt, items: [...newReceipt.items, { product_id: '', quantity: 1 }]});
  };

  const removeItem = (index: number) => {
    setNewReceipt({...newReceipt, items: newReceipt.items.filter((_, i) => i !== index)});
  };

  const updateItem = (index: number, field: string, value: any) => {
    const items = [...newReceipt.items];
    (items[index] as any)[field] = value;
    setNewReceipt({...newReceipt, items});
  };

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validItems = newReceipt.items.filter(i => i.product_id && i.quantity > 0);
      await axios.post('/receipts', { ...newReceipt, items: validItems });
      setToast({ message: 'Receipt created successfully', type: 'success' });
      setShowNewModal(false);
      fetchData();
      setNewReceipt({ from: '', to: 'WH/Stock', contact: '', schedule_date: new Date().toISOString().split('T')[0], items: [{ product_id: '', quantity: 1 }] });
    } catch (error) {
      setToast({ message: 'Failed to create receipt', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/receipts/${deleteId}`);
      setToast({ message: 'Receipt deleted', type: 'success' });
      fetchData();
    } catch (error) {
      setToast({ message: 'Failed to delete receipt', type: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await axios.patch(`/receipts/${id}/status`, { status: newStatus });
      setToast({ message: `Receipt ${newStatus === 'Done' ? 'validated — stock updated!' : 'status updated'}`, type: 'success' });
      fetchData();
    } catch (error) {
      setToast({ message: 'Failed to update status', type: 'error' });
    }
  };

  const filteredReceipts = receipts.filter(r => {
    const matchSearch = r.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.from_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.contact?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    toReceive: receipts.filter(r => r.status === 'Ready' || r.status === 'Draft').length,
    total: receipts.length,
    completed: receipts.filter(r => r.status === 'Done').length,
    late: receipts.filter(r => r.status === 'Late').length,
  };

  const activeFilters = (statusFilter !== 'All' ? 1 : 0);

  return (
    <div className="min-h-screen bg-[var(--primary-bg)] font-['DM_Sans']">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-[var(--muted-text)] mb-1">
              <span>Operations</span><ChevronRight size={14} />
              <span className="text-[var(--primary-orange)] font-medium">Receipts</span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--dark-text)] font-['Sora']">Receipts</h1>
          </div>
          <button onClick={() => setShowNewModal(true)} className="flex items-center gap-2 bg-[var(--primary-orange)] text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-all shadow-lg shadow-[var(--card-shadow)]">
            <Plus size={20} /> New Receipt
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'To Receive', value: stats.toReceive, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total', value: stats.total, color: 'text-gray-600', bg: 'bg-gray-50' },
            { label: 'Completed', value: stats.completed, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Late', value: stats.late, color: 'text-red-600', bg: 'bg-red-50' },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`${stat.bg} p-4 rounded-xl`}>
              <p className="text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-xl border border-[var(--input-border)] mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <SearchBar placeholder="Search by reference, vendor or contact..." onSearch={setSearchQuery} />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--input-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)]">
                {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
              </select>
              {activeFilters > 0 && (
                <button onClick={() => setStatusFilter('All')} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium">
                  <X size={14} /> Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[var(--input-border)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">From</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">To</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Items</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(5)].map((_, i) => <SkeletonRow key={i} columns={8} />)
                ) : filteredReceipts.length > 0 ? (
                  filteredReceipts.map((receipt, index) => (
                    <motion.tr key={receipt.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 font-medium text-[var(--primary-orange)]">{receipt.reference}</td>
                      <td className="px-6 py-4 text-[var(--dark-text)]">{receipt.from_location}</td>
                      <td className="px-6 py-4 text-[var(--muted-text)]">{receipt.to_location}</td>
                      <td className="px-6 py-4 text-[var(--muted-text)]">{receipt.items?.length || 0} product(s)</td>
                      <td className="px-6 py-4 text-[var(--muted-text)]">{receipt.contact}</td>
                      <td className="px-6 py-4 text-[var(--muted-text)]">{receipt.schedule_date}</td>
                      <td className="px-6 py-4"><StatusBadge status={receipt.status} /></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {receipt.status !== 'Done' && receipt.status !== 'Canceled' && (
                            <button onClick={() => handleStatusChange(receipt.id, 'Done')} className="text-xs font-medium text-[var(--primary-green)] hover:underline">Validate</button>
                          )}
                          <button onClick={() => setDeleteId(receipt.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr><td colSpan={8}><EmptyState icon={Inbox} title="No receipts found" subtitle="Try adjusting your search or filters." actionLabel="Create New Receipt" onAction={() => setShowNewModal(true)} /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* New Receipt Modal */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-xl font-bold text-[var(--dark-text)] font-['Sora']">New Receipt</h2>
                <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600"><Plus size={24} className="rotate-45" /></button>
              </div>
              <form onSubmit={handleCreateReceipt} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2"><User size={14} /> Vendor / From</label>
                  <input type="text" required value={newReceipt.from} onChange={e => setNewReceipt({...newReceipt, from: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)]" placeholder="e.g. Supplier A" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2"><MapPin size={14} /> Destination</label>
                  <input type="text" required value={newReceipt.to} onChange={e => setNewReceipt({...newReceipt, to: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)]" placeholder="e.g. WH/Stock" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2"><User size={14} /> Contact</label>
                  <input type="text" required value={newReceipt.contact} onChange={e => setNewReceipt({...newReceipt, contact: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)]" placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2"><Calendar size={14} /> Date</label>
                  <input type="date" required value={newReceipt.schedule_date} onChange={e => setNewReceipt({...newReceipt, schedule_date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)]" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-[var(--muted-text)] flex items-center gap-2"><Package size={14} /> Products</label>
                    <button type="button" onClick={addItem} className="text-[var(--primary-orange)] text-xs font-bold hover:underline flex items-center gap-1"><Plus size={14} /> Add</button>
                  </div>
                  <div className="space-y-3">
                    {newReceipt.items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-[var(--input-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)]">
                          <option value="">Select product</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                        </select>
                        <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} className="w-20 px-3 py-2 rounded-lg border border-[var(--input-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)]" />
                        {newReceipt.items.length > 1 && <button type="button" onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowNewModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--input-border)] text-[var(--muted-text)] font-medium hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--primary-orange)] text-white font-medium hover:opacity-90 shadow-lg shadow-[var(--card-shadow)]">Create</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmDialog isOpen={!!deleteId} title="Delete Receipt" message="Are you sure you want to delete this receipt?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
