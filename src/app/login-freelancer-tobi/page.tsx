'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';

export default function TobiFreelancerLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    // Note: User ID 1 (Tobi Philly) doesn't have username/password in the data
    // We'll need to add them or use a different approach
    const res = await signIn('credentials', {
      redirect: false,
      username: 'tobi', // We'll need to add this to the user data
      password: 'testpass',
    });

    if (res?.ok) {
      router.push('/freelancer-dashboard');
    } else {
      setError('Failed to log in as Tobi Philly');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-96 border border-gray-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-xl font-bold">💻</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Freelancer Login</h1>
          <p className="text-gray-600 mt-2">Web3 Engineer Dashboard Access</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">TP</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Tobi Philly</h3>
              <p className="text-sm text-gray-600">Web3 Engineer</p>
              <p className="text-xs text-gray-500">tobi.philly@example.com</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span>Access to freelancer dashboard</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span>Project management tools</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span>Gig marketplace access</span>
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 px-4 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Signing in...</span>
            </div>
          ) : (
            'Login as Tobi Philly'
          )}
        </button>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Test login for development purposes only
          </p>
          <div className="mt-2 flex justify-center space-x-4 text-xs text-gray-400">
            <span>User ID: 1</span>
            <span>Type: Freelancer</span>
          </div>
        </div>
      </div>
    </div>
  );
}
