import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Home, MapPin, Plus, Edit2, Trash2, 
  ChevronRight, Save, X, Building2, Info, Search
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import axios from '../utils/axios';

interface Location {
  id: string;
  name: string;
  short_code: string;
  warehouse_id: string;
  warehouse_name: string;
}

interface Warehouse {
  id: string;
  name: string;
  short_code: string;
}

export default function LocationSettings() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    short_code: '',
    warehouse_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [locRes, whRes] = await Promise.all([
        axios.get('/locations'),
        axios.get('/warehouses')
      ]);
      setLocations(locRes.data);
      setWarehouses(whRes.data);
      if (whRes.data.length > 0) {
        setFormData(prev => ({ ...prev, warehouse_id: whRes.data[0].id }));
      }
    } catch (error) {
      setToast({ message: 'Failed to fetch data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLocation) {
        await axios.patch(`/locations/${editingLocation.id}`, formData);
        setToast({ message: 'Location updated successfully', type: 'success' });
      } else {
        await axios.post('/locations', formData);
        setToast({ message: 'Location added successfully', type: 'success' });
      }
      resetForm();
      fetchData();
    } catch (error) {
      setToast({ message: 'Failed to save location', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/locations/${deleteId}`);
      setToast({ message: 'Location deleted', type: 'success' });
      fetchData();
    } catch (error) {
      setToast({ message: 'Failed to delete location', type: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  const startEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      short_code: location.short_code,
      warehouse_id: location.warehouse_id
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      short_code: '', 
      warehouse_id: warehouses.length > 0 ? warehouses[0].id : '' 
    });
    setEditingLocation(null);
    setShowAddForm(false);
  };

  const filteredLocations = locations.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.warehouse_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.short_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedWarehouse = warehouses.find(w => w.id === formData.warehouse_id);

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
              <span className="text-[var(--primary-orange)] font-medium">Locations</span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--dark-text)] font-['Sora']">Location Settings</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-2">
            <button 
              onClick={() => window.location.href = '/settings/warehouse'}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--muted-text)] hover:bg-gray-50 font-medium transition-all"
            >
              <Home size={20} />
              Warehouses
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--light-orange-bg)] text-[var(--primary-orange)] font-medium transition-all">
              <MapPin size={20} />
              Locations
            </button>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search & Add */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all"
                />
              </div>
              {!showAddForm && (
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 bg-[var(--primary-orange)] text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-all shadow-lg shadow-[var(--card-shadow)]"
                >
                  <Plus size={20} />
                  Add Location
                </button>
              )}
            </div>

            {/* Location List Grouped by Warehouse */}
            <div className="space-y-6">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-50 rounded-2xl animate-pulse" />)}
                </div>
              ) : warehouses.map(wh => {
                const whLocations = filteredLocations.filter(l => l.warehouse_id === wh.id);
                if (whLocations.length === 0 && searchQuery) return null;

                return (
                  <div key={wh.id} className="bg-white rounded-2xl border border-[var(--input-border)] overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 size={18} className="text-[var(--muted-text)]" />
                        <h3 className="font-bold text-[var(--dark-text)]">{wh.name}</h3>
                        <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-gray-200 text-[var(--muted-text)]">{wh.short_code}</span>
                      </div>
                      <span className="text-xs font-medium text-[var(--muted-text)]">{whLocations.length} Locations</span>
                    </div>

                    <div className="divide-y divide-gray-50">
                      {whLocations.length > 0 ? (
                        whLocations.map(location => (
                          <div key={location.id} className="p-4 px-6 flex items-center justify-between group hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="p-2 rounded-lg bg-gray-100 text-gray-500">
                                <MapPin size={20} />
                              </div>
                              <div>
                                <h4 className="font-bold text-[var(--dark-text)]">{location.name}</h4>
                                <p className="text-xs font-mono text-[var(--primary-orange)]">{wh.short_code}/{location.short_code}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => startEdit(location)}
                                className="p-2 text-gray-400 hover:text-[var(--primary-orange)] hover:bg-orange-50 rounded-lg transition-all"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => setDeleteId(location.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-[var(--muted-text)] text-sm italic">
                          No locations in this warehouse.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
                      {editingLocation ? 'Edit Location' : 'Add New Location'}
                    </h2>
                    <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">Warehouse</label>
                        <select 
                          required
                          value={formData.warehouse_id}
                          onChange={e => setFormData({...formData, warehouse_id: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all bg-white"
                        >
                          {warehouses.map(wh => (
                            <option key={wh.id} value={wh.id}>{wh.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">Location Name</label>
                        <input 
                          type="text" 
                          required
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all"
                          placeholder="e.g. Aisle 1, Shelf B"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">Short Code</label>
                      <div className="flex items-center gap-2">
                        <div className="px-4 py-2.5 rounded-xl bg-gray-100 border border-gray-200 text-[var(--muted-text)] font-mono text-sm">
                          {selectedWarehouse?.short_code || 'WH'}/
                        </div>
                        <input 
                          type="text" 
                          required
                          value={formData.short_code}
                          onChange={e => setFormData({...formData, short_code: e.target.value.toUpperCase()})}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all font-mono"
                          placeholder="e.g. A1-B"
                        />
                      </div>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-xl flex items-start gap-3 text-orange-800 text-sm">
                      <Info size={18} className="text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold mb-1">Location Code Preview:</p>
                        <p className="font-mono text-lg tracking-wider">
                          {selectedWarehouse?.short_code || 'WH'}/{formData.short_code || '____'}
                        </p>
                      </div>
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
                        {editingLocation ? 'Update Location' : 'Save Location'}
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
        title="Delete Location"
        message="Are you sure you want to delete this location? This may affect existing stock records."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
