'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Calendar, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Popover } from '@headlessui/react';
import { Calendar as CalendarComponent } from '../../ui/calendar';
import { format, differenceInDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { useSuccessToast } from '../../ui/toast';
import gigCategories from '../../../data/gigs/gig-categories.json';
import gigTools from '../../../data/gigs/gig-tools.json';

interface Milestone {
  id: string;
  title: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
}

type ExecutionMethod = 'completion' | 'milestone';

interface GigRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  freelancer: {
    id: number;
    userId: number;
    name: string;
    title: string;
    avatar: string;
    category: string;
    skills?: string[];
    tools?: string[];
  } | null;
}

export default function GigRequestModal({ isOpen, onClose, freelancer }: GigRequestModalProps) {
  const { data: session } = useSession();
  const showSuccessToast = useSuccessToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    projectType: '',
    specialization: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    duration: 0 as number,
    executionMethod: 'completion' as ExecutionMethod,
    projectDescription: '',
    skills: [] as string[],
    tools: [] as string[],
    milestones: [] as Milestone[],
    budgetMin: '',
    budgetMax: '',
    deliveryTimeWeeks: 0
  });

  // State for dropdowns and inputs
  const [showProjectTypeDropdown, setShowProjectTypeDropdown] = useState(false);
  const [showSpecializationDropdown, setShowSpecializationDropdown] = useState(false);
  const [showExecutionMethodDropdown, setShowExecutionMethodDropdown] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [toolInput, setToolInput] = useState('');
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
  const [toolSuggestions, setToolSuggestions] = useState<string[]>([]);
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const [showToolSuggestions, setShowToolSuggestions] = useState(false);

  // Extract all available skills and tools for fuzzy matching
  const allSkills = gigCategories.flatMap(cat => [
    cat.label,
    ...cat.subcategories.map(sub => typeof sub === 'string' ? sub : sub.name)
  ]);

  const allTools = gigTools.flatMap(cat =>
    cat.tools.map(tool => typeof tool === 'string' ? tool : tool.name)
  );

  // Get available specializations for selected project type
  const getSpecializations = () => {
    const category = gigCategories.find(cat => cat.label === formData.projectType);
    return category ? category.subcategories.map(sub => typeof sub === 'string' ? sub : sub.name) : [];
  };

  // Fuzzy matching function for skills and tools
  const fuzzyMatch = (input: string, items: string[]) => {
    if (!input.trim()) return [];
    const lowercaseInput = input.toLowerCase();
    return items.filter(item =>
      item.toLowerCase().includes(lowercaseInput) ||
      lowercaseInput.split(' ').some(word => item.toLowerCase().includes(word))
    ).slice(0, 10);
  };

  // Handle skill input changes
  const handleSkillInputChange = (value: string) => {
    setSkillInput(value);
    if (value.trim()) {
      const suggestions = fuzzyMatch(value, allSkills.filter(skill => !formData.skills.includes(skill)));
      setSkillSuggestions(suggestions);
      setShowSkillSuggestions(suggestions.length > 0);
    } else {
      setShowSkillSuggestions(false);
    }
  };

  // Handle tool input changes
  const handleToolInputChange = (value: string) => {
    setToolInput(value);
    if (value.trim()) {
      const suggestions = fuzzyMatch(value, allTools.filter(tool => !formData.tools.includes(tool)));
      setToolSuggestions(suggestions);
      setShowToolSuggestions(suggestions.length > 0);
    } else {
      setShowToolSuggestions(false);
    }
  };

  // Add skill from suggestion or input
  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, skill] }));
      setSkillInput('');
      setShowSkillSuggestions(false);
    }
  };

  // Add tool from suggestion or input
  const addTool = (tool: string) => {
    if (tool && !formData.tools.includes(tool)) {
      setFormData(prev => ({ ...prev, tools: [...prev.tools, tool] }));
      setToolInput('');
      setShowToolSuggestions(false);
    }
  };

  // Remove skill
  const removeSkill = (skill: string) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  // Remove tool
  const removeTool = (tool: string) => {
    setFormData(prev => ({ ...prev, tools: prev.tools.filter(t => t !== tool) }));
  };

  // Auto-calculate duration when both dates are selected
  const calculateDuration = (startDate: Date | null, endDate: Date | null): number => {
    if (!startDate || !endDate) return 0;
    return differenceInDays(endDate, startDate);
  };

  // Handle start date selection with auto-calculation
  const handleStartDateSelect = (date: Date | null) => {
    const newDuration = calculateDuration(date, formData.endDate);
    const newDeliveryTimeWeeks = Math.ceil(newDuration / 7); // Convert days to weeks
    setFormData(prev => ({
      ...prev,
      startDate: date,
      duration: newDuration,
      deliveryTimeWeeks: newDeliveryTimeWeeks
    }));
  };

  // Handle end date selection with auto-calculation
  const handleEndDateSelect = (date: Date | null) => {
    const newDuration = calculateDuration(formData.startDate, date);
    const newDeliveryTimeWeeks = Math.ceil(newDuration / 7); // Convert days to weeks
    setFormData(prev => ({
      ...prev,
      endDate: date,
      duration: newDuration,
      deliveryTimeWeeks: newDeliveryTimeWeeks
    }));
  };

  // Milestone management functions
  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: uuidv4(),
      title: '',
      description: '',
      startDate: null,
      endDate: null,
    };
    setFormData(prev => ({ ...prev, milestones: [...prev.milestones, newMilestone] }));
  };

  const updateMilestone = (id: string, updates: Partial<Milestone>) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => m.id === id ? { ...m, ...updates } : m)
    }));
  };

  const removeMilestone = (id: string) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter(m => m.id !== id)
    }));
  };

  // Form validation
  const isFormValid = () => {
    return (
      formData.title.trim().length > 0 &&
      formData.projectType.trim().length > 0 &&
      formData.specialization.trim().length > 0 &&
      formData.startDate !== null &&
      formData.endDate !== null &&
      formData.projectDescription.trim().length > 0 &&
      formData.milestones.length > 0 &&
      formData.milestones.every(m =>
        m.title.trim().length > 0 &&
        m.description.trim().length > 0
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freelancer || !session?.user?.id || !isFormValid()) return;

    setLoading(true);
    try {
      // Get commissioner's organization
      const organizationsResponse = await fetch('/api/organizations');
      const organizations = await organizationsResponse.json();
      const commissionerOrganization = organizations.find((org: any) => org.contactPersonId === parseInt(session.user.id));

      const organizationId = commissionerOrganization?.id || null;

      const response = await fetch('/api/gigs/gig-requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          freelancerId: freelancer.id,
          commissionerId: parseInt(session.user.id),
          organizationId: organizationId,
          title: formData.title,
          projectType: formData.projectType,
          specialization: formData.specialization,
          startDate: formData.startDate?.toISOString(),
          endDate: formData.endDate?.toISOString(),
          executionMethod: formData.executionMethod,
          projectDescription: formData.projectDescription,
          notes: formData.projectDescription, // Use project description as notes
          skills: formData.skills,
          tools: formData.tools,
          milestones: formData.milestones,
          budget: formData.budgetMin && formData.budgetMax ? {
            min: parseInt(formData.budgetMin),
            max: parseInt(formData.budgetMax),
            currency: 'USD'
          } : undefined,
          deliveryTimeWeeks: formData.deliveryTimeWeeks > 0 ? formData.deliveryTimeWeeks : undefined
        }),
      });

      if (response.ok) {
        // Success - close modal and reset form
        onClose();
        setFormData({
          title: '',
          projectType: '',
          specialization: '',
          startDate: null,
          endDate: null,
          duration: 0,
          executionMethod: 'completion',
          projectDescription: '',
          skills: [],
          tools: [],
          milestones: [],
          budgetMin: '',
          budgetMax: '',
          deliveryTimeWeeks: 0
        });
        // Show success toast
        showSuccessToast('Request Sent', 'Your gig request was successfully delivered.');
      } else {
        console.error('Failed to create gig request');
        // You could add an error toast here
      }
    } catch (error) {
      console.error('Error creating gig request:', error);
    } finally {
      setLoading(false);
    }
  };



  if (!isOpen || !freelancer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Send Gig Request</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Freelancer Info */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <Image
              src={freelancer.avatar}
              alt={freelancer.name}
              width={48}
              height={48}
              className="rounded-full"
            />
            <div>
              <h3 className="font-medium text-gray-900">{freelancer.name}</h3>
              <p className="text-sm text-gray-600">{freelancer.title}</p>
              <p className="text-xs text-gray-500">{freelancer.category}</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent"
                placeholder="Enter project title"
              />
            </div>

            {/* Project Type */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Type *
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProjectTypeDropdown(!showProjectTypeDropdown)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent text-left flex items-center justify-between"
                >
                  <span className={formData.projectType ? 'text-gray-900' : 'text-gray-500'}>
                    {formData.projectType || 'Select project type'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {showProjectTypeDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {gigCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, projectType: category.label, specialization: '' }));
                          setShowProjectTypeDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Specialization */}
            {formData.projectType && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialization *
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSpecializationDropdown(!showSpecializationDropdown)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent text-left flex items-center justify-between"
                  >
                    <span className={formData.specialization ? 'text-gray-900' : 'text-gray-500'}>
                      {formData.specialization || 'Select specialization'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {showSpecializationDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {getSpecializations().map((specialization) => (
                        <button
                          key={specialization}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, specialization }));
                            setShowSpecializationDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                        >
                          {specialization}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <Popover className="relative">
                <Popover.Button className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent text-left flex items-center justify-between">
                  <span className={formData.startDate ? 'text-gray-900' : 'text-gray-500'}>
                    {formData.startDate ? format(formData.startDate, 'PPP') : 'Select start date'}
                  </span>
                  <Calendar className="w-4 h-4 text-gray-400" />
                </Popover.Button>
                <Popover.Panel className="absolute z-10 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                  <CalendarComponent
                    mode="single"
                    selected={formData.startDate || undefined}
                    onSelect={(date) => handleStartDateSelect(date || null)}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </Popover.Panel>
              </Popover>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <Popover className="relative">
                <Popover.Button className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent text-left flex items-center justify-between">
                  <span className={formData.endDate ? 'text-gray-900' : 'text-gray-500'}>
                    {formData.endDate ? format(formData.endDate, 'PPP') : 'Select end date'}
                  </span>
                  <Calendar className="w-4 h-4 text-gray-400" />
                </Popover.Button>
                <Popover.Panel className="absolute z-10 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                  <CalendarComponent
                    mode="single"
                    selected={formData.endDate || undefined}
                    onSelect={(date) => handleEndDateSelect(date || null)}
                    disabled={(date) => date < (formData.startDate || new Date())}
                    initialFocus
                  />
                </Popover.Panel>
              </Popover>
            </div>

            {/* Project Duration (Auto-calculated) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Duration (Days)
              </label>
              <input
                type="text"
                value={formData.duration > 0 ? `${formData.duration} days` : 'Select start and end dates'}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                placeholder="Auto-calculated from dates"
              />
            </div>

            {/* Invoice Execution Mode */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Execution Mode *
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExecutionMethodDropdown(!showExecutionMethodDropdown)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent text-left flex items-center justify-between"
                >
                  <span className="text-gray-900">
                    {formData.executionMethod === 'milestone' ? 'Milestone-based' : 'Completion-based'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {showExecutionMethodDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, executionMethod: 'completion' }));
                        setShowExecutionMethodDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                    >
                      Completion-based
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, executionMethod: 'milestone' }));
                        setShowExecutionMethodDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                    >
                      Milestone-based
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Project Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Summary / Description *
              </label>
              <textarea
                required
                rows={4}
                value={formData.projectDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, projectDescription: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent"
                placeholder="Describe your project requirements and objectives"
              />
            </div>

            {/* Milestones / Deliverables */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Milestones / Deliverables</h3>
              </div>

              {formData.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="border border-gray-300 rounded-2xl p-6 bg-white mb-4 relative"
                >
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeMilestone(milestone.id)}
                    className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition p-1 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={18} />
                  </button>

                  {/* Milestone Title */}
                  <div className="mb-4 pr-12">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Milestone Title *
                    </label>
                    <input
                      type="text"
                      value={milestone.title}
                      onChange={(e) => updateMilestone(milestone.id, { title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent"
                      placeholder="Enter milestone title"
                      required
                    />
                  </div>

                  {/* Milestone Description */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      rows={3}
                      value={milestone.description}
                      onChange={(e) => updateMilestone(milestone.id, { description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent"
                      placeholder="Describe what will be delivered"
                      required
                    />
                  </div>

                  {/* Milestone Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <Popover className="relative">
                        <Popover.Button className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent text-left flex items-center justify-between">
                          <span className={milestone.startDate ? 'text-gray-900' : 'text-gray-500'}>
                            {milestone.startDate ? format(milestone.startDate, 'PPP') : 'Select date'}
                          </span>
                          <Calendar className="w-4 h-4 text-gray-400" />
                        </Popover.Button>
                        <Popover.Panel className="absolute z-10 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                          <CalendarComponent
                            mode="single"
                            selected={milestone.startDate || undefined}
                            onSelect={(date) => updateMilestone(milestone.id, { startDate: date || null })}
                            disabled={(date) => date < (formData.startDate || new Date())}
                            initialFocus
                          />
                        </Popover.Panel>
                      </Popover>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <Popover className="relative">
                        <Popover.Button className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent text-left flex items-center justify-between">
                          <span className={milestone.endDate ? 'text-gray-900' : 'text-gray-500'}>
                            {milestone.endDate ? format(milestone.endDate, 'PPP') : 'Select date'}
                          </span>
                          <Calendar className="w-4 h-4 text-gray-400" />
                        </Popover.Button>
                        <Popover.Panel className="absolute z-10 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                          <CalendarComponent
                            mode="single"
                            selected={milestone.endDate || undefined}
                            onSelect={(date) => updateMilestone(milestone.id, { endDate: date || null })}
                            disabled={(date) => date < (milestone.startDate || formData.startDate || new Date()) || date > (formData.endDate || new Date('2030-12-31'))}
                            initialFocus
                          />
                        </Popover.Panel>
                      </Popover>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addMilestone}
                className="flex items-center gap-2 px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium"
              >
                <Plus size={16} />
                Add milestone / deliverable
              </button>
            </div>

            {/* Budget Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Budget ($)
                </label>
                <input
                  type="number"
                  value={formData.budgetMin}
                  onChange={(e) => setFormData(prev => ({ ...prev, budgetMin: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent"
                  placeholder="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Budget ($)
                </label>
                <input
                  type="number"
                  value={formData.budgetMax}
                  onChange={(e) => setFormData(prev => ({ ...prev, budgetMax: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent"
                  placeholder="5000"
                />
              </div>
            </div>

            {/* Delivery Time (Auto-calculated) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Time (Weeks)
              </label>
              <input
                type="text"
                value={formData.deliveryTimeWeeks > 0 ? `${formData.deliveryTimeWeeks} weeks` : 'Select start and end dates'}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                placeholder="Auto-calculated from dates"
              />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Skills
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => handleSkillInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && skillInput.trim()) {
                      e.preventDefault();
                      addSkill(skillInput.trim());
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent"
                  placeholder="Type to search and add skills..."
                />
                {showSkillSuggestions && skillSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {skillSuggestions.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => addSkill(skill)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#FCD5E3] text-gray-700 rounded-full text-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Tools */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Tools
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={toolInput}
                  onChange={(e) => handleToolInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && toolInput.trim()) {
                      e.preventDefault();
                      addTool(toolInput.trim());
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eb1966] focus:border-transparent"
                  placeholder="Type to search and add tools..."
                />
                {showToolSuggestions && toolSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {toolSuggestions.map((tool) => (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => addTool(tool)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        {tool}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {formData.tools.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tools.map((tool) => (
                    <span
                      key={tool}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#FCD5E3] text-gray-700 rounded-full text-sm"
                    >
                      {tool}
                      <button
                        type="button"
                        onClick={() => removeTool(tool)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !isFormValid()}
                className="flex-1 px-4 py-2 bg-[#eb1966] text-white rounded-lg hover:bg-[#d1175a] transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
