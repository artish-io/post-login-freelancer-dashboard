// src/app/freelancer-dashboard/projects-and-invoices/task-board/page.tsx

'use client';

import TaskBoard from '../../../../../components/freelancer-dashboard/projects-and-invoices/projects/task-board';

export default function TaskBoardPage() {
  return (
    <main className="w-full h-full px-4 pt-6 pb-16 md:px-10">
      <h1 className="text-xl md:text-2xl font-semibold mb-6">Task Board</h1>
      <TaskBoard />
    </main>
  );
}