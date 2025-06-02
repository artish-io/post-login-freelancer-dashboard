'use client';

import Image from 'next/image';

export default function CreateGigBanner() {
  return (
    <div className="bg-[#FCD5E3] rounded-xl mt-4 mb-8 px-6 py-6 flex items-center justify-between w-full max-w-7xl mx-auto">
      {/* Left Side: Text and Avatars */}
      <div className="flex items-center gap-4">
        <h2 className="text-[48px] font-bold text-black leading-none">
          Create gig listing for this search
        </h2>
        {/* Avatar stack */}
        <div className="flex -space-x-4 ml-4">
          <Image
            src="/user-sample.png"
            alt="User 1"
            width={48}
            height={48}
            className="rounded-full border-2 border-white"
          />
          <Image
            src="/user-sample2.png"
            alt="User 2"
            width={48}
            height={48}
            className="rounded-full border-2 border-white"
          />
          <Image
            src="/user-sample3.png"
            alt="User 3"
            width={48}
            height={48}
            className="rounded-full border-2 border-white"
          />
        </div>
      </div>

      {/* CTA Button */}
      <button className="bg-black text-white px-6 py-3 rounded-md text-sm font-semibold flex items-center gap-2">
        <Image
          src="/+-sign.png"
          alt="Plus"
          width={12}
          height={12}
        />
        Post a Gig
      </button>
    </div>
  );
}