import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStyles = (s: string) => {
    switch (s.toUpperCase()) {
      case 'READY':
        return 'bg-[#EFF6FF] text-[#3B82F6] border-[#BFDBFE]';
      case 'DONE':
        return 'bg-[#F0FDF4] text-[#22C55E] border-[#BBF7D0]';
      case 'LATE':
        return 'bg-[#FEF2F2] text-[#EF4444] border-[#FECACA]';
      case 'DRAFT':
        return 'bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]';
      case 'IN':
        return 'bg-[#F0FDF4] text-[#22C55E] border-[#BBF7D0]';
      case 'OUT':
        return 'bg-[#FFF7ED] text-[#F97316] border-[#FED7AA]';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const label = status.toUpperCase() === 'IN' ? '↓ IN' : status.toUpperCase() === 'OUT' ? '↑ OUT' : status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStyles(status)}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
