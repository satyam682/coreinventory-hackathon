import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SearchBarProps {
  placeholder: string;
  onSearch: (value: string) => void;
  debounceMs?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder,
  onSearch,
  debounceMs = 300,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [value, onSearch, debounceMs]);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  return (
    <div className="relative flex items-center">
      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            initial={{ width: 40, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 40, opacity: 0 }}
            className="relative"
          >
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="w-full h-[38px] pl-10 pr-10 rounded-lg border-[1.5px] border-input-border outline-none focus:border-primary-orange transition-all font-dm-sans text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" size={16} />
            <button
              onClick={() => {
                setIsExpanded(false);
                setValue('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-text hover:text-dark-text"
            >
              <X size={16} />
            </button>
          </motion.div>
        ) : (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={() => setIsExpanded(true)}
            className="w-[38px] h-[38px] flex items-center justify-center border-[1.5px] border-input-border rounded-lg text-muted-text hover:text-primary-orange hover:border-primary-orange transition-all"
          >
            <Search size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;
