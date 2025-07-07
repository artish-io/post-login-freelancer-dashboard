import { useEffect, useState } from "react";
import { flattenAndSortNotes } from "../../src/lib/flattenNotes";
import { useReadNotes } from "../../src/hooks/useReadNotes";
import clsx from "clsx";

type NoteItem = {
  projectId: number;
  taskId: number;
  taskTitle: string;
  date: string;
  feedback: string;
};

type NotesTabProps = {
  projectIds: number[];
  onExpand?: (projectId: number) => void;
};

export function NotesTab({ projectIds, onExpand }: NotesTabProps) {
  const [data, setData] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(0);
  const { isNoteRead, markAsRead } = useReadNotes();

  useEffect(() => {
    async function fetchNotes() {
      try {
        const projectIdsParam = projectIds.join(",");
        const res = await fetch(`/api/dashboard/project-notes?projectIds=${projectIdsParam}`);
        const json = await res.json();
        const flattened = flattenAndSortNotes(json);
        setData(flattened);
      } catch (err) {
        console.error("Failed to fetch project notes", err);
      } finally {
        setLoading(false);
      }
    }

    if (projectIds.length) {
      fetchNotes();
    } else {
      setData([]);
      setLoading(false);
    }
  }, [projectIds]);

  // Listen for read state changes and force re-render
  useEffect(() => {
    const handleReadNotesChange = () => {
      setForceUpdate(prev => prev + 1);
    };

    window.addEventListener('readNotesChanged', handleReadNotesChange);
    return () => window.removeEventListener('readNotesChanged', handleReadNotesChange);
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Loading notes...</p>;
  if (!data.length) return <p className="text-sm text-gray-500">No notes yet.</p>;

  const latestNotesByTask = Object.values(
    data.reduce((acc, note) => {
      const current = acc[note.taskId];
      if (!current || new Date(note.date) > new Date(current.date)) {
        acc[note.taskId] = note;
      }
      return acc;
    }, {} as Record<number, NoteItem>)
  )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Debug: Log read states on render
  console.log('📖 Notes Tab Render - Read States:',
    latestNotesByTask.map(note => ({
      taskId: note.taskId,
      date: note.date,
      noteId: `${note.taskId}-${note.date}`,
      isRead: isNoteRead(`${note.taskId}-${note.date}`)
    }))
  );

  return (
    <ul className="space-y-4">
      {latestNotesByTask.map((note) => {
        const noteId = `${note.taskId}-${note.date}`;
        const read = isNoteRead(noteId);

        return (
          <li
            key={noteId}
            onClick={() => {
              markAsRead(noteId);
              if (onExpand) onExpand(note.projectId);
            }}
            className="flex justify-between items-center text-sm cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span
                className={clsx(
                  'w-5 h-5 rounded-full border flex items-center justify-center',
                  read
                    ? 'bg-pink-500 text-white border-pink-500'
                    : 'border-gray-400'
                )}
              >
                {read && (
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M5 10l3 3 7-7" />
                  </svg>
                )}
              </span>
              <span className="truncate max-w-[180px] text-ellipsis overflow-hidden">
                {note.taskTitle}
              </span>
            </div>
            {!read && (
              <span className="text-xs font-semibold text-pink-600 bg-pink-100 px-2 py-0.5 rounded-full">
                New
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}