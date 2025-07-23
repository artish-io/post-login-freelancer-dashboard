'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { 
  Home, 
  FolderOpen, 
  Users, 
  BarChart3, 
  MessageSquare, 
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/commissioner-dashboard', icon: Home },
  { name: 'Projects', href: '/commissioner-dashboard/projects', icon: FolderOpen },
  { name: 'Freelancers', href: '/commissioner-dashboard/freelancers', icon: Users },
  { name: 'Analytics', href: '/commissioner-dashboard/analytics', icon: BarChart3 },
  { name: 'Messages', href: '/commissioner-dashboard/messages', icon: MessageSquare },
  { name: 'Settings', href: '/commissioner-dashboard/settings', icon: Settings },
];

export default function CommissionerNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login-commissioner' });
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4 mb-8">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">👔</span>
            </div>
            <span className="ml-3 text-lg font-semibold text-gray-900">Commissioner</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-pink-50 text-pink-700 border-r-2 border-pink-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive ? 'text-pink-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200">
            <div className="flex items-center">
              <Image
                className="inline-block h-10 w-10 rounded-full border-2 border-pink-200"
                src={session?.user?.image || '/avatars/default-avatar.png'}
                alt={session?.user?.name || 'User'}
                width={40}
                height={40}
              />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {session?.user?.name || 'Commissioner'}
                </p>
                <p className="text-xs text-gray-500">Product Manager</p>
              </div>
              <button
                onClick={handleSignOut}
                className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navbar */}
      <div className="lg:hidden">
        {/* Mobile header */}
        <div className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">👔</span>
            </div>
            <span className="ml-3 text-lg font-semibold text-gray-900">Commissioner</span>
          </div>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-400 hover:text-gray-600 transition"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative flex flex-col w-full max-w-xs bg-white">
              <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
                {/* Mobile Navigation */}
                <nav className="flex-1 px-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive
                            ? 'bg-pink-50 text-pink-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <item.icon
                          className={`mr-3 h-5 w-5 ${
                            isActive ? 'text-pink-500' : 'text-gray-400 group-hover:text-gray-500'
                          }`}
                        />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>

                {/* Mobile User Profile */}
                <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Image
                        className="inline-block h-10 w-10 rounded-full border-2 border-pink-200"
                        src={session?.user?.image || '/avatars/default-avatar.png'}
                        alt={session?.user?.name || 'User'}
                        width={40}
                        height={40}
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {session?.user?.name || 'Commissioner'}
                        </p>
                        <p className="text-xs text-gray-500">Product Manager</p>
                      </div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="p-2 text-gray-400 hover:text-gray-600 transition"
                      title="Sign out"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
