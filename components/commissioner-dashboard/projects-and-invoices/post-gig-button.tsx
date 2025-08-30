'use client';

interface PostGigButtonProps {
  onClick?: () => void;
}

export default function PostGigButton({ onClick }: PostGigButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-black text-white px-6 py-4 rounded-xl font-medium text-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 shadow-lg border border-white/20 backdrop-blur-sm"
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      }}
    >
      <span className="text-xl">+</span>
      <span>Post a Gig</span>
    </button>
  );
}
