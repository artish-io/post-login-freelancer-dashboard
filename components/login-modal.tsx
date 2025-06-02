// src/components/login-modal.tsx

import Image from "next/image";

export default function LoginModal() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EB1669] px-4 py-8">
      <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-md">
        <h1 className="text-3xl font-extrabold text-center mb-2">Login</h1>
        <p className="text-sm font-semibold text-center mb-6">Welcome back!</p>

        <form className="space-y-4">
          <input
            type="email"
            placeholder="E-mail"
            className="w-full px-4 py-2 border border-black rounded-md outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-2 border border-black rounded-md outline-none"
          />

          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded-md font-semibold"
          >
            Login
          </button>

          <hr className="border-t border-gray-300" />

          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 border border-black py-2 rounded-md"
          >
            <Image
              src="/google-icon.png"
              alt="Google logo"
              width={16}
              height={16}
            />
            <span className="text-sm font-medium">Login with Google</span>
          </button>
        </form>

        <p className="text-center mt-4 text-sm">
          <a href="#" className="underline font-semibold">
            Forgot Password?
          </a>
        </p>
      </div>
    </div>
  );
}
