'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CommissionerLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      username: 'neilsan',
      password: 'testpass',
    });

    if (res?.ok) {
      router.push('/commissioner-dashboard');
    } else {
      setError('Failed to log in as Neilsan');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-xl font-bold">👔</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Commissioner Login</h1>
          <p className="text-gray-600 mt-2">Access your project management dashboard</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-3">
            <img 
              src="/avatars/neilsan.png" 
              alt="Neilsan Mando" 
              className="w-12 h-12 rounded-full border-2 border-pink-200"
            />
            <div>
              <h3 className="font-medium text-gray-900">Neilsan Mando</h3>
              <p className="text-sm text-gray-600">Product Manager</p>
              <p className="text-xs text-gray-500">Lagos Parks Services</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200 font-medium"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Signing in...</span>
            </div>
          ) : (
            'Login as Neilsan Mando'
          )}
        </button>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Development login for commissioner dashboard testing
          </p>
        </div>
      </div>
    </div>
  );
}
