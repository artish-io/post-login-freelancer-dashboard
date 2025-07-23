'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

type ProjectSummary = {
  invoiceNumber: string;
  freelancerId: number;
  projectId: number | null;
  commissionerId: number;
  projectTitle: string;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid';
  freelancer: {
    id: number;
    name: string;
    avatar: string;
    title: string;
  };
  invoiceCount: number;
  completedInvoices: number;
};

type Props = {
  projects: ProjectSummary[];
  onProjectClick: (project: ProjectSummary) => void;
  loading: boolean;
};

export default function AccountHistoryTable({ projects, onProjectClick, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white">
        <div className="px-6 py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="bg-white">
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">No projects found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="px-6 py-3">
          <div className="grid grid-cols-3 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div>Project Details</div>
            <div>Amount</div>
            <div>Freelancer</div>
          </div>
        </div>
      </div>

      {/* Project List */}
      <div className="divide-y divide-gray-200">
        <AnimatePresence mode="wait">
          {projects.map((project, index) => (
            <motion.div
              key={project.invoiceNumber}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onProjectClick(project)}
            >
              <div className="grid grid-cols-3 gap-4 items-center">
                {/* Project Details Column */}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    {project.projectTitle}
                  </span>
                  <span className="text-xs text-gray-500">
                    Project ID: #{project.projectId || 'Custom'}
                  </span>
                </div>

                {/* Amount Column */}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    ${project.totalAmount.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {project.invoiceCount} milestones • {project.completedInvoices} completed
                  </span>
                </div>

                {/* Freelancer Column */}
                <div className="flex items-center gap-3">
                  <Image
                    src={project.freelancer.avatar}
                    alt={project.freelancer.name}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {project.freelancer.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {project.freelancer.title}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
