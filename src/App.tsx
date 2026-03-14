/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Dashboard from './pages/Dashboard';
import ReceiptList from './pages/ReceiptList';
import DeliveryList from './pages/DeliveryList';
import DeliveryForm from './pages/DeliveryForm';
import ProductList from './pages/ProductList';
import MoveHistory from './pages/MoveHistory';
import WarehouseSettings from './pages/WarehouseSettings';
import LocationSettings from './pages/LocationSettings';
import InventoryAdjustment from './pages/InventoryAdjustment';
import InternalTransfers from './pages/InternalTransfers';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/operations/receipts" element={<ProtectedRoute><ReceiptList /></ProtectedRoute>} />
        <Route path="/operations/delivery" element={<ProtectedRoute><DeliveryList /></ProtectedRoute>} />
        <Route path="/operations/delivery/new" element={<ProtectedRoute><DeliveryForm /></ProtectedRoute>} />
        <Route path="/operations/adjustments" element={<ProtectedRoute><InventoryAdjustment /></ProtectedRoute>} />
        <Route path="/operations/transfers" element={<ProtectedRoute><InternalTransfers /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><ProductList /></ProtectedRoute>} />
        <Route path="/move-history" element={<ProtectedRoute><MoveHistory /></ProtectedRoute>} />
        <Route path="/settings/warehouse" element={<ProtectedRoute><WarehouseSettings /></ProtectedRoute>} />
        <Route path="/settings/location" element={<ProtectedRoute><LocationSettings /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        
        {/* Redirects */}
        <Route path="/settings" element={<Navigate to="/settings/warehouse" replace />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
