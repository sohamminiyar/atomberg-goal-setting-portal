import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, LayoutDashboard, Target } from 'lucide-react'
import GoalRoster from '@/components/employee/GoalRoster'
import { Goal } from '@/types/goals'

async function DashboardContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all employee goals
  const { data: goalsData } = await supabase
    .from('goals')
    .select('*')
    .eq('employee_id', user.id)
    .order('created_at', { ascending: true })

  const goals = (goalsData || []) as Goal[]

  const stats = {
    total: goals.length,
    approved: goals.filter(g => g.status === 'approved').length,
    pending: goals.filter(g => g.status === 'pending_approval').length,
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Stats Block */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Goal Overview</h2>
            <p className="text-xs text-slate-500 mt-1">Track your performance targets and review approval workflows.</p>
          </div>
          <Link href="/employee/goals/new">
            <Button className="bg-[#00288e] hover:bg-[#001f66] font-bold text-white shadow-sm transition-all hover:scale-[1.02] rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Set Goals
            </Button>
          </Link>
        </div>
        
        {/* Core metrics grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-blue-900">Total Goals</h3>
            </div>
            <p className="text-3xl font-extrabold text-blue-600">{stats.total}</p>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle2Icon className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-semibold text-emerald-900">Approved & Locked</h3>
            </div>
            <p className="text-3xl font-extrabold text-emerald-600">{stats.approved}</p>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <ClockIcon className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold text-amber-900">Pending Review</h3>
            </div>
            <p className="text-3xl font-extrabold text-amber-600">{stats.pending}</p>
          </div>
        </div>
      </div>

      {/* Dynamic FY 2026 Goal Roster Card */}
      <GoalRoster initialGoals={goals} employeeId={user.id} />
    </div>
  )
}

// Simple fallback components for metrics block
function CheckCircle2Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function ClockIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export default function EmployeeDashboard() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
          <LayoutDashboard className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Employee Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">Monitor your goal sheets, check-ins, and performance statistics.</p>
        </div>
      </div>
      <Suspense fallback={<div className="h-96 w-full bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
