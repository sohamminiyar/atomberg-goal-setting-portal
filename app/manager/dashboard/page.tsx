import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { DashboardCharts } from '@/components/manager/DashboardCharts'
import { Users, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

async function DashboardContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch team stats
  const { data: team } = await supabase
    .from('profiles')
    .select('id')
    .eq('manager_id', user.id)

  const teamIds = team?.map(t => t.id) || []

  const { data: goals } = await supabase
    .from('goals')
    .select('status')
    .in('employee_id', teamIds)

  const stats = {
    teamSize: teamIds.length,
    pendingApprovals: goals?.filter(g => g.status === 'pending_approval').length || 0,
    approvedGoals: goals?.filter(g => g.status === 'approved').length || 0,
    completionAvg: 75, // Placeholder for now
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Team Size</p>
              <p className="text-2xl font-bold text-slate-900">{stats.teamSize}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Approvals</p>
              <p className="text-2xl font-bold text-slate-900">{stats.pendingApprovals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg text-green-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Approved Goals</p>
              <p className="text-2xl font-bold text-slate-900">{stats.approvedGoals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-50 rounded-lg text-teal-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Check-ins Due</p>
              <p className="text-2xl font-bold text-slate-900">0</p>
            </div>
          </div>
        </div>
      </div>

      <DashboardCharts />
    </div>
  )
}

export default function ManagerDashboard() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Manager Dashboard</h1>
        <p className="text-slate-500">Overview of your team's goal performance and approval requests.</p>
      </div>
      <Suspense fallback={<div className="h-96 w-full bg-slate-100 animate-pulse rounded-lg border border-slate-200" />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
