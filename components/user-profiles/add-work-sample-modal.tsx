'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload } from 'lucide-react';

interface AddWorkSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: WorkSampleFormData) => void;
  availableSkills: string[];
  availableTools: string[];
}

interface WorkSampleFormData {
  title: string;
  coverImage: string;
  link: string;
  skills: string[];
  tools: string[];
  year: number;
}

export default function AddWorkSampleModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  availableSkills, 
  availableTools 
}: AddWorkSampleModalProps) {
  const [formData, setFormData] = useState<WorkSampleFormData>({
    title: '',
    coverImage: '',
    link: '',
    skills: [],
    tools: [],
    year: new Date().getFullYear()
  });

  const [skillSearch, setSkillSearch] = useState('');
  const [toolSearch, setToolSearch] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
    // Reset form
    setFormData({
      title: '',
      coverImage: '',
      link: '',
      skills: [],
      tools: [],
      year: new Date().getFullYear()
    });
  };

  const addSkill = (skill: string) => {
    if (!formData.skills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
    setSkillSearch('');
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const addTool = (tool: string) => {
    if (!formData.tools.includes(tool)) {
      setFormData(prev => ({
        ...prev,
        tools: [...prev.tools, tool]
      }));
    }
    setToolSearch('');
  };

  const removeTool = (tool: string) => {
    setFormData(prev => ({
      ...prev,
      tools: prev.tools.filter(t => t !== tool)
    }));
  };

  const filteredSkills = availableSkills.filter(skill =>
    skill.toLowerCase().includes(skillSearch.toLowerCase()) &&
    !formData.skills.includes(skill)
  );

  const filteredTools = availableTools.filter(tool =>
    tool.toLowerCase().includes(toolSearch.toLowerCase()) &&
    !formData.tools.includes(tool)
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Add Work Sample</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent"
                    required
                  />
                </div>

                {/* Cover Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cover Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.coverImage}
                    onChange={(e) => setFormData(prev => ({ ...prev, coverImage: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent"
                    required
                  />
                </div>

                {/* Project Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent"
                  />
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skills
                  </label>
                  <input
                    type="text"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder="Search and select skills..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent mb-2"
                  />
                  
                  {/* Selected Skills */}
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 bg-[#FCD5E3] text-sm rounded-full text-gray-700 flex items-center gap-2"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Skill Suggestions */}
                  {skillSearch && filteredSkills.length > 0 && (
                    <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                      {filteredSkills.slice(0, 5).map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => addSkill(skill)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tools */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tools
                  </label>
                  <input
                    type="text"
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    placeholder="Search and select tools..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent mb-2"
                  />
                  
                  {/* Selected Tools */}
                  {formData.tools.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.tools.map((tool) => (
                        <span
                          key={tool}
                          className="px-3 py-1 bg-gray-100 text-sm rounded-full text-gray-600 flex items-center gap-2"
                        >
                          {tool}
                          <button
                            type="button"
                            onClick={() => removeTool(tool)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tool Suggestions */}
                  {toolSearch && filteredTools.length > 0 && (
                    <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                      {filteredTools.slice(0, 5).map((tool) => (
                        <button
                          key={tool}
                          type="button"
                          onClick={() => addTool(tool)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                        >
                          {tool}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Year */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    min="2000"
                    max={new Date().getFullYear()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent"
                    required
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#eb1966] text-white rounded-lg hover:bg-[#B30445] transition-colors"
                  >
                    Add Work Sample
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
