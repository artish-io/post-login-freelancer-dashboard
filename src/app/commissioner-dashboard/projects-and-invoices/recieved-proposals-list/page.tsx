"use client";

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import CommissionerHeader from '../../../../../components/commissioner-dashboard/commissioner-header';
import ProposalStatusNav from '../../../../../components/commissioner-dashboard/projects-and-invoices/proposal-status-list/proposal-status-nav';
import ProposalsRow from '../../../../../components/commissioner-dashboard/projects-and-invoices/proposal-status-list/proposals-row';

interface Proposal {
  id: string;
  title: string;
  summary: string;
  totalBid: number;
  status: 'sent' | 'accepted' | 'rejected';
  createdAt: string;
  sentAt?: string;
  freelancerId?: number;
  commissionerId?: number;
  typeTags?: string[];
  executionMethod?: 'completion' | 'milestone';
}

export default function ReceivedProposalsListPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get('status') || 'sent';
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProposals = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const [proposalsRes, usersRes] = await Promise.all([
          fetch('/api/proposals/send'),
          fetch('/api/users')
        ]);

        if (proposalsRes.ok && usersRes.ok) {
          const proposalsData = await proposalsRes.json();
          const usersData = await usersRes.json();

          const currentCommissionerId = parseInt(session.user.id);

          // Filter proposals for current commissioner
          const commissionerProposals = proposalsData.filter((proposal: Proposal) =>
            proposal.commissionerId === currentCommissionerId
          );

          setProposals(commissionerProposals);
          setUsers(Array.isArray(usersData) ? usersData : []);
        } else {
          console.error('Failed to fetch proposals or users');
        }
      } catch (error) {
        console.error('Error fetching proposals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, [session]);

  if (loading || !session) {
    return (
      <section className="flex flex-col gap-3 p-4 md:p-6">
        <CommissionerHeader />
        <h2 className="text-[30px] font-normal mb-2 mt-2">Received Proposals</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading proposals...</div>
        </div>
      </section>
    );
  }



  return (
    <motion.section
      className="flex flex-col gap-3 p-4 md:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* User Info Header */}
      <CommissionerHeader />

      {/* Main Layout */}
      <motion.h2
        className="text-[30px] font-normal mb-2 mt-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      >
        Received Proposals
      </motion.h2>

      <motion.div
        className="flex flex-col lg:flex-row gap-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      >
        {/* Sidebar Nav */}
        <div className="w-full lg:w-[240px] shrink-0 pt-2">
          <div className="mb-3">
            <ProposalStatusNav />
          </div>
        </div>

        {/* Proposals List */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-220px)] mt-2 space-y-2 pr-2">
          <ProposalsRow
            proposals={proposals}
            filterStatus={currentStatus as 'sent' | 'accepted' | 'rejected'}
            users={users}
          />
        </div>
      </motion.div>
    </motion.section>
  );
}