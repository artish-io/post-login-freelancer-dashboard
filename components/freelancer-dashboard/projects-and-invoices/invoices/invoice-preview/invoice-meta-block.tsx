'use client';

type InvoiceMetaProps = {
  invoiceNumber: string;
  billedToName?: string;
  billedToAddress?: string;
};

export default function InvoiceMetaBlock({
  invoiceNumber,
  billedToName,
  billedToAddress,
}: InvoiceMetaProps) {
  return (
    <div className="w-full rounded-xl px-6 py-5 flex justify-between items-start" style={{ backgroundColor: '#FCD5E3' }}>
      {/* Left: Invoice Number */}
      <div className="space-y-1">
        <p className="text-sm text-gray-800">Invoice Number:</p>
        <p className="text-xl font-extrabold text-gray-900">{invoiceNumber || '—'}</p>
      </div>

      {/* Right: Bill To */}
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900">Billed to</p>
        <p className="text-sm text-gray-800 mt-1">{billedToName || '—'}</p>
        <p className="text-sm text-gray-700">{billedToAddress || '—'}</p>
      </div>
    </div>
  );
}