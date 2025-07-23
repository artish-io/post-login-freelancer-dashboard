'use client';

import Image from 'next/image';
import SmoothLink from '../ui/smooth-link';
import { usePathname } from 'next/navigation';
import { useUnreadMessages } from '../../src/hooks/useUnreadMessages';

const sidebarItems = [
  { label: 'Home', icon: '/side-bar-logos/commisoners/home.png', href: '/commissioner-dashboard' },
  { label: 'Discover Talent', icon: '/side-bar-logos/commisoners/discover-talent.png', href: '/commissioner-dashboard/discover-talent' },
  { label: 'Messages', icon: '/side-bar-logos/commisoners/messages.png', href: '/commissioner-dashboard/messages' },
  { label: 'Job Listings', icon: '/side-bar-logos/commisoners/job-listings.png', href: '/commissioner-dashboard/job-listings' },
  { label: 'Projects & Invoices', icon: '/side-bar-logos/commisoners/projects+invoices.png', href: '/commissioner-dashboard/projects-and-invoices' },
  { label: 'Payments', icon: '/side-bar-logos/commisoners/payments.png', href: '/commissioner-dashboard/payments' },
  { label: 'Storefront', icon: '/side-bar-logos/commisoners/storefront.png', href: '/commissioner-dashboard/storefront' },
  { label: 'Settings', icon: '/side-bar-logos/commisoners/settings.png', href: '/commissioner-dashboard/settings' },
];

interface CommissionerSidebarProps {
  isMobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

export default function CommissionerSidebar({
  isMobileMenuOpen = false,
  onMobileMenuClose,
}: CommissionerSidebarProps = {}) {
  const pathname = usePathname();
  const { unreadCount } = useUnreadMessages();

  const isActive = (label: string) => {
    switch (label) {
      case 'Home':
        return pathname === '/commissioner-dashboard';
      case 'Discover Talent':
        return pathname === '/commissioner-dashboard/discover-talent';
      case 'Messages':
        return pathname === '/commissioner-dashboard/messages';
      case 'Job Listings':
        return pathname === '/commissioner-dashboard/job-listings';
      case 'Projects & Invoices':
        return pathname === '/commissioner-dashboard/projects-and-invoices';
      case 'Payments':
        return pathname === '/commissioner-dashboard/payments';
      case 'Storefront':
        return pathname === '/commissioner-dashboard/storefront';
      case 'Settings':
        return pathname.startsWith('/commissioner-dashboard/settings');
      default:
        return false;
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={onMobileMenuClose}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed top-20 left-0 h-[calc(100vh-80px)] w-60 bg-black text-white z-40">
        <div className="px-6 pt-8 pb-10 flex flex-col gap-8">
          <nav className="flex flex-col gap-6">
            {sidebarItems.map(({ label, icon, href }) => (
              <SmoothLink
                key={label}
                href={href}
                className={`flex items-center gap-3 text-sm transition-all ${
                  isActive(label)
                    ? 'text-white font-semibold border-l-4 border-pink-300 pl-2'
                    : 'text-pink-200 hover:text-white'
                }`}
              >
                <Image src={icon} alt={label} width={20} height={20} />
                <span>
                  {label}
                  {label === 'Messages' && unreadCount > 0 && (
                    <span className="ml-2 bg-pink-200 text-pink-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </span>
              </SmoothLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Icon-only (md-lg) */}
      <aside className="hidden md:block lg:hidden fixed top-20 left-0 h-[calc(100vh-80px)] w-16 bg-black text-white z-40">
        <div className="px-3 pt-8 pb-10 flex flex-col gap-8">
          <nav className="flex flex-col gap-6">
            {sidebarItems.map(({ label, icon, href }) => (
              <SmoothLink
                key={label}
                href={href}
                className={`flex items-center justify-center p-2 rounded-lg transition-all ${
                  isActive(label)
                    ? 'text-white bg-pink-600'
                    : 'text-pink-200 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Image src={icon} alt={label} width={20} height={20} />
                {label === 'Messages' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-pink-300 text-pink-900 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-semibold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </SmoothLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile slide-out */}
      <aside
        className={`fixed top-0 left-0 h-screen w-60 bg-black text-white z-50 transform transition-transform duration-300 ease-in-out sm:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-6 pt-8 pb-10 flex flex-col gap-8">
          <nav className="flex flex-col gap-6">
            {sidebarItems.map(({ label, icon, href }) => (
              <SmoothLink
                key={label}
                href={href}
                onClick={onMobileMenuClose}
                className={`flex items-center gap-3 text-sm transition-all ${
                  isActive(label)
                    ? 'text-white font-semibold border-l-4 border-pink-300 pl-2'
                    : 'text-pink-200 hover:text-white'
                }`}
              >
                <Image src={icon} alt={label} width={20} height={20} />
                <span>
                  {label}
                  {label === 'Messages' && unreadCount > 0 && (
                    <span className="ml-2 bg-pink-200 text-pink-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </span>
              </SmoothLink>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}