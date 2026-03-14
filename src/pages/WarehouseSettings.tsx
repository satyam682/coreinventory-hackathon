import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Home, MapPin, Plus, Edit2, Trash2, 
  ChevronRight, Save, X, Building2, Info, Map as MapIcon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import axios from '../utils/axios';

// Indian cities with coordinates for map
const INDIAN_CITIES: { name: string; lat: number; lng: number }[] = [
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
  { name: 'Kanpur', lat: 26.4499, lng: 80.3319 },
  { name: 'Nagpur', lat: 21.1458, lng: 79.0882 },
  { name: 'Indore', lat: 22.7196, lng: 75.8577 },
  { name: 'Thane', lat: 19.2183, lng: 72.9781 },
  { name: 'Bhopal', lat: 23.2599, lng: 77.4126 },
  { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185 },
  { name: 'Patna', lat: 25.6093, lng: 85.1376 },
  { name: 'Vadodara', lat: 22.3072, lng: 73.1812 },
  { name: 'Ghaziabad', lat: 28.6692, lng: 77.4538 },
  { name: 'Ludhiana', lat: 30.901, lng: 75.8573 },
  { name: 'Agra', lat: 27.1767, lng: 78.0081 },
  { name: 'Nashik', lat: 19.9975, lng: 73.7898 },
  { name: 'Surat', lat: 21.1702, lng: 72.8311 },
  { name: 'Varanasi', lat: 25.3176, lng: 82.9739 },
  { name: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
  { name: 'Kochi', lat: 9.9312, lng: 76.2673 },
  { name: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
  { name: 'Guwahati', lat: 26.1445, lng: 91.7362 },
  { name: 'Dehradun', lat: 30.3165, lng: 78.0322 },
  { name: 'Noida', lat: 28.5355, lng: 77.391 },
  { name: 'Gurugram', lat: 28.4595, lng: 77.0266 },
  { name: 'Rajkot', lat: 22.3039, lng: 70.8022 },
  { name: 'Amritsar', lat: 31.634, lng: 74.8723 },
  { name: 'Ranchi', lat: 23.3441, lng: 85.3096 },
  { name: 'Raipur', lat: 21.2514, lng: 81.6296 },
];

function getCityCoords(address: string): { lat: number; lng: number } | null {
  const addr = address.toLowerCase();
  for (const city of INDIAN_CITIES) {
    if (addr.includes(city.name.toLowerCase())) return { lat: city.lat, lng: city.lng };
  }
  return null;
}

interface Warehouse {
  id: string;
  name: string;
  short_code: string;
  address: string;
}

// Fix for default Leaflet marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
    address: '',
    city: ''
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
      const submitData = {
        ...formData,
        address: formData.city ? `${formData.address}, ${formData.city}` : formData.address
      };
      if (editingWarehouse) {
        await axios.patch(`/warehouses/${editingWarehouse.id}`, submitData);
        setToast({ message: 'Warehouse updated successfully', type: 'success' });
      } else {
        await axios.post('/warehouses', submitData);
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
    // Extract city from address
    const matchedCity = INDIAN_CITIES.find(c => warehouse.address.toLowerCase().includes(c.name.toLowerCase()));
    setFormData({
      name: warehouse.name,
      short_code: warehouse.short_code,
      address: warehouse.address,
      city: matchedCity?.name || ''
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({ name: '', short_code: '', address: '', city: '' });
    setEditingWarehouse(null);
    setShowAddForm(false);
  };

  // Compute warehouse markers with valid city coordinates
  const warehouseMarkers = warehouses
    .map(w => ({ ...w, coords: getCityCoords(w.address) }))
    .filter(w => w.coords !== null) as (Warehouse & { coords: { lat: number; lng: number } })[];

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

            {/* Map View */}
            <div className="bg-white rounded-2xl border border-[var(--input-border)] overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--dark-text)] font-['Sora'] flex items-center gap-2">
                  <MapIcon size={20} className="text-[var(--primary-orange)]" /> Geographic Overview
                </h2>
                <span className="text-xs text-[var(--muted-text)] bg-orange-50 text-orange-600 px-2 py-1 rounded-full font-semibold">{warehouseMarkers.length} on map</span>
              </div>
              <div className="h-[400px] w-full relative z-0">
                <MapContainer 
                  center={[20.5937, 78.9629]} 
                  zoom={4} 
                  scrollWheelZoom={false}
                  style={{ height: '100%', width: '100%', zIndex: 0 }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {warehouseMarkers.map((w) => (
                    <Marker key={w.id} position={[w.coords.lat, w.coords.lng]}>
                      <Popup>
                        <strong>{w.name}</strong><br/>
                        {w.address}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
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

                    {/* Indian City Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-1.5">
                        <MapPin size={14} className="text-orange-500" /> City (India)
                      </label>
                      <select
                        value={formData.city}
                        onChange={e => setFormData({...formData, city: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all bg-white"
                      >
                        <option value="">Select City...</option>
                        {INDIAN_CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                      {formData.city && (
                        <p className="text-[11px] text-green-600 mt-1 flex items-center gap-1">
                          <MapPin size={10} /> {formData.city} will be marked on the Geographic Overview map
                        </p>
                      )}
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
