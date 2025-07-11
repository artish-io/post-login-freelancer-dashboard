'use client';

import { useState, useEffect } from 'react';
import { CheckIcon, XIcon, DownloadIcon } from 'lucide-react';

type Submission = {
  id: string;
  productName: string;
  description: string;
  category: string;
  tags: string[];
  fileName: string | null;
  fileSize: number | null;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
};

export default function StorefrontAdminPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const response = await fetch('/storefront-submissions/submissions.json');
      const data = await response.json();
      setSubmissions(data);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveProduct = async (submissionId: string) => {
    setProcessingId(submissionId);
    try {
      const response = await fetch('/api/storefront/approve-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      });

      const result = await response.json();
      if (result.success) {
        await loadSubmissions(); // Reload to get updated status
        alert('Product approved successfully!');
      } else {
        alert(result.error || 'Failed to approve product');
      }
    } catch (error) {
      alert('Failed to approve product');
    } finally {
      setProcessingId(null);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading submissions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Storefront Product Submissions</h1>
        
        {submissions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No submissions found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map((submission) => (
              <div key={submission.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{submission.productName}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Submitted {formatDate(submission.submittedAt)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    submission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Description</h4>
                    <p className="text-gray-600 text-sm">{submission.description}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Details</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">Category:</span> {submission.category}</p>
                      <p><span className="font-medium">Tags:</span> {submission.tags.join(', ') || 'None'}</p>
                      {submission.fileName && (
                        <p><span className="font-medium">File:</span> {submission.fileName} ({formatFileSize(submission.fileSize)})</p>
                      )}
                    </div>
                  </div>
                </div>

                {submission.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => approveProduct(submission.id)}
                      disabled={processingId === submission.id}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
                    >
                      <CheckIcon className="w-4 h-4" />
                      {processingId === submission.id ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                    >
                      <XIcon className="w-4 h-4" />
                      Reject
                    </button>
                    {submission.fileName && (
                      <a
                        href={`/storefront-submissions/files/${submission.fileName}`}
                        download
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                      >
                        <DownloadIcon className="w-4 h-4" />
                        Download File
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
