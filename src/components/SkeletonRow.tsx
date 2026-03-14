import React from 'react';

interface SkeletonRowProps {
  columns: number;
}

const SkeletonRow: React.FC<SkeletonRowProps> = ({ columns }) => {
  return (
    <tr className="border-b border-gray-50">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
        </td>
      ))}
    </tr>
  );
};

export default SkeletonRow;
