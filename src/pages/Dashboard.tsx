import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Package, AlertTriangle, Inbox, TruckIcon, ArrowRightLeft,
  Activity, Clock, ChevronRight, BarChart3, X, Filter, Clipboard
} from 'lucide-react';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import axios from '../utils/axios';

interface DashboardStats {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  receipts_pending: number;
  deliveries_pending: number;
  transfers_pending: number;
  late_operations_count: number;
  total_stock_items: number;
}

interface ReceiptSummary { to_receive: number; total_operations: number; completed: number; late_count: number; }
interface DeliverySummary { to_deliver: number; total_operations: number; completed: number; late_count: number; }

const DOC_TYPES = ['All', 'Receipts', 'Delivery', 'Internal', 'Adjustments'];
const STATUSES = ['All', 'Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];
const CATEGORIES = ['All', 'General', 'Furniture', 'Electronics', 'Accessories', 'Raw Materials', 'Packaging', 'Tools'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [receiptSummary, setReceiptSummary] = useState<ReceiptSummary | null>(null);
  const [deliverySummary, setDeliverySummary] = useState<DeliverySummary | null>(null);
  const [recentMoves, setRecentMoves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [docTypeFilter, setDocTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, receiptRes, deliveryRes, movesRes] = await Promise.all([
        axios.get('/dashboard/stats'),
        axios.get('/dashboard/receipt-summary'),
        axios.get('/dashboard/delivery-summary'),
        axios.get('/dashboard/recent-moves?limit=20')
      ]);
      setStats(statsRes.data);
      setReceiptSummary(receiptRes.data);
      setDeliverySummary(deliveryRes.data);
      setRecentMoves(movesRes.data);
    } catch (error) { console.error('Failed to fetch dashboard data', error); }
    finally { setLoading(false); }
  };

  // Filter recent moves
  const filteredMoves = recentMoves.filter(m => {
    const type = m.type || m.move_type || '';
    const matchDocType = docTypeFilter === 'All' || 
      (docTypeFilter === 'Receipts' && type === 'IN') ||
      (docTypeFilter === 'Delivery' && type === 'OUT') ||
      (docTypeFilter === 'Internal' && type === 'INTERNAL') ||
      (docTypeFilter === 'Adjustments' && type === 'ADJUSTMENT');
    const matchStatus = statusFilter === 'All' || m.status === statusFilter;
    const matchWarehouse = !warehouseFilter || m.from?.toLowerCase().includes(warehouseFilter.toLowerCase()) || m.to?.toLowerCase().includes(warehouseFilter.toLowerCase());
    return matchDocType && matchStatus && matchWarehouse;
  });

  const activeFilters = (docTypeFilter !== 'All' ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0) + (categoryFilter !== 'All' ? 1 : 0) + (warehouseFilter ? 1 : 0);
  const clearFilters = () => { setDocTypeFilter('All'); setStatusFilter('All'); setCategoryFilter('All'); setWarehouseFilter(''); };

  const kpiCards = [
    { label: 'Total Products', value: stats?.total_products || 0, icon: Package, color: 'text-blue-600', bg: 'from-blue-50 to-blue-100', border: 'border-blue-200' },
    { label: 'Low / Out of Stock', value: `${stats?.low_stock_count || 0} / ${stats?.out_of_stock_count || 0}`, icon: AlertTriangle, color: 'text-orange-600', bg: 'from-orange-50 to-orange-100', border: 'border-orange-200' },
    { label: 'Pending Receipts', value: stats?.receipts_pending || 0, icon: Inbox, color: 'text-indigo-600', bg: 'from-indigo-50 to-indigo-100', border: 'border-indigo-200' },
    { label: 'Pending Deliveries', value: stats?.deliveries_pending || 0, icon: TruckIcon, color: 'text-green-600', bg: 'from-green-50 to-green-100', border: 'border-green-200' },
    { label: 'Transfers Scheduled', value: stats?.transfers_pending || 0, icon: ArrowRightLeft, color: 'text-purple-600', bg: 'from-purple-50 to-purple-100', border: 'border-purple-200' },
    { label: 'Total Stock Items', value: stats?.total_stock_items || 0, icon: BarChart3, color: 'text-teal-600', bg: 'from-teal-50 to-teal-100', border: 'border-teal-200' },
  ];

  return (
    <div className="min-h-screen bg-[var(--primary-bg)] font-['DM_Sans']">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--dark-text)] font-['Sora'] mb-1">Inventory Dashboard</h1>
          <p className="text-[var(--muted-text)]">Real-time overview of your inventory operations</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {loading ? [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 animate-pulse border border-gray-100"><div className="h-4 bg-gray-100 rounded w-1/2 mb-3" /><div className="h-8 bg-gray-100 rounded w-1/3" /></div>
          )) : kpiCards.map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.4 }} className={`bg-gradient-to-br ${kpi.bg} p-5 rounded-2xl border ${kpi.border} hover:shadow-md transition-all cursor-pointer group`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider mb-1">{kpi.label}</p>
                  <p className={`text-3xl font-bold ${kpi.color} font-['Sora']`}>{kpi.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-white/70 shadow-sm ${kpi.color} group-hover:scale-110 transition-transform`}><kpi.icon size={24} /></div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Dynamic Filters */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white p-4 rounded-xl border border-[var(--input-border)] mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={16} className="text-[var(--primary-orange)]" />
            <span className="text-sm font-semibold text-[var(--dark-text)]">Dynamic Filters</span>
            {activeFilters > 0 && (
              <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium">
                <X size={14} /> Clear all ({activeFilters})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <select value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--input-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)]">
              <option value="All">📄 All Document Types</option>
              <option value="Receipts">📥 Receipts</option>
              <option value="Delivery">📤 Delivery</option>
              <option value="Internal">🔄 Internal Transfers</option>
              <option value="Adjustments">📋 Adjustments</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--input-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)]">
              <option value="All">🏷️ All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Waiting">Waiting</option>
              <option value="Ready">Ready</option>
              <option value="Done">Done</option>
              <option value="Canceled">Canceled</option>
            </select>
            <input type="text" value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)} placeholder="🏭 Filter by warehouse/location..." className="px-3 py-2 rounded-lg border border-[var(--input-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] min-w-[200px]" />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--input-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)]">
              {CATEGORIES.map(c => <option key={c} value={c}>{c === 'All' ? '📦 All Categories' : c}</option>)}
            </select>
          </div>
        </motion.div>

        {/* Operation Summaries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {(docTypeFilter === 'All' || docTypeFilter === 'Receipts') && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-2xl border border-[var(--input-border)] overflow-hidden shadow-sm">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--light-orange-bg)] rounded-xl"><Inbox size={20} className="text-[var(--primary-orange)]" /></div>
                  <h3 className="text-lg font-bold text-[var(--dark-text)] font-['Sora']">Receipts</h3>
                </div>
                <a href="/operations/receipts" className="text-sm text-[var(--primary-orange)] hover:underline flex items-center gap-1">View All <ChevronRight size={14} /></a>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                {[
                  { label: 'To Receive', value: receiptSummary?.to_receive || 0, color: 'text-blue-600' },
                  { label: 'Total', value: receiptSummary?.total_operations || 0, color: 'text-gray-600' },
                  { label: 'Completed', value: receiptSummary?.completed || 0, color: 'text-green-600' },
                  { label: 'Late', value: receiptSummary?.late_count || 0, color: 'text-red-600' },
                ].map((it, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl"><p className="text-xs text-[var(--muted-text)] uppercase tracking-wider mb-0.5">{it.label}</p><p className={`text-xl font-bold ${it.color}`}>{it.value}</p></div>
                ))}
              </div>
            </motion.div>
          )}

          {(docTypeFilter === 'All' || docTypeFilter === 'Delivery') && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-2xl border border-[var(--input-border)] overflow-hidden shadow-sm">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-xl"><TruckIcon size={20} className="text-[var(--primary-green)]" /></div>
                  <h3 className="text-lg font-bold text-[var(--dark-text)] font-['Sora']">Deliveries</h3>
                </div>
                <a href="/operations/delivery" className="text-sm text-[var(--primary-green)] hover:underline flex items-center gap-1">View All <ChevronRight size={14} /></a>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                {[
                  { label: 'To Deliver', value: deliverySummary?.to_deliver || 0, color: 'text-blue-600' },
                  { label: 'Total', value: deliverySummary?.total_operations || 0, color: 'text-gray-600' },
                  { label: 'Completed', value: deliverySummary?.completed || 0, color: 'text-green-600' },
                  { label: 'Late', value: deliverySummary?.late_count || 0, color: 'text-red-600' },
                ].map((it, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl"><p className="text-xs text-[var(--muted-text)] uppercase tracking-wider mb-0.5">{it.label}</p><p className={`text-xl font-bold ${it.color}`}>{it.value}</p></div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Recent Operations */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-white rounded-2xl border border-[var(--input-border)] overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl"><Activity size={20} className="text-blue-600" /></div>
              <h3 className="text-lg font-bold text-[var(--dark-text)] font-['Sora']">Recent Operations</h3>
              {activeFilters > 0 && <span className="text-xs text-[var(--muted-text)] bg-gray-100 px-2 py-0.5 rounded-full">{filteredMoves.length} results</span>}
            </div>
            <a href="/move-history" className="text-sm text-blue-600 hover:underline flex items-center gap-1">View All <ChevronRight size={14} /></a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-50">
                <th className="px-6 py-3 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">From</th>
                <th className="px-6 py-3 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">To</th>
                <th className="px-6 py-3 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Date</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? [...Array(5)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-6 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>) : filteredMoves.length > 0 ? filteredMoves.map((move: any, i: number) => {
                  const type = move.type || move.move_type || '';
                  return (
                    <motion.tr key={move.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-[var(--primary-orange)]">{move.reference}</td>
                      <td className="px-6 py-3"><span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase ${type === 'IN' ? 'bg-blue-50 text-blue-700' : type === 'OUT' ? 'bg-green-50 text-green-700' : type === 'INTERNAL' ? 'bg-purple-50 text-purple-700' : 'bg-yellow-50 text-yellow-700'}`}>{type}</span></td>
                      <td className="px-6 py-3 text-[var(--muted-text)] text-sm">{move.from}</td>
                      <td className="px-6 py-3 text-[var(--muted-text)] text-sm">{move.to}</td>
                      <td className="px-6 py-3"><StatusBadge status={move.status} /></td>
                      <td className="px-6 py-3 text-[var(--muted-text)] text-sm flex items-center gap-1"><Clock size={12} />{move.date ? new Date(move.date).toLocaleDateString() : '—'}</td>
                    </motion.tr>
                  );
                }) : (
                  <tr><td colSpan={6} className="px-6 py-12 text-center">
                    <Activity size={48} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-[var(--muted-text)] font-medium">{activeFilters > 0 ? 'No operations match your filters' : 'No recent operations'}</p>
                    <p className="text-sm text-[var(--muted-text)]">{activeFilters > 0 ? 'Try adjusting your filter criteria.' : 'Operations will appear here as you create them.'}</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
