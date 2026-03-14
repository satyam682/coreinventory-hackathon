import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Filter, MoreVertical, ChevronRight, Download, 
  Calendar, User, MapPin, Inbox, Package, Trash2, X
} from 'lucide-react';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import SearchBar from '../components/SearchBar';
import SkeletonRow from '../components/SkeletonRow';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import axios from '../utils/axios';

interface Product { id: string; name: string; sku: string; unit_of_measure: string; }
interface DeliveryItem { product_id: string; quantity: number; }
interface Delivery {
  id: string; reference: string; from_location: string; to_location: string;
  contact: string; schedule_date: string; status: string; items?: any[];
}

const STATUSES = ['All', 'Draft', 'Ready', 'Done', 'Late', 'Canceled'];

export default function DeliveryList() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showNewModal, setShowNewModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [newDelivery, setNewDelivery] = useState({
    from: 'WH/Stock', to: '', contact: '',
    schedule_date: new Date().toISOString().split('T')[0],
    items: [{ product_id: '', quantity: 1 }] as DeliveryItem[]
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [delRes, prodRes] = await Promise.all([axios.get('/delivery'), axios.get('/products')]);
      setDeliveries(delRes.data.data);
      setProducts(prodRes.data.data);
    } catch (error) { setToast({ message: 'Failed to fetch data', type: 'error' }); }
    finally { setLoading(false); }
  };

  const addItem = () => setNewDelivery({...newDelivery, items: [...newDelivery.items, { product_id: '', quantity: 1 }]});
  const removeItem = (i: number) => setNewDelivery({...newDelivery, items: newDelivery.items.filter((_, idx) => idx !== i)});
  const updateItem = (i: number, field: string, value: any) => {
    const items = [...newDelivery.items]; (items[i] as any)[field] = value; setNewDelivery({...newDelivery, items});
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/delivery', { ...newDelivery, items: newDelivery.items.filter(i => i.product_id && i.quantity > 0) });
      setToast({ message: 'Delivery created successfully', type: 'success' });
      setShowNewModal(false); fetchData();
      setNewDelivery({ from: 'WH/Stock', to: '', contact: '', schedule_date: new Date().toISOString().split('T')[0], items: [{ product_id: '', quantity: 1 }] });
    } catch (error) { setToast({ message: 'Failed to create delivery', type: 'error' }); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await axios.delete(`/delivery/${deleteId}`); setToast({ message: 'Delivery deleted', type: 'success' }); fetchData(); }
    catch (error) { setToast({ message: 'Failed to delete', type: 'error' }); }
    finally { setDeleteId(null); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try { await axios.patch(`/delivery/${id}/status`, { status }); setToast({ message: `Delivery ${status === 'Done' ? 'validated — stock updated!' : 'updated'}`, type: 'success' }); fetchData(); }
    catch (error) { setToast({ message: 'Failed to update status', type: 'error' }); }
  };

  const filtered = deliveries.filter(d => {
    const matchSearch = d.reference?.toLowerCase().includes(searchQuery.toLowerCase()) || d.to_location?.toLowerCase().includes(searchQuery.toLowerCase()) || d.contact?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    toDeliver: deliveries.filter(d => d.status === 'Ready' || d.status === 'Draft').length,
    total: deliveries.length,
    completed: deliveries.filter(d => d.status === 'Done').length,
    late: deliveries.filter(d => d.status === 'Late').length,
  };

  return (
    <div className="min-h-screen bg-[var(--primary-bg)] font-['DM_Sans']">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-[var(--muted-text)] mb-1"><span>Operations</span><ChevronRight size={14} /><span className="text-[var(--primary-green)] font-medium">Deliveries</span></div>
            <h1 className="text-3xl font-bold text-[var(--dark-text)] font-['Sora']">Deliveries</h1>
          </div>
          <button onClick={() => setShowNewModal(true)} className="flex items-center gap-2 bg-[var(--primary-green)] text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 shadow-lg shadow-green-100"><Plus size={20} /> New Delivery</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'To Deliver', value: stats.toDeliver, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total', value: stats.total, color: 'text-gray-600', bg: 'bg-gray-50' },
            { label: 'Completed', value: stats.completed, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Late', value: stats.late, color: 'text-red-600', bg: 'bg-red-50' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`${s.bg} p-4 rounded-xl`}>
              <p className="text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-[var(--input-border)] mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1"><SearchBar placeholder="Search by reference, customer or contact..." onSearch={setSearchQuery} /></div>
            <div className="flex items-center gap-3 flex-wrap">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--input-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]">
                {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
              </select>
              {statusFilter !== 'All' && <button onClick={() => setStatusFilter('All')} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"><X size={14} /> Clear</button>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[var(--input-border)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-50">
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Reference</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">From</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">To</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Items</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? [...Array(5)].map((_, i) => <SkeletonRow key={i} columns={8} />) : filtered.length > 0 ? filtered.map((d, i) => (
                  <motion.tr key={d.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="hover:bg-gray-50 group">
                    <td className="px-6 py-4 font-medium text-[var(--primary-green)]">{d.reference}</td>
                    <td className="px-6 py-4 text-[var(--muted-text)]">{d.from_location}</td>
                    <td className="px-6 py-4 text-[var(--dark-text)]">{d.to_location}</td>
                    <td className="px-6 py-4 text-[var(--muted-text)]">{d.items?.length || 0} product(s)</td>
                    <td className="px-6 py-4 text-[var(--muted-text)]">{d.contact}</td>
                    <td className="px-6 py-4 text-[var(--muted-text)]">{d.schedule_date}</td>
                    <td className="px-6 py-4"><StatusBadge status={d.status as any} /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {d.status !== 'Done' && d.status !== 'Canceled' && <button onClick={() => handleStatusChange(d.id, 'Done')} className="text-xs font-medium text-[var(--primary-green)] hover:underline">Validate</button>}
                        <button onClick={() => setDeleteId(d.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </motion.tr>
                )) : <tr><td colSpan={8}><EmptyState icon={Inbox} title="No deliveries found" subtitle="Adjust filters or create a new delivery." actionLabel="Create Delivery" onAction={() => setShowNewModal(true)} /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-xl font-bold text-[var(--dark-text)] font-['Sora']">New Delivery</h2>
                <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600"><Plus size={24} className="rotate-45" /></button>
              </div>
              <form onSubmit={handleCreateDelivery} className="p-6 space-y-4">
                <div><label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2"><MapPin size={14} /> Source</label><input type="text" required value={newDelivery.from} onChange={e => setNewDelivery({...newDelivery, from: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]" placeholder="WH/Stock" /></div>
                <div><label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2"><User size={14} /> Customer / To</label><input type="text" required value={newDelivery.to} onChange={e => setNewDelivery({...newDelivery, to: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]" placeholder="Customer X" /></div>
                <div><label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2"><User size={14} /> Contact</label><input type="text" required value={newDelivery.contact} onChange={e => setNewDelivery({...newDelivery, contact: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]" placeholder="Alice Brown" /></div>
                <div><label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2"><Calendar size={14} /> Date</label><input type="date" required value={newDelivery.schedule_date} onChange={e => setNewDelivery({...newDelivery, schedule_date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]" /></div>
                <div>
                  <div className="flex items-center justify-between mb-2"><label className="text-sm font-medium text-[var(--muted-text)] flex items-center gap-2"><Package size={14} /> Products</label><button type="button" onClick={addItem} className="text-[var(--primary-green)] text-xs font-bold hover:underline flex items-center gap-1"><Plus size={14} /> Add</button></div>
                  <div className="space-y-3">{newDelivery.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-[var(--input-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]"><option value="">Select product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}</select>
                      <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} className="w-20 px-3 py-2 rounded-lg border border-[var(--input-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]" />
                      {newDelivery.items.length > 1 && <button type="button" onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>}
                    </div>
                  ))}</div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowNewModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--input-border)] text-[var(--muted-text)] font-medium hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--primary-green)] text-white font-medium hover:opacity-90 shadow-lg shadow-green-100">Create</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmDialog isOpen={!!deleteId} title="Delete Delivery" message="Are you sure you want to delete this delivery?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
