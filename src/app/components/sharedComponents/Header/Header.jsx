"use client";

import { useAuth } from "@/app/hooks/useAuth";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  Cog6ToothIcon,
  HomeIcon,
  NewspaperIcon,
  UserCircleIcon,
  UserGroupIcon,
  VideoCameraIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const Header = () => {
  const { user, logout, isAuthenticated, initialLoadDone } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const profileMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();

  // Navigation items
  const navItems = [
    { name: "Home", href: "/", icon: HomeIcon },
    { name: "Posts", href: "/posts", icon: NewspaperIcon },
    { name: "Videos", href: "/videos", icon: VideoCameraIcon },
    { name: "Message", href: "/message", icon: MessageCircle },
    { name: "Community", href: "/community", icon: UserGroupIcon },
  ];

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && !event.target.closest('.mobile-menu-button')) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    setIsProfileMenuOpen(false);
    router.push("/auth/login");
  };

  const handleGetStarted = () => {
    router.push("/auth/login");
  };

  const handleProfileClick = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  const handleProfileNavigate = () => {
    setIsProfileMenuOpen(false);
    router.push(`/profile/${user?._id || user?.id}`);
  };

  // Don't render anything until initial auth check is complete
  if (!initialLoadDone) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center shrink-0">
              <Link href="/" className="group">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-linear-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg sm:text-xl">BD</span>
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold bg-linear-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                      BD BOOK
                    </h1>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      {/* Main Header - Always at top */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "backdrop-blur-xl bg-black/30 border-b border-white/10 shadow-lg" 
          : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Logo Section - Left */}
            <div className="flex items-center shrink-0">
              <Link href="/" className="group">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-linear-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                    <span className="text-white font-bold text-lg sm:text-xl">BD</span>
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold bg-linear-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                      BD BOOK
                    </h1>
                    <p className="text-[10px] sm:text-xs text-white/50 hidden sm:block">Connect & Share</p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation - Center (Hidden on mobile) */}
            <nav className="hidden md:flex items-center justify-center space-x-1 lg:space-x-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`relative px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 group ${
                      isActive
                        ? "text-white bg-white/10 backdrop-blur-sm"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 transition-all duration-300 ${
                        isActive ? "text-purple-400" : "group-hover:text-purple-400"
                      }`} />
                      <span>{item.name}</span>
                    </div>
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-purple-500 to-blue-500 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right Section - Get Started / User Profile */}
            <div className="flex items-center gap-3">
              {isAuthenticated && user ? (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={handleProfileClick}
                    className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 group"
                  >
                    {user.profilePicture?.url ? (
                      <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-purple-500/50 group-hover:border-purple-500 transition-all">
                        <Image
                          src={user.profilePicture.url}
                          alt={user.fullName || user.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-linear-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                        <UserCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                    )}
                    <span className="hidden sm:block text-white font-medium text-sm">
                      {user.fullName?.split(" ")[0] || user.name?.split(" ")[0] || "User"}
                    </span>
                  </button>

                  {/* Profile Dropdown Menu */}
                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl backdrop-blur-xl bg-black/70 border border-white/20 shadow-2xl overflow-hidden animate-fadeInDown">
                      <div className="py-2">
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-white/10">
                          <p className="text-white font-semibold text-sm">
                            {user.fullName || user.name}
                          </p>
                          <p className="text-white/50 text-xs mt-1">{user.email}</p>
                        </div>
                        
                        {/* Menu Items */}
                        <button
                          onClick={handleProfileNavigate}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group"
                        >
                          <UserCircleIcon className="h-5 w-5 group-hover:text-purple-400 transition-colors" />
                          <span className="text-sm">Profile</span>
                        </button>
                        
                        <Link
                          href="/settings"
                          className="flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <Cog6ToothIcon className="h-5 w-5 group-hover:text-purple-400 transition-colors" />
                          <span className="text-sm">Settings</span>
                        </Link>
                        
                        <div className="border-t border-white/10 my-1"></div>
                        
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 group"
                        >
                          <ArrowRightOnRectangleIcon className="h-5 w-5 group-hover:rotate-180 transition-transform duration-300" />
                          <span className="text-sm">Log out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleGetStarted}
                  className="px-4 sm:px-6 py-1.5 sm:py-2 bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-sm sm:text-base"
                >
                  Get Started
                </button>
              )}

              {/* Mobile Menu Button - Only visible on mobile */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 mobile-menu-button"
              >
                {isMenuOpen ? (
                  <XMarkIcon className="h-6 w-6 text-white" />
                ) : (
                  <Bars3Icon className="h-6 w-6 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar - Only visible on mobile, fixed at bottom */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="backdrop-blur-xl bg-black/70 border-t border-white/20 shadow-2xl">
          <div className="flex items-center justify-around px-4 py-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 ${
                    isActive
                      ? "text-purple-400"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-purple-400" : ""}`} />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Hamburger Menu - Overlay when menu is open */}
      {isMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden fixed inset-0 z-45 mt-16 mx-4 rounded-2xl backdrop-blur-xl bg-black/70 border border-white/20 shadow-2xl overflow-hidden animate-slideDown"
          style={{ height: 'auto', maxHeight: 'calc(100vh - 80px)', top: '64px' }}
        >
          <div className="py-3 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                    isActive
                      ? "bg-white/10 text-white border-l-4 border-purple-500"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-purple-400" : ""}`} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
            
            {!isAuthenticated && (
              <div className="border-t border-white/10 mt-2 pt-2">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleGetStarted();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span className="font-medium">Get Started</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add padding to body to prevent content from being hidden under fixed header and bottom nav */}
      <style jsx global>{`
        body {
          padding-top: 64px;
          padding-bottom: 0px;
        }
        @media (min-width: 768px) {
          body {
            padding-top: 80px;
          }
        }
        @media (max-width: 768px) {
          body {
            padding-bottom: 64px;
          }
        }
      `}</style>
    </>
  );
};

export default Header;