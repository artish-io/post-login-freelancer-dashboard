// src/hooks/useReadNotes.ts
import { useEffect, useState } from "react";

export function useReadNotes() {
  const [readNotes, setReadNotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem("readNotes");
    if (saved) {
      setReadNotes(new Set(JSON.parse(saved)));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("readNotes", JSON.stringify(Array.from(readNotes)));
  }, [readNotes]);

  const markAsRead = (id: string) => setReadNotes(prev => new Set(prev).add(id));
  const isNoteRead = (id: string) => readNotes.has(id);

  return { isNoteRead, markAsRead };
}