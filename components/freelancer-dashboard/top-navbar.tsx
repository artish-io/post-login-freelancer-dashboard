'use client';

import Image from 'next/image';

export default function TopNavbar() {
  return (
    <div className="flex items-center justify-between w-full px-6 py-4 bg-white border-b border-gray-200">
      {/* Logo only */}
      <Image
        src="/artish-logo.png"
        alt="Artish Logo"
        width={32}
        height={32}
      />

      {/* Icons */}
      <div className="flex items-center gap-4">
        <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition">
          <Image src="/bell-icon.png" alt="Notifications" width={20} height={20} />
        </button>

        <Image
          src="/avatar.png"
          alt="User Avatar"
          width={36}
          height={36}
          className="rounded-full border-2 border-white"
        />
      </div>
    </div>
  );
}