import { LayoutDashboard, Users, FlaskConical, PenLine, Settings, ChevronLeft, ChevronRight, X, Layers, LogOut } from 'lucide-react';
import { User } from 'firebase/auth';
import type { Page } from '../lib/types';

const NAV_ITEMS: { page: Page; label: string; icon: React.ReactNode }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { page: 'students', label: 'Student List', icon: <Users size={20} /> },
  { page: 'batches', label: 'Batches', icon: <Layers size={20} /> },
  { page: 'experiments', label: 'Experiments', icon: <FlaskConical size={20} /> },
  { page: 'sign-tracker', label: 'Record Sign Tracker', icon: <PenLine size={20} /> },
  { page: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  user: User | null;
  onLogout: () => void;
}

export default function Sidebar({ currentPage, onNavigate, collapsed, onToggle, mobileOpen, onMobileClose, user, onLogout }: SidebarProps) {
  const handleClick = (page: Page) => {
    onNavigate(page);
    onMobileClose();
  };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onMobileClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-50
        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
        transition-all duration-300 ease-in-out flex flex-col
        ${collapsed ? 'w-16' : 'w-60'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center h-16 px-3 border-b border-gray-200 dark:border-gray-700">
          {!collapsed && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <FlaskConical size={16} className="text-white" />
              </div>
              <span className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">LabMetrics</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center mx-auto">
              <FlaskConical size={16} className="text-white" />
            </div>
          )}
          <button
            onClick={onMobileClose}
            className="lg:hidden ml-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button
              key={item.page}
              onClick={() => handleClick(item.page)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150
                ${currentPage === item.page
                  ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Info & Logout */}
        {!collapsed && user && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-medium">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm transition-colors"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        )}

        <div className="hidden lg:block border-t border-gray-200 dark:border-gray-700 p-2">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
          >
            {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Collapse</span></>}
          </button>
        </div>
      </aside>
    </>
  );
}
