import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ArrowLeft, Loader2, CheckCircle, KeyRound, ShieldCheck } from 'lucide-react';
import axios from '../utils/axios';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/auth/forgot-password', { email });
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;
    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    const nextEmpty = newOtp.findIndex(v => !v);
    const focusIndex = nextEmpty === -1 ? 5 : nextEmpty;
    document.getElementById(`otp-${focusIndex}`)?.focus();
  };

  const handleVerifyOTP = async () => {
    setError('');
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/auth/verify-otp', { email, otp: otpCode });
      setResetToken(res.data.resetToken);
      // Navigate to reset password page with token
      navigate('/reset-password', { state: { resetToken: res.data.resetToken, email } });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setOtp(['', '', '', '', '', '']);
    setLoading(true);
    try {
      await axios.post('/auth/forgot-password', { email });
      setError(''); // Clear any previous error
    } catch (err: any) {
      setError('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--light-orange-bg)] via-white to-[var(--light-blue-bg)] font-['DM_Sans'] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-orange-100 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 opacity-50" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-blue-100 to-transparent rounded-full translate-x-1/2 translate-y-1/2 opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_8px_40px_rgba(249,115,22,0.1)] border border-white/50 overflow-hidden">
          {/* Header */}
          <div className="p-8 pb-2 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[var(--primary-orange)] to-[#EA580C] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
              {step === 'email' ? <Mail className="text-white" size={28} /> : <ShieldCheck className="text-white" size={28} />}
            </div>
            <h2 className="text-2xl font-bold text-[var(--dark-text)] font-['Sora']">
              {step === 'email' ? 'Forgot Password?' : 'Enter OTP'}
            </h2>
            <p className="text-sm text-[var(--muted-text)] mt-2">
              {step === 'email' 
                ? "Enter your email address and we'll send you a 6-digit OTP to reset your password."
                : `We've sent a 6-digit code to ${email}. Check your email (or server console).`
              }
            </p>
          </div>

          {/* Email Step */}
          <AnimatePresence mode="wait">
            {step === 'email' && (
              <motion.form
                key="email-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSendOTP}
                className="p-8 pt-6 space-y-5"
              >
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] focus:border-transparent transition-all"
                      placeholder="Enter your registered email"
                      autoFocus
                    />
                  </div>
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
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Mail size={18} />}
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>

                <div className="text-center pt-2">
                  <Link to="/login" className="text-sm text-[var(--primary-orange)] hover:underline flex items-center justify-center gap-1">
                    <ArrowLeft size={14} /> Back to Login
                  </Link>
                </div>
              </motion.form>
            )}

            {/* OTP Step */}
            {step === 'otp' && (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8 pt-6 space-y-6"
              >
                {/* OTP Input Boxes */}
                <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      autoFocus={index === 0}
                      className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 
                        ${digit ? 'border-[var(--primary-orange)] bg-orange-50' : 'border-[var(--input-border)]'} 
                        focus:outline-none focus:ring-2 focus:ring-[var(--input-focus)] focus:border-transparent 
                        transition-all font-['Sora']`}
                    />
                  ))}
                </div>

                {error && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-[var(--error-red)] bg-red-50 p-3 rounded-xl text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full py-3 bg-gradient-to-r from-[var(--primary-orange)] to-[#EA580C] text-white rounded-xl font-semibold text-sm uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-orange-200 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={18} />}
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>

                <div className="text-center space-y-2">
                  <p className="text-sm text-[var(--muted-text)]">
                    Didn't receive the code?{' '}
                    <button 
                      onClick={handleResendOTP} 
                      disabled={loading}
                      className="text-[var(--primary-orange)] font-semibold hover:underline"
                    >
                      Resend OTP
                    </button>
                  </p>
                  <button 
                    onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setError(''); }}
                    className="text-sm text-[var(--muted-text)] hover:text-[var(--primary-orange)] flex items-center justify-center gap-1 mx-auto"
                  >
                    <ArrowLeft size={14} /> Change email
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-[var(--muted-text)] mt-6">
          Check your server console for the OTP code during development.
        </p>
      </motion.div>
    </div>
  );
}
