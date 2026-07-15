'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '../components/button';
import { useTheme } from './theme-provider';

/** Icon button that flips between light and dark themes. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
