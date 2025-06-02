'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { motion } from "framer-motion"

export default function BusinessSignUpFlow() {
  const [step, setStep] = useState(1);
  const [bio, setBio] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const isStepOneValid = () => {
    return bio.trim().length > 0;
  };

  return (
    <div className="bg-[#EB1966] min-h-screen flex flex-col items-center px-4 py-10">
      {/* Progress Bar */}
      <div className="w-full max-w-md mb-6">
        <p className="text-xs text-white mb-1">Step {step} of 3</p>
        <div className="w-full bg-[#FCD5E3] h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#B30445] h-full transition-all duration-500"
            style={{ width: `${step * 33.33}%` }}
          />
        </div>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-md px-6 py-8 w-full max-w-md text-center">
          <h2 className="text-lg font-bold">Complete Sign-Up</h2>
          <p className="text-sm text-gray-700 mt-1 mb-4">Tell us a bit about you</p>

          {/* Profile Upload */}
          <div
            className="relative w-40 h-40 mx-auto mb-2 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image
              src="/Circle-Signup.png"
              alt="Profile placeholder"
              fill
              className="rounded-full object-cover"
            />
            {preview ? (
              <Image
                src={preview}
                alt="Preview"
                fill
                className="rounded-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Image
                  src="/image-icon.png"
                  alt="Upload"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          <p
            className="text-xs text-gray-500 underline cursor-pointer mb-6"
            onClick={() => fileInputRef.current?.click()}
          >
            Add a profile photo
          </p>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isStepOneValid()) handleNext();
            }}
            className="space-y-4"
          >
            <input
              type="text"
              placeholder="First Name"
              required
              className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
            />
            <input
              type="text"
              placeholder="Last Name"
              required
              className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
            />
            <div className="relative">
              <textarea
                placeholder="Add short bio"
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-md text-sm resize-none focus:outline-none h-28"
              />
              <span className="absolute bottom-2 right-3 text-[10px] text-gray-400">
                {bio.length}/500
              </span>
            </div>
            <button
              type="submit"
              className="w-full bg-black text-white py-2 rounded-md text-sm font-medium disabled:opacity-50"
              disabled={!isStepOneValid()}
            >
              Next
            </button>
          </form>
        </div>
      )}

      {/* Step 2 Placeholder (optional debug) */}
      {step === 2 && (
  <div className="bg-white rounded-xl shadow-md px-6 py-8 w-full max-w-md text-center">
    <h2 className="text-lg font-bold">Complete Sign-Up</h2>
    <p className="text-sm text-gray-700 mt-1 mb-4">Tell us a bit about what you do</p>

    {/* Logo Upload */}
    <div
      className="relative w-40 h-40 mx-auto mb-2 cursor-pointer"
      onClick={() => fileInputRef.current?.click()}
    >
      <Image
        src="/Circle-Signup.png"
        alt="Logo placeholder"
        fill
        className="rounded-full object-cover"
      />
      {preview ? (
        <Image
          src={preview}
          alt="Preview"
          fill
          className="rounded-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="/image-icon.png"
            alt="Upload"
            width={32}
            height={32}
            className="object-contain"
          />
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>

    <p
      className="text-xs text-gray-500 underline cursor-pointer mb-6"
      onClick={() => fileInputRef.current?.click()}
    >
      Add company logo
    </p>

    {/* Step 2 Form */}
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleNext(); // this would move to step 3 (or submit logic)
      }}
      className="space-y-4"
    >
      <input
        type="text"
        placeholder="Company / Brand Name"
        required
        className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
      />
      <input
        type="text"
        placeholder="Professional Title"
        required
        className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
      />
      <input
        type="url"
        placeholder="Website"
        required
        className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
      />
      <input
        type="text"
        placeholder="Location"
        required
        className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
      />
      <button
        type="submit"
        className="w-full bg-black text-white py-2 rounded-md text-sm font-medium"
      >
        Next
      </button>
    </form>
  </div>
)}
{step === 3 && (
  <motion.div
    key="step3"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    className="bg-white rounded-xl shadow-md px-6 py-8 w-full max-w-md text-center"
  >
    <h2 className="text-lg font-bold">Complete Sign-Up</h2>
    <p className="text-sm text-gray-600 mt-1 mb-6">
      Add anything else you want talents to know about you
    </p>

    <form
      onSubmit={(e) => {
        e.preventDefault();
        setStep(4); // Proceed to confirmation
      }}
      className="space-y-4"
    >
      <input
        type="url"
        placeholder="GitHub"
        className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
      />
      <input
        type="url"
        placeholder="Twitter"
        className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
      />
      <input
        type="url"
        placeholder="LinkedIn"
        className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
      />
      <button
        type="submit"
        className="w-full bg-black text-white py-2 rounded-md text-sm font-medium"
      >
        Next
      </button>
    </form>
  </motion.div>
)}
    </div>
  );
}