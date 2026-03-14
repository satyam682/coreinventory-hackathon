import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Warehouse, BellRing, ChevronDown, LogOut, User as UserIcon 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  activePage?: 'dashboard' | 'operations' | 'products' | 'move-history' | 'settings';
}

const Navbar: React.FC<NavbarProps> = ({ activePage }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showOpsDropdown, setShowOpsDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', id: 'dashboard' },
    { name: 'Operations', path: '#', id: 'operations', hasDropdown: true },
    { name: 'Products', path: '/products', id: 'products' },
    { name: 'Move History', path: '/move-history', id: 'move-history' },
    { name: 'Settings', path: '/settings/warehouse', id: 'settings' },
  ];

  const isLinkActive = (id: string, path: string) => {
    if (activePage) return activePage === id;
    if (id === 'operations') return location.pathname.startsWith('/operations');
    return location.pathname.startsWith(path) && path !== '#';
  };

  return (
    <nav className="sticky top-0 z-50 h-16 bg-white border-b border-input-border px-8 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-4">
        <Link to="/dashboard" className="flex items-center gap-2 text-primary-orange">
          <Warehouse size={24} />
          <span className="font-sora text-xl font-bold text-dark-text">StockFlow</span>
        </Link>
        <div className="h-6 w-[1px] bg-input-border mx-2" />
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <div key={link.id} className="relative">
              <button
                onClick={() => link.hasDropdown && setShowOpsDropdown(!showOpsDropdown)}
                className={`px-3 py-1 text-sm font-medium transition-all duration-200 flex items-center gap-1
                  ${isLinkActive(link.id, link.path)
                    ? 'text-primary-orange border-b-2 border-primary-orange font-semibold' 
                    : 'text-muted-text hover:text-primary-orange'}`}
              >
                {link.hasDropdown ? (
                  <span>{link.name}</span>
                ) : (
                  <Link to={link.path}>{link.name}</Link>
                )}
                {link.hasDropdown && <ChevronDown size={14} />}
              </button>
              {link.hasDropdown && showOpsDropdown && (
                <>
                  <div className="fixed inset-0 z-[-1]" onClick={() => setShowOpsDropdown(false)} />
                  <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] border border-input-border overflow-hidden">
                    <Link 
                      to="/operations/receipts" 
                      onClick={() => setShowOpsDropdown(false)}
                      className="block px-4 py-2.5 text-sm hover:bg-light-orange-bg hover:text-primary-orange transition-colors"
                    >
                      Receipts
                    </Link>
                    <Link 
                      to="/operations/delivery" 
                      onClick={() => setShowOpsDropdown(false)}
                      className="block px-4 py-2.5 text-sm hover:bg-light-orange-bg hover:text-primary-orange transition-colors"
                    >
                      Delivery Orders
                    </Link>
                    <Link 
                      to="/operations/transfers" 
                      onClick={() => setShowOpsDropdown(false)}
                      className="block px-4 py-2.5 text-sm hover:bg-light-orange-bg hover:text-primary-orange transition-colors"
                    >
                      Internal Transfers
                    </Link>
                    <Link 
                      to="/operations/adjustments" 
                      onClick={() => setShowOpsDropdown(false)}
                      className="block px-4 py-2.5 text-sm hover:bg-light-orange-bg hover:text-primary-orange transition-colors"
                    >
                      Inventory Adjustment
                    </Link>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="text-muted-text hover:text-primary-orange transition-colors">
          <BellRing size={20} />
        </button>
        <div className="h-6 w-[1px] bg-input-border" />
        <div className="relative">
          <button 
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 group"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-orange to-[#EA580C] flex items-center justify-center text-white font-sora font-bold text-sm shadow-md">
              A
            </div>
            <ChevronDown size={14} className="text-muted-text group-hover:text-primary-orange transition-colors" />
          </button>
          {showUserDropdown && (
            <>
              <div className="fixed inset-0 z-[-1]" onClick={() => setShowUserDropdown(false)} />
              <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] border border-input-border overflow-hidden">
                <Link
                  to="/profile"
                  onClick={() => setShowUserDropdown(false)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-light-orange-bg hover:text-primary-orange flex items-center gap-2"
                >
                  <UserIcon size={14} /> My Profile
                </Link>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-light-orange-bg hover:text-error-red flex items-center gap-2 text-error-red"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
