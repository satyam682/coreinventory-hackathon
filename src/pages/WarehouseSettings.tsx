import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Home, MapPin, Plus, Edit2, Trash2, 
  ChevronRight, Save, X, Building2, Info
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import axios from '../utils/axios';

interface Warehouse {
  id: string;
  name: string;
  short_code: string;
  address: string;
}

export default function WarehouseSettings() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    short_code: '',
    address: ''
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/warehouses');
      setWarehouses(response.data);
    } catch (error) {
      setToast({ message: 'Failed to fetch warehouses', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWarehouse) {
        await axios.patch(`/warehouses/${editingWarehouse.id}`, formData);
        setToast({ message: 'Warehouse updated successfully', type: 'success' });
      } else {
        await axios.post('/warehouses', formData);
        setToast({ message: 'Warehouse added successfully', type: 'success' });
      }
      resetForm();
      fetchWarehouses();
    } catch (error) {
      setToast({ message: 'Failed to save warehouse', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/warehouses/${deleteId}`);
      setToast({ message: 'Warehouse deleted', type: 'success' });
      fetchWarehouses();
    } catch (error) {
      setToast({ message: 'Failed to delete warehouse', type: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  const startEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      short_code: warehouse.short_code,
      address: warehouse.address
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({ name: '', short_code: '', address: '' });
    setEditingWarehouse(null);
    setShowAddForm(false);
  };

  return (
    <div className="min-h-screen bg-[var(--primary-bg)] font-['DM_Sans']">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-[var(--muted-text)] mb-1">
              <span>Settings</span>
              <ChevronRight size={14} />
              <span className="text-[var(--primary-orange)] font-medium">Warehouses</span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--dark-text)] font-['Sora']">Warehouse Settings</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--light-orange-bg)] text-[var(--primary-orange)] font-medium transition-all">
              <Home size={20} />
              Warehouses
            </button>
            <button 
              onClick={() => window.location.href = '/settings/location'}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--muted-text)] hover:bg-gray-50 font-medium transition-all"
            >
              <MapPin size={20} />
              Locations
            </button>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Warehouse List */}
            <div className="bg-white rounded-2xl border border-[var(--input-border)] overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--dark-text)] font-['Sora']">Active Warehouses</h2>
                {!showAddForm && (
                  <button 
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 text-sm font-bold text-[var(--primary-orange)] hover:underline"
                  >
                    <Plus size={16} /> Add New
                  </button>
                )}
              </div>

              <div className="divide-y divide-gray-50">
                {loading ? (
                  <div className="p-6 space-y-4">
                    {[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}
                  </div>
                ) : warehouses.length > 0 ? (
                  warehouses.map((warehouse) => (
                    <div key={warehouse.id} className="p-6 flex items-start justify-between group hover:bg-gray-50 transition-colors">
                      <div className="flex gap-4">
                        <div className="p-3 rounded-xl bg-orange-50 text-[var(--primary-orange)]">
                          <Building2 size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-[var(--dark-text)]">{warehouse.name}</h3>
                          <p className="text-sm text-[var(--muted-text)] font-mono mb-1">{warehouse.short_code}</p>
                          <p className="text-sm text-[var(--muted-text)] flex items-center gap-1">
                            <MapPin size={12} /> {warehouse.address}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEdit(warehouse)}
                          className="p-2 text-gray-400 hover:text-[var(--primary-orange)] hover:bg-orange-50 rounded-lg transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setDeleteId(warehouse.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <Building2 size={48} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-[var(--muted-text)]">No warehouses configured yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Add/Edit Form */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="bg-white rounded-2xl border border-[var(--input-border)] overflow-hidden shadow-sm"
                >
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[var(--dark-text)] font-['Sora']">
                      {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
                    </h2>
                    <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">Warehouse Name</label>
                        <input 
                          type="text" 
                          required
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all"
                          placeholder="e.g. Main Distribution Center"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">Short Code</label>
                        <input 
                          type="text" 
                          required
                          value={formData.short_code}
                          onChange={e => setFormData({...formData, short_code: e.target.value.toUpperCase()})}
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all font-mono"
                          placeholder="e.g. WH-MAIN"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">Full Address</label>
                      <textarea 
                        required
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all min-h-[100px]"
                        placeholder="Enter the full physical address..."
                      />
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 text-blue-800 text-sm">
                      <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                      <p>The short code will be used as a prefix for all location and operation references within this warehouse.</p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                      <button 
                        type="button"
                        onClick={resetForm}
                        className="px-6 py-2.5 rounded-xl border border-[var(--input-border)] text-[var(--muted-text)] font-medium hover:bg-gray-50 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--primary-orange)] text-white font-medium hover:opacity-90 transition-all shadow-lg shadow-[var(--card-shadow)]"
                      >
                        <Save size={18} />
                        {editingWarehouse ? 'Update Warehouse' : 'Save Warehouse'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Toast & Dialog */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmDialog 
        isOpen={!!deleteId}
        title="Delete Warehouse"
        message="Are you sure you want to delete this warehouse? All associated locations and stock records will be affected."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
