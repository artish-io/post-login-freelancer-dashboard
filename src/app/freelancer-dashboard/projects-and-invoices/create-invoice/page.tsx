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
    { id: Date.now(), title: '', description: '', rate: 0, taskId: undefined as number | undefined },
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

  // Load saved form data on mount
  useEffect(() => {
    if (isResumeMode) return; // Don't load saved data if resuming from preview

    const savedData = loadFormData();
    if (savedData) {
      setBillTo(savedData.billTo || '');
      setSelectedProject(savedData.selectedProject || { projectId: null, title: '' });
      setMilestones(savedData.milestones || []);
      setNotes(savedData.notes || '');
      setExecutionTiming(savedData.executionTiming || 'Upon completion');
      setIssueDate(savedData.issueDate || new Date().toISOString().split('T')[0]);
      setDueDate(savedData.dueDate || '');
      setSelectedCommissionerId(savedData.selectedCommissionerId || null);

      console.log('✅ Loaded saved form data');
    }
  }, [isResumeMode]);

  // Auto-populate milestone when project is selected
  useEffect(() => {
    if (selectedProject?.projectId) {
      autoPopulateMilestone();
    }
  }, [selectedProject?.projectId]);

  // Save form data when it changes
  useEffect(() => {
    if (!isResumeMode) {
      saveFormData();
    }
  }, [billTo, selectedProject, milestones, notes, executionTiming, issueDate, dueDate, selectedCommissionerId, isResumeMode]);

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
    setMilestones([...milestones, { id: newId, title: '', description: '', rate: 0, taskId: undefined }]);
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

  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // Form persistence key
  const FORM_STORAGE_KEY = 'invoice-form-data';

  // Save form data to localStorage
  const saveFormData = () => {
    if (typeof window === 'undefined') return;

    const formData = {
      billTo,
      selectedProject,
      milestones,
      notes,
      executionTiming,
      issueDate,
      dueDate,
      selectedCommissionerId,
      timestamp: Date.now()
    };

    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
  };

  // Load form data from localStorage
  const loadFormData = () => {
    if (typeof window === 'undefined') return null;

    try {
      const saved = localStorage.getItem(FORM_STORAGE_KEY);
      if (!saved) return null;

      const data = JSON.parse(saved);
      // Only load if saved within last 24 hours
      if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(FORM_STORAGE_KEY);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to load form data:', error);
      return null;
    }
  };

  // Clear form data from localStorage
  const clearFormData = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(FORM_STORAGE_KEY);
  };

  // Auto-populate milestone fields with most recent completed unpaid task
  const autoPopulateMilestone = async () => {
    if (!selectedProject?.projectId) return;

    // Check if milestones are already populated (not just empty default ones)
    const hasPopulatedMilestones = milestones.some(m => m.title.trim() !== '' || m.rate > 0);
    if (hasPopulatedMilestones) return;

    try {
      // Fetch project tasks, project info, and existing invoices
      const [projectTasksRes, projectInfoRes, invoicesRes] = await Promise.all([
        fetch(`/api/project-tasks/${selectedProject.projectId}`),
        fetch('/api/projects'),
        fetch('/api/invoices')
      ]);

      const projectTasksData = await projectTasksRes.json();
      const allProjects = await projectInfoRes.json();
      const invoices = await invoicesRes.json();

      // Find the specific project info
      const projectInfo = allProjects.find((p: any) => p.projectId === selectedProject.projectId);
      const tasks = projectTasksData.tasks || [];

      console.log('🔍 Project info:', projectInfo);
      console.log('🔍 Project tasks:', tasks);

      // Get all task IDs and descriptions that have been invoiced (from all invoices for this project)
      // Include ALL invoice statuses: draft, sent, paid, cancelled, overdue
      const invoicedTaskIds = new Set();
      const invoicedTaskTitles = new Set();
      const validInvoiceStatuses = ['draft', 'sent', 'paid', 'cancelled', 'overdue'];

      invoices
        .filter((invoice: any) =>
          invoice.projectId === selectedProject.projectId &&
          validInvoiceStatuses.includes(invoice.status)
        )
        .forEach((invoice: any) => {
          // Check new invoice format with milestones array
          if (invoice.milestones) {
            invoice.milestones.forEach((milestone: any) => {
              if (milestone.taskId) {
                invoicedTaskIds.add(milestone.taskId);
              }
              if (milestone.title || milestone.description) {
                invoicedTaskTitles.add(milestone.title || milestone.description);
              }
            });
          }
          // Check old invoice format with milestoneDescription
          if (invoice.milestoneDescription) {
            invoicedTaskTitles.add(invoice.milestoneDescription);
          }
        });

      console.log('🔍 Already invoiced task IDs:', Array.from(invoicedTaskIds));
      console.log('🔍 Already invoiced task titles:', Array.from(invoicedTaskTitles));

      // Find tasks that are both approved AND completed, and haven't been invoiced yet
      const availableTasks = tasks.filter((task: any) => {
        const isTaskEligible = task.status === 'Approved' &&
                              task.completed === true;
        const hasNoInvoice = !invoicedTaskIds.has(task.id) &&
                            !invoicedTaskTitles.has(task.title) &&
                            !task.invoicePaid;

        return isTaskEligible && hasNoInvoice;
      });

      console.log(`🔍 Found ${availableTasks.length} available tasks for invoicing:`, availableTasks);

      if (availableTasks.length > 0) {
        // Calculate rate per task based on project budget and invoicing method
        let ratePerTask = 0;
        if (projectInfo?.totalBudget && projectInfo?.totalTasks) {
          if (projectInfo.invoicingMethod === 'completion') {
            // For completion-based projects: (totalBudget - upfrontCommitment) / totalTasks
            const upfrontCommitment = projectInfo.upfrontCommitment || 0;
            const milestonePool = projectInfo.totalBudget - upfrontCommitment;
            ratePerTask = milestonePool / projectInfo.totalTasks;

            console.log(`💰 Completion-based rate per task: $${ratePerTask} (Budget: $${projectInfo.totalBudget}, Upfront: $${upfrontCommitment}, Tasks: ${projectInfo.totalTasks})`);
          } else {
            // For milestone-based projects: totalBudget / totalTasks
            ratePerTask = projectInfo.totalBudget / projectInfo.totalTasks;

            console.log(`💰 Milestone-based rate per task: $${ratePerTask} (Budget: $${projectInfo.totalBudget}, Tasks: ${projectInfo.totalTasks})`);
          }
        }

        // Sort by completion/approval date (most recent first)
        availableTasks.sort((a: any, b: any) => {
          const dateA = new Date(a.approvedAt || a.completedAt || a.updatedAt).getTime();
          const dateB = new Date(b.approvedAt || b.completedAt || b.updatedAt).getTime();
          return dateB - dateA;
        });

        // Auto-populate with ALL available tasks, not just the latest one
        const populatedMilestones = availableTasks.map((task: any, index: number) => ({
          id: Date.now() + index,
          title: task.title || `Task ${task.id}`,
          description: task.description || task.title || `Task ${task.id}`,
          rate: ratePerTask > 0 ? ratePerTask : (task.rate || task.budget || 0),
          taskId: task.id // Store task ID for tracking
        }));

        setMilestones(populatedMilestones);

        console.log('✅ Auto-populated milestones with tasks:', populatedMilestones.map((m: any) => `${m.title} - $${m.rate}`));
      } else {
        console.log('⚠️ No available tasks for invoicing in this project');
      }
    } catch (error) {
      console.error('Failed to auto-populate milestone:', error);
    }
  };

  const handleSendInvoice = async () => {
    if (!selectedCommissionerId) {
      alert('Please select a commissioner to send the invoice to');
      return;
    }

    if (!invoiceNumber) {
      alert('Please wait for invoice number to be generated');
      return;
    }

    setSending(true);
    try {
      // Step 1: Create the invoice first
      const createInvoiceData = {
        invoiceNumber,
        freelancerId: Number(session?.user?.id),
        commissionerId: selectedCommissionerId,
        projectId: selectedProject.projectId, // null for custom projects
        projectTitle: selectedProject.projectId ? selectedProject.title : selectedProject.title,
        issueDate,
        dueDate,
        totalAmount: total,
        status: 'draft', // Create as draft first
        milestones: milestones.map(m => ({
          title: m.title,
          description: m.description,
          rate: m.rate,
          taskId: m.taskId // Include task ID for tracking
        })),
        isCustomProject: selectedProject.projectId === null
      };

      console.log('🚀 Creating invoice with data:', createInvoiceData);

      // First, save the invoice to the database
      const createRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createInvoiceData),
      });

      if (!createRes.ok) {
        const createResult = await createRes.json();
        throw new Error(createResult.error || 'Failed to create invoice');
      }

      // Step 2: Now send the invoice
      const sendData = {
        invoiceNumber,
        freelancerId: Number(session?.user?.id),
        commissionerId: selectedCommissionerId
      };

      console.log('📤 Sending invoice with data:', sendData);

      const res = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendData),
      });

      const result = await res.json();
      console.log('📡 Send API Response:', result);

      if (!res.ok) {
        throw new Error(result.error || `Server error: ${res.status}`);
      }

      if (result.success) {
        setSendSuccess(true);

        // Clear saved form data since invoice was sent successfully
        clearFormData();

        // Show success message
        alert('Invoice sent successfully! The recipient has been notified.');

        // Redirect after a short delay
        setTimeout(() => {
          router.push(`/freelancer-dashboard/projects-and-invoices/invoices?invoiceNumber=${invoiceNumber}`);
        }, 1000);
      } else {
        throw new Error(result.error || 'Failed to send invoice');
      }
    } catch (err) {
      console.error('❌ Error sending invoice:', err);
      alert(`Failed to send invoice: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedCommissionerId) {
      alert('Please select a commissioner before saving draft');
      return;
    }

    if (milestones.length === 0 || milestones.every(m => !m.description.trim())) {
      alert('Please add at least one milestone before saving draft');
      return;
    }

    setSavingDraft(true);
    setDraftSaved(false);

    try {
      // Prepare draft data
      const draftData = {
        invoiceNumber,
        freelancerId: Number(session?.user?.id),
        commissionerId: selectedCommissionerId,
        projectId: selectedProject.projectId, // null for custom projects
        projectTitle: selectedProject.projectId ? selectedProject.title : selectedProject.title,
        issueDate,
        dueDate,
        totalAmount: total,
        status: 'draft',
        milestones: milestones.map(m => ({
          title: m.title,
          description: m.description,
          rate: m.rate,
          taskId: m.taskId
        })),
        isCustomProject: selectedProject.projectId === null
      };

      const res = await fetch('/api/invoices/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData),
      });

      const result = await res.json();

      if (res.ok) {
        setDraftSaved(true);
        console.log('✅ Draft saved successfully:', result);

        // Show success message briefly
        setTimeout(() => {
          setDraftSaved(false);
        }, 3000);
      } else {
        throw new Error(result.error || 'Failed to save draft');
      }
    } catch (err) {
      console.error('❌ Error saving draft:', err);
      alert(`Failed to save draft: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSavingDraft(false);
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
        sending={sending}
        sendSuccess={sendSuccess}
        savingDraft={savingDraft}
        draftSaved={draftSaved}
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