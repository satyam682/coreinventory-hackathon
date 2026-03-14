import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Filter, MoreVertical, ChevronRight, 
  Download, ArrowUpDown, Package, DollarSign, Layers, 
  AlertTriangle, Edit2, Trash2, Check, X, Tag, Ruler
} from 'lucide-react';
import Navbar from '../components/Navbar';
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
  category: string;
  unit_of_measure: string;
  per_unit_cost: number;
  on_hand: number;
  free: number;
  reorder_level: number;
}

interface ProductStats {
  total: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_value: number;
}

const CATEGORIES = ['General', 'Furniture', 'Electronics', 'Accessories', 'Raw Materials', 'Packaging', 'Tools', 'Other'];
const UNITS = ['Units', 'Kg', 'Litres', 'Metres', 'Boxes', 'Packs', 'Pairs', 'Rolls'];

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showNewModal, setShowNewModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});

  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category: 'General',
    unit_of_measure: 'Units',
    per_unit_cost: 0,
    on_hand: 0,
    reorder_level: 10
  });

  useEffect(() => {
    fetchProducts();
    fetchStats();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/products');
      setProducts(response.data.data);
    } catch (error) {
      setToast({ message: 'Failed to fetch products', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/products/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/products', { ...newProduct, free: newProduct.on_hand });
      setToast({ message: 'Product added successfully', type: 'success' });
      setShowNewModal(false);
      fetchProducts();
      fetchStats();
      setNewProduct({ name: '', sku: '', category: 'General', unit_of_measure: 'Units', per_unit_cost: 0, on_hand: 0, reorder_level: 10 });
    } catch (error: any) {
      setToast({ message: error.response?.data?.error || 'Failed to add product', type: 'error' });
    }
  };

  const handleUpdateProduct = async (id: string) => {
    try {
      await axios.patch(`/products/${id}`, editForm);
      setToast({ message: 'Product updated', type: 'success' });
      setEditingId(null);
      fetchProducts();
      fetchStats();
    } catch (error) {
      setToast({ message: 'Failed to update product', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/products/${deleteId}`);
      setToast({ message: 'Product deleted', type: 'success' });
      fetchProducts();
      fetchStats();
    } catch (error) {
      setToast({ message: 'Failed to delete product', type: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setEditForm(product);
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen bg-[var(--primary-bg)] font-['DM_Sans']">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-[var(--muted-text)] mb-1">
              <span>Inventory</span>
              <ChevronRight size={14} />
              <span className="text-[var(--primary-orange)] font-medium">Stock / Products</span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--dark-text)] font-['Sora']">Stock / Products</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 bg-[var(--primary-orange)] text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-all shadow-lg shadow-[var(--card-shadow)]"
            >
              <Plus size={20} />
              Add Product
            </button>
            <button className="p-2 text-[var(--muted-text)] hover:bg-gray-100 rounded-lg transition-colors border border-[var(--input-border)]">
              <Download size={20} />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Products', value: stats?.total || 0, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Low Stock', value: stats?.low_stock_count || 0, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Out of Stock', value: stats?.out_of_stock_count || 0, icon: Layers, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Inventory Value', value: `₹${(stats?.total_value || 0).toLocaleString()}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`${stat.bg} p-5 rounded-2xl border border-transparent hover:border-gray-200 transition-all flex items-center gap-4`}
            >
              <div className={`p-3 rounded-xl bg-white shadow-sm ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-0.5">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Low Stock Banner */}
        {stats && stats.low_stock_count > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-orange-50 border border-orange-100 p-4 rounded-xl mb-8 flex items-center gap-3 text-orange-800"
          >
            <AlertTriangle size={20} className="text-orange-500 shrink-0" />
            <p className="text-sm font-medium">
              Attention: <span className="font-bold">{stats.low_stock_count} products</span> are running low on stock. Consider restocking soon.
            </p>
          </motion.div>
        )}

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-xl border border-[var(--input-border)] mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <SearchBar 
              placeholder="Search by name or SKU..." 
              onSearch={setSearchQuery}
            />
            <select 
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--input-border)] text-sm text-[var(--muted-text)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)]"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-2xl border border-[var(--input-border)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-bottom border-[var(--input-border)]">
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">
                    <div className="flex items-center gap-2 cursor-pointer hover:text-[var(--primary-orange)] transition-colors">
                      Product Name <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">UOM</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Cost / Unit</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">On Hand</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">Free to Use</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(5)].map((_, i) => <SkeletonRow key={i} columns={8} />)
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product, index) => (
                    <motion.tr 
                      key={product.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        {editingId === product.id ? (
                          <input 
                            type="text"
                            value={editForm.name}
                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                            className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-[var(--primary-orange)]"
                          />
                        ) : (
                          <span className="font-medium text-[var(--dark-text)]">{product.name}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-[var(--primary-orange)]">{product.sku}</span>
                      </td>
                      <td className="px-6 py-4">
                        {editingId === product.id ? (
                          <select 
                            value={editForm.category}
                            onChange={e => setEditForm({...editForm, category: e.target.value})}
                            className="px-2 py-1 border rounded text-sm"
                          >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-[var(--muted-text)]">{product.category}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--muted-text)]">{product.unit_of_measure}</td>
                      <td className="px-6 py-4 text-[var(--muted-text)]">
                        {editingId === product.id ? (
                          <input 
                            type="number"
                            value={editForm.per_unit_cost}
                            onChange={e => setEditForm({...editForm, per_unit_cost: Number(e.target.value)})}
                            className="w-24 px-2 py-1 border rounded focus:ring-1 focus:ring-[var(--primary-orange)]"
                          />
                        ) : (
                          `₹${product.per_unit_cost.toLocaleString()}`
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${product.on_hand === 0 ? 'text-red-500' : product.on_hand < (product.reorder_level || 10) ? 'text-orange-500' : 'text-green-600'}`}>
                          {product.on_hand}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--muted-text)]">
                        {product.free}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingId === product.id ? (
                            <>
                              <button 
                                onClick={() => handleUpdateProduct(product.id)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                <Check size={18} />
                              </button>
                              <button 
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <X size={18} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => startEditing(product)}
                                className="p-1.5 text-gray-400 hover:text-[var(--primary-orange)] hover:bg-orange-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => setDeleteId(product.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState 
                        icon={Package}
                        title="No products found" 
                        subtitle="Start by adding your first product to the inventory."
                        actionLabel="Add Product"
                        onAction={() => setShowNewModal(true)}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* New Product Modal */}
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
                <h2 className="text-xl font-bold text-[var(--dark-text)] font-['Sora']">Add New Product</h2>
                <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              
              <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">Product Name</label>
                  <input 
                    type="text" 
                    required
                    value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all"
                    placeholder="e.g. Office Desk"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2">
                    <Tag size={14} /> SKU / Code
                  </label>
                  <input 
                    type="text" 
                    required
                    value={newProduct.sku}
                    onChange={e => setNewProduct({...newProduct, sku: e.target.value.toUpperCase()})}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all font-mono"
                    placeholder="e.g. OD-001"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">Category</label>
                    <select 
                      value={newProduct.category}
                      onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all bg-white"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2">
                      <Ruler size={14} /> Unit of Measure
                    </label>
                    <select 
                      value={newProduct.unit_of_measure}
                      onChange={e => setNewProduct({...newProduct, unit_of_measure: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all bg-white"
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">Cost / Unit (₹)</label>
                    <input 
                      type="number" 
                      required
                      value={newProduct.per_unit_cost}
                      onChange={e => setNewProduct({...newProduct, per_unit_cost: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">Initial Stock</label>
                    <input 
                      type="number" 
                      required
                      value={newProduct.on_hand}
                      onChange={e => setNewProduct({...newProduct, on_hand: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all"
                    />
                  </div>
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
                    Add Product
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast & Dialog */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmDialog 
        isOpen={!!deleteId}
        title="Delete Product"
        message="Are you sure you want to delete this product? This will remove all stock records for it."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
