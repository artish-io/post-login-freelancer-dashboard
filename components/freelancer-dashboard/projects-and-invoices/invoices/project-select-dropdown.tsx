'use client';

import { useEffect, useState } from 'react';
import { RadioGroup } from '@headlessui/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ProjectSelectDropdownItem from './project-select-dropdown-item';

interface ProjectOption {
  projectId: number;
  title: string;
  hasAvailableMilestones?: boolean;
  availableTasksCount?: number;
}

interface Props {
  freelancerId: number;
  commissionerId?: number | null;
  selected: { projectId: number | null; title: string };
  onChange: (selection: { projectId: number | null; title: string }) => void;
}

export default function ProjectSelectDropdown({ freelancerId, commissionerId, selected, onChange }: Props) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    console.log('🔍 [Dropdown Mount] freelancerId:', freelancerId, 'commissionerId:', commissionerId);
    const fetchProjects = async () => {
      try {
        let url = `/api/dashboard/invoice-meta/projects?freelancerId=${freelancerId}`;
        if (commissionerId) {
          url += `&commissionerId=${commissionerId}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        console.log('✅ [Fetched Projects]:', data);
        setProjects(data);
      } catch (err) {
        console.error('❌ [Fetch Error] Failed to fetch projects:', err);
      }
    };
    fetchProjects();
  }, [freelancerId, commissionerId]);

  const options = [
    ...projects.map((p) => ({
      id: p.projectId,
      label: `#${p.projectId} — ${p.title}`,
      hasAvailableMilestones: p.hasAvailableMilestones,
      availableTasksCount: p.availableTasksCount,
      disabled: !p.hasAvailableMilestones
    })),
    { id: null, label: 'Create custom project', hasAvailableMilestones: true, availableTasksCount: 0, disabled: false },
  ];

  const selectedLabel = selected.projectId !== null
    ? `#${selected.projectId} — ${selected.title}`
    : selected.title || 'Select Project ID';

  const handleSelect = (id: number | null) => {
    const match = projects.find((p) => p.projectId === id);
    console.log('🟡 [Option Selected]:', id, match ?? customTitle);
    if (match) {
      onChange({ projectId: match.projectId, title: match.title });
    } else {
      onChange({ projectId: null, title: customTitle });
    }
    setIsOpen(false);
  };

  console.log('🔁 [Render] Selected:', selected, 'Dropdown open:', isOpen);

  return (
    <div className="relative w-full max-w-lg">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-pink-500"
      >
        {selectedLabel}
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-md max-h-64 overflow-y-auto">
          <RadioGroup value={selected.projectId} onChange={handleSelect}>
            <div className="flex flex-col divide-y">
              {options.map(({ id, label, disabled, hasAvailableMilestones, availableTasksCount }) => (
                <RadioGroup.Option key={id ?? 'custom'} value={id} disabled={disabled}>
                  {({ checked }) => (
                    <ProjectSelectDropdownItem
                      label={label}
                      checked={checked}
                      isCustom={id === null}
                      disabled={disabled}
                      hasAvailableMilestones={hasAvailableMilestones}
                      availableTasksCount={availableTasksCount}
                    />
                  )}
                </RadioGroup.Option>
              ))}
            </div>
          </RadioGroup>
        </div>
      )}

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