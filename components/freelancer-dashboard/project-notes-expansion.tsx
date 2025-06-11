import { useEffect, useState } from "react";
import clsx from "clsx";

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
        const res = await fetch(`/api/dashboard/project-details?projectId=${projectId}`);
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
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-auto pointer-events-auto p-8" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Close */}
        <button
          className="absolute left-6 top-6 flex items-center gap-2 text-gray-500 hover:text-pink-500 text-base"
          onClick={onClose}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Close
        </button>

        {/* Tags */}
        <div className="flex gap-2 mt-12 ml-8 mb-2">
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
<div className="flex items-center gap-4 mb-6 ml-8">
  <div className="w-10 h-10 flex items-center justify-center rounded-full border bg-white">
    <img src={logoUrl} alt="Project Logo" className="object-contain w-8 h-8" />
  </div>
  <span className="text-2xl font-semibold text-pink-600 whitespace-normal leading-tight">{title}</span>
</div>

        {/* Timeline */}
        <div className="relative ml-8">
          <div className="absolute left-[13px] top-3 bottom-0 w-px bg-gray-300 z-0"></div>
          <ul className="space-y-10">
            {loading ? (
              <li className="text-gray-400">Loading...</li>
            ) : (
              tasks.flatMap((task) =>
                task.notes.map((note) => (
                  <li key={`${task.taskTitle}-${note.date}`} className="relative flex items-start gap-6">
                    {/* Circle */}
                    <div className="relative z-10">
                      <div className="w-6 h-6 rounded-full border-2 border-gray-400 bg-white flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
                      </div>
                    </div>
                    {/* Text block */}
                    <div className="text-sm">
                      <p className="text-xs italic text-gray-500 mb-1">
                        {new Date(note.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </p>
                      <div className="font-semibold text-sm mb-1">{task.taskTitle}</div>
                      <div className="text-gray-700 text-sm">“{note.feedback}”</div>
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