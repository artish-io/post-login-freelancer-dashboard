'use client';

import { useEffect, useState } from 'react';
import { RadioGroup } from '@headlessui/react';
import { Plus } from 'lucide-react';

// Types
interface ProjectOption {
  projectId: number;
  title: string;
}

interface Props {
  freelancerId: number;
  selected: { projectId: number | null; title: string };
  onChange: (selection: { projectId: number | null; title: string }) => void;
}

export default function ProjectSelectDropdown({ freelancerId, selected, onChange }: Props) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [customTitle, setCustomTitle] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`/api/dashboard/invoice-meta/projects?freelancerId=${freelancerId}`);
        const data = await res.json();
        setProjects(data);
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      }
    };
    fetchProjects();
  }, [freelancerId]);

  const options = [
    ...projects.map((p) => ({ id: p.projectId, title: `#${p.projectId} — ${p.title}` })),
    { id: null, title: '➕ Create custom project' },
  ];

  return (
    <div className="flex flex-col gap-2">
      <RadioGroup
        value={selected.projectId !== null ? selected.projectId : null}
        onChange={(val) => {
          const match = projects.find((p) => p.projectId === val);
          if (match) {
            onChange({ projectId: match.projectId, title: match.title });
          } else {
            onChange({ projectId: null, title: customTitle });
          }
        }}
      >
        <div className="flex flex-col border rounded-md divide-y">
          {options.map((option) => (
            <RadioGroup.Option key={option.id ?? 'custom'} value={option.id} className={({ checked }) => `px-4 py-3 text-sm cursor-pointer ${checked ? 'bg-gray-100' : ''}`}>
              {option.title}
            </RadioGroup.Option>
          ))}
        </div>
      </RadioGroup>

      {selected.projectId === null && (
        <input
          type="text"
          placeholder="Enter custom project title"
          value={customTitle}
          onChange={(e) => {
            setCustomTitle(e.target.value);
            onChange({ projectId: null, title: e.target.value });
          }}
          className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      )}
    </div>
  );
}