'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Moon, Sun } from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';

export function ThemeToggleSwitch() {
  const { settings, updateSettings } = useSettings();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync next-themes state with Firestore settings
  useEffect(() => {
    if (mounted && settings.theme) {
      setTheme(settings.theme);
    }
  }, [mounted, settings.theme, setTheme]);

  if (!mounted) {
    return (
        <div className="flex items-center space-x-2 p-2 rounded-lg border animate-pulse">
            <div className="h-6 w-10 bg-muted rounded-full"></div>
            <div className="h-4 w-20 bg-muted rounded-md"></div>
        </div>
    );
  }

  const isDarkMode = resolvedTheme === 'dark';

  const toggleTheme = async () => {
    const nextTheme = isDarkMode ? 'light' : 'dark';
    setTheme(nextTheme);
    await updateSettings({ theme: nextTheme });
  };

  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <Switch
        id="theme-mode-switch"
        checked={isDarkMode}
        onCheckedChange={toggleTheme}
        aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      />
      <Label htmlFor="theme-mode-switch" className="flex items-center cursor-pointer">
        {isDarkMode ? (
          <Moon className="h-5 w-5 mr-2 text-primary" />
        ) : (
          <Sun className="h-5 w-5 mr-2 text-primary" />
        )}
        <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
      </Label>
    </div>
  );
}
