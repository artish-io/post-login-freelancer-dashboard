// src/lib/flattenNotes.ts
export function flattenAndSortNotes(data: any[]) {
  const flattened = data.flatMap(task =>
    task.notes.map((note: any) => ({
      projectId: task.projectId,
      taskId: task.taskId,
      taskTitle: task.taskTitle,
      date: note.date,
      feedback: note.feedback,
    }))
  );

  return flattened.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}