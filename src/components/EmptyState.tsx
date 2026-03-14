import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
        <Icon size={40} />
      </div>
      <h3 className="text-lg font-bold font-sora text-dark-text mb-2">{title}</h3>
      <p className="text-sm text-muted-text font-dm-sans max-w-[300px] mb-8">{subtitle}</p>
      {actionLabel && onAction && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAction}
          className="px-6 py-2.5 bg-primary-orange text-white rounded-xl font-semibold shadow-lg shadow-primary-orange/20"
        >
          {actionLabel}
        </motion.button>
      )}
    </div>
  );
};

export default EmptyState;
