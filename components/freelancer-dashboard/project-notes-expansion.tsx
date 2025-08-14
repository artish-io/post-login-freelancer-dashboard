"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import Image from "next/image";
import { motion } from "framer-motion";
import { useReadNotes } from "../../src/hooks/useReadNotes";

type Note = {
  date: string;
  feedback: string;
};

type Task = {
  taskId: number;
  taskTitle: string;
  notes: Note[];
};

type Props = {
  projectId: number;
  onClose: () => void;
};

export default function ProjectNotesExpansion({ projectId, onClose }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("Untitled Project");
  const [logoUrl, setLogoUrl] = useState("/icons/lagos-parks-logo.png");
  const [typeTags, setTypeTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { markMultipleAsRead } = useReadNotes();

  // Ensure component is mounted before rendering portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    async function fetchProjectDetails() {
      try {
        console.log(`🔍 Fetching project details for projectId: ${projectId}`);
        const res = await fetch(
          `/api/dashboard/project-details?projectId=${projectId}`
        );

        if (!res.ok) {
          console.error(`❌ API response not ok: ${res.status} ${res.statusText}`);
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const json = await res.json();
        console.log(`📋 API response for project ${projectId}:`, json);

        setTitle(json.title || "Untitled Project");
        setLogoUrl(json.logoUrl || "/icons/lagos-parks-logo.png");
        setTypeTags(json.typeTags || []);

        const notes = json.notes || [];
        console.log(`📝 Notes found for project ${projectId}:`, notes);
        setTasks(notes);

        if (notes.length === 0) {
          console.log(`⚠️ No notes found for project ${projectId}`);
        }
      } catch (err) {
        console.error("Failed to load project details", err);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }
    fetchProjectDetails();
  }, [projectId]);

  // Mark all notes as read when the expansion opens and tasks are loaded
  useEffect(() => {
    if (!loading && tasks.length > 0) {
      const noteIds: string[] = [];

      tasks.forEach((task) => {
        task.notes.forEach((note) => {
          // Create the same noteId format used in notes-tab.tsx: `${taskId}-${date}`
          const noteId = `${task.taskId}-${note.date}`;
          noteIds.push(noteId);
        });
      });

      // Mark all notes as read in one batch operation
      if (noteIds.length > 0) {
        markMultipleAsRead(noteIds);
        console.log(`📖 Marked ${noteIds.length} notes as read for project ${projectId}`);
      }
    }
  }, [loading, tasks, markMultipleAsRead, projectId]);

  // Don't render until mounted to avoid hydration issues
  if (!mounted) return null;

  const modalContent = (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className="relative bg-white rounded-t-2xl md:rounded-2xl w-full max-w-3xl mx-4 md:mx-auto pointer-events-auto shadow-xl"
        style={{
          maxHeight: "90vh",
          overflowY: "auto",
          minHeight: "50vh"
        }}
        initial={{
          y: "100%",
          opacity: 0,
          scale: 0.95
        }}
        animate={{
          y: 0,
          opacity: 1,
          scale: 1
        }}
        exit={{
          y: "100%",
          opacity: 0,
          scale: 0.95
        }}
        transition={{
          type: "spring",
          damping: 30,
          stiffness: 400,
          mass: 0.8
        }}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white pt-6 pb-4 px-6 md:px-8 shadow-[rgba(0,0,0,0.05)_0px_2px_10px]">
          {/* Close Button */}
          <button
            className="absolute top-4 left-4 flex items-center gap-2 text-gray-500 hover:text-pink-500 text-sm transition-colors duration-200"
            onClick={onClose}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Close
          </button>

          {/* Tags */}
          <div className="flex gap-2 mb-2 mt-4">
            {typeTags.map((tag) => (
              <span
                key={tag}
                className={clsx(
                  "px-3 py-1 rounded-full text-xs font-semibold",
                  tag === "Brand Design"
                    ? "bg-pink-100 text-pink-700"
                    : "bg-gray-100 text-gray-700"
                )}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-full border bg-white shrink-0">
              <Image
                src={logoUrl}
                alt="Project Logo"
                width={32} // Matches original w-8 (8 * 4 = 32px)
                height={32} // Matches original h-8
                className="object-contain"
              />
            </div>
            <h2 className="text-2xl font-semibold text-pink-600 leading-tight">
              {title}
            </h2>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative px-6 md:px-8 pt-6 pb-10 flex-1">
          <ul className="space-y-8 relative min-h-[200px]">
            {/* vertical line behind bullets */}
            <div className="absolute top-3 left-4 w-[2px] bg-gray-300 h-full z-0" />

            {loading ? (
              <li className="text-gray-400 text-center py-8">Loading notes...</li>
            ) : tasks.length === 0 ? (
              <li className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No comments or notes found for this project</p>
                <p className="text-gray-400 text-xs mt-1">Notes will appear here when commissioners provide feedback on tasks</p>
              </li>
            ) : (
              tasks.flatMap((task) =>
                task.notes.map((note) => (
                  <li
                    key={`${task.taskTitle}-${note.date}`}
                    className="relative flex items-start gap-6"
                  >
                    {/* Circle */}
                    <div className="relative z-10 mt-1.5">
                      <div className="w-8 h-8 rounded-full border-2 border-gray-400 bg-white flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                      </div>
                    </div>
                    {/* Note content */}
                    <div className="text-sm max-w-full">
                      <p className="text-xs italic text-gray-500 mb-1">
                        {new Date(note.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <div className="font-semibold text-sm mb-1">
                        {task.taskTitle}
                      </div>
                      <p className="text-gray-700 text-[0.85rem] leading-snug max-w-prose">
                        “{note.feedback}”
                      </p>
                    </div>
                  </li>
                ))
              )
            )}
          </ul>
        </div>
      </motion.div>
    </motion.div>
  );

  // Render modal in a portal to avoid layout constraints
  return createPortal(modalContent, document.body);
}
