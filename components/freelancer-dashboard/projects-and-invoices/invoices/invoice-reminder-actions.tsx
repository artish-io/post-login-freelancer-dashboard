'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '../../../ui/button';

type Props = {
  invoiceData: any;
  onReminderSent?: () => void;
  onUserReported?: () => void;
};

export default function InvoiceReminderActions({ invoiceData, onReminderSent, onUserReported }: Props) {
  const { data: session } = useSession();
  const [sending, setSending] = useState(false);
  const [reporting, setReporting] = useState(false);

  if (!invoiceData || !['sent', 'overdue'].includes(invoiceData.status)) {
    return null; // Only show for sent or overdue invoices
  }

  const reminderCount = invoiceData.reminders?.length || 0;
  const isOverdue = invoiceData.status === 'overdue';
  const canReport = isOverdue && reminderCount >= 2;

  // Calculate next allowed reminder time
  const getNextReminderTime = () => {
    if (!invoiceData.lastReminderSent) return null;
    
    const lastReminder = new Date(invoiceData.lastReminderSent);
    const cooldownHours = reminderCount < 2 ? 48 : 72;
    const nextAllowed = new Date(lastReminder.getTime() + cooldownHours * 60 * 60 * 1000);
    const now = new Date();
    
    if (now < nextAllowed) {
      const hoursRemaining = Math.ceil((nextAllowed.getTime() - now.getTime()) / (1000 * 60 * 60));
      return hoursRemaining;
    }
    
    return 0;
  };

  const hoursUntilNextReminder = getNextReminderTime();
  const canSendReminder = hoursUntilNextReminder === null || hoursUntilNextReminder <= 0;

  const handleSendReminder = async () => {
    if (!session?.user?.id || !canSendReminder) return;

    setSending(true);
    try {
      const res = await fetch('/api/invoices/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: invoiceData.invoiceNumber,
          freelancerId: Number(session.user.id),
          commissionerId: invoiceData.commissionerId,
          type: 'reminder'
        }),
      });

      const result = await res.json();

      if (res.ok) {
        alert('Reminder sent successfully!');
        onReminderSent?.();
      } else {
        throw new Error(result.error || 'Failed to send reminder');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert(`Failed to send reminder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  const handleReportUser = async () => {
    if (!session?.user?.id || !canReport) return;

    const reason = prompt('Please provide a reason for reporting this user (optional):');
    if (reason === null) return; // User cancelled

    setReporting(true);
    try {
      const res = await fetch('/api/invoices/report-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: invoiceData.invoiceNumber,
          freelancerId: Number(session.user.id),
          commissionerId: invoiceData.commissionerId,
          reason: reason || 'Non-payment of overdue invoice'
        }),
      });

      const result = await res.json();

      if (res.ok) {
        alert('User reported successfully. Our team will review this case.');
        onUserReported?.();
      } else {
        throw new Error(result.error || 'Failed to report user');
      }
    } catch (error) {
      console.error('Error reporting user:', error);
      alert(`Failed to report user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
      <div className="flex items-center gap-2 text-sm">
        {isOverdue ? (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        ) : (
          <Clock className="w-4 h-4 text-yellow-500" />
        )}
        <span className={`font-medium ${isOverdue ? 'text-red-700' : 'text-yellow-700'}`}>
          Invoice {isOverdue ? 'Overdue' : 'Sent'} • {reminderCount} reminder{reminderCount !== 1 ? 's' : ''} sent
        </span>
      </div>

      {/* Send Reminder Button */}
      <Button
        onClick={handleSendReminder}
        disabled={!canSendReminder || sending}
        variant={isOverdue ? "primary" : "secondary"}
        className="w-full flex items-center justify-center gap-2"
      >
        {sending ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Sending...
          </>
        ) : (
          <>
            <Bell className="w-4 h-4" />
            {isOverdue ? 'Send Overdue Reminder' : 'Send Payment Reminder'}
          </>
        )}
      </Button>

      {!canSendReminder && hoursUntilNextReminder && (
        <p className="text-xs text-gray-500 text-center">
          Next reminder available in {hoursUntilNextReminder} hour{hoursUntilNextReminder !== 1 ? 's' : ''}
        </p>
      )}

      {/* Report User Button (only for overdue invoices with 2+ reminders) */}
      {canReport && (
        <Button
          onClick={handleReportUser}
          disabled={reporting}
          variant="outline"
          className="w-full flex items-center justify-center gap-2 border-red-200 text-red-700 hover:bg-red-50"
        >
          {reporting ? (
            <>
              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              Reporting...
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4" />
              Report User
            </>
          )}
        </Button>
      )}

      {isOverdue && reminderCount < 2 && (
        <p className="text-xs text-gray-500 text-center">
          Send {2 - reminderCount} more reminder{2 - reminderCount !== 1 ? 's' : ''} to unlock user reporting
        </p>
      )}
    </div>
  );
}
