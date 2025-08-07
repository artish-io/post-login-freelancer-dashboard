'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useErrorToast, useSuccessToast } from '@/components/ui/toast';


interface ApplyModalProps {
  gigId: number;
  gigTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Gig = {
  id: number;
  title: string;
  toolsRequired?: string[];
  tags?: string[];
  category?: string;
};

export default function ApplyModal({ gigId, gigTitle, isOpen, onClose, onSuccess }: ApplyModalProps) {
  const { data: session } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gigData, setGigData] = useState<Gig | null>(null);
  const showErrorToast = useErrorToast();
  const showSuccessToast = useSuccessToast();

  // Form fields
  const [pitch, setPitch] = useState('');
  const [sampleLinks, setSampleLinks] = useState<string[]>(['']);
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');

  // Autosuggestion state
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const skillInputRef = useRef<HTMLInputElement>(null);
  const [gigCategories, setGigCategories] = useState<any[]>([]);

  // Load gig categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        // Try to fetch from API first
        const response = await fetch('/data/gigs/gig-categories.json');
        if (response.ok) {
          const data = await response.json();
          setGigCategories(data);
        }
      } catch (error) {
        console.error('Failed to load gig categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Fetch gig data when modal opens
  useEffect(() => {
    if (isOpen && gigId) {
      const fetchGigData = async () => {
        try {
          const res = await fetch(`/api/gigs/${gigId}`);
          if (res.ok) {
            const data = await res.json();
            setGigData(data);

            // Pre-select required tools
            if (data.toolsRequired) {
              setSelectedTools(data.toolsRequired);
            }
          }
        } catch (error) {
          console.error('Failed to fetch gig data:', error);
        }
      };

      fetchGigData();
    }
  }, [isOpen, gigId]);



  const addSampleLink = () => {
    setSampleLinks([...sampleLinks, '']);
  };

  const updateSampleLink = (index: number, value: string) => {
    const updated = [...sampleLinks];
    updated[index] = value;
    setSampleLinks(updated);
  };

  const handleSampleLinkBlur = (index: number, value: string) => {
    // Auto-format URL when user leaves the field
    const formattedUrl = validateAndFormatUrl(value);
    if (formattedUrl !== value) {
      updateSampleLink(index, formattedUrl);
    }
  };

  const removeSampleLink = (index: number) => {
    setSampleLinks(sampleLinks.filter((_, i) => i !== index));
  };

  // Enhanced fuzzy matching function with natural language support
  const fuzzyMatch = (query: string, target: string): boolean => {
    // Normalize both strings by removing special characters and converting to lowercase
    const normalizeString = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    const queryNormalized = normalizeString(query);
    const targetNormalized = normalizeString(target);
    const queryLower = query.toLowerCase();
    const targetLower = target.toLowerCase();

    // Direct substring match (highest priority)
    if (targetLower.includes(queryLower)) {
      return true;
    }

    // Normalized substring match
    if (targetNormalized.includes(queryNormalized)) {
      return true;
    }

    // Split query into individual keywords and check if all are present
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 1);
    if (queryWords.length > 1) {
      const allWordsMatch = queryWords.every(word =>
        targetLower.includes(word) || targetNormalized.includes(normalizeString(word))
      );
      if (allWordsMatch) {
        return true;
      }
    }

    // Partial word matching for single words
    if (queryWords.length === 1 && queryWords[0].length >= 3) {
      const queryWord = queryWords[0];
      const targetWords = targetLower.split(/\s+/);
      return targetWords.some(targetWord =>
        targetWord.startsWith(queryWord) ||
        targetWord.includes(queryWord) ||
        normalizeString(targetWord).includes(normalizeString(queryWord))
      );
    }

    // Character-based fuzzy match (lowest priority, for very short queries)
    if (queryNormalized.length <= 3) {
      return queryNormalized.split('').every(char => targetNormalized.includes(char));
    }

    return false;
  };

  // Enhanced skill suggestions with natural language support
  const getSkillSuggestions = (query: string): string[] => {
    if (!query.trim() || query.length < 2) return [];

    const suggestions: string[] = [];
    const queryLower = query.toLowerCase();

    gigCategories.forEach((category: any) => {
      // Add category name if it matches
      if (fuzzyMatch(query, category.label)) {
        suggestions.push(category.label);
      }

      // Add subcategory names if they match
      category.subcategories?.forEach((sub: any) => {
        const subName = typeof sub === 'string' ? sub : sub.name;
        if (fuzzyMatch(query, subName)) {
          suggestions.push(subName);
        }
      });
    });

    // Handle common synonyms and variations
    const synonymMap: { [key: string]: string[] } = {
      'frontend': ['Frontend Development', 'UI/UX Design', 'Web Development'],
      'backend': ['Backend Development', 'Web Development'],
      'fullstack': ['Web Development', 'Frontend Development', 'Backend Development'],
      'full stack': ['Web Development', 'Frontend Development', 'Backend Development'],
      'react': ['Frontend Development', 'Web Development'],
      'javascript': ['Frontend Development', 'Web Development'],
      'js': ['Frontend Development', 'Web Development'],
      'node': ['Backend Development', 'Web Development'],
      'nodejs': ['Backend Development', 'Web Development'],
      'python': ['Backend Development', 'Web Development'],
      'design': ['UI/UX Design', 'Graphic Design', 'Brand Design', 'Product Design'],
      'ui': ['UI/UX Design', 'Mobile Design'],
      'ux': ['UI/UX Design', 'User Research'],
      'video': ['Video Editing', 'Motion Graphics', 'Animation'],
      'editing': ['Video Editing', 'Audio Editing'],
      'marketing': ['Social Media Marketing', 'Email Marketing', 'Campaign Strategy'],
      'social': ['Social Media Marketing', 'Community Management'],
      'content': ['Content Writing', 'Social Media Marketing'],
      'writing': ['Content Writing', 'Copywriting', 'Technical Writing'],
      'copy': ['Copywriting', 'Content Writing'],
      'dev': ['Web Development', 'Frontend Development', 'Backend Development'],
      'development': ['Web Development', 'Frontend Development', 'Backend Development'],
      'mobile': ['Mobile Design', 'Frontend Development'],
      'app': ['Mobile Design', 'Frontend Development', 'Product Design'],
      'blockchain': ['Blockchain Development', 'Smart Contracts'],
      'crypto': ['Blockchain Development', 'Smart Contracts'],
      'ai': ['AI Training', 'Data Annotation'],
      'ml': ['AI Training', 'Data Annotation'],
      'data': ['Data Visualization', 'Data Annotation', 'ETL'],
      'analytics': ['Data Visualization', 'Market Research'],
      'research': ['Market Research', 'User Research'],
      'event': ['Event Marketing', 'Virtual Events', 'Corporate Events'],
      'audio': ['Audio Editing', 'Podcast Production', 'Voice-Over'],
      'podcast': ['Podcast Production', 'Audio Editing'],
      'voice': ['Voice-Over', 'Audio Editing'],
      'animation': ['Animation', 'Motion Graphics'],
      'motion': ['Motion Graphics', 'Animation'],
      '3d': ['3D Design', 'Animation'],
      'brand': ['Brand Design', 'Graphic Design'],
      'logo': ['Brand Design', 'Graphic Design'],
      'presentation': ['Presentation Design', 'Graphic Design'],
      'slides': ['Presentation Design'],
      'accounting': ['Freelancer Invoicing', 'Project Budgeting', 'Bookkeeping'],
      'invoice': ['Freelancer Invoicing', 'Bookkeeping'],
      'budget': ['Project Budgeting', 'Bookkeeping'],
      'devops': ['DevOps', 'Backend Development'],
      'infrastructure': ['DevOps', 'Backend Development'],
      'strategy': ['Product Strategy', 'Campaign Strategy', 'Influencer Strategy'],
      'prototype': ['Prototyping', 'Product Design'],
      'testing': ['User Testing', 'Product Strategy'],
      'consulting': ['Consulting Services']
    };

    // Add synonym-based suggestions
    Object.entries(synonymMap).forEach(([synonym, relatedSkills]) => {
      if (queryLower.includes(synonym) || synonym.includes(queryLower)) {
        relatedSkills.forEach(skill => {
          if (!suggestions.includes(skill)) {
            suggestions.push(skill);
          }
        });
      }
    });

    // Filter out already selected skills, remove duplicates, and limit to 8 for better coverage
    return [...new Set(suggestions)]
      .filter(suggestion => !skills.includes(suggestion))
      .slice(0, 8);
  };

  // Handle skill input change
  const handleSkillInputChange = (value: string) => {
    setNewSkill(value);
    const suggestions = getSkillSuggestions(value);
    setSkillSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
    setSelectedSuggestionIndex(-1);
  };

  // Handle keyboard navigation
  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev < skillSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0) {
        addSkillFromSuggestion(skillSuggestions[selectedSuggestionIndex]);
      } else {
        addSkill();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const addSkillFromSuggestion = (skill: string) => {
    if (!skills.includes(skill)) {
      setSkills([...skills, skill]);
      setNewSkill('');
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // URL validation helper
  const validateAndFormatUrl = (url: string): string => {
    if (!url.trim()) return url;

    const trimmedUrl = url.trim();

    // Check if URL already has a protocol
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      return trimmedUrl;
    }

    // Check if it looks like a valid domain (contains at least one dot)
    if (trimmedUrl.includes('.') && !trimmedUrl.includes(' ')) {
      return `https://${trimmedUrl}`;
    }

    return trimmedUrl; // Return as-is if it doesn't look like a URL
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const toggleTool = (tool: string) => {
    if (selectedTools.includes(tool)) {
      setSelectedTools(selectedTools.filter(t => t !== tool));
    } else {
      setSelectedTools([...selectedTools, tool]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.id) {
      setError('Please log in to submit an application');
      return;
    }

    if (!pitch.trim()) {
      setError('Please provide a pitch for your application');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const applicationData = {
        gigId,
        freelancerId: Number(session.user.id),
        pitch: pitch.trim(),
        sampleLinks: sampleLinks
          .filter(link => link.trim())
          .map(link => validateAndFormatUrl(link)),
        skills,
        tools: selectedTools,
      };

      console.log('🚀 Submitting application:', applicationData);

      const res = await fetch('/api/gigs/gig-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationData),
      });

      const result = await res.json();
      console.log('📡 API Response:', result);

      if (!res.ok) {
        // Handle specific error cases
        if (res.status === 409 && result.error?.includes('no longer accepting applications')) {
          showErrorToast('Gig Unavailable', 'This gig is no longer accepting applications.');
          onClose(); // Close the modal
          return;
        }
        throw new Error(result.error || `Server error: ${res.status}`);
      }

      // Success
      showSuccessToast('Your application was sent successfully.');
      onSuccess?.();
      onClose();
      
      // Reset form
      setPitch('');
      setSampleLinks(['']);
      setSkills([]);
      setSelectedTools([]);
      setNewSkill('');
    } catch (err) {
      console.error('Application submission error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit application';
      showErrorToast('Submission Failed', errorMessage);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Apply for {gigTitle}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <span className="sr-only">Close</span>
              ✕
            </button>
          </div>
        </div>

        <div className="p-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pitch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Pitch *
              </label>
              <textarea
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                placeholder="Explain why you're the perfect fit for this gig..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                rows={4}
                required
              />
            </div>

            {/* Sample Links */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Portfolio/Sample Links
              </label>
              {sampleLinks.map((link, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={link}
                    onChange={(e) => updateSampleLink(index, e.target.value)}
                    onBlur={(e) => handleSampleLinkBlur(index, e.target.value)}
                    placeholder="example.com or https://example.com"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  {sampleLinks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSampleLink(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addSampleLink}
                className="text-pink-600 hover:text-pink-700 text-sm"
              >
                + Add another link
              </button>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relevant Skills
              </label>
              <div className="relative">
                <div className="flex gap-2 mb-2">
                  <input
                    ref={skillInputRef}
                    type="text"
                    value={newSkill}
                    onChange={(e) => handleSkillInputChange(e.target.value)}
                    placeholder="Add a skill (type to see suggestions)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    onKeyDown={handleSkillKeyDown}
                    onFocus={() => {
                      if (skillSuggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding suggestions to allow clicking on them
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Add
                  </button>
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && skillSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {skillSuggestions.map((suggestion, index) => (
                      <button
                        key={suggestion}
                        type="button"
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                          index === selectedSuggestionIndex ? 'bg-pink-50 text-pink-700' : ''
                        }`}
                        onClick={() => addSkillFromSuggestion(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="text-pink-600 hover:text-pink-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Tools */}
            {gigData?.toolsRequired && gigData.toolsRequired.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Tools & Technologies
                </label>
                <div className="space-y-2">
                  {gigData.toolsRequired.map((tool) => (
                    <label key={tool} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTools.includes(tool)}
                        onChange={() => toggleTool(tool)}
                        className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                      />
                      <span className="text-sm text-gray-700">{tool}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Select the tools you're proficient with for this project
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={submitting || !pitch.trim()}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                  submitting || !pitch.trim()
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </div>
                ) : (
                  'Submit Application'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
