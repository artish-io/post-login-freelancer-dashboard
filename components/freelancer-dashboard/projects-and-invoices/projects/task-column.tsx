'use client';

import { useEffect, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import TaskCard from './task-card';
import projects from '../../../../data/project-tasks.json';
import organizations from '../../../../data/organizations.json';
import { isToday, isThisWeek, parseISO } from 'date-fns';

type Props = {
  columnId: 'todo' | 'upcoming' | 'review';
  title: string;
};

type Project = {
  projectId: number;
  title: string;
  organizationId: number;
  typeTags: string[];
  tasks: {
    id: number;
    title: string;
    description?: string; // ← Add this line
    status: string;
    completed: boolean;
    order: number;
    link: string;
    dueDate: string;
    rejected: boolean;
    feedbackCount: number;
    pushedBack: boolean;
    briefUrl?: string;
    workingFileUrl?: string;
  }[];
};

type Organization = {
  id: number;
  name: string;
  logo: string;
};

export default function TaskColumn({ columnId, title }: Props) {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    const collected: any[] = [];

    (projects as Project[]).forEach((project) => {
      const org = (organizations as Organization[]).find(
        (o) => o.id === project.organizationId
      );

      const projectLogo = org?.logo || '/logos/fallback-logo.png';

      project.tasks.forEach((task, index) => {
        const due = parseISO(task.dueDate);

        const shouldInclude =
          (columnId === 'todo' && isToday(due) && !task.completed) ||
          (columnId === 'upcoming' &&
            isThisWeek(due, { weekStartsOn: 1 }) &&
            !isToday(due) &&
            !task.completed) ||
          (columnId === 'review' && !task.completed && task.rejected);

        if (!shouldInclude) return;

        let tag = project.typeTags[0] ?? 'General';
        if (task.completed) tag = 'Completed';
        else if (task.rejected) tag = 'Rejected';
        else if (task.feedbackCount > 0) tag = `Feedback ×${task.feedbackCount}`;
        else if (task.pushedBack) tag = 'Delayed';

        const cardData = {
          taskIndex: index + 1,
          totalTasks: project.tasks.length,
          taskTitle: task.title,
          description: task.description || '',
          avatarUrl: '',
          projectTitle: project.title,
          projectLogo,
          projectTags: project.typeTags,
          briefUrl: task.briefUrl,
          workingFileUrl: task.workingFileUrl,
          tag,
          columnId,
        };

        collected.push(cardData);
      });
    });

    setTasks(collected);
  }, [columnId]);

  return (
    <div className="flex flex-col w-[320px] xl:w-[360px] bg-pink-100 p-4 rounded-2xl shadow-sm shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <button className="hover:opacity-80 transition" aria-label="More options">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Task list */}
<div className="flex flex-col gap-4">
  {tasks.length === 0 ? (
    <div className="h-[140px] bg-white rounded-xl border shadow-sm flex items-center justify-center text-sm text-gray-400">
      Empty list
    </div>
  ) : (
    tasks.map((task) => (
      <TaskCard
        key={`${task.projectTitle}-${task.taskIndex}`}
        tag={task.tag}
        title={task.taskTitle}
        description={task.description}
        avatarUrl={task.avatarUrl}
        projectTitle={task.projectTitle}
        projectLogo={task.projectLogo}
        projectTags={task.projectTags}
        taskIndex={task.taskIndex}
        totalTasks={task.totalTasks}
        briefUrl={task.briefUrl}
        workingFileUrl={task.workingFileUrl}
        columnId={columnId}
        status={task.status as 'Ongoing' | 'In review' | 'Approved'} // ✅ required!
      />
    ))
  )}
</div>
    </div>
  );
}