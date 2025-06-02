// src/components/reset-password-modal.tsx

export default function ResetPasswordModal() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EB1669] px-4 py-8">
      <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-md text-center">
        <h1 className="text-3xl font-extrabold mb-2">Reset Password</h1>
        <p className="text-sm font-semibold mb-6">
          We’ll send a one-time reset link to your email
        </p>

        <form className="space-y-4">
          <input
            type="email"
            placeholder="E-mail"
            className="w-full px-4 py-2 border border-black rounded-md outline-none"
          />
          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded-md font-semibold"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
