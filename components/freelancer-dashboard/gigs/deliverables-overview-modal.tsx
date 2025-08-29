"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import Image from "next/image";

type Milestone = {
  id: string;
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
  percentage?: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  gigTitle: string;
  organizationName: string;
  organizationLogo?: string;
  milestones: Milestone[];
};

export default function DeliverablesOverviewModal({
  isOpen,
  onClose,
  gigTitle,
  organizationName,
  organizationLogo,
  milestones = []
}: Props) {
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Don't render until mounted to avoid hydration issues
  if (!mounted || !isOpen) return null;

  const modalContent = (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className="relative bg-white rounded-t-2xl md:rounded-2xl w-full max-w-3xl mx-4 md:mx-auto pointer-events-auto shadow-xl"
        style={{
          maxHeight: "90vh",
          overflowY: "auto",
          minHeight: "50vh"
        }}
        initial={{
          y: "100%",
          opacity: 0,
          scale: 0.95
        }}
        animate={{
          y: 0,
          opacity: 1,
          scale: 1
        }}
        exit={{
          y: "100%",
          opacity: 0,
          scale: 0.95
        }}
        transition={{
          type: "spring",
          damping: 30,
          stiffness: 400,
          mass: 0.8
        }}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white pt-6 pb-4 px-6 md:px-8 shadow-[rgba(0,0,0,0.05)_0px_2px_10px]">
          {/* Close Button */}
          <button
            className="absolute top-4 left-4 flex items-center gap-2 text-gray-500 hover:text-pink-500 text-sm transition-colors duration-200"
            onClick={onClose}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Close
          </button>

          {/* Tags */}
          <div className="flex gap-2 mb-2 mt-4">
            <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-semibold">
              Deliverables Overview
            </span>
          </div>

          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            {organizationLogo && (
              <div className="w-10 h-10 flex items-center justify-center rounded-full border bg-white shrink-0">
                <Image
                  src={organizationLogo}
                  alt="Organization Logo"
                  width={32}
                  height={32}
                  className="object-contain rounded-full"
                />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-semibold text-pink-600 leading-tight">
                {gigTitle}
              </h2>
              <p className="text-sm text-gray-600">{organizationName}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative px-6 md:px-8 pt-6 pb-10 flex-1">
          <ul className="space-y-8 relative min-h-[200px]">
            {/* vertical line behind bullets */}
            <div className="absolute top-3 left-4 w-[2px] bg-gray-300 h-full z-0" />

            {milestones.length === 0 ? (
              <li className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No milestones defined for this project</p>
                <p className="text-gray-400 text-xs mt-1">This project uses completion-based invoicing</p>
              </li>
            ) : (
              milestones.map((milestone, index) => (
                <li
                  key={milestone.id}
                  className="relative flex items-start gap-6"
                >
                  {/* Circle */}
                  <div className="relative z-10 mt-1.5">
                    <div className="w-8 h-8 rounded-full border-2 border-gray-400 bg-white flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-gray-400" />
                    </div>
                  </div>
                  {/* Milestone content */}
                  <div className="text-sm max-w-full">
                    <div className="font-semibold text-sm mb-1">
                      Milestone {index + 1}: {milestone.title}
                    </div>
                    <p className="text-gray-700 text-[0.85rem] leading-snug max-w-prose mb-2">
                      {milestone.description}
                    </p>
                    {milestone.percentage && (
                      <p className="text-xs text-gray-500">
                        {milestone.percentage}% of total project value
                      </p>
                    )}
                    {(milestone.startDate || milestone.endDate) && (
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        {milestone.startDate && (
                          <span>Start: {new Date(milestone.startDate).toLocaleDateString()}</span>
                        )}
                        {milestone.startDate && milestone.endDate && <span>•</span>}
                        {milestone.endDate && (
                          <span>End: {new Date(milestone.endDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </motion.div>
    </motion.div>
  );

  // Render modal in a portal to avoid layout constraints
  return createPortal(modalContent, document.body);
}
