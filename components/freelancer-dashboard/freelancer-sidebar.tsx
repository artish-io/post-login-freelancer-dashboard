'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

const sidebarItems = [
  { label: 'Home', icon: '/home-logo (sidebar).png', href: '#' },
  { label: 'Explore Gigs', icon: '/explore-gigs-logo (sidebar).png', href: '#' },
  { label: 'Messages', icon: '/messages-logo (sidebar).png', href: '/freelancer-dashboard/messages' },
  { label: 'Gig Requests', icon: '/gig-requests-logo (sidebar).png', href: '#' },
  { label: 'Projects & Invoices', icon: '/projects-invoices-logo (sidebar).png', href: '/freelancer-dashboard/projects-and-invoices' },
  { label: 'Wallet', icon: '/wallet-logo (sidebar).png', href: '#' },
  { label: 'Storefront', icon: '/storefront-logo (sidebar).png', href: '#' },
  { label: 'Settings', icon: '/account-settings-logo (sidebar).png', href: '#' },
];

export default function FreelancerSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { data: session } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchUnread = async () => {
      try {
        const res = await fetch(`/api/dashboard/messages/count?userId=${session.user.id}`);
        const data = await res.json();
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      } catch (err) {
        console.error('[sidebar] Failed to fetch unread count:', err);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);

    return () => clearInterval(interval);
  }, [session?.user?.id]);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-black text-white rounded-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        ☰
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

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
                    <Image src={item.icon} alt={item.label} width={20} height={20} />
                    {isMessages && unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-pink-300 text-pink-900 rounded-full px-1.5 text-[10px] font-semibold md:hidden">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="md:inline hidden">
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