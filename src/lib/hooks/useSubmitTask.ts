'use client';

import { useState } from 'react';

type SubmitParams = {
  projectId: number;
  taskId: number;
  referenceUrl?: string;
  action?: string;
};

export default function useSubmitTask() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitTask = async ({ projectId, taskId, referenceUrl, action = 'submit' }: SubmitParams) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/project-tasks/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          taskId,
          action,
          referenceUrl,
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Submission failed');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    submitTask,
    loading,
    error,
    success,
  };
}