import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  confirmColor?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  confirmColor = 'bg-error-red',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-[400px] bg-white rounded-2xl p-8 shadow-2xl"
          >
            <button onClick={onCancel} className="absolute top-4 right-4 text-muted-text hover:text-dark-text">
              <X size={20} />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-error-red/10 rounded-full flex items-center justify-center text-error-red mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold font-sora text-dark-text mb-2">{title}</h3>
              <p className="text-sm text-muted-text font-dm-sans mb-8">{message}</p>
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={onCancel}
                  className="flex-1 h-11 rounded-xl border border-input-border text-muted-text font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-1 h-11 rounded-xl text-white font-semibold shadow-lg transition-all hover:brightness-110 ${confirmColor}`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
