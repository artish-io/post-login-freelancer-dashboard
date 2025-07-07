

export type TaskStatus = 'Ongoing' | 'In review' | 'Approved';

export type TaskSummary = {
  taskIndex: number;
  totalTasks: number;
  taskTitle: string;
  description: string;
  avatarUrl: string;
  projectTitle: string;
  projectLogo: string;
  projectTags: string[];
  briefUrl?: string;
  workingFileUrl?: string;
  tag: string;
  columnId: 'todo' | 'upcoming' | 'review';
  projectId: number;
  taskId: number;
  status: TaskStatus;
};

export type Project = {
  projectId: number;
  title: string;
  description: string;
  manager: {
    name: string;
    title: string;
    avatar: string;
    email: string;
  };
  freelancerId: number;
  status: string;
  dueDate: string;
  totalTasks: number;
  progress: number;
};