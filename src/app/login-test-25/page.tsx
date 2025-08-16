'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';

export default function LucasFreelancerLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      username: 'lucas25',
      password: 'testpass',
    });

    if (res?.ok) {
      router.push('/freelancer-dashboard');
    } else {
      setError('Failed to log in as Lucas Meyer');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Image
              src="/avatars/lucas.png"
              alt="Lucas Meyer"
              width={80}
              height={80}
              className="rounded-full"
            />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Test Login</h1>
          <p className="text-gray-600 mt-2">Lucas Meyer - Hardware Engineer</p>
          <p className="text-sm text-gray-500 mt-1">User ID: 25 | Freelancer</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value="lucas25"
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value="testpass"
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#eb1966] text-white py-3 px-4 rounded-md hover:bg-[#d1175a] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Login as Lucas Meyer'}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Profile:</strong> Accounting & Finance</p>
            <p><strong>Skills:</strong> Excel, Forecasting, Financial Modelling</p>
            <p><strong>Rate:</strong> 80-130/hr</p>
            <p><strong>Location:</strong> DE</p>
            <p><strong>Rating:</strong> ⭐⭐⭐⭐⭐ (5.0)</p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            Test login for development purposes
          </p>
        </div>
      </div>
    </div>
  );
}
