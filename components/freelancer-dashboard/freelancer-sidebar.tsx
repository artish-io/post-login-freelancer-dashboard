"use client";

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUnreadMessages } from '../../src/hooks/useUnreadMessages';

const sidebarItems = [
  { label: 'Home', icon: '/home-logo (sidebar).png', href: '/freelancer-dashboard' },
  { label: 'Explore Gigs', icon: '/explore-gigs-logo (sidebar).png', href: '#' },
  { label: 'Messages', icon: '/messages-logo (sidebar).png', href: '/freelancer-dashboard/messages' },
  { label: 'Gig Requests', icon: '/gig-requests-logo (sidebar).png', href: '#' },
  { label: 'Projects & Invoices', icon: '/projects-invoices-logo (sidebar).png', href: '/freelancer-dashboard/projects-and-invoices' },
  { label: 'Wallet', icon: '/wallet-logo (sidebar).png', href: '#' },
  { label: 'Storefront', icon: '/storefront-logo (sidebar).png', href: '#' },
  { label: 'Settings', icon: '/account-settings-logo (sidebar).png', href: '#' },
];

interface FreelancerSidebarProps {
  isMobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

export default function FreelancerSidebar({
  isMobileMenuOpen = false,
  onMobileMenuClose
}: FreelancerSidebarProps = {}) {
  const pathname = usePathname();
  const { unreadCount } = useUnreadMessages();

  return (
    <>
      {/* Mobile Overlay for small screens */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={onMobileMenuClose}
        />
      )}

      {/* Desktop Sidebar (lg+) */}
      <aside className="hidden lg:block fixed top-[80px] left-0 h-[calc(100vh-80px)] w-60 bg-black text-white z-40">
        <div className="px-6 pt-8 pb-10 flex flex-col gap-8">
          <nav className="flex flex-col gap-6">
            {sidebarItems.map((item) => {
              const isMessages = item.label === 'Messages';
              const isActive = pathname.startsWith(item.href) && item.href !== '#';

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 text-sm relative transition-all ${
                    isActive
                      ? 'text-white font-semibold border-l-4 border-pink-300 pl-2'
                      : 'text-pink-200 hover:text-white'
                  }`}
                >
                  <div className="relative">
                    <Image
                      src={item.icon}
                      alt={item.label}
                      width={20}
                      height={20}
                    />
                  </div>
                  <span>
                    {item.label}
                    {isMessages && unreadCount > 0 && (
                      <span className="ml-2 bg-pink-200 text-pink-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Icon-Only Sidebar for large mobile (md-lg) */}
      <aside className="hidden md:block lg:hidden fixed top-[80px] left-0 h-[calc(100vh-80px)] w-16 bg-black text-white z-40">
        <div className="px-3 pt-8 pb-10 flex flex-col gap-8">
          <nav className="flex flex-col gap-6">
            {sidebarItems.map((item) => {
              const isMessages = item.label === 'Messages';
              const isActive = pathname.startsWith(item.href) && item.href !== '#';

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center justify-center relative transition-all p-2 rounded-lg ${
                    isActive
                      ? 'text-white bg-pink-600'
                      : 'text-pink-200 hover:text-white hover:bg-gray-800'
                  }`}
                  title={item.label}
                >
                  <div className="relative">
                    <Image
                      src={item.icon}
                      alt={item.label}
                      width={20}
                      height={20}
                    />
                    {isMessages && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-pink-300 text-pink-900 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-semibold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Slide-out Menu for small screens (sm and below) */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-60 bg-black text-white z-50 transform
          transition-transform duration-300 ease-in-out sm:hidden
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="px-6 pt-8 pb-10 flex flex-col gap-8">
          <nav className="flex flex-col gap-6">
            {sidebarItems.map((item) => {
              const isMessages = item.label === 'Messages';
              const isActive = pathname.startsWith(item.href) && item.href !== '#';

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onMobileMenuClose}
                  className={`flex items-center gap-3 text-sm relative transition-all ${
                    isActive
                      ? 'text-white font-semibold border-l-4 border-pink-300 pl-2'
                      : 'text-pink-200 hover:text-white'
                  }`}
                >
                  <div className="relative">
                    <Image
                      src={item.icon}
                      alt={item.label}
                      width={20}
                      height={20}
                    />
                  </div>
                  <span>
                    {item.label}
                    {isMessages && unreadCount > 0 && (
                      <span className="ml-2 bg-pink-200 text-pink-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
