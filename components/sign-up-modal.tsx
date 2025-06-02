import Image from "next/image";

export default function SignUpModal() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#eb1966] px-4 py-12">
      <div className="bg-white rounded-xl w-full max-w-md p-8 shadow-md">
        <h1 className="text-3xl font-extrabold text-center mb-2">Join Now</h1>
        <p className="text-sm font-semibold text-center text-black mb-6">
          Sign up to connect with freelance creators
        </p>

        <form className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="E-mail"
            className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none"
          />

          <button
            type="submit"
            className="bg-black text-white rounded-md py-2 text-sm font-semibold hover:bg-opacity-90 transition"
          >
            Sign Up
          </button>
        </form>

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
            <a href="#" className="underline font-semibold">
              Log In
            </a>
          </p>
          <p className="mt-1">
            <a href="#" className="underline">
              Forgot Password?
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
