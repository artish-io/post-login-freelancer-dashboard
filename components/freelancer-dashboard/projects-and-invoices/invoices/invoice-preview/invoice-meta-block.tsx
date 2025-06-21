'use client';

type InvoiceMetaProps = {
  invoiceNumber: string;
  projectId: string;
  issueDate: string;
  dueDate: string;
};

export default function InvoiceMetaBlock({ invoiceNumber, projectId, issueDate, dueDate }: InvoiceMetaProps) {
  return (
    <div className="bg-pink-100 p-4 rounded-md text-sm space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-gray-800">Invoice Number:</span>
        <span className="text-gray-700">{invoiceNumber}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Project ID:</span>
        <span>{projectId}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Issued Date:</span>
        <span>{issueDate}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Due Date:</span>
        <span>{dueDate}</span>
      </div>
    </div>
  );
}