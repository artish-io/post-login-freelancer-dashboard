'use client';

import Image from "next/image";
import { useState } from "react";

export default function SignUpModal() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setMessage('Please enter your email address');
      setIsSuccess(false);
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        setMessage('Magic link sent! Check the server console for your login link.');

        // DEV-ONLY: Show additional dev info if available
        if (data.devUrl) {
          console.log('🔗 [DEV] Magic link URL:', data.devUrl);
        }
      } else {
        setIsSuccess(false);
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Magic link request failed:', error);
      setIsSuccess(false);
      setMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#eb1966] px-4 py-12">
      <div className="bg-white rounded-xl w-full max-w-md p-8 shadow-md">
        <h1 className="text-3xl font-extrabold text-center mb-2">Join Now</h1>
        <p className="text-sm font-semibold text-center text-black mb-6">
          Sign up to connect with freelance creators
        </p>

        {!isSuccess ? (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none disabled:opacity-50"
              required
            />

            <button
              type="submit"
              disabled={isLoading}
              className="bg-black text-white rounded-md py-2 text-sm font-semibold hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Check Your Console!</h3>
              <p className="text-sm text-gray-600 mb-4">
                We've generated a magic link for you. In development mode, check the server console for your login URL.
              </p>
            </div>
            <button
              onClick={() => {
                setIsSuccess(false);
                setEmail('');
                setMessage('');
              }}
              className="text-sm text-[#eb1966] hover:underline"
            >
              Send another link
            </button>
          </div>
        )}

        {message && !isSuccess && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{message}</p>
          </div>
        )}

        <hr className="my-6 border-gray-300" />

        <button className="flex items-center justify-center gap-2 border border-black rounded-md py-2 w-full text-sm font-medium hover:bg-gray-50 transition">
          <Image
            src="/google-icon.png" // update this to your image file
            alt="Google"
            width={18}
            height={18}
            className="object-contain"
          />
          Sign up with Google
        </button>

        <div className="mt-6 text-center text-sm text-black">
          <p>
            Already have an account?{" "}
            <a href="/login" className="underline font-semibold">
              Log In
            </a>
          </p>
          <p className="mt-1">
            <a href="/reset-password" className="underline">
              Forgot Password?
            </a>
          </p>
        </div>

        {/* DEV-ONLY: Development info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-600 font-medium mb-1">Development Mode</p>
            <p className="text-xs text-blue-600">
              Magic links will appear in your server console. After clicking the magic link,
              you'll be redirected to complete your profile setup.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
