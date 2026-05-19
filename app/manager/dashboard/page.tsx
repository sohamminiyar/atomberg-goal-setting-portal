import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { DashboardCharts } from '@/components/manager/DashboardCharts'
import { DirectReportsTable } from '@/components/manager/DirectReportsTable'
import { Users, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { getCurrentQuarter } from '@/utils/getCurrentQuarter'

async function DashboardContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch logged-in manager's own profile details
  const { data: managerProfile } = await supabase
    .from('profiles')
    .select('full_name, department')
    .eq('id', user.id)
    .maybeSingle()

  // Fetch complete profiles of reporting team members
  const { data: team } = await supabase
    .from('profiles')
    .select('id, full_name, email, department')
    .eq('manager_id', user.id)

  const teamIds = team?.map(t => t.id) || []

  // Fetch overall goal details for reports
  const { data: goals } = await supabase
    .from('goals')
    .select('id, employee_id, status, target, weightage, title, description, thrust_area, uom_type, is_shared, is_primary_owner')
    .in('employee_id', teamIds)

  // Fetch active quarter updates for team's goals
  const activeQuarter = getCurrentQuarter()
  let quarterlyUpdates: any[] = []
  
  if (goals && goals.length > 0) {
    const goalIds = goals.map(g => g.id)
    const { data: updates } = await supabase
      .from('quarterly_updates')
      .select('goal_id, progress_score, quarter')
      .in('goal_id', goalIds)
      .eq('quarter', activeQuarter)
    
    if (updates) {
      quarterlyUpdates = updates
    }
  }

  const approvedGoalsList = goals?.filter(g => g.status === 'approved') || []
  const approvedGoalIds = approvedGoalsList.map(g => g.id)
  const updatedGoalIds = new Set(quarterlyUpdates.map(u => u.goal_id))
  
  // Calculate check-ins due: approved goals that DO NOT have an active quarterly update
  const checkinsDue = approvedGoalsList.filter(g => !updatedGoalIds.has(g.id)).length

  const stats = {
    teamSize: teamIds.length,
    pendingApprovals: goals?.filter(g => g.status === 'pending_approval').length || 0,
    approvedGoals: approvedGoalsList.length,
    checkinsDue: checkinsDue
  }

  return (
    <div className="space-y-8">
      {/* Visual Welcome Segment */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <span className="px-3 py-1 bg-blue-500/25 text-blue-200 text-xs font-bold rounded-full border border-blue-500/30">
            Active Cycle: FY 2026 {activeQuarter}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {managerProfile?.full_name || 'Manager'}!
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/80 max-w-xl font-light">
            You are overseeing the **{managerProfile?.department || 'Operations'}** department. Here is your team's real-time goal metrics, pending submissions, and check-in scores.
          </p>
        </div>
      </div>

      {/* Overview Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-blue-50 rounded-xl text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Size</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{stats.teamSize}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-amber-50 rounded-xl text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Approvals</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{stats.pendingApprovals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approved Goals</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{stats.approvedGoals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-teal-50 rounded-xl text-teal-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Check-ins Due</p>
              <p className={`text-2xl font-extrabold mt-0.5 ${stats.checkinsDue > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                {stats.checkinsDue}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Visualization Card */}
      <DashboardCharts 
        goals={goals || []} 
        quarterlyUpdates={quarterlyUpdates} 
        currentQuarter={activeQuarter} 
      />

      {/* Direct Reports Custom High-Fidelity Table Card */}
      <DirectReportsTable team={team || []} goals={goals || []} />
    </div>
  )
}

export default function ManagerDashboard() {
  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="hidden sm:block">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Manager Dashboard</h1>
        <p className="text-xs text-slate-400">Overview of your team's goal performance and approval requests.</p>
      </div>
      
      <Suspense fallback={
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="h-44 bg-slate-100 rounded-3xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-80 bg-slate-100 rounded-2xl" />
            <div className="h-80 bg-slate-100 rounded-2xl" />
          </div>
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
