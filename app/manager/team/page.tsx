import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Users } from 'lucide-react'
import { TeamCard } from '@/components/manager/TeamCard'

async function TeamContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch team members
  const { data: team } = await supabase
    .from('profiles')
    .select('id, full_name, email, department')
    .eq('manager_id', user.id)

  if (!team || team.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900">No team members found</h3>
        <p className="text-slate-500">You don't have any direct reports assigned yet.</p>
      </div>
    )
  }

  const teamIds = team.map(t => t.id)

  // Fetch all goals for the team
  const { data: goals } = await supabase
    .from('goals')
    .select('id, employee_id, status, target, weightage, title, description, thrust_area, uom_type, is_shared, is_primary_owner')
    .in('employee_id', teamIds)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {team.map((member) => {
        const memberGoals = goals?.filter(g => g.employee_id === member.id) || []
        
        return (
          <TeamCard 
            key={member.id} 
            member={member} 
            memberGoals={memberGoals} 
          />
        )
      })}
    </div>
  )
}

export default function TeamPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Team Goals</h1>
        <p className="text-xs text-slate-400">Monitor and manage the performance goals of your direct reports.</p>
      </div>
      <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[1,2,3].map(i => <div key={i} className="h-64 bg-slate-100 rounded-xl" />)}
      </div>}>
        <TeamContent />
      </Suspense>
    </div>
  )
}
