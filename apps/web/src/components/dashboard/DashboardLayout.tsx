"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, isAdmin, isInfluencer } = useAuth();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-turquoise rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">P</span>
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">
                  PawGo
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
              {isAdmin && (
                <>
                  <Link
                    href="/dashboard/analytics"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Estadísticas
                  </Link>
                  <Link
                    href="/dashboard/influencers"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Influencers
                  </Link>
                  <Link
                    href="/dashboard/discount-codes"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Códigos
                  </Link>
                  <Link
                    href="/dashboard/influencer-payments"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Pagos
                  </Link>
                  <Link
                    href="/dashboard/products"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Productos
                  </Link>
                  <Link
                    href="/dashboard/leads"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Leads
                  </Link>
                  <Link
                    href="/dashboard/orders"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Órdenes
                  </Link>
                </>
              )}
              {isInfluencer && (
                <>
                  <Link
                    href="/dashboard/influencer/payments"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Mis Pagos
                  </Link>
                  <Link
                    href="/dashboard/influencer/payment-info"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Datos Bancarios
                  </Link>
                </>
              )}
              {/* <Link
                href="/dashboard/profile"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg transition-colors"
              >
                Perfil
              </Link> */}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-primary-turquoise focus:ring-offset-2 rounded-lg p-1"
                >
                  <div className="w-10 h-10 bg-primary-turquoise rounded-full flex items-center justify-center text-white font-semibold">
                    {getInitials(user?.name, user?.email)}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.name || "Usuario"}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400 hidden md:block"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                      <div className="py-1">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">
                            {user?.name || "Usuario"}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {user?.email}
                          </p>
                        </div>
                        <Link
                          href="/dashboard/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          Ver Perfil
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {showMobileMenu ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/dashboard"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg"
                onClick={() => setShowMobileMenu(false)}
              >
                Dashboard
              </Link>
              {isAdmin && (
                <>
                  <Link
                    href="/dashboard/analytics"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Estadísticas
                  </Link>
                  <Link
                    href="/dashboard/influencers"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Influencers
                  </Link>
                  <Link
                    href="/dashboard/discount-codes"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Códigos
                  </Link>
                  <Link
                    href="/dashboard/influencer-payments"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Pagos
                  </Link>
                  <Link
                    href="/dashboard/products"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Productos
                  </Link>
                  <Link
                    href="/dashboard/leads"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Leads
                  </Link>
                  <Link
                    href="/dashboard/orders"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Órdenes
                  </Link>
                </>
              )}
              {isInfluencer && (
                <Link
                  href="/dashboard/influencer/payments"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Mis Pagos
                </Link>
              )}
              {/* <Link
                href="/dashboard/profile"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-turquoise hover:bg-gray-50 rounded-lg"
                onClick={() => setShowMobileMenu(false)}
              >
                Perfil
              </Link> */}
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-lg"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
