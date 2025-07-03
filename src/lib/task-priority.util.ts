export type Task = {
  id: number;
  title: string;
  status: string;
  completed: boolean;
  order: number;
  dueDate?: string;
  rejected?: boolean;
  feedbackCount?: number;
  pushedBack?: boolean;
};

export function calculateTaskPriority(task: Task): number {
  if (task.completed) return 0;

  const now = new Date();
  const due = task.dueDate ? new Date(task.dueDate) : null;

  const isRejected = task.rejected ?? false;
  const isPushedBack = task.pushedBack ?? false;
  const feedbackCount = task.feedbackCount ?? 0;

  let score = 0;

  // Rejected task with due date
  if (isRejected && due) {
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 1) score += 40;
    else if (daysLeft <= 3) score += 30;
    else score += 20;
  }

  // Pushed back status
  if (isPushedBack) {
    score += 15;
  }

  // Feedback weight
  score += feedbackCount * 5;

  // Near deadline urgency
  if (due) {
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 1) score += 10;
    else if (daysLeft <= 3) score += 5;
  }

  // Order fallback (earlier = higher)
  score += Math.max(0, 10 - task.order);

  return score;
}

export function sortTasksByPriority(tasks: Task[]): Task[] {
  return [...tasks]
    .filter((t) => !t.completed)
    .sort((a, b) => calculateTaskPriority(b) - calculateTaskPriority(a));
}