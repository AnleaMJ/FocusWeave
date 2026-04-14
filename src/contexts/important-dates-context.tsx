'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { stripUndefined } from '@/lib/firebase-utils';
import type { ImportantDate } from '@/types';

interface ImportantDatesContextType {
  importantDates: ImportantDate[];
  addImportantDate: (date: ImportantDate) => Promise<void>;
  isLoading: boolean;
}

const ImportantDatesContext = createContext<ImportantDatesContextType | undefined>(undefined);

export function ImportantDatesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync with Firestore in real-time
  useEffect(() => {
    if (!user?.uid) {
      setImportantDates([]); // Clear if no user
      setIsLoading(false);
      setIsInitialized(true);
      return;
    }

    setIsLoading(true);
    const ref = doc(db, 'userPreferences', user.uid);
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      console.log(`[ImportantDatesProvider] Snapshot received for ${user.uid}. Exists: ${snapshot.exists()}`);
      if (snapshot.exists()) {
        const data = snapshot.data();
        const dbDates = Array.isArray(data?.importantDates) ? data.importantDates : [];
        setImportantDates(dbDates);
      } else {
        setImportantDates([]);
      }
      setIsLoading(false);
      setIsInitialized(true);
    }, (error) => {
      console.error("[ImportantDatesProvider] Important dates sync error:", error);
      setIsLoading(false);
      setIsInitialized(true);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const addImportantDate = async (newDate: ImportantDate) => {
    const updated = [...importantDates, newDate];
    setImportantDates(updated);
    
    if (user?.uid) {
      const ref = doc(db, 'userPreferences', user.uid);
      await setDoc(ref, { importantDates: stripUndefined(updated) }, { merge: true });
    }
  };

  return (
    <ImportantDatesContext.Provider value={{ importantDates, addImportantDate, isLoading: isLoading || !isInitialized }}>
      {children}
    </ImportantDatesContext.Provider>
  );
}

export function useImportantDates() {
  const context = useContext(ImportantDatesContext);
  if (context === undefined) {
    throw new Error('useImportantDates must be used within an ImportantDatesProvider');
  }
  return context;
}
