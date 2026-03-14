import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Loader2, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react';
import axios from '../utils/axios';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetToken, email } = (location.state as any) || {};

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // If no reset token, redirect back
  if (!resetToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--light-orange-bg)] via-white to-[var(--light-blue-bg)] font-['DM_Sans']">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-lg p-8 max-w-md w-full text-center">
          <KeyRound size={48} className="mx-auto text-orange-400 mb-4" />
          <h2 className="text-xl font-bold text-[var(--dark-text)] font-['Sora'] mb-2">Session Expired</h2>
          <p className="text-sm text-[var(--muted-text)] mb-6">Please start the password reset process again.</p>
          <Link 
            to="/forgot-password"
            className="inline-block px-6 py-2.5 bg-[var(--primary-orange)] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all"
          >
            Go to Forgot Password
          </Link>
        </div>
      </div>
    );
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/auth/reset-password', { resetToken, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--light-orange-bg)] via-white to-[var(--light-blue-bg)] font-['DM_Sans'] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-green-100 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 opacity-50" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-blue-100 to-transparent rounded-full translate-x-1/2 translate-y-1/2 opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_8px_40px_rgba(249,115,22,0.1)] border border-white/50 overflow-hidden">
          <div className="p-8 pb-2 text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${
              success ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-green-200' : 'bg-gradient-to-br from-[var(--primary-orange)] to-[#EA580C] shadow-orange-200'
            }`}>
              {success ? <CheckCircle className="text-white" size={28} /> : <Lock className="text-white" size={28} />}
            </div>
            <h2 className="text-2xl font-bold text-[var(--dark-text)] font-['Sora']">
              {success ? 'Password Reset!' : 'Set New Password'}
            </h2>
            <p className="text-sm text-[var(--muted-text)] mt-2">
              {success 
                ? 'Your password has been reset successfully. Redirecting to login...'
                : `Create a new password for ${email}`
              }
            </p>
          </div>

          {!success ? (
            <form onSubmit={handleResetPassword} className="p-8 pt-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] focus:border-transparent transition-all"
                    placeholder="Min 8 characters"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] focus:border-transparent transition-all"
                    placeholder="Re-enter password"
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-[var(--error-red)] bg-red-50 p-3 rounded-xl"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[var(--primary-orange)] to-[#EA580C] text-white rounded-xl font-semibold text-sm uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-orange-200 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Lock size={18} />}
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          ) : (
            <div className="p-8 pt-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="text-green-500" size={40} />
              </motion.div>
              <Link to="/login" className="text-sm text-[var(--primary-orange)] font-semibold hover:underline">
                Go to Login Now →
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
