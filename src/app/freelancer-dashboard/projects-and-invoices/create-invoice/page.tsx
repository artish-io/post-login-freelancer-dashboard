'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';

import InvoiceHeader from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-header';
import InvoiceMetaSection from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-meta-section';
import ProjectSelectDropdown from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/project-select-dropdown';
import MilestoneListEditor from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/milestone-list-editor';
import AdditionalNotes from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/additional-notes';

export default function CreateInvoicePage() {
  const { data: session } = useSession();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [executionTiming, setExecutionTiming] = useState('');
  const [billTo, setBillTo] = useState('');
  const [notes, setNotes] = useState('');

  const [selectedProject, setSelectedProject] = useState<{
    projectId: number | null;
    title: string;
  }>({ projectId: null, title: '' });

  const [milestones, setMilestones] = useState([
    { id: Date.now(), title: '', description: '', rate: 0 },
  ]);

  const updateMilestone = (
    id: number,
    field: 'title' | 'description' | 'rate',
    value: string | number
  ) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const removeMilestone = (id: number) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const addMilestone = () => {
    const newId =
      milestones.length > 0
        ? Math.max(...milestones.map((m) => m.id)) + 1
        : Date.now();
    setMilestones([...milestones, { id: newId, title: '', description: '', rate: 0 }]);
  };

  const total = milestones.reduce((sum, m) => sum + Number(m.rate || 0), 0);

  const handleSendInvoice = async () => {
    try {
      const res = await fetch(
        '/api/freelancer-dashboard/projects-and-invoices/create-invoice',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceNumber,
            issueDate,
            executionTiming,
            billTo,
            project: selectedProject,
            milestones,
            total,
            notes,
            freelancerId: session?.user?.id,
          }),
        }
      );

      const result = await res.json();
      console.log('Invoice sent:', result);
    } catch (err) {
      console.error('Error sending invoice:', err);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 py-12 space-y-12">
      <InvoiceHeader onSend={handleSendInvoice} />

      <div className="bg-white rounded-xl border px-6 py-10 space-y-10">
        <InvoiceMetaSection
          invoiceNumber={invoiceNumber}
          onInvoiceNumberChange={setInvoiceNumber}
          issueDate={issueDate}
          onIssueDateChange={setIssueDate}
          executionTiming={executionTiming}
          onExecutionTimingChange={setExecutionTiming}
          billTo={billTo}
          onBillToChange={setBillTo}
        />

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 uppercase">Project Details</h4>
          {session?.user?.id && (
            <ProjectSelectDropdown
              freelancerId={Number(session.user.id)}
              selected={selectedProject}
              onChange={setSelectedProject}
            />
          )}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 uppercase">Billable Project Milestones</h4>
          <MilestoneListEditor
            milestones={milestones}
            onUpdate={updateMilestone}
            onRemove={removeMilestone}
            onAdd={addMilestone}
          />
        </div>

        <div className="text-right text-gray-800 font-semibold text-sm border-t pt-3">
          Total: ${total.toFixed(2)}
        </div>

        <AdditionalNotes value={notes} onChange={setNotes} />
      </div>
    </div>
  );
}