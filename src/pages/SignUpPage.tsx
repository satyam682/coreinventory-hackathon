import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Warehouse, Mail, Lock, Loader2, ShieldCheck, Check } from 'lucide-react';
import { motion } from 'motion/react';
import AuthInput from '../components/AuthInput';
import axios from '../utils/axios';

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);

  // Validation states
  const isLoginIdValid = loginId.length >= 6 && loginId.length <= 12 && /^[a-zA-Z0-9]+$/.test(loginId);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
  const passwordRules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  const isPasswordValid = Object.values(passwordRules).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword !== '';

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoginIdValid || !isEmailValid || !isPasswordValid || !passwordsMatch) return;

    setIsLoading(true);
    try {
      await axios.post('/auth/signup', { loginId, email, password });
      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      console.error(err);
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
        className="w-full max-w-[460px] bg-white rounded-[20px] p-10 shadow-[0_8px_40px_rgba(249,115,22,0.15)] border-t-4 border-primary-green"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary-orange/10 rounded-xl flex items-center justify-center text-primary-orange mb-4">
            <Warehouse size={28} />
          </div>
          <h1 className="text-[28px] font-bold text-dark-text font-sora mb-1">StockFlow</h1>
          <p className="text-sm text-muted-text font-dm-sans">Create your account</p>
          <div className="w-full h-[1px] bg-primary-green/20 mt-6" />
        </div>

        <form onSubmit={handleSignUp} className="flex flex-col gap-5">
          <AuthInput
            label="Login ID"
            placeholder="Choose a login ID"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            hint="Must be 6–12 characters, letters and numbers only"
            success={loginId.length > 0 && isLoginIdValid}
            error={loginId.length > 0 && !isLoginIdValid ? "Invalid Login ID format" : undefined}
          />

          <AuthInput
            label="Email Address"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={Mail}
            success={email.length > 0 && isEmailValid}
            error={email.length > 0 && !isEmailValid ? "Invalid email format" : undefined}
          />

          <div className="flex flex-col gap-2">
            <AuthInput
              label="Password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              showPasswordToggle
              success={password.length > 0 && isPasswordValid}
            />
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
              <RuleItem met={passwordRules.length} text="At least 8 characters" />
              <RuleItem met={passwordRules.upper} text="One uppercase letter" />
              <RuleItem met={passwordRules.lower} text="One lowercase letter" />
              <RuleItem met={passwordRules.special} text="One special character" />
            </div>
          </div>

          <AuthInput
            label="Confirm Password"
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={ShieldCheck}
            success={passwordsMatch}
            error={confirmPassword.length > 0 && !passwordsMatch ? "Passwords do not match" : undefined}
          />
          {passwordsMatch && (
            <p className="text-primary-green text-[11px] font-dm-sans flex items-center gap-1 -mt-3">
              <Check size={12} /> Passwords match
            </p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isLoading || isSuccess}
            className={`
              w-full h-[52px] rounded-xl text-white font-sora text-[15px] font-semibold tracking-[1.5px] shadow-lg flex items-center justify-center gap-2 transition-all mt-2
              ${isSuccess ? 'bg-primary-green' : 'bg-gradient-to-br from-[#22C55E] to-[#16A34A] shadow-primary-green/20'}
              disabled:opacity-70 disabled:cursor-not-allowed
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                CREATING ACCOUNT...
              </>
            ) : isSuccess ? (
              <>
                <Check size={20} /> ACCOUNT CREATED!
              </>
            ) : (
              'CREATE ACCOUNT'
            )}
          </motion.button>
        </form>

        <div className="mt-8 text-center text-[13px] font-dm-sans">
          <span className="text-muted-text">Already have an account? </span>
          <Link to="/login" className="text-primary-orange font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

const RuleItem = ({ met, text }: { met: boolean; text: string }) => (
  <div className={`flex items-center gap-1.5 text-[11px] font-dm-sans transition-colors duration-200 ${met ? 'text-primary-green' : 'text-muted-text'}`}>
    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${met ? 'bg-primary-green border-primary-green text-white' : 'border-muted-text/30'}`}>
      {met && <Check size={10} strokeWidth={3} />}
    </div>
    {text}
  </div>
);

export default SignUpPage;
