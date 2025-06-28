'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import InvoiceHeader from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-header';
import InvoiceMetaSection from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-meta-section';
import ProjectSelectDropdown from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/project-select-dropdown';
import MilestoneListEditor from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/milestone-list-editor';
import AdditionalNotes from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/additional-notes';

import PROJECTS from '../../../../../data/projects.json';

export default function CreateInvoicePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [executionTiming, setExecutionTiming] = useState('');
  const [billTo, setBillTo] = useState('');
  const [notes, setNotes] = useState('');

  const [selectedProject, setSelectedProject] = useState<{
  projectId: number | null;
  title: string;
}>({
  projectId: null,
  title: '',
});

  const [milestones, setMilestones] = useState([
    { id: Date.now(), title: '', description: '', rate: 0 },
  ]);

  useEffect(() => {
    const fetchInvoiceNumber = async () => {
      try {
        const res = await fetch('/api/dashboard/invoice-meta/generate-number');
        const data = await res.json();
        setInvoiceNumber(data.invoiceNumber);
        console.log('🧾 Generated Invoice Number:', data.invoiceNumber);
      } catch (error) {
        console.error('❌ Failed to fetch invoice number:', error);
      }
    };

    fetchInvoiceNumber();
  }, []);

  useEffect(() => {
  const now = new Date().toISOString();

  if (executionTiming === 'immediate') {
    setIssueDate(now);
    setDueDate(now);
  } else if (executionTiming === 'on-completion') {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setIssueDate(now);
    setDueDate(nextWeek.toISOString());
  } else if (executionTiming === 'custom') {
    setIssueDate(now); // dueDate set manually via Calendar
  } else if (!isNaN(Date.parse(executionTiming))) {
    // This is a custom ISO date
    setIssueDate(now); // ← Only update issueDate
    setDueDate(new Date(executionTiming).toISOString()); // ← Assign custom date to dueDate
  }
}, [executionTiming]);

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

  const invoicePayload = {
    invoiceNumber,
    issueDate,
    dueDate,
    executionTiming,
    billTo,
    project: selectedProject,
    milestones,
    total,
    notes,
    freelancerId: session?.user?.id,
  };

  const handleSendInvoice = async () => {
    console.log('📤 Sending Invoice:', invoicePayload);

    try {
      const res = await fetch(
        '/api/freelancer-dashboard/projects-and-invoices/create-invoice',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoicePayload),
        }
      );

      const result = await res.json();
      console.log('✅ Invoice sent response:', result);

      if (result.invoiceNumber) {
        router.push(`/freelancer-dashboard/preview-invoice/${result.invoiceNumber}`);
      }
    } catch (err) {
      console.error('❌ Error sending invoice:', err);
    }
  };

  const handleSaveDraft = async () => {
    console.log('💾 Saving Draft:', invoicePayload);

    try {
      const res = await fetch(
        '/api/freelancer-dashboard/projects-and-invoices/save-draft',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...invoicePayload, status: 'draft' }),
        }
      );

      const result = await res.json();
      console.log('✅ Draft saved response:', result);
    } catch (err) {
      console.error('❌ Error saving draft:', err);
    }
  };

  const handlePreviewInvoice = async () => {
    console.log('🟧 handlePreviewInvoice triggered');

    const previewPayload = {
      invoiceNumber,
      issueDate,
      dueDate,
      executionTiming,
      billTo,
      project: selectedProject,
      milestones,
      total,
      notes,
      freelancerId: session?.user?.id,
    };

    console.log('📦 Preview Payload:', previewPayload);

    if (!invoiceNumber) {
      alert('Please wait — invoice number is still generating.');
      return;
    }

    try {
      const res = await fetch(
        `/api/invoices/preview-meta/invoice-preview-cache/${invoiceNumber}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(previewPayload),
        }
      );

      if (!res.ok) throw new Error('Failed to store preview');

      console.log('✅ Preview stored successfully');
      router.push(`/freelancer-dashboard/preview-invoice/${invoiceNumber}`);
    } catch (err) {
      console.error('❌ Error generating preview:', err);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 py-12 space-y-12">
      <InvoiceHeader
        onSend={handleSendInvoice}
        onSaveDraft={handleSaveDraft}
        onPreview={handlePreviewInvoice}
        billTo={billTo}
      />

      <div className="bg-white rounded-xl border px-6 py-10 space-y-10">
        <InvoiceMetaSection
          invoiceNumber={invoiceNumber}
          issueDate={issueDate}
          onIssueDateChange={setIssueDate}
          dueDate={dueDate}
          onDueDateChange={setDueDate}
          executionTiming={executionTiming}
          onExecutionTimingChange={setExecutionTiming}
          billTo={billTo}
          onBillToChange={setBillTo}
        />

        <hr className="border-t border-gray-200 my-8" />

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
          <h4 className="text-sm font-semibold text-gray-700 uppercase">
            Billable Project Milestones
          </h4>
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