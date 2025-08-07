'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function TestLoginNeilsanPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleTestLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        username: 'neilsan',
        password: 'testpass',
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">NM</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Test Login</h1>
          <p className="text-gray-600">Commissioner Dashboard Access</p>
        </div>

        {/* User Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Test User Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name:</span>
              <span className="font-medium">Neilsan Mando</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Title:</span>
              <span className="font-medium">Product Manager</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Organization:</span>
              <span className="font-medium">Lagos State Parks Services</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">User ID:</span>
              <span className="font-medium">32</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Organization ID:</span>
              <span className="font-medium">1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Username:</span>
              <span className="font-medium">neilsan</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Password:</span>
              <span className="font-medium">testpass</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email:</span>
              <span className="font-medium text-xs">neilsan.mando@example.com</span>
            </div>
          </div>
        </div>

        {/* Expected Data */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">Expected Gig Data</h3>
          <div className="space-y-1 text-sm text-blue-800">
            <div>• <strong>7 gigs</strong> in organization 1</div>
            <div>• <strong>9 applications</strong> (all accepted)</div>
            <div>• <strong>Matched Listings</strong> tab should show applications</div>
            <div>• <strong>Gig Listings</strong> tab should show placeholder gigs</div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-green-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-green-900 mb-3">Quick Navigation</h3>
          <div className="space-y-1 text-sm text-green-800">
            <div>→ Commissioner Dashboard</div>
            <div>→ Job Listings (Candidate Table)</div>
            <div>→ Projects & Invoices</div>
            <div>→ Notifications</div>
          </div>
        </div>

        {/* Login Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleTestLogin}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-600 hover:to-green-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Logging in...</span>
            </div>
          ) : (
            'Login as Neilsan Mando'
          )}
        </motion.button>

        {/* Debug Info */}
        <div className="mt-6 p-3 bg-gray-100 rounded text-xs text-gray-600">
          <strong>Debug:</strong> This will log you in as user 32 (Neilsan Mando) to test the commissioner dashboard and verify that gig applications are showing correctly after the hierarchical storage fix.
        </div>
      </motion.div>
    </div>
  );
}
