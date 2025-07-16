'use client';

import Image from 'next/image';

export default function CreateGigBanner() {
  return (
    <div className="bg-[#FCD5E3] rounded-xl mt-4 mb-2 px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between w-full max-w-7xl mx-auto gap-4 sm:gap-0">
      {/* Left Side: Text and Avatars */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[48px] font-bold text-black leading-tight sm:leading-none">
          Create gig listing for this search
        </h2>
        {/* Avatar stack - hidden on mobile */}
        <div className="hidden sm:flex -space-x-4 sm:ml-4">
          <Image
            src="/user-sample.png"
            alt="User 1"
            width={40}
            height={40}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white"
          />
          <Image
            src="/user-sample2.png"
            alt="User 2"
            width={40}
            height={40}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white"
          />
          <Image
            src="/user-sample3.png"
            alt="User 3"
            width={40}
            height={40}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white"
          />
        </div>
      </div>

      {/* CTA Button */}
      <button className="bg-black text-white px-4 sm:px-6 py-2 sm:py-3 rounded-md text-xs sm:text-sm font-semibold flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
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