'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';

export default function FreelancerSignUpFlow() {
  const [step, setStep] = useState(1);
  const [bio, setBio] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [skills, setSkills] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [toolInput, setToolInput] = useState('');

  const [step3Fields, setStep3Fields] = useState({
    portfolio: '',
    twitter: '',
    linkedin: '',
    instagram: '',
    location: '',
  });

  // New state for submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const allSkillSuggestions = ['Programming', 'Video Editing', 'Design', 'Marketing', 'Writing'];
  const allToolSuggestions = ['VSCode', 'Canva', 'Figma', 'Notion', 'Photoshop'];

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
        skills: skills,
        tools: tools,
        links: {
          portfolio: step3Fields.portfolio,
          twitter: step3Fields.twitter,
          linkedin: step3Fields.linkedin,
          instagram: step3Fields.instagram
        }
      };

      const response = await fetch('/api/signup?role=freelancer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitMessage('Account created successfully! You can now log in with your email.');
        console.log('✅ Freelancer account created:', data.user);

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

  const handleAddTag = (
    value: string,
    list: string[],
    setList: (val: string[]) => void,
    resetInput: () => void
  ) => {
    const tag = value.trim();
    if (tag && !list.includes(tag) && list.length < 3) {
      setList([...list, tag]);
      resetInput();
    }
  };

  const handleRemoveTag = (
    tag: string,
    list: string[],
    setList: (val: string[]) => void
  ) => {
    setList(list.filter((t) => t !== tag));
  };

  const filteredSkills = allSkillSuggestions
    .filter((s) => !skills.includes(s) && s.toLowerCase().includes(skillInput.toLowerCase()))
    .slice(0, 2);

  const filteredTools = allToolSuggestions
    .filter((t) => !tools.includes(t) && t.toLowerCase().includes(toolInput.toLowerCase()))
    .slice(0, 2);

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

      {/* STEP 1 */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-md px-6 py-8 w-full max-w-md text-center">
          <h2 className="text-lg font-bold">Complete Sign-Up</h2>
          <p className="text-sm text-gray-700 mt-1 mb-4">Tell us a bit about you</p>

          <div
            className="relative w-40 h-40 mx-auto mb-2 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image
              src="/Circle-Signup.png"
              alt="Placeholder"
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
                <Image src="/image-icon.png" alt="Upload" width={32} height={32} />
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

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (firstName.trim() && lastName.trim() && email.trim() && bio.trim().length > 0) {
                setStep(2);
              }
            }}
            className="space-y-4"
          >
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-md text-sm"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-md text-sm"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-md text-sm"
            />
            <div className="relative">
              <textarea
                placeholder="Add short bio"
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-md text-sm resize-none h-28"
              />
              <span className="absolute bottom-2 right-3 text-[10px] text-gray-400">
                {bio.length}/500
              </span>
            </div>
            <button
              type="submit"
              className="w-full bg-black text-white py-2 rounded-md text-sm font-medium"
            >
              Next
            </button>
          </form>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow-md px-6 py-8 w-full max-w-md text-center">
          <h2 className="text-lg font-bold">Complete Sign-Up</h2>
          <p className="text-sm text-gray-700 mt-1 mb-6">Tell us a bit about what you can do</p>

          {/* SKILLS */}
          <div className="mb-6 text-left">
            <label className="block text-sm font-semibold mb-1">Tag up to three skills</label>
            <div className="border rounded-md p-2 flex flex-wrap gap-2 min-h-[48px]">
              {skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="bg-gray-200 text-sm px-3 py-1 rounded-full flex items-center gap-1"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(skill, skills, setSkills)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    &times;
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(skillInput, skills, setSkills, () => setSkillInput(''));
                  }
                }}
                placeholder="Type a skill"
                className="flex-grow min-w-[80px] text-sm outline-none"
              />
            </div>

            <div className="mt-2 flex gap-2 flex-wrap text-sm">
              {filteredSkills.map((s) => (
                <button
                  key={s}
                  onClick={() => handleAddTag(s, skills, setSkills, () => setSkillInput(''))}
                  className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full border"
                >
                  {s} +
                </button>
              ))}
            </div>
          </div>

          {/* TOOLS */}
          <div className="mb-6 text-left">
            <label className="block text-sm font-semibold mb-1">Tag up to three tools</label>
            <div className="border rounded-md p-2 flex flex-wrap gap-2 min-h-[48px]">
              {tools.map((tool, idx) => (
                <span
                  key={idx}
                  className="bg-gray-200 text-sm px-3 py-1 rounded-full flex items-center gap-1"
                >
                  {tool}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tool, tools, setTools)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    &times;
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={toolInput}
                onChange={(e) => setToolInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(toolInput, tools, setTools, () => setToolInput(''));
                  }
                }}
                placeholder="Type a tool"
                className="flex-grow min-w-[80px] text-sm outline-none"
              />
            </div>

            <div className="mt-2 flex gap-2 flex-wrap text-sm">
              {filteredTools.map((t) => (
                <button
                  key={t}
                  onClick={() => handleAddTag(t, tools, setTools, () => setToolInput(''))}
                  className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full border"
                >
                  {t} +
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(3)}
            className="w-full bg-black text-white py-2 rounded-md text-sm font-medium"
          >
            Next
          </button>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="bg-white rounded-xl shadow-md px-6 py-8 w-full max-w-md text-center">
          <h2 className="text-lg font-bold">Complete Sign-Up</h2>
          <p className="text-sm text-gray-700 mt-1 mb-6">
            Add a bit of everything else to improve your profile
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFinalSubmit();
            }}
            className="space-y-3"
          >
            <input
              type="url"
              placeholder="Portfolio Link"
              value={step3Fields.portfolio}
              onChange={(e) => setStep3Fields({ ...step3Fields, portfolio: e.target.value })}
              className="w-full px-4 py-2 border rounded-md text-sm"
            />
            <input
              type="url"
              placeholder="X / Twitter"
              value={step3Fields.twitter}
              onChange={(e) => setStep3Fields({ ...step3Fields, twitter: e.target.value })}
              className="w-full px-4 py-2 border rounded-md text-sm"
            />
            <input
              type="url"
              placeholder="LinkedIn"
              value={step3Fields.linkedin}
              onChange={(e) => setStep3Fields({ ...step3Fields, linkedin: e.target.value })}
              className="w-full px-4 py-2 border rounded-md text-sm"
            />
            <input
              type="url"
              placeholder="Instagram"
              value={step3Fields.instagram}
              onChange={(e) => setStep3Fields({ ...step3Fields, instagram: e.target.value })}
              className="w-full px-4 py-2 border rounded-md text-sm"
            />
            <input
              type="text"
              placeholder="Location"
              value={step3Fields.location}
              onChange={(e) => setStep3Fields({ ...step3Fields, location: e.target.value })}
              className="w-full px-4 py-2 border rounded-md text-sm"
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
        </div>
      )}
    </div>
  );
}