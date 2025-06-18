"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import Image from "next/image";

type Note = {
  date: string;
  feedback: string;
};

type Task = {
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

  useEffect(() => {
    async function fetchProjectDetails() {
      try {
        const res = await fetch(
          `/api/dashboard/project-details?projectId=${projectId}`
        );
        const json = await res.json();
        setTitle(json.title || "Untitled Project");
        setLogoUrl(json.logoUrl || "/icons/lagos-parks-logo.png");
        setTypeTags(json.typeTags || []);
        setTasks(json.notes || []);
      } catch (err) {
        console.error("Failed to load project details", err);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }
    fetchProjectDetails();
  }, [projectId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className="relative bg-white rounded-2xl w-full max-w-3xl mx-auto pointer-events-auto shadow-xl"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white pt-8 pb-4 pl-8 pr-4 shadow-[rgba(0,0,0,0.05)_-2px_2px_10px]">
          {/* Close Button */}
          <button
            className="absolute top-4 left-4 flex items-center gap-2 text-gray-500 hover:text-pink-500 text-sm"
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
        <div className="relative px-8 pt-6 pb-10">
          <ul className="space-y-10 relative">
            {/* vertical line behind bullets */}
            <div className="absolute top-3 left-4 w-[2px] bg-gray-300 h-full z-0" />

            {loading ? (
              <li className="text-gray-400">Loading...</li>
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
      </div>
    </div>
  );
}
