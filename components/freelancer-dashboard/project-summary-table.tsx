'use client';

// NOTE TO DEV TEAM:
// This component dynamically fetches dashboard-specific project summaries based on the current user's session ID.
// It uses useSession() to access the client session and loads data from /api/dashboard/projects-summary.
// If no session is available, a warning is logged to help debug dev hydration or login state issues.
// Ensure file is named correctly as 'project-summary-table.tsx' to match imports.

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useSession } from 'next-auth/react';
import ProgressRing from '../progress-ring'; // ✅ Ensure correct path

export type Project = {
  name: string;
  manager: string;
  dueDate: string;
  status: 'Delayed' | 'At risk' | 'Completed';
  progress: number;
};

const statusColors: Record<Project['status'], string> = {
  Delayed: 'bg-yellow-100 text-yellow-800',
  'At risk': 'bg-red-100 text-red-700',
  Completed: 'bg-green-100 text-green-700',
};

export default function ProjectSummaryTable() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!session?.user?.id) {
      console.warn('⚠️ No session.user.id detected in project-summary-table');
      return;
    }

    const fetchProjects = async () => {
      try {
        const res = await fetch(`/api/dashboard/projects-summary?id=${session.user.id}`);
        const data = await res.json();
        setProjects(data);
      } catch (error) {
        console.error('❌ Failed to fetch project summary:', error);
      }
    };

    fetchProjects();
  }, [session?.user?.id]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Project summary</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-gray-700">
          <thead className="text-xs text-gray-500 uppercase border-b">
            <tr>
              <th className="py-3 pr-6">Name</th>
              <th className="py-3 pr-6">Project manager</th>
              <th className="py-3 pr-6">Due date</th>
              <th className="py-3 pr-6">Status</th>
              <th className="py-3">Progress</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project, index) => (
              <tr key={index} className="border-b last:border-0">
                <td className="py-3 pr-6">{project.name}</td>
                <td className="py-3 pr-6">{project.manager}</td>
                <td className="py-3 pr-6">{project.dueDate}</td>
                <td className="py-3 pr-6">
                  <span
                    className={clsx(
                      'px-3 py-1 rounded-full text-xs font-medium',
                      statusColors[project.status]
                    )}
                  >
                    {project.status}
                  </span>
                </td>
                <td className="py-3">
                  <ProgressRing value={project.progress} status={project.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CTA */}
      <div className="flex justify-end mt-4">
        <button className="text-sm px-4 py-2 rounded-full border text-gray-800 hover:bg-gray-100 transition">
          View All
        </button>
      </div>
    </div>
  );
}