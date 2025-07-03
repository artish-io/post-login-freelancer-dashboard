'use client';

import { useEffect, useState, useRef, KeyboardEvent } from 'react';
import { Input } from '../../../ui/input';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface ProjectTypeSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
}

export default function ProjectTypeSelector({
  selectedTags,
  onChange,
  maxTags = 3,
}: ProjectTypeSelectorProps) {
  const [allTags, setAllTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/projects/project-types')
      .then((res) => res.json())
      .then((data) => {
        const flattened = Object.values(data).flat() as string[];
        setAllTags(flattened);
      });
  }, []);

  useEffect(() => {
    if (inputValue.trim() === '') {
      setSuggestions([]);
      return;
    }
    const lowercaseInput = inputValue.toLowerCase();
    const matches = allTags.filter(
      (tag) =>
        tag.toLowerCase().includes(lowercaseInput) &&
        !selectedTags.includes(tag)
    );
    setSuggestions(matches.slice(0, 5));
  }, [inputValue, allTags, selectedTags]);

  const saveCustomTag = async (tag: string) => {
    try {
      await fetch('/api/projects/project-types/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag,
          suggestedBy: 'anonymous', // TODO: Wire in session-based email if available
        }),
      });
    } catch (err) {
      console.warn('Failed to save custom tag:', err);
    }
  };

  const addTag = async (tag: string) => {
    if (selectedTags.length < maxTags && !selectedTags.includes(tag)) {
      onChange([...selectedTags, tag]);

      // Save if it’s custom (not in known tags)
      const isCustom = !allTags.some(
        (existing) => existing.toLowerCase() === tag.toLowerCase()
      );
      if (isCustom) await saveCustomTag(tag);
    }
    setInputValue('');
  };

  const removeTag = (tag: string) => {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === 'Tab') && inputValue.trim() !== '') {
      e.preventDefault();
      addTag(inputValue.trim());
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-xs text-gray-500 font-medium">
        PROJECT TYPE <span className="italic">(TAG UP TO 3 SKILLS)</span>
      </label>

      <div className="flex items-center flex-wrap gap-2 px-2 py-2 border border-gray-300 rounded-xl w-full max-w-[480px] bg-white">
        {selectedTags.map((tag) => (
          <div
            key={tag}
            className="flex items-center gap-1 bg-black text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm"
          >
            {tag}
            <button onClick={() => removeTag(tag)} className="ml-1">
              <X size={12} />
            </button>
          </div>
        ))}

        {selectedTags.length < maxTags && (
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add skill..."
            className="w-auto min-w-[100px] flex-1 border-none shadow-none focus:ring-0 focus:outline-none text-sm"
          />
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-1 w-full max-w-[480px] border border-gray-200 rounded-md shadow bg-white text-sm z-10 relative">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => addTag(suggestion)}
              className="w-full text-left px-3 py-1 hover:bg-gray-100"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}