'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const sidebarItems = [
  { label: 'Home', icon: '/home-logo (sidebar).png', href: '#' },
  { label: 'Explore Gigs', icon: '/explore-gigs-logo (sidebar).png', href: '#' },
  { label: 'Messages', icon: '/messages-logo (sidebar).png', href: '#' },
  { label: 'Gig Requests', icon: '/gig-requests-logo (sidebar).png', href: '#' },
  { label: 'Projects & Invoices', icon: '/projects-invoices-logo (sidebar).png', href: '#' },
  { label: 'Wallet', icon: '/wallet-logo (sidebar).png', href: '#' },
  { label: 'Storefront', icon: '/storefront-logo (sidebar).png', href: '#' },
  { label: 'Settings', icon: '/account-settings-logo (sidebar).png', href: '#' },
];

export default function FreelancerSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-black text-white rounded-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        ☰
      </button>

      {/* Overlay for mobile when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-60 bg-black text-white z-50 transform
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:relative md:block
        `}
      >
        <div className="px-6 pt-8 pb-10 flex flex-col gap-8">
          <nav className="flex flex-col gap-6">
            {sidebarItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 text-pink-200 hover:text-white text-sm"
              >
                <Image src={item.icon} alt={item.label} width={20} height={20} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}