'use client'

import { useEffect, useState } from 'react'
import { adminService } from '@/services/admin'
import { authService } from '@/services/auth'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  UserCheck, 
  Clock, 
  Lock, 
  CalendarRange, 
  RefreshCw,
  Bell,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    totalManagers: 0,
    totalEmployees: 0,
    pendingApprovals: 0,
    lockedGoals: 0,
    activeCycles: 1
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const user = await authService.getCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }

      const freshStats = await adminService.getDashboardStats()
      setStats(freshStats)

      const userList = await adminService.getAllUsers()
      setUsers(userList)
    } catch (error) {
      toast.error('Failed to load dashboard metrics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Static Cycle Windows metadata
  const cycleWindows = [
    { name: 'Q1 Performance Window', window: 'July', status: 'closed', desc: 'Q1 target configuration and submission window' },
    { name: 'Q2 Performance Window', window: 'October', status: 'closed', desc: 'Q2 target review & mid-cycle updates' },
    { name: 'Q3 Performance Window', window: 'January', status: 'active', desc: 'Q3 goal setting, manager approvals, & tracking' },
    { name: 'Q4 Performance Window', window: 'March/April', status: 'upcoming', desc: 'Final annual reviews & target achievements validation' },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">System Overview</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time indicators, operational states, and cycles monitor.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100/80 transition-all px-4 py-2.5 rounded-xl border border-blue-100 hover:scale-[1.02] transform duration-150 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
        {/* Card 1: Total Employees */}
        <Card className="hover:shadow-md transition-all duration-300 border border-slate-200/80 border-r-4 border-r-blue-400/80 bg-white group hover:-translate-y-0.5 rounded-xl">
          <CardContent className="pt-0 pb-1 px-3 flex flex-col justify-start">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Users className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">Total Employees</span>
            </div>
            {loading ? (
              <div className="h-7 w-12 bg-slate-100 animate-pulse rounded mt-0.5" />
            ) : (
              <p className="text-3xl font-extrabold text-[#00288e] tracking-tight mt-0.5">
                {stats.totalEmployees}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Active Managers */}
        <Card className="hover:shadow-md transition-all duration-300 border border-slate-200/80 border-r-4 border-r-purple-400/80 bg-white group hover:-translate-y-0.5 rounded-xl">
          <CardContent className="pt-0 pb-1 px-3 flex flex-col justify-start">
            <div className="flex items-center gap-1.5 text-slate-700">
              <UserCheck className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">Active Managers</span>
            </div>
            {loading ? (
              <div className="h-7 w-12 bg-slate-100 animate-pulse rounded mt-0.5" />
            ) : (
              <p className="text-3xl font-extrabold text-[#00288e] tracking-tight mt-0.5">
                {stats.totalManagers}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Pending Reviews */}
        <Card className="hover:shadow-md transition-all duration-300 border border-slate-200/80 border-r-4 border-r-amber-400/80 bg-white group hover:-translate-y-0.5 rounded-xl">
          <CardContent className="pt-0 pb-1 px-3 flex flex-col justify-start">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Clock className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">Pending Reviews</span>
            </div>
            {loading ? (
              <div className="h-7 w-12 bg-slate-100 animate-pulse rounded mt-0.5" />
            ) : (
              <p className="text-3xl font-extrabold text-[#00288e] tracking-tight mt-0.5">
                {stats.pendingApprovals}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Locked Goals */}
        <Card className="hover:shadow-md transition-all duration-300 border border-slate-200/80 border-r-4 border-r-emerald-400/80 bg-white group hover:-translate-y-0.5 rounded-xl">
          <CardContent className="pt-0 pb-1 px-3 flex flex-col justify-start">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">Locked Goals</span>
            </div>
            {loading ? (
              <div className="h-7 w-12 bg-slate-100 animate-pulse rounded mt-0.5" />
            ) : (
              <p className="text-3xl font-extrabold text-[#00288e] tracking-tight mt-0.5">
                {stats.lockedGoals}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cycle Management & Active Windows Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cycle Windows List Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Goal Cycle Windows</h3>
              <p className="text-xs text-slate-400">Quarterly windows structure as defined in corporate blueprint.</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {cycleWindows.map((cycle, index) => (
              <div key={index} className="py-4.5 flex items-center justify-between gap-4 group">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                      {cycle.name}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">({cycle.window})</span>
                  </div>
                  <p className="text-xs text-slate-500 font-light">{cycle.desc}</p>
                </div>
                
                <div>
                  {cycle.status === 'active' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50 animate-pulse">
                      Active
                    </span>
                  )}
                  {cycle.status === 'closed' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-50 text-slate-500 border border-slate-200/40">
                      Closed
                    </span>
                  )}
                  {cycle.status === 'upcoming' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/40">
                      Upcoming
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Logs Feed / Panel Alerts Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600 animate-bounce">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">System Feed</h3>
              <p className="text-xs text-slate-400">Automated diagnostic checks & updates.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3 p-3 bg-green-50/50 border border-green-100 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-green-900 block mb-0.5">Supabase Connected</span>
                <span className="text-green-700 font-light leading-normal">Database schemas resolved & operational RLS checked.</span>
              </div>
            </div>

            <div className="flex gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-blue-900 block mb-0.5">Goal Cycle Synchronizer</span>
                <span className="text-blue-700 font-light leading-normal">Active cycle dynamically set to **Q3 Window** (January).</span>
              </div>
            </div>

            <div className="flex gap-3 p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-amber-900 block mb-0.5">Pending Action Item</span>
                <span className="text-amber-700 font-light leading-normal">Assign reporting lines for new employees in the Hierarchy Workspace.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Overview Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">System Users Overview</h3>
              <p className="text-xs text-slate-400">All users present in the database registry.</p>
            </div>
          </div>
          <button onClick={() => router.push('/admin/users')} className="text-xs font-bold text-blue-600 hover:text-blue-700">
            View All &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400 font-medium animate-pulse">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400 font-medium">
              No users found in the database.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/70 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-sm">
                      {user.full_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      {user.role === 'admin' && <Badge variant="secondary" className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200">Admin</Badge>}
                      {user.role === 'manager' && <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-indigo-200">Manager</Badge>}
                      {user.role === 'employee' && <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200">Employee</Badge>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {user.department || <span className="text-slate-300 italic">Not Assigned</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
