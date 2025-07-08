'use client';

import React, { useState, useEffect } from 'react';
import gigCategories from '../../../data/gigs/gig-categories.json';
import gigs from '../../../data/gigs/gigs.json';
import organizations from '../../../data/organizations.json';
import { useParams } from 'next/navigation';
import { Paperclip } from 'lucide-react';

interface ApplyProps {
  gig?: any;
  organization?: any;
}

const Apply: React.FC<ApplyProps> = ({ gig: propGig, organization: propOrganization }) => {
  const [skills, setSkills] = useState<string[]>([]);
  const [pitch, setPitch] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [currentLink, setCurrentLink] = useState('');
  const [toolFamiliarity, setToolFamiliarity] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const params = useParams();
  const gigId = params?.id;

  // Use props if provided (modal context), otherwise use URL params (standalone page)
  const selectedGig = propGig || gigs.find((gig) => gig.id === Number(gigId));
  const organization = propOrganization || (selectedGig
    ? organizations.find((org) => org.id === selectedGig.organizationId)
    : null);

  const allSubcategories = gigCategories.reduce<string[]>((acc, category) => {
    return acc.concat(category.subcategories);
  }, []);

  useEffect(() => {
    if (inputValue.trim() === '') {
      setSuggestions([]);
      return;
    }
    const filtered = allSubcategories.filter(
      (subcat) =>
        subcat.toLowerCase().includes(inputValue.toLowerCase()) &&
        !skills.includes(subcat)
    );
    setSuggestions(filtered);
  }, [inputValue, skills]);

  const handleSubmit = async () => {
    const payload = {
      pitch,
      links,
      skills,
      tools: toolFamiliarity,
    };

    try {
      const res = await fetch(`/api/gigs/${gigId}/submit-application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to submit application');
      }

      alert('Application submitted!');
    } catch (error) {
      console.error(error);
      alert('Error submitting application');
    }
  };

  const tools = selectedGig?.toolsRequired || [];

  console.log('🔧 Debug Apply component:');
  console.log('📋 gigId:', gigId);
  console.log('🎯 selectedGig:', selectedGig);
  console.log('🏢 organization:', organization);
  console.log('🛠️ tools:', tools);

  return (
    <div className="flex flex-col gap-4 text-sm text-gray-900 w-full max-w-3xl">{/* Removed px-4 pb-10 since modal handles padding */}
      <textarea
        placeholder="Short quick pitch about why you’d be perfect for this project"
        value={pitch}
        onChange={(e) => setPitch(e.target.value)}
        maxLength={600}
        rows={4}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black resize-none"
      />
      <div className="relative">
        <input
          type="text"
          placeholder="Links to similar / sample projects (3 max)"
          value={currentLink}
          onChange={(e) => setCurrentLink(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          type="button"
          onClick={() => {
            if (currentLink && !links.includes(currentLink) && links.length < 3) {
              setLinks([...links, currentLink]);
              setCurrentLink('');
            }
          }}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-black"
        >
          <Paperclip size={18} />
        </button>
      </div>
      {links.length > 0 && (
        <ul className="list-disc list-inside text-sm text-gray-700 pl-1">
          {links.map((link, idx) => (
            <li key={idx}>{link}</li>
          ))}
        </ul>
      )}
      <input
        type="text"
        placeholder="Tag your skills that are relevant to this project"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && inputValue.trim() !== '') {
            e.preventDefault();
            if (!skills.includes(inputValue.trim())) {
              setSkills([...skills, inputValue.trim()]);
              setInputValue('');
            }
          }
        }}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
      />
      {suggestions.length > 0 && (
        <ul className="border border-gray-300 rounded-lg mt-1 text-sm bg-white shadow-sm">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                if (!skills.includes(suggestion)) {
                  setSkills([...skills, suggestion]);
                  setInputValue('');
                }
              }}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill}
            className="bg-black text-white px-3 py-1 rounded-full text-xs flex items-center gap-1"
          >
            {skill}
            <button onClick={() => setSkills(skills.filter((s) => s !== skill))}>×</button>
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm font-medium">Which of these tools are you familiar with?</p>
      <div className="flex flex-wrap gap-3">
        {tools.length > 0 ? (
          tools.map((tool: string) => (
            <button
              key={tool}
              onClick={() =>
                setToolFamiliarity((prev) =>
                  prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
                )
              }
              className={`border px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-colors ${
                toolFamiliarity.includes(tool)
                  ? 'bg-black text-white border-black'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <span className={`w-3 h-3 border rounded-sm flex items-center justify-center ${
                toolFamiliarity.includes(tool) ? 'bg-white border-white' : 'border-gray-400'
              }`}>
                {toolFamiliarity.includes(tool) && <span className="text-black text-xs">✓</span>}
              </span>
              {tool}
            </button>
          ))
        ) : (
          <p className="text-gray-500 text-sm">No specific tools required for this gig.</p>
        )}
      </div>
      <button
        onClick={handleSubmit}
        className="mt-6 bg-white border border-black text-black px-6 py-3 rounded-xl hover:bg-black hover:text-white transition-all text-sm self-center"
      >
        Submit Application
      </button>
    </div>
  );
};

export default Apply;