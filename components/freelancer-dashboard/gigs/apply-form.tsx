'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface ApplyFormProps {
  gig: any;
  organization: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ApplyForm({ gig, organization, onSuccess, onCancel }: ApplyFormProps) {
  const { data: session } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [pitch, setPitch] = useState('');
  const [sampleLinks, setSampleLinks] = useState<string[]>(['']);
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');

  // Pre-select required tools when gig data loads
  useEffect(() => {
    if (gig?.toolsRequired) {
      setSelectedTools(gig.toolsRequired);
    }
  }, [gig]);

  const addSampleLink = () => {
    setSampleLinks([...sampleLinks, '']);
  };

  const updateSampleLink = (index: number, value: string) => {
    const updated = [...sampleLinks];
    updated[index] = value;
    setSampleLinks(updated);
  };

  const removeSampleLink = (index: number) => {
    setSampleLinks(sampleLinks.filter((_, i) => i !== index));
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
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
        gigId: gig.id,
        freelancerId: Number(session.user.id),
        pitch: pitch.trim(),
        sampleLinks: sampleLinks.filter(link => link.trim()),
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
        throw new Error(result.error || `Server error: ${res.status}`);
      }

      // Success
      alert('Application submitted successfully!');
      onSuccess?.();
      
      // Reset form
      setPitch('');
      setSampleLinks(['']);
      setSkills([]);
      setSelectedTools([]);
      setNewSkill('');
    } catch (err) {
      console.error('Application submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
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
                type="url"
                value={link}
                onChange={(e) => updateSampleLink(index, e.target.value)}
                placeholder="https://example.com"
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
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Add a skill"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
            />
            <button
              type="button"
              onClick={addSkill}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Add
            </button>
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
        {gig?.toolsRequired && gig.toolsRequired.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Tools & Technologies
            </label>
            <div className="space-y-2">
              {gig.toolsRequired.map((tool: string) => (
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
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
