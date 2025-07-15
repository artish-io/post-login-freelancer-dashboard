'use client';

import FreelancerHeader from '../../../components/freelancer-dashboard/freelancer-header';
import ProjectStatsRow from '../../../components/freelancer-dashboard/project-stats-row';
import EarningsCard from '../../../components/freelancer-dashboard/earnings-card';
import ProjectSummaryTable from '../../../components/shared/project-summary-table';
import TasksPanel from '../../../components/shared/tasks-panel';
import MessagesPreview from '../../../components/freelancer-dashboard/messages-preview';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '../../../components/ui/page-transition';

export default function FreelancerDashboardPage() {
  return (
    <motion.div
      className="flex-1 flex flex-col bg-gray-50"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Sticky Freelancer Header */}
      <motion.section
        variants={staggerItem}
        className="sticky top-[80px] z-40 bg-gray-50 px-4 sm:px-6 py-2"
      >
        <FreelancerHeader />
      </motion.section>

      {/* Responsive Grid Layout */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 px-4 sm:px-6 py-4">
        {/* Left column: Main content */}
        <div className="order-2 lg:order-1 space-y-6">
          {/* Earnings shown first on mobile */}
          <motion.div variants={staggerItem} className="lg:hidden flex justify-center">
            <EarningsCard />
          </motion.div>
          <motion.div variants={staggerItem}>
            <ProjectStatsRow />
          </motion.div>
          <motion.div variants={staggerItem}>
            <ProjectSummaryTable viewType="freelancer" />
          </motion.div>
          <motion.div variants={staggerItem}>
            <TasksPanel
              viewType="freelancer"
              title="Today's tasks"
              showNotesTab={true}
            />
          </motion.div>

          {/* MessagesPreview only on mobile */}
          <motion.div variants={staggerItem} className="lg:hidden">
            <MessagesPreview />
          </motion.div>
        </div>

        {/* Right column: Sidebar on large screens */}
        <div className="order-1 lg:order-2 hidden lg:flex flex-col gap-6">
          <motion.div variants={staggerItem}>
            <EarningsCard />
          </motion.div>
          <motion.div variants={staggerItem}>
            <MessagesPreview />
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}