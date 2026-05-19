'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import NotificationDropdown from '@/components/NotificationDropdown'
import { 
  LayoutDashboard, 
  Target,
  LogOut, 
  Menu, 
  X,
  Bell,
  Search,
  Settings,
  Calendar
} from 'lucide-react'

const sidebarItems = [
  { name: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
  { name: 'Goal Center', href: '/employee/goals/new', icon: Target },
  { name: 'Quarterly Updates', href: '/employee/checkins', icon: Calendar },
]

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  
  const { user, profile: authProfile, fetchUser, clearUser } = useAuthStore()

  useEffect(() => {
    // Determine initial sidebar state based on viewport width
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true)
      } else {
        setIsSidebarOpen(false)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const profile = authProfile ? {
    id: authProfile.id,
    full_name: authProfile.full_name || 'Employee',
    email: authProfile.email || user?.email || ''
  } : user ? {
    id: user.id,
    full_name: 'Employee Account',
    email: user.email || 'employee@test.com'
  } : null

  const handleLogout = async () => {
    await authService.signOut()
    clearUser()
    router.push('/login')
  }

  const getInitials = () => {
    if (!profile?.full_name) return 'E'
    return profile.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="h-screen w-screen bg-slate-50 flex overflow-hidden relative">
      {/* Mobile Drawer Overlay Backdrop */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Responsive Left Sidebar Drawer */}
      <aside 
        className={cn(
          "bg-white border-r border-slate-200 flex flex-col h-full z-50 pt-4 transition-all duration-300 ease-in-out flex-shrink-0",
          // Desktop positioning
          "lg:relative lg:translate-x-0 lg:shadow-none",
          isSidebarOpen ? "w-56" : "w-56 lg:w-16",
          // Mobile positioning overlay
          "fixed inset-y-0 left-0 shadow-2xl",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Hamburger Menu Toggle inside Sidebar (Desktop only) */}
        <div className={cn("mb-5 hidden lg:flex", isSidebarOpen ? "px-4 justify-start" : "px-0 justify-center")}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-slate-500 hover:bg-slate-100 h-9 w-9 rounded-lg flex items-center justify-center"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Mobile Header Close button (Mobile only) */}
        <div className="flex lg:hidden justify-between items-center px-4 mb-5 pb-2 border-b border-slate-100">
          <span className="font-extrabold text-blue-900 text-xs uppercase tracking-wider">Navigation</span>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-150 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sidebar Options */}
        <nav className={cn("flex-1 space-y-1", isSidebarOpen ? "px-4" : "px-2")}>
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.name} href={item.href}>
                <div className={cn(
                   "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group relative cursor-pointer",
                  isActive 
                    ? "bg-blue-50 text-blue-600 font-semibold" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}>
                  <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                  {isSidebarOpen && <span className="text-xs truncate">{item.name}</span>}
                  {!isSidebarOpen && (
                    <div className="absolute left-14 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>
      </aside>

       {/* Right Content Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Fixed Top Navigation Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex-shrink-0 px-4 sm:px-8 flex justify-between items-center z-30 shadow-sm">
          {/* Top Left: Hamburger trigger and Brand Logo */}
          <div className="flex items-center gap-2">
            {/* Mobile Hamburger menu open trigger */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 lg:hidden transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm overflow-hidden border border-slate-100 bg-white">
              <img src="/atomberg.jpg" alt="Atomberg Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold text-slate-800 tracking-tight">Atomberg</span>
            <div className="h-4 w-px bg-slate-200 mx-2 hidden sm:block"></div>
            <span className="text-sm font-medium text-slate-400 hidden sm:block">Goal Setting Portal</span>
          </div>

          {/* Top Right: Action Icons */}
          <div className="flex items-center gap-5">
            {/* Search Bar */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search goals..."
                className="pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 text-[#151c27] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-all placeholder:text-slate-400 w-48"
              />
            </div>

            {/* Alert Icon */}
            {profile?.id && (
              <NotificationDropdown currentUserId={profile.id} role="employee" />
            )}



            {/* Divider */}
            <div className="h-6 w-px bg-slate-200"></div>

            {/* Account Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                onBlur={() => setTimeout(() => setIsProfileOpen(false), 200)}
                className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center bg-blue-50 text-[#00288e] hover:bg-[#00288e] hover:text-white transition-all font-bold text-sm shadow-sm hover:scale-105 active:scale-95"
              >
                {getInitials()}
              </button>
              
              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800 truncate">{profile?.full_name || 'Employee Account'}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{profile?.email || 'employee@test.com'}</p>
                  </div>
                  
                  <Link href="/employee/dashboard" className="block w-full">
                    <button className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors font-semibold flex items-center gap-2">
                      <Settings className="w-4 h-4 text-slate-400" />
                      Settings
                    </button>
                  </Link>
                  
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors font-semibold flex items-center gap-2 border-t border-slate-100 mt-1 pt-2"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Main Screen Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  )
}
