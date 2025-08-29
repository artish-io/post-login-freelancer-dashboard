'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface PlatformOption {
  value: string;
  label: string;
  domain?: string;
}

const platformOptions: PlatformOption[] = [
  { value: 'linkedin', label: 'LinkedIn', domain: 'linkedin.com' },
  { value: 'behance', label: 'Behance', domain: 'behance.net' },
  { value: 'dribbble', label: 'Dribbble', domain: 'dribbble.com' },
  { value: 'github', label: 'GitHub', domain: 'github.com' },
  { value: 'notion', label: 'Notion', domain: 'notion.so' },
  { value: 'googledocs', label: 'Google Docs', domain: 'docs.google.com' },
  { value: 'airtable', label: 'Airtable', domain: 'airtable.com' },
  { value: 'website', label: 'Personal Website' },
  { value: 'other', label: 'Other' },
];

interface PlatformDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export function detectPlatformFromUrl(url: string): string {
  if (!url) return 'other';
  
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    for (const option of platformOptions) {
      if (option.domain && hostname.includes(option.domain)) {
        return option.value;
      }
    }
    
    // Additional domain checks
    if (hostname.includes('github.io')) return 'github';
    if (hostname.includes('notion.site')) return 'notion';
    if (hostname.includes('behance.net')) return 'behance';
    
    return 'website';
  } catch {
    return 'other';
  }
}

export default function PlatformDropdown({
  value,
  onChange,
  placeholder = 'Select platform',
  disabled = false,
  'aria-label': ariaLabel,
}: PlatformDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = platformOptions.find(option => option.value === value);
  
  const filteredOptions = platformOptions.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        if (!isOpen) {
          e.preventDefault();
          setIsOpen(true);
        } else if (focusedIndex >= 0) {
          e.preventDefault();
          onChange(filteredOptions[focusedIndex].value);
          setIsOpen(false);
          setSearchTerm('');
          setFocusedIndex(-1);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
        }
        break;
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(filteredOptions.length - 1);
        break;
      case 'Enter':
        if (focusedIndex >= 0) {
          e.preventDefault();
          onChange(filteredOptions[focusedIndex].value);
          setIsOpen(false);
          setSearchTerm('');
          setFocusedIndex(-1);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        break;
    }
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`w-full px-3 py-2 text-left bg-white border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-[#eb1966] transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg">
          <div className="p-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search platforms..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-0 focus:border-[#eb1966] transition-colors"
            />
          </div>
          
          <ul role="listbox" className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => handleOptionClick(option.value)}
                  className={`px-3 py-2 cursor-pointer flex items-center justify-between ${
                    index === focusedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
                  } ${option.value === value ? 'bg-[#FCD5E3] text-[#eb1966]' : 'text-gray-900'}`}
                >
                  <span>{option.label}</span>
                  {option.value === value && (
                    <Check className="w-4 h-4 text-[#eb1966]" />
                  )}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-gray-500 text-sm">
                No platforms found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
