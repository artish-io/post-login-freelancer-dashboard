"use client";
import type { NextPage } from "next";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import CartIcon from "./storefront/cart-icon";

export type Navbar1Type = {
  className?: string;
};

const Navbar1: NextPage<Navbar1Type> = ({
  className = "",
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  return (
    <>
      {/* Main Navbar */}
      <nav className={`w-full bg-white border-b border-gray-200 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center">
                <div className="h-12 w-auto bg-[url('/content@3x.png')] bg-contain bg-no-repeat bg-center" style={{ width: '200px' }}>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <Link href="/post-gig" className="text-gray-900 hover:text-gray-600 px-3 py-2 text-sm font-medium">
                  Post A Gig
                </Link>
                <Link href="/blog" className="text-gray-900 hover:text-gray-600 px-3 py-2 text-sm font-medium">
                  Blog
                </Link>
                <div className="relative group">
                  <button className="text-gray-900 hover:text-gray-600 px-3 py-2 text-sm font-medium flex items-center gap-1">
                    About Us
                    <Image src="/chevron-down.svg" alt="Chevron Down" width={16} height={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <CartIcon />
              <Link href="/login" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Login
              </Link>
              <Link href="/get-started" className="bg-black text-white hover:bg-gray-800 px-4 py-2 rounded-lg text-sm font-medium">
                Get Started
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-4">
              <CartIcon />
              {/* Mobile Login Button */}
              <Link href="/login" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Login
              </Link>

              {/* Hamburger Menu */}
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <span className="sr-only">Open main menu</span>
                {!isMobileMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={toggleMobileMenu}
          ></div>

          {/* Sidebar */}
          <div className="fixed top-0 right-0 h-full w-64 bg-white shadow-lg z-50 md:hidden transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <span className="text-lg font-semibold">Menu</span>
                <button
                  onClick={toggleMobileMenu}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 px-4 py-6 space-y-4">
                <Link
                  href="/post-gig"
                  className="block px-3 py-2 text-base font-medium text-gray-900 hover:text-gray-600"
                  onClick={toggleMobileMenu}
                >
                  Post A Gig
                </Link>
                <Link
                  href="/blog"
                  className="block px-3 py-2 text-base font-medium text-gray-900 hover:text-gray-600"
                  onClick={toggleMobileMenu}
                >
                  Blog
                </Link>
                <Link
                  href="/about"
                  className="block px-3 py-2 text-base font-medium text-gray-900 hover:text-gray-600"
                  onClick={toggleMobileMenu}
                >
                  About Us
                </Link>
              </div>

              {/* Bottom Actions */}
              <div className="p-4 border-t border-gray-200">
                <Link
                  href="/get-started"
                  className="block w-full bg-black text-white text-center py-3 px-4 rounded-lg text-sm font-medium hover:bg-gray-800"
                  onClick={toggleMobileMenu}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navbar1;
