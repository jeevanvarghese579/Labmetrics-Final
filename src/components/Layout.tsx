import { useState, type ReactNode } from 'react';
import { User } from 'firebase/auth';
import Sidebar from './Sidebar';
import type { Page } from '../lib/types';
import { Menu, Sun, Moon } from 'lucide-react';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  dark: boolean;
  toggleDark: () => void;
  user: User | null;
  onLogout: () => void;
  children: ReactNode;
}

export default function Layout({ currentPage, onNavigate, dark, toggleDark, user, onLogout, children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        user={user}
        onLogout={onLogout}
      />

      <div className={`transition-all duration-300 ${collapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <header className="sticky top-0 z-30 h-14 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
          >
            <Menu size={20} />
          </button>

          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex-1 truncate">
            {currentPage === 'dashboard' && 'Dashboard'}
            {currentPage === 'students' && 'Student List'}
            {currentPage === 'batches' && 'Batches'}
            {currentPage === 'experiments' && 'Experiments'}
            {currentPage === 'sign-tracker' && 'Record Sign Tracker'}
            {currentPage === 'settings' && 'Settings'}
          </h1>

          <button
            onClick={toggleDark}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        <main className="p-4 md:p-6 max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
