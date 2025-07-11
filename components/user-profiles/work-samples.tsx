'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkSample {
  id: string;
  title: string;
  coverImage: string;
  link?: string;
  skills: string[];
  tools: string[];
  year: number;
}

interface WorkSamplesProps {
  workSamples: WorkSample[];
  isOwnProfile: boolean;
  onAddWorkSample?: () => void;
}

export default function WorkSamples({ workSamples, isOwnProfile, onAddWorkSample }: WorkSamplesProps) {
  const [selectedSample, setSelectedSample] = useState<WorkSample | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Work Samples</h2>
      </div>

      {/* Add Work Sample Card - Only for own profile */}
      {isOwnProfile && (
        <div
          onClick={onAddWorkSample}
          className="border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors cursor-pointer mb-6"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center flex-shrink-0">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1 text-sm">
                Add a new work sample that highlights your skills
              </h3>
              <p className="text-xs text-gray-600">
                Only add projects that showcase the depth of your abilities and expertise
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Work Samples Grid - 2 columns as in Figma */}
      <div className="grid grid-cols-2 gap-4">
        {workSamples.map((sample) => (
          <motion.div
            key={sample.id}
            layout
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedSample(sample)}
          >
            {/* Cover Image - Smaller aspect ratio */}
            <div className="aspect-[4/3] relative bg-gray-100">
              <Image
                src={sample.coverImage}
                alt={sample.title}
                fill
                className="object-cover"
              />
              {/* External link icon overlay */}
              {sample.link && (
                <div className="absolute top-2 right-2">
                  <ExternalLink className="w-4 h-4 text-white drop-shadow-md" />
                </div>
              )}
            </div>

            {/* Content - More compact */}
            <div className="p-3">
              <h3 className="font-medium text-gray-900 mb-2 text-sm line-clamp-1">{sample.title}</h3>

              {/* Skills and Tools combined */}
              <div className="flex flex-wrap gap-1 mb-2">
                {sample.skills.slice(0, 1).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-[#FCD5E3] text-xs rounded text-gray-800"
                  >
                    {skill}
                  </span>
                ))}
                {sample.tools.slice(0, 1).map((tool) => (
                  <span
                    key={tool}
                    className="px-2 py-1 bg-gray-100 text-xs rounded text-gray-600"
                  >
                    {tool}
                  </span>
                ))}
                <span className="px-2 py-1 bg-gray-100 text-xs rounded text-gray-600">
                  {sample.year}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Work Sample Detail Modal */}
      <AnimatePresence>
        {selectedSample && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedSample(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cover Image */}
              <div className="aspect-video relative bg-gray-100">
                <Image
                  src={selectedSample.coverImage}
                  alt={selectedSample.title}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{selectedSample.title}</h2>
                  {selectedSample.link && (
                    <a
                      href={selectedSample.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[#eb1966] hover:text-[#B30445] transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Project
                    </a>
                  )}
                </div>

                {/* Skills */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedSample.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-[#FCD5E3] text-sm rounded-full text-gray-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tools */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Tools</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedSample.tools.map((tool) => (
                      <span
                        key={tool}
                        className="px-3 py-1 bg-gray-100 text-sm rounded-full text-gray-600"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Year */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Year</h3>
                  <span className="text-gray-600">{selectedSample.year}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
