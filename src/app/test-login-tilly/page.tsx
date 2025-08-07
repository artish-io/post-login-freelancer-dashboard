'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function TestLoginTillyPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleTestLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        username: 'tilly',
        password: 'password123',
        redirect: false,
      });

      if (result?.ok) {
        // Redirect to commissioner dashboard
        router.push('/commissioner-dashboard');
      } else {
        console.error('Login failed:', result?.error);
        alert('Login failed. Please check the console for details.');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login error. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">TB</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Test Login</h1>
          <p className="text-gray-600">Commissioner Dashboard Access</p>
        </div>

        {/* User Info Card */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3 mb-3">
            <img
              src="/avatars/tilly.png"
              alt="Tilly Burzinsky"
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/avatars/default-avatar.png';
              }}
            />
            <div>
              <h3 className="font-semibold text-gray-900">Tilly Burzinsky</h3>
              <p className="text-sm text-gray-600">Events Lead</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">User ID:</span>
              <span className="font-medium">35</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type:</span>
              <span className="font-medium text-purple-600">Commissioner</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Organization:</span>
              <span className="font-medium">Zynate Events Group</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Location:</span>
              <span className="font-medium">Ottawa, Canada</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Username:</span>
              <span className="font-medium">tilly</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Password:</span>
              <span className="font-medium">password123</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email:</span>
              <span className="font-medium text-xs">tilly.burzinsky@example.com</span>
            </div>
          </div>
        </div>

        {/* Test Features */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-900 mb-2">🧪 Test Features</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Gig application notifications</li>
            <li>• Commissioner dashboard access</li>
            <li>• Payment dashboard functionality</li>
            <li>• Job listings and applications</li>
            <li>• Real-time notification updates</li>
          </ul>
        </div>

        {/* Login Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleTestLogin}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Logging in...</span>
            </div>
          ) : (
            'Login as Tilly Burzinsky'
          )}
        </motion.button>

        {/* Quick Links */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center mb-3">Quick Navigation</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => router.push('/login-commissioner')}
              className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
            >
              Regular Login
            </button>
            <button
              onClick={() => router.push('/')}
              className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
            >
              Home Page
            </button>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
          <strong>Debug Info:</strong><br />
          This test login page automatically logs in as Tilly Burzinsky (ID: 35) to test commissioner functionality, especially gig application notifications.
        </div>
      </motion.div>
    </div>
  );
}
