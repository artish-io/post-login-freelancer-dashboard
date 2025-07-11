'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ExternalLink, Plus } from 'lucide-react';

type WorkSample = {
  id: string;
  userId: number;
  title: string;
  image: string;
  skill: string;
  tool: string;
  year: number;
  url: string;
};

type Props = {
  workSamples: WorkSample[];
  isOwnProfile?: boolean;
  onAddWorkSample?: () => void;
};

export default function WorkSamplesGrid({ 
  workSamples, 
  isOwnProfile = false, 
  onAddWorkSample 
}: Props) {
  const [hoveredSample, setHoveredSample] = useState<string | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <h2 className="text-xl font-semibold text-gray-900">Work Samples</h2>

      {/* Fixed Add Button */}
      {isOwnProfile && (
        <div className="mb-6">
          <button
            onClick={onAddWorkSample}
            className="flex items-center gap-3 text-gray-700 hover:text-gray-900 transition-colors group"
          >
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <div className="font-medium">Add a new work sample that highlights your skills</div>
              <div className="text-sm text-gray-500">Only add projects that showcase the depth of your abilities and expertise</div>
            </div>
          </button>
        </div>
      )}

      {/* Scrollable Grid */}
      <div className="max-h-96 overflow-y-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-4"
        >
        {workSamples.map((sample) => (
          <motion.div
            key={sample.id}
            variants={itemVariants}
            className="group relative bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow"
            onMouseEnter={() => setHoveredSample(sample.id)}
            onMouseLeave={() => setHoveredSample(null)}
          >
            {/* Image */}
            <div className="relative h-32 overflow-hidden">
              <Image
                src={sample.image}
                alt={sample.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Overlay on hover */}
              {hoveredSample === sample.id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center"
                >
                  <a
                    href={sample.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1 bg-white text-gray-900 rounded text-xs hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View
                  </a>
                </motion.div>
              )}
            </div>

            {/* Content */}
            <div className="p-3">
              <h3 className="font-medium text-gray-900 text-sm mb-1">{sample.title}</h3>

              <div className="flex flex-wrap gap-1 mb-2">
                <span
                  className="px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: '#FCD5E3', color: '#000' }}
                >
                  {sample.skill}
                </span>
                <span
                  className="px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: '#FCD5E3', color: '#000' }}
                >
                  {sample.tool}
                </span>
                <span
                  className="px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: '#FCD5E3', color: '#000' }}
                >
                  {sample.year}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
        </motion.div>
      </div>

      {/* Empty state */}
      {workSamples.length === 0 && !isOwnProfile && (
        <div className="text-center py-12 text-gray-500">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Image
              src="/icons/portfolio.svg"
              alt="Portfolio"
              width={24}
              height={24}
              className="opacity-50"
            />
          </div>
          <p className="text-sm">No work samples available</p>
        </div>
      )}
    </section>
  );
}
