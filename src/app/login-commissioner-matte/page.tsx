'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';

export default function MatteCommissionerLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      username: 'matte',
      password: 'testpass',
    });

    if (res?.ok) {
      router.push('/commissioner-dashboard');
    } else {
      setError('Failed to log in as Matte Hannery');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-96 border border-gray-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-xl font-bold">🚀</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Commissioner Login</h1>
          <p className="text-gray-600 mt-2">Corlax Wellness Dashboard Access</p>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-6 border border-blue-100">
          <div className="flex items-center space-x-3">
            <Image
              src="/avatars/matte.png"
              alt="Matte Hannery"
              width={48}
              height={48}
              className="w-12 h-12 rounded-full border-2 border-blue-200"
            />
            <div>
              <h3 className="font-medium text-gray-900">Matte Hannery</h3>
              <p className="text-sm text-gray-600">Startup Founder</p>
              <p className="text-xs text-gray-500">Corlax Wellness • Toronto, Canada</p>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Rating: ⭐ 4.9/5</span>
              <span>User ID: 34</span>
            </div>
            <div className="mt-1">
              <p className="text-xs text-gray-500">Wellness Technology & Mental Health Solutions</p>
            </div>
          </div>
        </div>

        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <span className="text-amber-600 text-sm">⚡</span>
            <div>
              <p className="text-xs font-medium text-amber-800">Development Login</p>
              <p className="text-xs text-amber-700">Quick access for testing commissioner features</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Signing in...</span>
            </div>
          ) : (
            'Login as Matte Hannery'
          )}
        </button>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-gray-500">
            Development login for commissioner dashboard testing
          </p>
          <div className="flex justify-center space-x-4 text-xs text-gray-400">
            <span>Username: matte</span>
            <span>•</span>
            <span>Password: testpass</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-center space-x-4">
            <a 
              href="/login-commissioner" 
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Neilsan Login
            </a>
            <span className="text-xs text-gray-300">•</span>
            <a 
              href="/login-dev" 
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Freelancer Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
