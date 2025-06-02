// src/components/password-reset-confirmation.tsx

import Image from "next/image";

export default function PasswordResetConfirmation() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EB1669]">
      <div className="bg-white rounded-xl p-8 w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold mb-6">Reset Link Sent</h1>

        <Image
          src="/email-sent.png"
          alt="Email sent icon"
          width={120}
          height={120}
          className="mx-auto mb-6"
        />

        <p className="text-sm font-medium">Check your email</p>
      </div>
    </div>
  );
}
