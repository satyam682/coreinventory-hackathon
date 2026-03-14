import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import AuthInput from '../components/AuthInput';
import Logo from '../components/Logo';
import axios from '../utils/axios';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ loginId?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors: { loginId?: string; password?: string } = {};
    if (!loginId) {
      newErrors.loginId = 'Login ID is required';
    } else if (loginId.length < 6 || loginId.length > 12) {
      newErrors.loginId = 'Login ID must be 6-12 characters';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    
    if (!validate()) return;

    setIsLoading(true);
    try {
      const response = await axios.post('/auth/login', { loginId, password });
      localStorage.setItem('token', response.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setApiError('Invalid Login ID or Password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-light-orange-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-[460px] bg-white rounded-[20px] p-10 shadow-[0_8px_40px_rgba(249,115,22,0.15)] border-t-4 border-primary-orange"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-sm text-muted-text font-dm-sans mt-2">Warehouse Management System</p>
          <div className="w-full h-[1px] bg-primary-orange/20 mt-6" />
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <AuthInput
            label="Login ID"
            placeholder="Enter your login ID"
            value={loginId}
            onChange={(e) => {
              setLoginId(e.target.value);
              if (errors.loginId) setErrors({ ...errors, loginId: undefined });
            }}
            icon={User}
            error={errors.loginId}
          />

          <AuthInput
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors({ ...errors, password: undefined });
            }}
            icon={Lock}
            error={errors.password}
            showPasswordToggle
          />

          {apiError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-[#FEF2F2] border border-error-red/20 rounded-lg p-3 flex items-center gap-3 text-error-red text-sm font-dm-sans"
            >
              <AlertCircle size={18} />
              {apiError}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isLoading}
            className="w-full h-[52px] bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-xl text-white font-sora text-[15px] font-semibold tracking-[1.5px] shadow-lg shadow-primary-orange/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                SIGNING IN...
              </>
            ) : (
              'SIGN IN'
            )}
          </motion.button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-2 text-[13px] font-dm-sans">
          <Link to="/forgot-password" title="Forgot Password?" className="text-primary-orange hover:underline">
            Forgot Password?
          </Link>
          <span className="text-muted-text/40">|</span>
          <Link to="/signup" title="Sign Up" className="text-primary-green hover:underline">
            Sign Up
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
