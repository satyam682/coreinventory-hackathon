import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, Mail, Shield, Lock, Loader2, Check, AlertCircle, Save } from 'lucide-react';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import axios from '../utils/axios';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [editForm, setEditForm] = useState({ name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/profile');
      setProfile(res.data);
      setEditForm({ name: res.data.name || '', email: res.data.email || '' });
    } catch (error) {
      setToast({ message: 'Failed to fetch profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.patch('/profile', editForm);
      setProfile(res.data);
      setToast({ message: 'Profile updated successfully', type: 'success' });
    } catch (error: any) {
      setToast({ message: error.response?.data?.error || 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setToast({ message: 'Passwords do not match', type: 'error' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setToast({ message: 'Password must be at least 8 characters', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      await axios.post('/profile/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setToast({ message: 'Password changed successfully', type: 'success' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordSection(false);
    } catch (error: any) {
      setToast({ message: error.response?.data?.error || 'Failed to change password', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--primary-bg)] font-['DM_Sans']">
        <Navbar />
        <div className="max-w-2xl mx-auto p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-100 rounded w-1/3" />
            <div className="h-40 bg-gray-100 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--primary-bg)] font-['DM_Sans']">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold text-[var(--dark-text)] font-['Sora'] mb-8">My Profile</h1>

          {/* Profile Avatar & Info */}
          <div className="bg-white rounded-2xl border border-[var(--input-border)] overflow-hidden shadow-sm mb-6">
            <div className="bg-gradient-to-r from-[var(--primary-orange)] to-[#EA580C] h-24 relative">
              <div className="absolute -bottom-10 left-6">
                <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center text-[var(--primary-orange)] font-['Sora'] text-3xl font-bold border-4 border-white">
                  {(profile?.name || profile?.login_id || 'U')[0].toUpperCase()}
                </div>
              </div>
            </div>
            <div className="pt-14 p-6">
              <h2 className="text-xl font-bold text-[var(--dark-text)] font-['Sora']">{profile?.name || profile?.login_id}</h2>
              <div className="flex items-center gap-4 text-sm text-[var(--muted-text)] mt-1">
                <span className="flex items-center gap-1"><User size={14} /> {profile?.login_id}</span>
                <span className="flex items-center gap-1"><Shield size={14} /> {profile?.role}</span>
              </div>
            </div>
          </div>

          {/* Edit Profile Form */}
          <div className="bg-white rounded-2xl border border-[var(--input-border)] overflow-hidden shadow-sm mb-6">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-[var(--dark-text)] font-['Sora']">Profile Details</h3>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2">
                  <User size={14} /> Full Name
                </label>
                <input 
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2">
                  <Mail size={14} /> Email Address
                </label>
                <input 
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm({...editForm, email: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all"
                  placeholder="your@email.com"
                />
              </div>
              <div className="flex justify-end">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--primary-orange)] text-white font-medium hover:opacity-90 transition-all shadow-lg shadow-[var(--card-shadow)] disabled:opacity-70"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-2xl border border-[var(--input-border)] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--dark-text)] font-['Sora']">Security</h3>
              <button 
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="text-sm font-medium text-[var(--primary-orange)] hover:underline"
              >
                {showPasswordSection ? 'Cancel' : 'Change Password'}
              </button>
            </div>
            {showPasswordSection && (
              <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2">
                    <Lock size={14} /> Current Password
                  </label>
                  <input 
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2">
                    <Lock size={14} /> New Password
                  </label>
                  <input 
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all"
                    placeholder="Min 8 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5 flex items-center gap-2">
                    <Lock size={14} /> Confirm New Password
                  </label>
                  <input 
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] transition-all"
                  />
                  {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Passwords do not match
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:opacity-90 transition-all shadow-lg disabled:opacity-70"
                  >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}
                    Change Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
