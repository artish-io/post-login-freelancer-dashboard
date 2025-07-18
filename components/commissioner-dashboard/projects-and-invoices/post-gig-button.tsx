'use client';

interface PostGigButtonProps {
  onClick?: () => void;
}

export default function PostGigButton({ onClick }: PostGigButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-black text-white px-6 py-4 rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center gap-2"
    >
      <span className="text-xl">+</span>
      <span>Post a Gig</span>
    </button>
  );
}
