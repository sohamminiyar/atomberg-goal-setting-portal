import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, LayoutDashboard, Target } from 'lucide-react'

async function DashboardContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch goal stats
  const { data: goals } = await supabase
    .from('goals')
    .select('status')
    .eq('employee_id', user.id)

  const stats = {
    total: goals?.length || 0,
    approved: goals?.filter(g => g.status === 'approved').length || 0,
    pending: goals?.filter(g => g.status === 'pending_approval').length || 0,
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Goal Overview</h2>
            <p className="text-sm text-slate-500">Track your performance targets for the current cycle.</p>
          </div>
          <Link href="/employee/goals/new">
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm transition-all hover:scale-[1.02]">
              <Plus className="w-4 h-4 mr-2" />
              Set Goals
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-md transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-blue-900">Total Goals</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="p-4 bg-green-50 border border-green-100 rounded-md transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <LayoutDashboard className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="font-semibold text-green-900">Approved</h3>
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-md transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <LayoutDashboard className="w-4 h-4 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-yellow-900">Pending</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EmployeeDashboard() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-8">
        <LayoutDashboard className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Employee Dashboard</h1>
      </div>
      <Suspense fallback={<div className="h-64 w-full bg-slate-100 animate-pulse rounded-lg border border-slate-200" />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
