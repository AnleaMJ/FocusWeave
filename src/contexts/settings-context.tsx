'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { 
  type DashboardWidgetPreferences, 
  getDefaultDashboardWidgetPreferences,
  sanitizeDashboardWidgetPreferences
} from '@/lib/dashboard-preferences';
import { 
  type QuickLinkItem,
  type WeatherMode
} from '@/lib/user-preferences';
import { stripUndefined } from '@/lib/firebase-utils';

export interface UserSettings {
  weatherMode: WeatherMode;
  weatherLocation: string;
  quickLinks: QuickLinkItem[];
  theme: 'light' | 'dark' | 'system';
  newsCategories: string[];
  searchEngine: string;
  dashboardWidgets: DashboardWidgetPreferences;
}

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_NEWS_CATEGORIES = ['technology', 'business', 'startups', 'productivity'];

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    weatherMode: 'device',
    weatherLocation: '',
    quickLinks: [],
    theme: 'dark',
    newsCategories: DEFAULT_NEWS_CATEGORIES,
    searchEngine: 'google',
    dashboardWidgets: getDefaultDashboardWidgetPreferences(),
  });
  const [isLoading, setIsLoading] = useState(true);

  // Real-time Firestore Sync
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const ref = doc(db, 'userPreferences', user.uid);
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      console.log(`[SettingsProvider] Snapshot received for ${user.uid}. Exists: ${snapshot.exists()}`);
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log("[SettingsProvider] Raw data keys:", Object.keys(data));
        
        setSettings(prev => ({
          ...prev,
          weatherMode: data.weatherMode || prev.weatherMode,
          weatherLocation: data.weatherLocation || prev.weatherLocation,
          quickLinks: Array.isArray(data.quickLinks) ? data.quickLinks : prev.quickLinks,
          theme: data.theme || prev.theme,
          newsCategories: Array.isArray(data.newsCategories) ? data.newsCategories : prev.newsCategories,
          searchEngine: data.searchEngine || prev.searchEngine,
          dashboardWidgets: sanitizeDashboardWidgetPreferences(data.dashboardWidgets),
        }));
      }
      setIsLoading(false);
    }, (error) => {
      console.error("[SettingsProvider] Settings sync error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    // 1. Update local state for immediate feedback
    setSettings(prev => ({ ...prev, ...updates }));

    // 2. Persist to DB if logged in
    if (user?.uid) {
      const ref = doc(db, 'userPreferences', user.uid);
      await setDoc(ref, stripUndefined(updates), { merge: true });
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
