export type TaskStatus = 'Ongoing' | 'Submitted' | 'Rejected' | 'In review' | 'Approved';

export interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  completed: boolean;
  order: number;
  link?: string;
  dueDate: string;
  rejected: boolean;
  feedbackCount: number;
  pushedBack: boolean;
  version: number;
  description?: string;
  briefUrl?: string;
  workingFileUrl?: string;
}

export interface Project {
  projectId: number;
  title: string;
  organizationId: number;
  typeTags: string[];
  tasks: Task[];
  // Computed properties for display
  manager?: {
    name: string;
  };
  dueDate?: string;
  totalTasks?: number;
  progress?: number;
}

export interface TaskSummary {
  id: number;
  projectId: number;
  title: string;
  status: TaskStatus;
  completed: boolean;
  version: number;
  latestSubmittedVersion: number;
  feedbackCount: number;
  rejected: boolean;
  resubmitted?: boolean;
  projectTitle: string;
  projectLogo: string;
  typeTags: string[];
  dueDate: string;
  briefUrl?: string;
  workingFileUrl?: string;
}
