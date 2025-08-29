'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { motion } from "framer-motion"

export default function BusinessSignUpFlow() {
  const [step, setStep] = useState(1);
  const [bio, setBio] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [links, setLinks] = useState({
    github: '',
    twitter: '',
    linkedin: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const isStepOneValid = () => {
    return firstName.trim().length > 0 && lastName.trim().length > 0 && email.trim().length > 0 && bio.trim().length > 0;
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        bio: bio.trim(),
        avatar: preview, // Base64 data URL
        skills: [], // Commissioners don't have skills in this flow
        tools: [], // Commissioners don't have tools in this flow
        links: Object.fromEntries(
          Object.entries(links).filter(([_, value]) => value.trim() !== '')
        ),
        organization: companyName.trim() ? {
          name: companyName.trim(),
          bio: bio.trim(), // Use same bio for organization
          website: website.trim(),
          logo: preview // Use same avatar as organization logo
        } : null
      };

      const response = await fetch('/api/signup?role=commissioner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitMessage('Account created successfully! You can now log in with your email.');
        console.log('✅ Commissioner account created:', data.user);

        // Redirect to login or dashboard after a delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setSubmitMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Signup failed:', error);
      setSubmitMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
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
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        required
        className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
      />
      <input
        type="text"
        placeholder="Professional Title"
        value={professionalTitle}
        onChange={(e) => setProfessionalTitle(e.target.value)}
        required
        className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
      />
      <input
        type="url"
        placeholder="Website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
      />
      <input
        type="text"
        placeholder="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
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
        handleFinalSubmit();
      }}
      className="space-y-4"
    >
      <input
        type="url"
        placeholder="GitHub"
        value={links.github}
        onChange={(e) => setLinks({ ...links, github: e.target.value })}
        className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
      />
      <input
        type="url"
        placeholder="Twitter"
        value={links.twitter}
        onChange={(e) => setLinks({ ...links, twitter: e.target.value })}
        className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
      />
      <input
        type="url"
        placeholder="LinkedIn"
        value={links.linkedin}
        onChange={(e) => setLinks({ ...links, linkedin: e.target.value })}
        className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-black text-white py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Creating Account...' : 'Submit'}
      </button>
    </form>

    {/* Error/Success Message */}
    {submitMessage && (
      <div className={`mt-4 p-3 rounded-md ${
        submitMessage.includes('successfully')
          ? 'bg-green-50 border border-green-200'
          : 'bg-red-50 border border-red-200'
      }`}>
        <p className={`text-sm ${
          submitMessage.includes('successfully')
            ? 'text-green-600'
            : 'text-red-600'
        }`}>
          {submitMessage}
        </p>
      </div>
    )}
  </motion.div>
)}
    </div>
  );
}