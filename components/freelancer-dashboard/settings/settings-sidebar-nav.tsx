

'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import clsx from 'clsx';

const settingsLinks = [
  { label: 'Account', href: '/freelancer-dashboard/settings?tab=account' },
  { label: 'Preferences', href: '/freelancer-dashboard/settings/preferences' },
  { label: 'Help', href: '/freelancer-dashboard/settings/help' },
  { label: 'Withdrawals & Payouts', href: '/freelancer-dashboard/settings?tab=payouts' },
  { label: 'Logout', href: '/logout' },
];

export default function SettingsSidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'account';

  const isActive = (href: string) => {
    if (href.includes('?tab=')) {
      const tab = href.split('?tab=')[1];
      return pathname === '/freelancer-dashboard/settings' && currentTab === tab;
    }
    return pathname === href;
  };

  return (
    <nav className="flex flex-col gap-4 text-sm font-medium">
      {settingsLinks.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx(
            'px-2 py-1.5 rounded hover:text-black transition',
            isActive(item.href) ? 'text-black font-semibold' : 'text-gray-500'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}