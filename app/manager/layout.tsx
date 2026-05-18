'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/services/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import NotificationDropdown from '@/components/NotificationDropdown'
import { 
  LayoutDashboard, 
  Users, 
  CheckCircle2, 
  Clock, 
  LogOut, 
  Menu, 
  X,
  Target,
  Bell,
  History,
  HelpCircle,
  Search,
  Settings,
  Network
} from 'lucide-react'

const sidebarItems = [
  { name: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
  { name: 'Team Goals', href: '/manager/team', icon: Target },
  { name: 'Shared Goals', href: '/manager/shared-goals', icon: Network },
  { name: 'Pending Approvals', href: '/manager/approvals', icon: CheckCircle2 },
  { name: 'Quarterly Check-ins', href: '/manager/checkins', icon: Clock },
]

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [profile, setProfile] = useState<{ id: string; full_name: string; email: string } | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const user = await authService.getCurrentUser()
        if (user) {
          const prof = await authService.getUserProfile(user.id)
          if (prof) {
            setProfile({
              id: prof.id,
              full_name: prof.full_name || 'Manager',
              email: prof.email || user.email || ''
            })
          } else {
            setProfile({
              id: user.id,
              full_name: 'Manager Account',
              email: user.email || 'manager@test.com'
            })
          }
        }
      } catch (err) {
        console.error('Error fetching manager profile:', err)
      }
    }
    fetchProfile()
  }, [])

  const getInitials = () => {
    if (!profile?.full_name) return 'M'
    return profile.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = async () => {
    await authService.signOut()
    router.push('/login')
  }

  return (
    <div className="h-screen w-screen bg-slate-50 flex overflow-hidden">
      {/* Full-Height Collapsible Left Sidebar (No Logo) */}
      <aside 
        className={cn(
          "bg-white border-r border-slate-200 flex flex-col h-full z-40 transition-all duration-300 ease-in-out flex-shrink-0 pt-4",
          isSidebarOpen ? "w-56" : "w-16"
        )}
      >
        {/* Hamburger Menu Toggle at the very top of Sidebar options */}
        <div className={cn("mb-5 flex", isSidebarOpen ? "px-4 justify-start" : "px-0 justify-center")}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-slate-500 hover:bg-slate-100 h-9 w-9 rounded-lg flex items-center justify-center"
          >
            <Menu className="w-5 h-5" />
          </Button>
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
        <header className="h-16 bg-white border-b border-slate-200 flex-shrink-0 px-6 sm:px-8 flex justify-between items-center z-30 shadow-sm">
          {/* Top Left: Atomberg Brand logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold">A</span>
            </div>
            <span className="text-lg font-bold text-slate-800 tracking-tight">Atomberg</span>
            <div className="h-4 w-px bg-slate-200 mx-2 hidden sm:block"></div>
            <span className="text-sm font-medium text-slate-400 hidden sm:block">Goal Setting Portal</span>
          </div>

          {/* Top Right: Stitch Action Icons */}
          <div className="flex items-center gap-5">
            {/* Search Bar */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search team or goals..."
                className="pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 text-[#151c27] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-all placeholder:text-slate-400 w-48"
              />
            </div>

            {/* Stitch Alert Icon */}
            {profile?.id && (
              <NotificationDropdown currentUserId={profile.id} role="manager" />
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
                <div className="absolute right-0 mt-3 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800">{profile?.full_name || 'Manager Account'}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{profile?.email || 'manager@test.com'}</p>
                  </div>
                  
                  <Link href="/manager/settings" className="block w-full">
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

        {/* Scrollable Main Screen Content Area (ONLY this area moves up & down) */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  )
}
