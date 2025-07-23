'use client';

import { useState } from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';

interface SendInvoiceButtonProps {
  projectId: number;
  taskId: number;
  taskTitle: string;
  taskStatus: string;
  freelancerId: number;
  commissionerId: number;
  onInvoiceSent?: () => void;
}

/**
 * Send Invoice Button Component
 * 
 * INTEGRATION NOTES:
 * - This component handles sending invoices for approved tasks
 * - In production, this will integrate with payment gateways
 * - Currently runs in simulation mode for testing
 */

export default function SendInvoiceButton({
  projectId,
  taskId,
  taskTitle,
  taskStatus,
  freelancerId,
  commissionerId,
  onInvoiceSent
}: SendInvoiceButtonProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show button for approved tasks
  if (taskStatus !== 'Approved') {
    return null;
  }

  const handleSendInvoice = async () => {
    setSending(true);
    setError(null);

    try {
      // Generate invoice number (in production, this would be handled by the backend)
      const invoiceNumber = `INV_${projectId}_${taskId}_${Date.now()}`;

      const response = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber,
          freelancerId,
          commissionerId,
          projectId,
          taskId,
          taskTitle
        })
      });

      if (response.ok) {
        setSent(true);
        onInvoiceSent?.();
        
        // Reset state after 3 seconds
        setTimeout(() => {
          setSent(false);
        }, 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send invoice');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      setError('Failed to send invoice');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <button
        disabled
        className="flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg border border-green-200"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Invoice Sent!
      </button>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col">
        <button
          onClick={handleSendInvoice}
          disabled={sending}
          className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg border border-red-200 mb-1"
        >
          <AlertCircle className="w-4 h-4 mr-2" />
          Retry Send
        </button>
        <span className="text-xs text-red-600">{error}</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleSendInvoice}
      disabled={sending}
      className={`flex items-center px-4 py-2 rounded-lg border transition-all duration-200 ${
        sending
          ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 active:bg-blue-200'
      }`}
    >
      {sending ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
          Sending...
        </>
      ) : (
        <>
          <Send className="w-4 h-4 mr-2" />
          Send Invoice
        </>
      )}
    </button>
  );
}
