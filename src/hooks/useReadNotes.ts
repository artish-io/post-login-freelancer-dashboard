// src/hooks/useReadNotes.ts
import { useEffect, useState, useCallback, useRef } from "react";

export function useReadNotes() {
  // Initialize with localStorage data immediately (synchronous)
  const [readNotes, setReadNotes] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set<string>(); // SSR safety

    const saved = localStorage.getItem("readNotes");
    if (saved) {
      try {
        const parsedData: string[] = JSON.parse(saved);
        const parsedNotes = new Set<string>(parsedData);
        console.log(`📖 Loaded ${parsedNotes.size} read notes from localStorage on mount`);
        return parsedNotes;
      } catch (error) {
        console.error("Error parsing saved read notes:", error);
        localStorage.removeItem("readNotes");
        return new Set<string>();
      }
    }
    console.log("📖 No saved read notes found, starting with empty set");
    return new Set<string>();
  });

  // Use ref to track if we're updating from our own event
  const isUpdatingFromOwnEvent = useRef(false);

  // Save to localStorage whenever readNotes changes
  useEffect(() => {
    // Skip if this update is from our own custom event listener
    if (isUpdatingFromOwnEvent.current) {
      isUpdatingFromOwnEvent.current = false;
      return;
    }

    localStorage.setItem("readNotes", JSON.stringify(Array.from(readNotes)));

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('readNotesChanged', {
      detail: { readNotes: Array.from(readNotes) }
    }));
  }, [readNotes]);

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "readNotes" && e.newValue) {
        try {
          isUpdatingFromOwnEvent.current = true;
          setReadNotes(new Set(JSON.parse(e.newValue)));
        } catch (error) {
          console.error("Error parsing storage change:", error);
          isUpdatingFromOwnEvent.current = false;
        }
      }
    };

    // Only listen for storage changes from other tabs, not custom events
    // Custom events would create infinite loops since this hook dispatches them
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const markAsRead = useCallback((id: string) => {
    setReadNotes(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
  }, []);

  const markMultipleAsRead = useCallback((ids: string[]) => {
    setReadNotes(prev => {
      const newSet = new Set(prev);
      ids.forEach(id => newSet.add(id));
      return newSet;
    });
  }, []);

  const isNoteRead = useCallback((id: string) => readNotes.has(id), [readNotes]);

  return { isNoteRead, markAsRead, markMultipleAsRead, readNotes };
}