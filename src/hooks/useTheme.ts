import { useState, useEffect } from 'react';

export function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('labmetrics-dark');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('labmetrics-dark', String(dark));
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dark]);

  return { dark, setDark, toggleDark: () => setDark(d => !d) };
}
