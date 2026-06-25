import React, { createContext, useContext } from 'react';
import { useStore } from './useStore';
import type { User } from 'firebase/auth';

type StoreType = ReturnType<typeof useStore>;

const AppContext = createContext<StoreType | null>(null);

export function AppProvider({ children, user }: { children: React.ReactNode; user: User | null }) {
  const store = useStore(user);
  return <AppContext.Provider value={store}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}