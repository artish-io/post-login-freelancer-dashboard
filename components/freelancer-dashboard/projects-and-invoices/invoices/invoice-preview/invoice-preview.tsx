'use client';


import FreelancerInfoBox from './freelancer-info-box';
import ClientDetailsBox from './client-details-box';
import InvoiceMetaBlock from './invoice-meta-block';
import InvoiceTaskList from './invoice-task-list';
import InvoiceDatesDisplay from './invoice-dates-display';

type Invoice = {
  invoiceNumber: string;
  freelancerId: number;
  projectId: number;
  commissionerId: number;
  projectTitle: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid';
  milestones: {
    description: string;
    rate: number;
  }[];
  freelancer?: {
    id: number;
    name: string;
    email: string;
    avatar: string;
    title: string;
    address: string;
  };
  commissioner?: {
    id: number;
    name: string;
    email: string;
    organizationId?: number;
    organization?: {
      name: string;
      logo: string;
      address: string;
    };
  };
};

interface InvoicePreviewProps {
  invoice: Invoice;
  userType: 'freelancer' | 'commissioner';
  actionButtons?: React.ReactNode;
}

// Helper function to get appropriate status text based on user type
function getStatusDisplayText(status: string, userType: 'freelancer' | 'commissioner'): string {
  if (userType === 'commissioner') {
    switch (status) {
      case 'sent':
        return 'Pending';
      case 'draft':
        return 'Draft';
      case 'paid':
        return 'Paid';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  } else {
    // Freelancer perspective - keep original status text
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export default function InvoicePreview({ invoice, userType, actionButtons }: InvoicePreviewProps) {

  if (!invoice) {
    return (
      <div className="p-10 text-center text-gray-500">
        No invoice data available
      </div>
    );
  }

  // Transform milestones to tasks format
  const tasks = (invoice.milestones || []).map((milestone, index) => ({
    id: index + 1,
    title: milestone.description,
    order: `Milestone ${index + 1}`,
    rate: milestone.rate
  }));

  return (
    <div className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-4 pb-12 space-y-10">
      {/* Project Title */}
      <h1 className="text-2xl font-semibold text-gray-800">
        {invoice.projectTitle || 'Untitled Project'}
      </h1>

      {/* Top Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <FreelancerInfoBox
            name={invoice.freelancer?.name || 'Unknown Freelancer'}
            email={invoice.freelancer?.email || 'No email'}
            address={invoice.freelancer?.address || 'No address provided'}
          />
          <InvoiceMetaBlock
            invoiceNumber={invoice.invoiceNumber}
            billedToName={invoice.commissioner?.name || invoice.commissioner?.organization?.name}
            billedToAddress={invoice.commissioner?.organization?.address || 'No address provided'}
          />
        </div>
        <div>
          <ClientDetailsBox
            organizationName={invoice.commissioner?.organization?.name || 'Unknown Organization'}
            organizationLogo={invoice.commissioner?.organization?.logo || ''}
            clientName={invoice.commissioner?.name || 'Unknown Commissioner'}
            clientEmail={invoice.commissioner?.email || 'No email'}
            clientAddress={invoice.commissioner?.organization?.address || 'No address provided'}
          />
        </div>
      </div>

      {/* Main Body: Tasks + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-md font-semibold text-gray-700">Work Details</h3>
          <InvoiceTaskList tasks={tasks} readOnly={true} />
          <div className="flex justify-end pt-4 text-lg font-semibold text-gray-800 border-t">
            Total: ${invoice.totalAmount?.toFixed(2) || '0.00'}
          </div>
        </div>

        <div className="space-y-4">
          <InvoiceDatesDisplay 
            invoiceDate={invoice.issueDate} 
            dueDate={invoice.dueDate} 
          />
          
          {/* Status Badge */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">Status</div>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              invoice.status === 'paid'
                ? 'bg-green-100 text-green-800'
                : invoice.status === 'sent'
                ? 'bg-yellow-100 text-yellow-800'
                : invoice.status === 'draft'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {getStatusDisplayText(invoice.status, userType)}
            </div>
          </div>

          {/* Commissioner-specific info banner (non-blocking) */}
          {userType === 'commissioner' && (invoice.status === 'sent' || invoice.status === 'draft') && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-800 font-medium mb-2">
                {invoice.status === 'draft' ? 'Draft Invoice' : 'Payment Pending'}
              </div>
              <div className="text-sm text-blue-600">
                {invoice.status === 'draft'
                  ? 'This invoice is in draft status and can be paid when ready.'
                  : 'This invoice is pending payment. Please process payment to complete the transaction.'
                }
              </div>
            </div>
          )}

          {/* Custom Action Buttons */}
          {actionButtons && actionButtons}
        </div>
      </div>
    </div>
  );
}
