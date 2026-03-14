import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, Package, X,
  MapPin, Calendar, User, Search, AlertCircle, Mail, Phone, Printer
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import axios from '../utils/axios';

interface Product {
  id: string;
  name: string;
  sku: string;
  unit_of_measure: string;
  on_hand: number;
}

interface DeliveryItem {
  product_id: string;
  quantity: number;
  product?: Product;
}

export default function DeliveryForm() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [formData, setFormData] = useState({
    from: 'WH/Stock',
    to: '',
    contact: '',
    receiver_name: '',
    receiver_email: '',
    receiver_contact: '',
    schedule_date: new Date().toISOString().split('T')[0],
    operation_type: 'Delivery Order',
    items: [{ product_id: '', quantity: 1, product: undefined }] as DeliveryItem[]
  });

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = formData.items
      .filter(i => i.product)
      .map((i, idx) => `
        <tr style="border-bottom: 1px solid #f0f0f0;">
          <td style="padding: 10px 12px; color: #555;">${idx + 1}</td>
          <td style="padding: 10px 12px; font-weight: 600; color: #0F1E38;">${i.product?.name || ''}</td>
          <td style="padding: 10px 12px; color: #555; font-family: monospace;">${i.product?.sku || ''}</td>
          <td style="padding: 10px 12px; color: #555; text-align: center;">${i.quantity}</td>
          <td style="padding: 10px 12px; color: #555; text-align: center;">${i.product?.unit_of_measure || 'Units'}</td>
        </tr>
      `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Delivery Receipt - ${formData.to || 'New Delivery'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'DM Sans', Arial, sans-serif; color: #1A1A1A; background: #fff; padding: 40px; }
          @media print { body { padding: 20px; } }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0F1E38; padding-bottom: 24px; margin-bottom: 28px; }
          .logo { display: flex; align-items: center; gap: 10px; }
          .logo-icon { background: #0F1E38; color: white; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 20px; }
          .logo-name { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 28px; color: #0F1E38; }
          .logo-dot { color: #F97316; }
          .doc-info { text-align: right; }
          .doc-ref { font-size: 22px; font-weight: 700; color: #0F1E38; }
          .doc-status { display: inline-block; background: #d1fae5; color: #065f46; padding: 3px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 4px; }
          .section { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
          .box { background: #f9fafb; border-radius: 10px; padding: 16px; }
          .box-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 10px; }
          .box-value { font-size: 14px; font-weight: 600; color: #0F1E38; margin-bottom: 4px; }
          .box-sub { font-size: 12px; color: #6b7280; }
          table { width: 100%; border-collapse: collapse; }
          thead { background: #0F1E38; } 
          thead th { color: white; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; text-align: left; }
          .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
          .footer-note { font-size: 11px; color: #9ca3af; }
          .status-bar { display: flex; gap: 0; margin-bottom: 28px; }
          .step { flex: 1; padding: 8px 0; text-align: center; font-size: 11px; font-weight: 600; background: #e5e7eb; color: #6b7280; }
          .step:first-child { border-radius: 6px 0 0 6px; background: #0F1E38; color: white; }
          .step:last-child { border-radius: 0 6px 6px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            <div class="logo-icon">S</div>
            <div>
              <div class="logo-name">Sanchay<span class="logo-dot">.</span></div>
              <div style="font-size:11px;color:#9ca3af;">Warehouse Management System</div>
            </div>
          </div>
          <div class="doc-info">
            <div class="doc-ref">WH/OUT/NEW</div>
            <div class="doc-status">Draft</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:6px;">Printed: ${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
          </div>
        </div>
        
        <div class="status-bar">
          <div class="step">Draft</div>
          <div class="step">Waiting</div>
          <div class="step">Ready</div>
          <div class="step">Done</div>
        </div>

        <div class="section">
          <div class="box">
            <div class="box-title">Delivery Address</div>
            <div class="box-value">${formData.to || '—'}</div>
            <div class="box-sub">Source: ${formData.from}</div>
            <div class="box-sub">Date: ${formData.schedule_date}</div>
          </div>
          <div class="box">
            <div class="box-title">Receiver Details</div>
            <div class="box-value">${formData.receiver_name || '—'}</div>
            <div class="box-sub">${formData.receiver_email || ''}</div>
            <div class="box-sub">${formData.receiver_contact || ''}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th><th>Product</th><th>SKU</th><th style="text-align:center">Quantity</th><th style="text-align:center">Unit</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#9ca3af;">No products added</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <div class="footer-note">This is a computer-generated delivery receipt.</div>
          <div class="footer-note"><strong>Sanchay.</strong> — Powered by Sanchay WMS</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/products');
      setProducts(response.data.data);
    } catch (error) {
      setToast({ message: 'Failed to fetch products', type: 'error' });
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 1 }]
    });
  };

  const removeItem = (idx: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== idx)
    });
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const items = [...formData.items];
    if (field === 'product_id') {
      const selectedProduct = products.find(p => p.id === value);
      items[idx] = { ...items[idx], product_id: value, product: selectedProduct };
    } else {
      (items[idx] as any)[field] = value;
    }
    setFormData({ ...formData, items });
  };

  const handleValidate = async () => {
    // Check for empty fields
    if (!formData.to) return setToast({ message: 'Delivery Address is required', type: 'error' });
    
    // Filter valid items
    const validItems = formData.items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) return setToast({ message: 'At least one valid product is required', type: 'error' });

    // Validate stock limits before submission
    for (const item of validItems) {
      if (item.product && item.quantity > item.product.on_hand) {
        return setToast({ message: `Insufficient stock for ${item.product.name}`, type: 'error' });
      }
    }

    setLoading(true);
    try {
      await axios.post('/delivery', { ...formData, items: validItems });
      setToast({ message: 'Delivery successfully validated and receipt emailed!', type: 'success' });
      setTimeout(() => navigate('/operations/delivery'), 2000);
    } catch (error) {
      setToast({ message: 'Failed to create delivery', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--primary-bg)] font-['DM_Sans'] pb-20">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-[var(--muted-text)] mb-1">
              <span>Operations</span>
              <ChevronRight size={14} />
              <button onClick={() => navigate('/operations/delivery')} className="hover:text-[var(--primary-green)] transition-colors">Deliveries</button>
              <ChevronRight size={14} />
              <span className="text-[var(--primary-green)] font-medium">New Document</span>
            </div>
          </div>
        </div>

        {/* Main Document Card */}
        <div className="bg-white rounded-[24px] border border-[var(--input-border)] shadow-sm overflow-hidden border-t-[6px] border-t-[var(--primary-green)]">
          
          {/* Header Action Bar */}
          <div className="px-8 py-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-gray-50/50">
            <h1 className="text-3xl font-bold text-[var(--dark-text)] font-['Sora'] flex items-center gap-3">
              <span className="p-2.5 bg-green-100 text-green-700 rounded-xl inline-flex"><Package size={24} /></span>
              New Delivery
            </h1>
            
            {/* Status Tracker (User UI match) */}
            <div className="flex items-center text-sm font-medium tracking-wide">
              <div className="flex items-center px-4 py-2 bg-[var(--primary-green)] text-white rounded-l-full relative after:content-[''] after:absolute after:right-[-12px] after:top-0 after:border-[18px] after:border-transparent after:border-l-[var(--primary-green)] z-30">
                Draft
              </div>
              <div className="flex items-center px-6 py-2 bg-gray-100 text-gray-400 pl-8 relative after:content-[''] after:absolute after:right-[-12px] after:top-0 after:border-[18px] after:border-transparent after:border-l-gray-100 z-20 transition-all border-y border-gray-200">
                Waiting
              </div>
              <div className="flex items-center px-6 py-2 bg-gray-100 text-gray-400 pl-8 relative after:content-[''] after:absolute after:right-[-12px] after:top-0 after:border-[18px] after:border-transparent after:border-l-gray-100 z-10 transition-all border-y border-gray-200">
                Ready
              </div>
              <div className="flex items-center px-6 py-2 bg-gray-100 text-gray-400 pl-8 rounded-r-full transition-all border-y border-r border-gray-200">
                Done
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="flex items-center gap-4 mb-10">
              <button disabled={loading} onClick={handleValidate} className="px-6 py-2.5 bg-[var(--primary-green)] hover:opacity-90 text-white font-bold rounded-xl shadow-lg shadow-green-100 transition-all disabled:opacity-50">Validate</button>
              <button onClick={handlePrint} className="px-6 py-2.5 bg-white border border-[var(--input-border)] hover:bg-gray-50 text-[var(--dark-text)] font-bold rounded-xl transition-all flex items-center gap-2"><Printer size={16}/> Print</button>
              <button onClick={() => navigate('/operations/delivery')} className="px-6 py-2.5 bg-white border border-[var(--input-border)] hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-500 font-bold rounded-xl transition-all">Cancel</button>
            </div>

            <h2 className="text-2xl font-bold text-gray-400 font-mono mb-8 border-b border-gray-100 pb-4">WH/OUT/NEW</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8 mb-12">
              <div className="space-y-6">
                <div className="border-b-2 border-[var(--primary-green)] relative group">
                  <label className="text-xs font-bold text-[var(--primary-green)] uppercase tracking-wider absolute -top-5 left-0">Delivery Address</label>
                  <input 
                    type="text" 
                    value={formData.to} 
                    onChange={e => setFormData({...formData, to: e.target.value})}
                    placeholder="e.g. 123 Customer Lane, NYC" 
                    className="w-full py-2 bg-transparent text-[var(--dark-text)] font-medium focus:outline-none placeholder:text-gray-300" 
                  />
                </div>
                
                <div className="border-b-2 border-gray-200 hover:border-gray-300 transition-colors relative">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider absolute -top-5 left-0">Receiver Name</label>
                  <input 
                    type="text" 
                    value={formData.receiver_name} 
                    onChange={e => setFormData({...formData, receiver_name: e.target.value})}
                    placeholder="John Doe" 
                    className="w-full py-2 bg-transparent text-[var(--dark-text)] font-medium focus:outline-none placeholder:text-gray-300" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="border-b-2 border-gray-200 hover:border-gray-300 transition-colors relative">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider absolute -top-5 left-0 flex items-center gap-1"><Mail size={12}/> Email <span className="text-xs font-normal text-gray-400 normal-case">(For Receipt)</span></label>
                    <input 
                      type="email" 
                      value={formData.receiver_email} 
                      onChange={e => setFormData({...formData, receiver_email: e.target.value})}
                      placeholder="john@example.com" 
                      className="w-full py-2 bg-transparent text-[var(--dark-text)] font-medium focus:outline-none placeholder:text-gray-300" 
                    />
                  </div>
                  <div className="border-b-2 border-gray-200 hover:border-gray-300 transition-colors relative">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider absolute -top-5 left-0 flex items-center gap-1"><Phone size={12}/> Contact</label>
                    <input 
                      type="text" 
                      value={formData.receiver_contact} 
                      onChange={e => setFormData({...formData, receiver_contact: e.target.value})}
                      placeholder="+1 (555) 000-0000" 
                      className="w-full py-2 bg-transparent text-[var(--dark-text)] font-medium focus:outline-none placeholder:text-gray-300" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                 <div className="border-b-2 border-gray-200 hover:border-[var(--primary-green)] transition-colors relative">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider absolute -top-5 left-0">Schedule Date</label>
                  <input 
                    type="date" 
                    value={formData.schedule_date} 
                    onChange={e => setFormData({...formData, schedule_date: e.target.value})}
                    className="w-full py-2 bg-transparent text-[var(--dark-text)] font-medium focus:outline-none" 
                  />
                </div>
                 
                 <div className="border-b-2 border-gray-200 relative">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider absolute -top-5 left-0">Operation Type</label>
                  <select 
                    value={formData.operation_type} 
                    onChange={e => setFormData({...formData, operation_type: e.target.value})}
                    className="w-full py-2 bg-transparent text-[var(--dark-text)] font-medium focus:outline-none cursor-pointer appearance-none" 
                  >
                    <option>Delivery Orders</option>
                    <option>Internal Transfer</option>
                    <option>Returns</option>
                  </select>
                </div>
                 <div className="border-b-2 border-gray-200 relative">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider absolute -top-5 left-0">Source Location</label>
                  <input 
                    type="text" 
                    value={formData.from} 
                    onChange={e => setFormData({...formData, from: e.target.value})}
                    className="w-full py-2 bg-transparent text-[var(--dark-text)] font-medium focus:outline-none" 
                  />
                </div>
              </div>
            </div>

            {/* Products Array Table */}
            <div>
              <h3 className="text-xl font-bold text-[var(--primary-green)] mb-1 font-['Sora'] border-b-2 border-gray-100 pb-3 flex items-center gap-2">Products</h3>
              
              <div className="mt-4 border-b-2 border-gray-200 pb-2 flex text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
                <div className="flex-[3]">Product</div>
                <div className="flex-1">Quantity</div>
                <div className="flex-1 text-right">Unit</div>
                <div className="w-[80px]"></div>
              </div>

              <div className="space-y-3">
                {formData.items.map((item, idx) => {
                  const isOutOfStock = item.product && item.quantity > item.product.on_hand;
                  return (
                    <div key={idx} className={`flex items-center gap-4 bg-gray-50 p-2 rounded-xl transition-all border-2 ${isOutOfStock ? 'border-red-400 bg-red-50' : 'border-transparent hover:border-gray-200'}`}>
                      <div className="flex-[3]">
                        <div className="relative flex items-center">
                          <Search size={16} className="absolute left-3 text-gray-400" />
                          <select 
                            value={item.product_id} 
                            onChange={e => updateItem(idx, 'product_id', e.target.value)} 
                            className={`w-full bg-white border ${isOutOfStock ? 'border-red-200' : 'border-gray-200'} rounded-lg py-2 pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)] appearance-none font-medium`}
                          >
                            <option value="">Search and select product...</option>
                            {products.map(p => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <input 
                          type="number" 
                          min="1" 
                          value={item.quantity} 
                          onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} 
                          className={`w-full bg-white border ${isOutOfStock ? 'border-red-400 text-red-700 font-bold' : 'border-gray-200'} rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]`} 
                        />
                      </div>
                      
                      <div className="flex-1 text-right text-[var(--muted-text)] font-medium">
                        {item.product ? item.product.unit_of_measure : '—'}
                      </div>
                      
                      <div className="w-[80px] flex justify-end">
                        <button type="button" onClick={() => removeItem(idx)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors">
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Warning Alert if Out of Stock */}
                {formData.items.some(i => i.product && i.quantity > i.product.on_hand) && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm border border-red-200">
                    <AlertCircle size={16} /> <strong>Warning!</strong> Some products are not in stock. You must reduce the requested quantity to validate.
                  </motion.div>
                )}
                
                <button type="button" onClick={addItem} className="text-[var(--primary-green)] font-bold text-sm flex items-center gap-1 mt-4 hover:underline px-2">
                  <span className="text-lg leading-none">+</span> Add a line
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
