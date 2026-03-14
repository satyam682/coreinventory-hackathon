import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, ChevronRight, ArrowRightLeft, MapPin, Package,
  Trash2, Search, MoreVertical, Inbox, X
} from 'lucide-react';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
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

interface TransferItem {
  product_id: string;
  quantity: number;
}

interface Transfer {
  id: string;
  reference: string;
  from_location: string;
  to_location: string;
  notes: string;
  status: string;
  created_at: string;
  items: any[];
}

export default function InternalTransfers() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [form, setForm] = useState({
    from_location: '',
    to_location: '',
    notes: '',
    items: [{ product_id: '', quantity: 1 }] as TransferItem[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trRes, prodRes] = await Promise.all([
        axios.get('/transfers'),
        axios.get('/products')
      ]);
      setTransfers(trRes.data.data);
      setProducts(prodRes.data.data);
    } catch (error) {
      setToast({ message: 'Failed to fetch data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setForm({...form, items: [...form.items, { product_id: '', quantity: 1 }]});
  };

  const removeItem = (index: number) => {
    setForm({...form, items: form.items.filter((_, i) => i !== index)});
  };

  const updateItem = (index: number, field: string, value: any) => {
    const items = [...form.items];
    (items[index] as any)[field] = value;
    setForm({...form, items});
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.from_location || !form.to_location) {
      setToast({ message: 'Source and destination are required', type: 'error' });
      return;
    }
    const validItems = form.items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) {
      setToast({ message: 'Add at least one product', type: 'error' });
      return;
    }
    try {
      await axios.post('/transfers', { ...form, items: validItems });
      setToast({ message: 'Transfer created successfully', type: 'success' });
      setShowNewModal(false);
      setForm({ from_location: '', to_location: '', notes: '', items: [{ product_id: '', quantity: 1 }] });
      fetchData();
    } catch (error: any) {
      setToast({ message: error.response?.data?.error || 'Failed to create transfer', type: 'error' });
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await axios.patch(`/transfers/${id}/status`, { status });
      setToast({ message: `Transfer ${status.toLowerCase()}`, type: 'success' });
      fetchData();
    } catch (error) {
      setToast({ message: 'Failed to update status', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/transfers/${deleteId}`);
      setToast({ message: 'Transfer deleted', type: 'success' });
      fetchData();
    } catch (error) {
      setToast({ message: 'Failed to delete', type: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = transfers.filter(t => {
    const matchSearch = t.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.from_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.to_location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
              <span className="text-purple-600 font-medium">Internal Transfers</span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--dark-text)] font-['Sora']">Internal Transfers</h1>
          </div>
          <button 
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-all shadow-lg shadow-purple-100"
          >
            <Plus size={20} />
            New Transfer
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Transfers', value: transfers.length, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Pending', value: transfers.filter(t => t.status !== 'Done' && t.status !== 'Canceled').length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Completed', value: transfers.filter(t => t.status === 'Done').length, color: 'text-green-600', bg: 'bg-green-50' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`${stat.bg} p-5 rounded-2xl flex items-center gap-4`}
            >
              <div className={`p-3 rounded-xl bg-white shadow-sm ${stat.color}`}>
                <ArrowRightLeft size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-0.5">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-[var(--input-border)] mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Search transfers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all"
              />
            </div>
            <div className="flex items-center gap-3">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--input-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Ready">Ready</option>
                <option value="Done">Done</option>
                <option value="Canceled">Canceled</option>
              </select>
              {statusFilter !== 'All' && <button onClick={() => setStatusFilter('All')} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"><X size={14} /> Clear</button>}
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
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length > 0 ? (
                  filtered.map((transfer, index) => (
                    <motion.tr 
                      key={transfer.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-6 py-4 font-medium text-purple-600">{transfer.reference}</td>
                      <td className="px-6 py-4 text-[var(--dark-text)]">{transfer.from_location}</td>
                      <td className="px-6 py-4 text-[var(--dark-text)]">{transfer.to_location}</td>
                      <td className="px-6 py-4 text-[var(--muted-text)]">
                        {transfer.items?.length || 0} product(s)
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={transfer.status as any} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {transfer.status !== 'Done' && (
                            <button 
                              onClick={() => handleStatusChange(transfer.id, 'Done')}
                              className="text-xs font-medium text-[var(--primary-green)] hover:underline"
                            >
                              Complete
                            </button>
                          )}
                          <button 
                            onClick={() => setDeleteId(transfer.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <ArrowRightLeft size={48} className="mx-auto text-gray-200 mb-4" />
                      <p className="text-[var(--muted-text)] font-medium">No transfers found</p>
                      <p className="text-sm text-[var(--muted-text)]">Create a transfer to move stock between locations</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* New Transfer Modal */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-xl font-bold text-[var(--dark-text)] font-['Sora']">New Internal Transfer</h2>
                <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2">
                      <MapPin size={14} /> Source
                    </label>
                    <input 
                      type="text"
                      required
                      value={form.from_location}
                      onChange={e => setForm({...form, from_location: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-purple-400"
                      placeholder="e.g. Main Warehouse"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2">
                      <MapPin size={14} /> Destination
                    </label>
                    <input 
                      type="text"
                      required
                      value={form.to_location}
                      onChange={e => setForm({...form, to_location: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-purple-400"
                      placeholder="e.g. Production Floor"
                    />
                  </div>
                </div>

                {/* Product Line Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-[var(--muted-text)] flex items-center gap-2">
                      <Package size={14} /> Products to Transfer
                    </label>
                    <button type="button" onClick={addItem} className="text-purple-600 text-xs font-bold hover:underline flex items-center gap-1">
                      <Plus size={14} /> Add Item
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          value={item.product_id}
                          onChange={e => updateItem(idx, 'product_id', e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white text-sm"
                        >
                          <option value="">Select product</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                          ))}
                        </select>
                        <input 
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                          className="w-20 px-3 py-2 rounded-lg border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                          placeholder="Qty"
                        />
                        {form.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm({...form, notes: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-[60px]"
                    placeholder="Optional notes..."
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
                    className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 text-white font-medium hover:opacity-90 transition-all shadow-lg shadow-purple-100"
                  >
                    Create Transfer
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
        title="Delete Transfer"
        message="Are you sure you want to delete this transfer?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
