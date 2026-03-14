import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ size = 'md' }) => {
  const svgSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14'
  };
  
  const textSizes = {
    sm: 'text-xl',
    md: 'text-[28px]',
    lg: 'text-[42px]'
  };

  return (
    <div className="flex items-center gap-3">
      <svg className={svgSizes[size]} viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="52" height="52" rx="12" fill="#0F1E38"/>
        <rect x="13" y="10" width="4" height="32" rx="2" fill="#FFFFFF"/>
        <rect x="13" y="10" width="26" height="4" rx="2" fill="#FFFFFF"/>
        <rect x="13" y="24" width="22" height="4" rx="2" fill="#FFFFFF"/>
        <rect x="13" y="38" width="26" height="4" rx="2" fill="#FFFFFF"/>
        <rect x="29" y="15" width="9" height="9" rx="2" fill="#E8970A"/>
        <rect x="20" y="29" width="9" height="9" rx="2" fill="#E8970A"/>
      </svg>
      <div className={`font-['Plus_Jakarta_Sans'] font-[800] ${textSizes[size]} text-[#0F1E38] tracking-[-1.5px] leading-none`}>
        Sanchay<span className="text-[#E8970A]">.</span>
      </div>
    </div>
  );
};

export default Logo;
