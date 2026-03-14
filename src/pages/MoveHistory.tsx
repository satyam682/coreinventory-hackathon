import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  History, Download, ChevronRight, ArrowUpDown, ArrowRightLeft, 
  ArrowUpRight, ArrowDownLeft, X, Filter
} from 'lucide-react';
import Navbar from '../components/Navbar';
import SearchBar from '../components/SearchBar';
import SkeletonRow from '../components/SkeletonRow';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import axios from '../utils/axios';

interface Move {
  id: string;
  reference: string;
  type: string;
  move_type?: string;
  from: string;
  to: string;
  contact: string;
  date: string;
  status: string;
}

const TYPES = ['All', 'IN', 'OUT', 'INTERNAL', 'ADJUSTMENT'];
const STATUSES = ['All', 'Draft', 'Ready', 'Done', 'Late', 'Canceled'];

export default function MoveHistory() {
  const [moves, setMoves] = useState<Move[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => { fetchMoves(); }, []);

  const fetchMoves = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/dashboard/recent-moves?limit=100');
      setMoves(response.data);
    } catch (error) { console.error('Failed to fetch moves', error); }
    finally { setLoading(false); }
  };

  const getType = (m: Move) => m.type || m.move_type || '';

  const filteredMoves = moves.filter(m => {
    const type = getType(m);
    const matchSearch = m.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.to?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'All' || type === typeFilter;
    const matchStatus = statusFilter === 'All' || m.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const activeFilters = (typeFilter !== 'All' ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0);

  const clearFilters = () => { setTypeFilter('All'); setStatusFilter('All'); };

  return (
    <div className="min-h-screen bg-[var(--primary-bg)] font-['DM_Sans']">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-[var(--muted-text)] mb-1"><span>Inventory</span><ChevronRight size={14} /><span className="text-[var(--primary-orange)] font-medium">Move History</span></div>
            <h1 className="text-3xl font-bold text-[var(--dark-text)] font-['Sora']">Move History</h1>
          </div>
          <button className="flex items-center gap-2 bg-white border border-[var(--input-border)] text-[var(--dark-text)] px-4 py-2 rounded-lg font-medium hover:bg-gray-50"><Download size={20} /> Export CSV</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Incoming', value: moves.filter(m => getType(m) === 'IN').length, icon: ArrowDownLeft, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Outgoing', value: moves.filter(m => getType(m) === 'OUT').length, icon: ArrowUpRight, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Internal', value: moves.filter(m => getType(m) === 'INTERNAL').length, icon: ArrowRightLeft, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Total', value: moves.length, icon: History, color: 'text-gray-600', bg: 'bg-gray-50' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`${s.bg} p-4 rounded-xl flex items-center gap-4`}>
              <div className={`p-2.5 rounded-xl bg-white shadow-sm ${s.color}`}><s.icon size={20} /></div>
              <div>
                <p className="text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-0.5">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-[var(--input-border)] mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <SearchBar placeholder="Search by reference, location..." onSearch={setSearchQuery} />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--input-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)]">
                {TYPES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--input-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)]">
                {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
              </select>
              {activeFilters > 0 && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium">
                  <X size={14} /> Clear ({activeFilters})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[var(--input-border)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-50">
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Reference</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">From</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">To</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? [...Array(5)].map((_, i) => <SkeletonRow key={i} columns={7} />) : filteredMoves.length > 0 ? filteredMoves.map((move, index) => {
                  const type = getType(move);
                  return (
                    <motion.tr key={move.id || index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-[var(--dark-text)]">{move.reference}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                          type === 'IN' ? 'bg-blue-100 text-blue-700' : 
                          type === 'OUT' ? 'bg-green-100 text-green-700' : 
                          type === 'INTERNAL' ? 'bg-purple-100 text-purple-700' :
                          type === 'ADJUSTMENT' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>{type}</span>
                      </td>
                      <td className="px-6 py-4 text-[var(--muted-text)]">{move.from}</td>
                      <td className="px-6 py-4 text-[var(--muted-text)]">{move.to}</td>
                      <td className="px-6 py-4 text-[var(--muted-text)]">{move.contact}</td>
                      <td className="px-6 py-4 text-[var(--muted-text)]">{move.date ? new Date(move.date).toLocaleDateString() : '—'}</td>
                      <td className="px-6 py-4"><StatusBadge status={move.status as any} /></td>
                    </motion.tr>
                  );
                }) : (
                  <tr><td colSpan={7}><EmptyState icon={History} title="No moves found" subtitle="Adjust your filters or wait for operations to be processed." /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
