'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import InvoiceHeader from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-header';
import InvoiceMetaSection from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/invoice-meta-section';
import ProjectSelectDropdown from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/project-select-dropdown';
import MilestoneListEditor from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/milestone-list-editor';
import AdditionalNotes from '../../../../../components/freelancer-dashboard/projects-and-invoices/invoices/additional-notes';

export default function CreateInvoicePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const resumeInvoiceNumber = searchParams.get('invoiceNumber');
  const isResumeMode = searchParams.get('pageState') === 'resume';

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [executionTiming, setExecutionTiming] = useState('');
  const [billTo, setBillTo] = useState('');
  const [selectedCommissionerId, setSelectedCommissionerId] = useState<number | null>(null);
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

  // Load preview cache if returning from preview
  useEffect(() => {
    const hydrateFromPreview = async () => {
      if (!resumeInvoiceNumber) return;

      try {
        const res = await fetch(
          `/api/invoices/preview-meta/invoice-preview-cache/${resumeInvoiceNumber}`
        );
        const data = await res.json();

        if (!res.ok || !data.invoiceNumber) return;

        setInvoiceNumber(data.invoiceNumber);
        setIssueDate(data.issueDate);
        setDueDate(data.dueDate);
        setExecutionTiming(data.executionTiming);
        setBillTo(data.billTo);
        setSelectedProject(data.project || { projectId: null, title: '' });
        setMilestones(data.milestones || []);
        setNotes(data.notes || '');

        console.log('✅ Hydrated invoice from preview cache');
      } catch (err) {
        console.error('❌ Failed to hydrate from preview cache:', err);
      }
    };

    if (isResumeMode && resumeInvoiceNumber) {
      hydrateFromPreview();
    }
  }, [isResumeMode, resumeInvoiceNumber]);

  // Only generate invoice number if not resuming
  useEffect(() => {
    const fetchInvoiceNumber = async () => {
      if (isResumeMode && resumeInvoiceNumber) return;

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
  }, [isResumeMode, resumeInvoiceNumber]);

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
      setIssueDate(now);
    } else if (!isNaN(Date.parse(executionTiming))) {
      setIssueDate(now);
      setDueDate(new Date(executionTiming).toISOString());
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
    try {
      // Prepare invoice data for the API
      const invoiceData = {
        invoiceNumber,
        freelancerId: session?.user?.id,
        commissionerId: selectedCommissionerId,
        projectId: selectedProject.projectId, // null for custom projects
        projectTitle: selectedProject.projectId ? selectedProject.title : selectedProject.title,
        issueDate,
        dueDate,
        totalAmount: total,
        status: 'sent',
        milestones: milestones.map(m => ({
          description: m.description,
          rate: m.rate
        })),
        isCustomProject: selectedProject.projectId === null
      };

      const res = await fetch('/api/dashboard/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      const result = await res.json();
      if (result.success && result.invoice) {
        router.push(`/freelancer-dashboard/projects-and-invoices/invoices?invoiceNumber=${result.invoice.invoiceNumber}`);
      }
    } catch (err) {
      console.error('❌ Error sending invoice:', err);
    }
  };

  const handleSaveDraft = async () => {
    try {
      // Prepare draft data
      const draftData = {
        invoiceNumber,
        freelancerId: session?.user?.id,
        commissionerId: selectedCommissionerId,
        projectId: selectedProject.projectId, // null for custom projects
        projectTitle: selectedProject.projectId ? selectedProject.title : selectedProject.title,
        issueDate,
        dueDate,
        totalAmount: total,
        status: 'draft',
        milestones: milestones.map(m => ({
          description: m.description,
          rate: m.rate
        })),
        isCustomProject: selectedProject.projectId === null
      };

      const res = await fetch('/api/invoices/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData),
      });

      const result = await res.json();
      console.log('✅ Draft saved response:', result);
    } catch (err) {
      console.error('❌ Error saving draft:', err);
    }
  };

  const handlePreviewInvoice = async () => {
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
          body: JSON.stringify(invoicePayload),
        }
      );

      if (!res.ok) throw new Error('Failed to store preview');

      router.push(
        `/freelancer-dashboard/preview-invoice/${invoiceNumber}?pageState=resume`
      );
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
          onCommissionerSelect={setSelectedCommissionerId}
        />

        <hr className="border-t border-gray-200 my-8" />

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 uppercase">Project Details</h4>
          {session?.user?.id && (
            <ProjectSelectDropdown
              freelancerId={Number(session.user.id)}
              commissionerId={selectedCommissionerId}
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