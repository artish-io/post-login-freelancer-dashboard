export type TaskStatus = 'Ongoing' | 'Submitted' | 'Rejected' | 'In review' | 'Approved';

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
