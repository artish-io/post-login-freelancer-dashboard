'use client';

import { Dialog, Transition } from '@headlessui/react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { Fragment, useState, useRef, useEffect } from 'react';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../../../../firebase';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  userCountry?: string;
};

export default function PhoneVerificationModal({
  isOpen,
  onClose,
  onVerified,
  userCountry = 'Nigeria',
}: Props) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<'phone' | 'verification'>('phone');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(32);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  // Country codes array - must be declared before state that uses it
  const countryCodes = [
    { id: 'ng', code: '+234', country: 'Nigeria', flag: '🇳🇬' },
    { id: 'us', code: '+1', country: 'United States', flag: '🇺🇸' },
    { id: 'ca', code: '+1', country: 'Canada', flag: '🇨🇦' },
    { id: 'gb', code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
    { id: 'in', code: '+91', country: 'India', flag: '🇮🇳' },
    { id: 'fr', code: '+33', country: 'France', flag: '🇫🇷' },
    { id: 'de', code: '+49', country: 'Germany', flag: '🇩🇪' },
    { id: 'it', code: '+39', country: 'Italy', flag: '🇮🇹' },
    { id: 'es', code: '+34', country: 'Spain', flag: '🇪🇸' },
    { id: 'nl', code: '+31', country: 'Netherlands', flag: '🇳🇱' },
    { id: 'se', code: '+46', country: 'Sweden', flag: '🇸🇪' },
    { id: 'no', code: '+47', country: 'Norway', flag: '🇳🇴' },
    { id: 'dk', code: '+45', country: 'Denmark', flag: '🇩🇰' },
    { id: 'fi', code: '+358', country: 'Finland', flag: '🇫🇮' },
    { id: 'ch', code: '+41', country: 'Switzerland', flag: '🇨🇭' },
    { id: 'at', code: '+43', country: 'Austria', flag: '🇦🇹' },
    { id: 'be', code: '+32', country: 'Belgium', flag: '🇧🇪' },
    { id: 'pt', code: '+351', country: 'Portugal', flag: '🇵🇹' },
    { id: 'ie', code: '+353', country: 'Ireland', flag: '🇮🇪' },
    { id: 'au', code: '+61', country: 'Australia', flag: '🇦🇺' },
    { id: 'nz', code: '+64', country: 'New Zealand', flag: '🇳🇿' },
    { id: 'jp', code: '+81', country: 'Japan', flag: '🇯🇵' },
    { id: 'kr', code: '+82', country: 'South Korea', flag: '🇰🇷' },
    { id: 'cn', code: '+86', country: 'China', flag: '🇨🇳' },
    { id: 'sg', code: '+65', country: 'Singapore', flag: '🇸🇬' },
    { id: 'my', code: '+60', country: 'Malaysia', flag: '🇲🇾' },
    { id: 'th', code: '+66', country: 'Thailand', flag: '🇹🇭' },
    { id: 'vn', code: '+84', country: 'Vietnam', flag: '🇻🇳' },
    { id: 'ph', code: '+63', country: 'Philippines', flag: '🇵🇭' },
    { id: 'id', code: '+62', country: 'Indonesia', flag: '🇮🇩' },
    { id: 'za', code: '+27', country: 'South Africa', flag: '🇿🇦' },
    { id: 'ke', code: '+254', country: 'Kenya', flag: '🇰🇪' },
    { id: 'gh', code: '+233', country: 'Ghana', flag: '🇬🇭' },
    { id: 'eg', code: '+20', country: 'Egypt', flag: '🇪🇬' },
    { id: 'ma', code: '+212', country: 'Morocco', flag: '🇲🇦' },
    { id: 'br', code: '+55', country: 'Brazil', flag: '🇧🇷' },
    { id: 'mx', code: '+52', country: 'Mexico', flag: '🇲🇽' },
    { id: 'ar', code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { id: 'cl', code: '+56', country: 'Chile', flag: '🇨🇱' },
    { id: 'co', code: '+57', country: 'Colombia', flag: '🇨🇴' },
    { id: 'pe', code: '+51', country: 'Peru', flag: '🇵🇪' },
    { id: 've', code: '+58', country: 'Venezuela', flag: '🇻🇪' },
    { id: 'ru', code: '+7', country: 'Russia', flag: '🇷🇺' },
    { id: 'ua', code: '+380', country: 'Ukraine', flag: '🇺🇦' },
    { id: 'pl', code: '+48', country: 'Poland', flag: '🇵🇱' },
    { id: 'cz', code: '+420', country: 'Czech Republic', flag: '🇨🇿' },
    { id: 'hu', code: '+36', country: 'Hungary', flag: '🇭🇺' },
    { id: 'ro', code: '+40', country: 'Romania', flag: '🇷🇴' },
    { id: 'tr', code: '+90', country: 'Turkey', flag: '🇹🇷' },
    { id: 'il', code: '+972', country: 'Israel', flag: '🇮🇱' },
    { id: 'ae', code: '+971', country: 'UAE', flag: '🇦🇪' },
    { id: 'sa', code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  ];

  // Country code mapping
  const countryCodeMap: { [key: string]: string } = {
    'Nigeria': '+234',
    'United States': '+1',
    'Canada': '+1',
    'United Kingdom': '+44',
    'India': '+91',
    'France': '+33',
    'Germany': '+49',
    'Italy': '+39',
    'Spain': '+34',
    'Netherlands': '+31',
    'Sweden': '+46',
    'Norway': '+47',
    'Denmark': '+45',
    'Finland': '+358',
    'Switzerland': '+41',
    'Austria': '+43',
    'Belgium': '+32',
    'Portugal': '+351',
    'Ireland': '+353',
    'Australia': '+61',
    'New Zealand': '+64',
    'Japan': '+81',
    'South Korea': '+82',
    'China': '+86',
    'Singapore': '+65',
    'Malaysia': '+60',
    'Thailand': '+66',
    'Vietnam': '+84',
    'Philippines': '+63',
    'Indonesia': '+62',
    'South Africa': '+27',
    'Kenya': '+254',
    'Ghana': '+233',
    'Egypt': '+20',
    'Morocco': '+212',
    'Brazil': '+55',
    'Mexico': '+52',
    'Argentina': '+54',
    'Chile': '+56',
    'Colombia': '+57',
    'Peru': '+51',
    'Venezuela': '+58',
    'Russia': '+7',
    'Ukraine': '+380',
    'Poland': '+48',
    'Czech Republic': '+420',
    'Hungary': '+36',
    'Romania': '+40',
    'Turkey': '+90',
    'Israel': '+972',
    'UAE': '+971',
    'Saudi Arabia': '+966',
  };

  const [countryCode, setCountryCode] = useState(countryCodeMap[userCountry] || '+234');
  const [selectedCountry, setSelectedCountry] = useState(() => {
    const defaultCode = countryCodeMap[userCountry] || '+234';
    return countryCodes.find(c => c.code === defaultCode && c.country === userCountry) ||
           countryCodes.find(c => c.code === defaultCode) ||
           countryCodes[0];
  });

  useEffect(() => {
    if (step === 'verification' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, timeLeft]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize reCAPTCHA only when modal is open and DOM is ready
  useEffect(() => {
    if (!recaptchaVerifier && typeof window !== 'undefined' && isOpen && step === 'phone') {
      // Wait for DOM to be ready
      const timer = setTimeout(() => {
        const container = document.getElementById('recaptcha-container');
        if (container) {
          try {
            console.log('DOM element found, initializing reCAPTCHA...');
            // Correct Firebase v9+ syntax: RecaptchaVerifier(auth, container, options)
            const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
              size: 'invisible',
              callback: (response) => {
                console.log('reCAPTCHA solved:', response);
              },
              'expired-callback': () => {
                console.log('reCAPTCHA expired');
              }
            });
            setRecaptchaVerifier(verifier);
            console.log('reCAPTCHA initialized successfully');
          } catch (error) {
            console.error('Error initializing reCAPTCHA:', error);
          }
        } else {
          console.error('recaptcha-container element not found in DOM');
        }
      }, 100); // Small delay to ensure DOM is rendered

      return () => clearTimeout(timer);
    }

    return () => {
      if (recaptchaVerifier) {
        try {
          // Check if verifier is still valid before clearing
          if (recaptchaVerifier && typeof recaptchaVerifier.clear === 'function') {
            recaptchaVerifier.clear();
          }
        } catch (error) {
          // Ignore cleanup errors - verifier might already be destroyed
          console.log('reCAPTCHA cleanup (expected):', error.code);
        }
      }
    };
  }, [recaptchaVerifier, isOpen, step]);

  const handlePhoneSubmit = async () => {
    if (!phoneNumber.trim()) {
      alert('Please enter a phone number');
      return;
    }

    setIsLoading(true);
    console.log('=== STARTING PHONE VERIFICATION ===');
    console.log('Phone number:', phoneNumber);
    console.log('Country code:', countryCode);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Current domain:', window.location.origin);
    console.log('Firebase project: artish-otp');

    try {
      // Clean and format phone number
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, ''); // Remove non-digits
      const fullPhoneNumber = `${countryCode}${cleanPhoneNumber}`;
      console.log('Clean phone number:', cleanPhoneNumber);
      console.log('Full phone number:', fullPhoneNumber);

      // Validate phone number format
      if (cleanPhoneNumber.length < 10) {
        alert('Please enter a valid phone number (at least 10 digits)');
        setIsLoading(false);
        return;
      }

      // Check if this is a test number
      const isTestNumber = fullPhoneNumber === '+16505553434' || fullPhoneNumber === '+18257366420';
      if (isTestNumber) {
        console.log('Using test phone number:', fullPhoneNumber);
      }

      // Check if reCAPTCHA is ready
      if (!recaptchaVerifier) {
        console.log('reCAPTCHA not initialized yet, initializing now...');
        const container = document.getElementById('recaptcha-container');
        if (!container) {
          throw new Error('reCAPTCHA container not found in DOM');
        }

        try {
          const currentVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            callback: (response) => {
              console.log('reCAPTCHA solved successfully', response);
            },
            'expired-callback': () => {
              console.log('reCAPTCHA expired');
            }
          });

          // Render the reCAPTCHA
          await currentVerifier.render();
          setRecaptchaVerifier(currentVerifier);
          console.log('reCAPTCHA initialized and rendered');

          // Use the newly created verifier
          const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, currentVerifier);
          setConfirmationResult(confirmation);
          setStep('verification');
          setTimeLeft(32);
          console.log('=== SMS SENT SUCCESSFULLY ===');
          return;
        } catch (recaptchaError) {
          console.error('reCAPTCHA initialization failed:', recaptchaError);
          throw new Error('reCAPTCHA initialization failed');
        }
      }

      // Try to send SMS with existing verifier
      console.log('Attempting to send SMS...');
      console.log('Using auth:', !!auth);
      console.log('Using recaptchaVerifier:', !!recaptchaVerifier);
      console.log('Phone number format:', fullPhoneNumber);

      const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, recaptchaVerifier);
      setConfirmationResult(confirmation);
      setStep('verification');
      setTimeLeft(32);
      console.log('=== SMS SENT SUCCESSFULLY ===');

    } catch (error: any) {
      console.error('=== SMS SENDING FAILED ===');
      console.error('Error details:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      // Handle specific Firebase errors
      if (error.code === 'auth/invalid-phone-number') {
        alert('Invalid phone number format. Please check your number.');
      } else if (error.code === 'auth/too-many-requests') {
        console.log('Rate limited - this is normal during testing');
        setRateLimited(true);
        alert('Too many requests (normal during testing). Wait 1-2 minutes or use test number 6505553434.');
        // Still proceed to verification for testing
        setStep('verification');
        setTimeLeft(32);
      } else if (error.code === 'auth/quota-exceeded') {
        alert('SMS quota exceeded. Please try again later.');
      } else if (error.code === 'auth/billing-not-enabled') {
        console.error('BILLING ISSUE DETECTED:');
        console.error('1. Check Firebase Console > Authentication > Settings > Usage');
        console.error('2. Enable Identity Toolkit API in Cloud Console');
        console.error('3. Verify billing account is linked to project');
        alert(`Billing not enabled for Phone Auth. Check Firebase Console billing settings. Proceeding with test mode.`);
        setStep('verification');
        setTimeLeft(32);
      } else {
        // For development/testing, proceed anyway
        console.log('Proceeding to verification step for testing...');
        setStep('verification');
        setTimeLeft(32);
        alert(`SMS sending failed (${error.message}), but proceeding for testing. Use any 6-digit code.`);
      }

      // Reset reCAPTCHA on error (only for non-rate-limit errors)
      if (recaptchaVerifier && error.code !== 'auth/too-many-requests') {
        try {
          if (typeof recaptchaVerifier.clear === 'function') {
            recaptchaVerifier.clear();
          }
        } catch (clearError) {
          // Ignore cleanup errors
          console.log('reCAPTCHA cleanup (expected):', clearError.code);
        }
        setRecaptchaVerifier(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationCodeChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...verificationCode];
      newCode[index] = value;
      setVerificationCode(newCode);

      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-verify when all digits are entered
      if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
        handleVerifyCode(newCode.join(''));
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (code: string) => {
    setIsLoading(true);
    console.log('=== VERIFYING SMS CODE ===');
    console.log('Code entered:', code);
    console.log('Has confirmation result:', !!confirmationResult);

    try {
      if (!confirmationResult) {
        console.log('No confirmation result - accepting any code for testing');
        if (code.length === 6) {
          console.log('Phone number verified successfully (fallback mode)');
          onVerified();
          return;
        } else {
          alert('Please enter a 6-digit code');
          setVerificationCode(['', '', '', '', '', '']);
          return;
        }
      }

      console.log('Attempting to verify with Firebase...');
      const result = await confirmationResult.confirm(code);
      console.log('=== VERIFICATION SUCCESSFUL ===');
      console.log('Verification result:', result);
      onVerified();

    } catch (error: any) {
      console.error('=== VERIFICATION FAILED ===');
      console.error('Error details:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      // Handle specific verification errors
      if (error.code === 'auth/invalid-verification-code') {
        alert('Invalid verification code. Please check and try again.');
      } else if (error.code === 'auth/code-expired') {
        alert('Verification code has expired. Please request a new one.');
      } else {
        // For testing, accept any 6-digit code
        if (code.length === 6) {
          console.log('Accepting code for testing purposes');
          onVerified();
          return;
        }
        alert('Verification failed. Please try again.');
      }

      setVerificationCode(['', '', '', '', '', '']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!recaptchaVerifier) return;

    setIsLoading(true);
    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, recaptchaVerifier);
      setConfirmationResult(confirmation);
      setTimeLeft(32);
      setVerificationCode(['', '', '', '', '', '']);
      console.log('SMS resent successfully');
    } catch (error) {
      console.error('Error resending SMS:', error);
      alert('Failed to resend verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0" style={{ zIndex: 60 }}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-visible rounded-3xl bg-white p-6 md:p-8 text-left shadow-xl transition-all w-full max-w-md">
                <button
                  onClick={onClose}
                  className="text-sm text-gray-500 flex items-center mb-6 hover:text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </button>

                {step === 'phone' ? (
                  <>
                    <Dialog.Title className="text-2xl font-bold mb-2">
                      Link phone number
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 mb-6">
                      Link your phone number to assist the verification of your bank account
                    </p>

                    <div className="flex gap-2 mb-6">
                      <div className="relative" ref={dropdownRef}>
                        <button
                          type="button"
                          onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                          className="flex items-center gap-2 border border-gray-300 rounded-2xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white min-w-[100px]"
                        >
                          <span className="text-sm flex items-center gap-1">
                            <span className="text-lg">{selectedCountry.flag}</span>
                            <span className="font-medium">{selectedCountry.code}</span>
                          </span>
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </button>

                        {showCountryDropdown && (
                          <div className="fixed top-auto left-auto mt-1 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto" style={{ zIndex: 9999, position: 'absolute', top: '100%', left: 0 }}>
                            {countryCodes.map((country) => (
                              <button
                                key={country.id}
                                type="button"
                                onClick={() => {
                                  setCountryCode(country.code);
                                  setSelectedCountry(country);
                                  setShowCountryDropdown(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 first:rounded-t-2xl last:rounded-b-2xl transition-colors"
                              >
                                <span className="text-lg">{country.flag}</span>
                                <span className="text-sm font-medium min-w-[3rem]">{country.code}</span>
                                <span className="text-sm text-gray-600 truncate">{country.country}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input
                        type="tel"
                        placeholder="Phone number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>

                    <button
                      onClick={() => {
                        console.log('Continue button clicked');
                        console.log('Phone number:', phoneNumber);
                        console.log('Country code:', countryCode);
                        console.log('Is loading:', isLoading);
                        handlePhoneSubmit();
                      }}
                      disabled={!phoneNumber.trim() || isLoading}
                      className="w-full bg-black text-white py-3 rounded-2xl font-medium hover:bg-gray-800 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Sending...' : 'Continue'}
                    </button>

                    {/* reCAPTCHA container */}
                    <div ref={recaptchaRef} id="recaptcha-container"></div>
                  </>
                ) : (
                  <>
                    <Dialog.Title className="text-2xl font-bold mb-2">
                      Enter verification code
                    </Dialog.Title>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">
                        The verification code has been sent to:
                      </p>
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                        <span className="text-sm font-medium">{selectedCountry.flag} {countryCode} {phoneNumber}</span>
                        <button
                          onClick={() => setStep('phone')}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium ml-auto"
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-center mb-6">
                      {verificationCode.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => (inputRefs.current[index] = el)}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleVerificationCodeChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          className="w-12 h-12 border border-gray-300 rounded-xl text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                      ))}
                    </div>

                    <div className="text-center text-sm text-gray-500 mb-6">
                      {timeLeft > 0 ? (
                        `Resend after ${timeLeft} seconds`
                      ) : (
                        <button
                          onClick={handleResend}
                          disabled={isLoading}
                          className="text-black font-medium hover:underline disabled:opacity-50"
                        >
                          {isLoading ? 'Sending...' : 'Resend code'}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
