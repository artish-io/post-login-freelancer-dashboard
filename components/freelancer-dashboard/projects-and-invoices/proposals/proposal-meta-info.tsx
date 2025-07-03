// components/freelancer-dashboard/projects-and-invoices/proposals/proposal-meta-info.tsx

'use client';

import ProposalClientSelector from './propoosal-client-selector';
import ProposalProjectNameInput from './proposal-project-name-input';
import ProjectTypeSelector from './project-type-selector';

interface Props {
  selectedContact: any;
  onSelectContact: (contact: any) => void;
  projectName: string;
  onChangeProjectName: (val: string) => void;
  typeTags: string[];
  onChangeTypeTags: (tags: string[]) => void;
}

export default function ProposalMetaInfo({
  selectedContact,
  onSelectContact,
  projectName,
  onChangeProjectName,
  typeTags,
  onChangeTypeTags,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      <ProposalClientSelector selectedContact={selectedContact} onSelect={onSelectContact} />
      <ProposalProjectNameInput value={projectName} onChange={onChangeProjectName} />
      <ProjectTypeSelector selectedTags={typeTags} onChange={onChangeTypeTags} />
    </div>
  );
}