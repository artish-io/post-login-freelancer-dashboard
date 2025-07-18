'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface TaskApprovalTestProps {
  taskId: number;
  projectId: number;
  taskTitle: string;
  currentStatus: string;
}

export default function TaskApprovalTest({ 
  taskId, 
  projectId, 
  taskTitle, 
  currentStatus 
}: TaskApprovalTestProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [message, setMessage] = useState('');

  const handleApprove = async () => {
    if (!session?.user?.id) {
      setMessage('Please log in to approve tasks');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/tasks/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          projectId,
          commissionerId: parseInt(session.user.id)
        })
      });

      const result = await response.json();

      if (result.success) {
        setStatus('Approved');
        setMessage(`✅ ${result.message}. Auto-invoice generation triggered.`);
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Approval error:', error);
      setMessage('❌ Failed to approve task');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'text-green-600 bg-green-100';
      case 'Rejected': return 'text-red-600 bg-red-100';
      case 'Ongoing': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{taskTitle}</h3>
          <p className="text-sm text-gray-500">Task ID: {taskId} | Project ID: {projectId}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
          {status}
        </span>
      </div>

      {status !== 'Approved' && (
        <button
          onClick={handleApprove}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          {loading ? 'Approving...' : 'Approve Task'}
        </button>
      )}

      {message && (
        <div className="mt-3 p-3 rounded-md bg-gray-50 border">
          <p className="text-sm">{message}</p>
        </div>
      )}
    </div>
  );
}
