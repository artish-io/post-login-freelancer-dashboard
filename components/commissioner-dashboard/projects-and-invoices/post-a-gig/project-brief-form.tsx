'use client';

import { useState, useEffect } from 'react';
import { Paperclip, X, Plus, Calendar, Trash2, ChevronDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover } from '@headlessui/react';
import { Calendar as CalendarComponent } from '../../../ui/calendar';
import { format } from 'date-fns';
import clsx from 'clsx';

// Import data for fuzzy matching
import gigCategories from '../../../../data/gigs/gig-categories.json';
import gigTools from '../../../../data/gigs/gig-tools.json';

// Fuzzy matching utility
const fuzzyMatch = (query: string, text: string): boolean => {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match
  if (textLower.includes(queryLower)) return true;

  // Fuzzy character matching
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === queryLower.length;
};

// Get skill suggestions from categories and subcategories
const getSkillSuggestions = (query: string): string[] => {
  if (!query.trim()) return [];

  const suggestions: string[] = [];

  gigCategories.forEach((category: any) => {
    // Add category name if it matches
    if (fuzzyMatch(query, category.label)) {
      suggestions.push(category.label);
    }

    // Add subcategory names if they match
    category.subcategories?.forEach((sub: any) => {
      if (fuzzyMatch(query, sub.name)) {
        suggestions.push(sub.name);
      }
    });
  });

  return [...new Set(suggestions)].slice(0, 5); // Remove duplicates and limit to 5
};

// Get tool suggestions from tools data
const getToolSuggestions = (query: string): string[] => {
  if (!query.trim()) return [];

  const suggestions: string[] = [];

  gigTools.forEach((category: any) => {
    category.tools?.forEach((tool: any) => {
      if (fuzzyMatch(query, tool.name)) {
        suggestions.push(tool.name);
      }
    });
  });

  return [...new Set(suggestions)].slice(0, 5); // Remove duplicates and limit to 5
};

type ExecutionMethod = 'completion' | 'milestone';

interface Milestone {
  id: string;
  title: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  amount?: number;
}

interface ProjectBriefFormProps {
  projectDescription: string;
  onProjectDescriptionChange: (value: string) => void;
  projectBriefFile: File | null;
  onProjectBriefFileChange: (file: File | null) => void;
  skills: string[];
  onSkillsChange: (skills: string[]) => void;
  tools: string[];
  onToolsChange: (tools: string[]) => void;
  milestones: Milestone[];
  onMilestonesChange: (milestones: Milestone[]) => void;
  executionMethod: ExecutionMethod;
  upperBudget: number;
  endDate: Date | null;
}

export default function ProjectBriefForm({
  projectDescription,
  onProjectDescriptionChange,
  projectBriefFile,
  onProjectBriefFileChange,
  skills,
  onSkillsChange,
  tools,
  onToolsChange,
  milestones,
  onMilestonesChange,
  executionMethod,
  upperBudget,
  endDate,
}: ProjectBriefFormProps) {
  const [skillInput, setSkillInput] = useState('');
  const [toolInput, setToolInput] = useState('');
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
  const [toolSuggestions, setToolSuggestions] = useState<string[]>([]);
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const [showToolSuggestions, setShowToolSuggestions] = useState(false);

  // Update skill suggestions when input changes
  useEffect(() => {
    const suggestions = getSkillSuggestions(skillInput);
    setSkillSuggestions(suggestions);
    // Only show suggestions if there's input and suggestions exist
    setShowSkillSuggestions(skillInput.length > 0 && suggestions.length > 0);
  }, [skillInput]);

  // Update tool suggestions when input changes
  useEffect(() => {
    const suggestions = getToolSuggestions(toolInput);
    setToolSuggestions(suggestions);
    // Only show suggestions if there's input and suggestions exist
    setShowToolSuggestions(toolInput.length > 0 && suggestions.length > 0);
  }, [toolInput]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onProjectBriefFileChange(file);
    }
  };

  const removeFile = () => {
    onProjectBriefFileChange(null);
  };

  const addSkill = (skill?: string) => {
    const skillToAdd = skill || skillInput.trim();
    if (skillToAdd && !skills.includes(skillToAdd)) {
      onSkillsChange([...skills, skillToAdd]);
      setSkillInput('');
      setShowSkillSuggestions(false);
      // Don't set skillInputFocused to false - let the natural blur handle it
    }
  };

  const removeSkill = (skillToRemove: string) => {
    onSkillsChange(skills.filter(skill => skill !== skillToRemove));
  };

  const addTool = (tool?: string) => {
    const toolToAdd = tool || toolInput.trim();
    if (toolToAdd && !tools.includes(toolToAdd)) {
      onToolsChange([...tools, toolToAdd]);
      setToolInput('');
      setShowToolSuggestions(false);
      // Don't set toolInputFocused to false - let the natural blur handle it
    }
  };

  const removeTool = (toolToRemove: string) => {
    onToolsChange(tools.filter(tool => tool !== toolToRemove));
  };

  const handleSkillKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showSkillSuggestions && skillSuggestions.length > 0) {
        addSkill(skillSuggestions[0]); // Add first suggestion
      } else {
        addSkill();
      }
    } else if (e.key === 'Escape') {
      setShowSkillSuggestions(false);
    }
  };

  const handleToolKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showToolSuggestions && toolSuggestions.length > 0) {
        addTool(toolSuggestions[0]); // Add first suggestion
      } else {
        addTool();
      }
    } else if (e.key === 'Escape') {
      setShowToolSuggestions(false);
    }
  };

  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: uuidv4(),
      title: '',
      description: '',
      startDate: null,
      endDate: null,
      ...(executionMethod === 'milestone' && { amount: 0 }),
    };
    onMilestonesChange([...milestones, newMilestone]);
  };

  const updateMilestone = (id: string, updates: Partial<Milestone>) => {
    onMilestonesChange(milestones.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const removeMilestone = (id: string) => {
    onMilestonesChange(milestones.filter(m => m.id !== id));
  };

  // Calculate milestone payment info for milestone-based projects
  const milestonePaymentInfo = executionMethod === 'milestone' && milestones.length > 0 
    ? {
        perMilestone: Math.round(upperBudget / milestones.length),
        range: `$${Math.round(upperBudget / milestones.length).toLocaleString()} per milestone`
      }
    : null;

  return (
    <div className="space-y-8">
      {/* Project Description */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Add summary project description
        </label>
        <div className="relative">
          <textarea
            value={projectDescription}
            onChange={(e) => onProjectDescriptionChange(e.target.value)}
            placeholder="Add summary project description"
            rows={4}
            maxLength={600}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#eb1966] transition text-sm resize-none"
          />
          <div className="absolute bottom-3 right-3 text-xs text-gray-500">
            {projectDescription.length}/600
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Upload a project brief document (Optional)
        </label>
        <div className="relative">
          <input
            type="file"
            id="project-brief-upload"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
          />
          <label
            htmlFor="project-brief-upload"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus-within:border-[#eb1966] transition text-sm cursor-pointer flex items-center justify-between bg-white hover:bg-gray-50"
          >
            <span className="text-gray-500">
              {projectBriefFile ? projectBriefFile.name : 'Upload a project brief document (Optional)'}
            </span>
            {projectBriefFile ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  removeFile();
                }}
                className="text-gray-400 hover:text-red-500 transition"
              >
                <X size={16} />
              </button>
            ) : (
              <Paperclip size={16} className="text-gray-400" />
            )}
          </label>
        </div>
      </div>

      {/* Skills */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Tag up-to 3 skills that are relevant to this project
        </label>
        <div className="space-y-3">
          <div className="relative">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={handleSkillKeyPress}
                  onFocus={() => {
                    // Show suggestions if there's input and suggestions exist
                    if (skillInput.trim().length > 0 && skillSuggestions.length > 0) {
                      setShowSkillSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding to allow click events on suggestions
                    setTimeout(() => {
                      setShowSkillSuggestions(false);
                    }, 150);
                  }}
                  placeholder="Tag up-to 3 skills that are relevant to this project"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#eb1966] transition text-sm"
                  disabled={skills.length >= 3}
                />

                {/* Skill Suggestions Dropdown */}
                {showSkillSuggestions && skillSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                    {skillSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent input blur
                          addSkill(suggestion);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 transition text-sm border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{suggestion}</div>
                        <div className="text-xs text-gray-500 italic">Skill</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => addSkill()}
                disabled={!skillInput.trim() || skills.length >= 3}
                className="px-4 py-3 bg-[#eb1966] text-white rounded-xl hover:bg-[#d1175a] transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#FCD5E3] text-[#eb1966] rounded-full text-sm"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="text-[#eb1966] hover:text-[#d1175a] transition"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tools */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Tag up-to 3 tools required for this project
        </label>
        <div className="space-y-3">
          <div className="relative">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={toolInput}
                  onChange={(e) => setToolInput(e.target.value)}
                  onKeyPress={handleToolKeyPress}
                  onFocus={() => {
                    // Show suggestions if there's input and suggestions exist
                    if (toolInput.trim().length > 0 && toolSuggestions.length > 0) {
                      setShowToolSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding to allow click events on suggestions
                    setTimeout(() => {
                      setShowToolSuggestions(false);
                    }, 150);
                  }}
                  placeholder="Tag up-to 3 tools required for this project"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#eb1966] transition text-sm"
                  disabled={tools.length >= 3}
                />

                {/* Tool Suggestions Dropdown */}
                {showToolSuggestions && toolSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                    {toolSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent input blur
                          addTool(suggestion);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 transition text-sm border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{suggestion}</div>
                        <div className="text-xs text-gray-500 italic">Tool</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => addTool()}
                disabled={!toolInput.trim() || tools.length >= 3}
                className="px-4 py-3 bg-[#eb1966] text-white rounded-xl hover:bg-[#d1175a] transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
          {tools.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tools.map((tool) => (
                <span
                  key={tool}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#FCD5E3] text-[#eb1966] rounded-full text-sm"
                >
                  {tool}
                  <button
                    type="button"
                    onClick={() => removeTool(tool)}
                    className="text-[#eb1966] hover:text-[#d1175a] transition"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Milestones Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Milestones / Deliverables</h3>
          {milestonePaymentInfo && (
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
              {milestonePaymentInfo.range}
            </div>
          )}
        </div>

        {milestones.map((milestone) => (
          <div
            key={milestone.id}
            className="border border-gray-300 rounded-2xl p-6 bg-white mb-4 relative"
          >
            {/* Remove Button - with better spacing */}
            <button
              type="button"
              onClick={() => removeMilestone(milestone.id)}
              className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition p-1 rounded-lg hover:bg-red-50"
            >
              <Trash2 size={18} />
            </button>

            {/* Milestone Title - with spacing for delete button */}
            <div className="mb-4 pr-12">
              <input
                type="text"
                value={milestone.title}
                onChange={(e) => updateMilestone(milestone.id, { title: e.target.value })}
                placeholder="Milestone Title"
                maxLength={150}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#eb1966] transition text-sm font-medium"
              />
            </div>

            {/* Milestone Description */}
            <div className="mb-4">
              <div className="relative">
                <textarea
                  value={milestone.description}
                  onChange={(e) => updateMilestone(milestone.id, { description: e.target.value })}
                  placeholder="Write a detailed description of the project deliverable, including specific requirements, expected outcomes, and any important details for this milestone"
                  rows={6}
                  maxLength={1000}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#eb1966] transition text-sm resize-none"
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                  {milestone.description.length}/1000
                </div>
              </div>
            </div>

            {/* Date Pickers and Payment Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Start Date</label>
                <Popover className="relative w-full">
                  <Popover.Button
                    className={clsx(
                      'w-full rounded-xl bg-white px-4 py-3 text-sm text-left flex items-center justify-between border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#eb1966] transition'
                    )}
                  >
                    <span className="text-gray-900">
                      {milestone.startDate ? format(milestone.startDate, 'PPP') : 'Pick a date'}
                    </span>
                    <Calendar size={16} className="text-gray-500" />
                  </Popover.Button>
                  <Popover.Panel className="absolute z-50 mt-2 bg-white rounded-xl p-4 shadow-xl border border-gray-200 max-h-96 overflow-visible">
                    <CalendarComponent
                      mode="single"
                      selected={milestone.startDate ?? undefined}
                      onSelect={(date) => updateMilestone(milestone.id, { startDate: date ?? null })}
                      fromDate={new Date()}
                      toDate={endDate ?? undefined}
                      className="scale-95 origin-top-left"
                      initialFocus
                    />
                  </Popover.Panel>
                </Popover>
              </div>

              {/* End Date */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">End Date</label>
                <Popover className="relative w-full">
                  <Popover.Button
                    className={clsx(
                      'w-full rounded-xl bg-white px-4 py-3 text-sm text-left flex items-center justify-between border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#eb1966] transition'
                    )}
                  >
                    <span className="text-gray-900">
                      {milestone.endDate ? format(milestone.endDate, 'PPP') : 'Pick a date'}
                    </span>
                    <Calendar size={16} className="text-gray-500" />
                  </Popover.Button>
                  <Popover.Panel className="absolute z-50 mt-2 bg-white rounded-xl p-4 shadow-xl border border-gray-200 max-h-96 overflow-visible">
                    <CalendarComponent
                      mode="single"
                      selected={milestone.endDate ?? undefined}
                      onSelect={(date) => updateMilestone(milestone.id, { endDate: date ?? null })}
                      fromDate={milestone.startDate ?? new Date()}
                      toDate={endDate ?? undefined}
                      className="scale-95 origin-top-left"
                      initialFocus
                    />
                  </Popover.Panel>
                </Popover>
              </div>
            </div>

            {/* Payment Information for Milestone-based projects */}
            {executionMethod === 'milestone' && milestonePaymentInfo && (
              <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Payment on completion:</span> ${milestonePaymentInfo.perMilestone.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Automatically calculated based on total budget ÷ number of milestones
                </div>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addMilestone}
          className="flex items-center gap-2 px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium"
        >
          <Plus size={16} />
          Add milestones / deliverables
        </button>
      </div>
    </div>
  );
}
