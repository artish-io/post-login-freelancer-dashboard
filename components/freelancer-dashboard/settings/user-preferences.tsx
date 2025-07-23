'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import Image from 'next/image';
import CustomDropdown from './custom-dropdown';
import gigTools from '../../../data/gigs/gig-tools.json';

interface Tool {
  name: string;
  icon: string;
}

interface ToolCategory {
  category: string;
  tools: Tool[];
}

export default function UserPreferences() {
  const [openToWork, setOpenToWork] = useState(true);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['Copy Writing', 'UX Design', 'UX Research', 'Graphic Design']);
  const [selectedTools, setSelectedTools] = useState<string[]>(['Figma', 'Adobe Illustrator', 'Adobe Photoshop']);
  const [hourlyRate, setHourlyRate] = useState('$20 - $50/hr');
  const [showSkillsInput, setShowSkillsInput] = useState(false);
  const [showToolsInput, setShowToolsInput] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newTool, setNewTool] = useState('');

  // Flatten all tools from the JSON data
  const allTools: Tool[] = (gigTools as ToolCategory[]).flatMap(category => category.tools);

  // Suggested skills and tools
  const suggestedSkills = ['Brand Design', 'Product Design'];
  const suggestedTools = [
    { name: 'Adobe XD', icon: '/icons/tools/adobe-xd.png' },
    { name: 'Canva', icon: '/canva-logo.png' }
  ].filter(tool => !selectedTools.includes(tool.name));

  // Hourly rate options
  const hourlyRateOptions = [
    { value: '$20 - $50/hr', label: '$20 - $50/hr' },
    { value: '$50 - $75/hr', label: '$50 - $75/hr' },
    { value: '$75 - $100/hr', label: '$75 - $100/hr' },
    { value: '$100 - $150/hr', label: '$100 - $150/hr' },
    { value: '$150 - $200/hr', label: '$150 - $200/hr' },
    { value: '$200+/hr', label: '$200+/hr' },
  ];

  // Helper function to get tool icon
  const getToolIcon = (toolName: string): string => {
    const tool = allTools.find(t => t.name === toolName);
    return tool?.icon || '/default-avatar.png';
  };

  // Handle adding skills
  const handleAddSkill = (skill: string) => {
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleAddSkillFromInput = () => {
    if (newSkill.trim() && !selectedSkills.includes(newSkill.trim())) {
      setSelectedSkills([...selectedSkills, newSkill.trim()]);
      setNewSkill('');
      setShowSkillsInput(false);
    }
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills(selectedSkills.filter(s => s !== skill));
  };

  // Handle adding tools
  const handleAddTool = (tool: string) => {
    if (!selectedTools.includes(tool)) {
      setSelectedTools([...selectedTools, tool]);
    }
  };

  const handleAddToolFromInput = () => {
    if (newTool.trim() && !selectedTools.includes(newTool.trim())) {
      setSelectedTools([...selectedTools, newTool.trim()]);
      setNewTool('');
      setShowToolsInput(false);
    }
  };

  const removeTool = (tool: string) => {
    setSelectedTools(selectedTools.filter(t => t !== tool));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Open to work toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Open to work</h3>
          <p className="text-sm text-gray-600">
            Toggle this setting on to recruiters know you're available for work so they can send you gig requests.
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setOpenToWork(!openToWork)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
              openToWork ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                openToWork ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Skills and tools */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Skills and tools</h3>
        <p className="text-sm text-gray-600 mb-6">
          Add more proficiencies to improve your chances of matching with the right paying customers
        </p>

        {/* Tools Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-600">Add tools to your portfolio</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {selectedTools.map((tool) => (
              <div
                key={tool}
                className="flex items-center gap-2 px-3 py-2 bg-[#FCD5E3] rounded-full text-sm font-medium text-gray-800 group"
              >
                <Image
                  src={getToolIcon(tool)}
                  alt={tool}
                  width={16}
                  height={16}
                  className="rounded"
                  onError={(e) => {
                    e.currentTarget.src = '/default-avatar.png';
                  }}
                />
                <span>{tool}</span>
                <button
                  onClick={() => removeTool(tool)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Add tool input or button */}
            {showToolsInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTool}
                  onChange={(e) => setNewTool(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddToolFromInput()}
                  onBlur={() => {
                    if (newTool.trim()) {
                      handleAddToolFromInput();
                    } else {
                      setShowToolsInput(false);
                    }
                  }}
                  placeholder="Add tool..."
                  className="px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            ) : (
              <button
                onClick={() => setShowToolsInput(true)}
                className="flex items-center gap-1 px-3 py-2 border border-dashed border-gray-300 rounded-full text-sm text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add tool
              </button>
            )}
          </div>

          {/* Suggested tools */}
          {suggestedTools.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-600 mb-2">Suggested:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTools.map((tool) => (
                  <button
                    key={tool.name}
                    onClick={() => handleAddTool(tool.name)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-full text-sm text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    <Image
                      src={tool.icon}
                      alt={tool.name}
                      width={16}
                      height={16}
                      className="rounded"
                      onError={(e) => {
                        e.currentTarget.src = '/default-avatar.png';
                      }}
                    />
                    <span>{tool.name}</span>
                    <Plus className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Skills Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-600">Add skills to your portfolio</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {selectedSkills.map((skill) => (
              <div
                key={skill}
                className="flex items-center gap-2 px-3 py-2 bg-[#FCD5E3] rounded-full text-sm font-medium text-gray-800 group"
              >
                <span>{skill}</span>
                <button
                  onClick={() => removeSkill(skill)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Add skill input or button */}
            {showSkillsInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSkillFromInput()}
                  onBlur={() => {
                    if (newSkill.trim()) {
                      handleAddSkillFromInput();
                    } else {
                      setShowSkillsInput(false);
                    }
                  }}
                  placeholder="Add skill..."
                  className="px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            ) : (
              <button
                onClick={() => setShowSkillsInput(true)}
                className="flex items-center gap-1 px-3 py-2 border border-dashed border-gray-300 rounded-full text-sm text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add skill
              </button>
            )}
          </div>

          {/* Suggested skills */}
          {suggestedSkills.length > 0 && (
            <div>
              <p className="text-xs text-gray-600 mb-2">Suggested:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedSkills.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => handleAddSkill(skill)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-full text-sm text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    <span>{skill}</span>
                    <Plus className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hourly Rate */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Hourly Rate</h3>
        <div className="max-w-sm">
          <CustomDropdown
            options={hourlyRateOptions}
            value={hourlyRate}
            onChange={setHourlyRate}
            placeholder="Select hourly rate"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <button className="bg-black text-white px-6 py-3 rounded-2xl font-medium hover:bg-gray-800 transition-colors">
          Save Changes
        </button>
        <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-2xl font-medium hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}