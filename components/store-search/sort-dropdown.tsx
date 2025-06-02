'use client';

import { useState, useRef, useEffect } from 'react';

type SortDropdownProps = {
  selected: string;
  onChange: (option: string) => void;
};

const options = ['Skill', 'Tools', 'Rates (Low to High)', 'Rates (High to Low)'];

export default function SortDropdown({ selected, onChange }: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleOptionClick = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  // Close dropdown if clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative text-sm" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-gray-100 border border-gray-300 px-4 py-2 rounded-lg shadow-sm flex justify-between items-center"
      >
        <span className="font-medium text-gray-700">{selected}</span>
        <span className="text-gray-500">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <ul className="absolute z-10 mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-md animate-fade-in">
          {options.map((option) => (
            <li
              key={option}
              onClick={() => handleOptionClick(option)}
              className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                selected === option ? 'bg-gray-200 font-semibold' : ''
              }`}
            >
              {option}
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.15s ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}