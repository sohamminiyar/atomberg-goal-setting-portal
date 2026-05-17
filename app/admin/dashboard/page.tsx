import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

async function DashboardContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <p className="text-slate-600 mb-4">Manage users, configure cycles, and view enterprise-wide reports.</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
          <h3 className="font-semibold text-slate-900">Total Users</h3>
          <p className="text-2xl font-bold text-slate-600">0</p>
        </div>
        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-md">
          <h3 className="font-semibold text-indigo-900">Active Cycles</h3>
          <p className="text-2xl font-bold text-indigo-600">0</p>
        </div>
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-md">
          <h3 className="font-semibold text-rose-900">Locked Goals</h3>
          <p className="text-2xl font-bold text-rose-600">0</p>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-md">
          <h3 className="font-semibold text-amber-900">System Alerts</h3>
          <p className="text-2xl font-bold text-amber-600">0</p>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Admin Dashboard</h1>
      <Suspense fallback={<div className="h-48 w-full bg-slate-100 animate-pulse rounded-lg" />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
