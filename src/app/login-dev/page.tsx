'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DevLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      username: 'margsate',
      password: 'testpass',
    });

    if (res?.ok) {
      router.push('/freelancer-dashboard');
    } else {
      setError('Failed to log in as Margsate');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-6 rounded-lg shadow-md w-96">
        <h1 className="text-xl font-semibold mb-4">Dev Login</h1>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-black text-white py-2 px-4 rounded hover:bg-gray-900 transition"
        >
          {loading ? 'Signing in...' : 'Login as Margsate Flether'}
        </button>
        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}