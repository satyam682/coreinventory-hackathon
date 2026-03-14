import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ToastProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
  onDismiss?: () => void; // Keeping for backward compatibility if any component uses it
}

const Toast: React.FC<ToastProps> = ({ type, message, onClose, onDismiss }) => {
  const handleClose = onClose || onDismiss || (() => {});
  
  useEffect(() => {
    const timer = setTimeout(handleClose, 3000);
    return () => clearTimeout(timer);
  }, [handleClose]);

  const icons = {
    success: <CheckCircle className="text-primary-green" size={20} />,
    error: <XCircle className="text-error-red" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
  };

  const colors = {
    success: 'bg-[#F0FDF4] border-primary-green',
    error: 'bg-[#FEF2F2] border-error-red',
    info: 'bg-[#EFF6FF] border-blue-500',
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 shadow-lg min-w-[300px] ${colors[type]}`}
    >
      {icons[type]}
      <p className="flex-1 text-sm font-medium text-dark-text font-dm-sans">{message}</p>
      <button onClick={handleClose} className="text-muted-text hover:text-dark-text transition-colors">
        <X size={16} />
      </button>
    </motion.div>
  );
};

export default Toast;
