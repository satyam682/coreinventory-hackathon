import React, { useState } from 'react';
import { Eye, EyeOff, LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthInputProps {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: LucideIcon;
  error?: string;
  hint?: string;
  success?: boolean;
  showPasswordToggle?: boolean;
}

const AuthInput: React.FC<AuthInputProps> = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  icon: Icon,
  error,
  hint,
  success,
  showPasswordToggle = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[13px] font-medium text-dark-text font-dm-sans">
        {label}
      </label>
      <div className="relative group">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-text group-focus-within:text-primary-orange transition-colors duration-200">
            <Icon size={18} />
          </div>
        )}
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`
            w-full h-[48px] rounded-[10px] border-[1.5px] transition-all duration-200 font-dm-sans text-sm
            ${Icon ? 'pl-11' : 'px-4'}
            ${showPasswordToggle ? 'pr-11' : 'pr-4'}
            ${error 
              ? 'border-error-red focus:border-error-red focus:ring-4 focus:ring-error-red/10' 
              : success 
                ? 'border-primary-green focus:border-primary-green focus:ring-4 focus:ring-primary-green/10'
                : 'border-input-border focus:border-primary-orange focus:ring-4 focus:ring-primary-orange/10'
            }
            outline-none text-dark-text placeholder:text-muted-text/60
          `}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${success ? 'text-primary-green' : 'text-primary-orange'}`}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="text-error-red text-[12px] font-dm-sans overflow-hidden"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-muted-text text-[11px] font-dm-sans"
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default AuthInput;
