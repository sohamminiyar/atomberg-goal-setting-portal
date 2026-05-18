import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Target, ArrowRight } from 'lucide-react'
import Link from 'next/link'

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

  // Fetch all goals for the team to count status
  const { data: goals } = await supabase
    .from('goals')
    .select('employee_id, status')
    .in('employee_id', teamIds)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Approved</Badge>
      case 'pending_approval': return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">Pending Review</Badge>
      case 'rework_requested': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">Rework</Badge>
      default: return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none">Draft</Badge>
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {team.map((member) => {
        const memberGoals = goals?.filter(g => g.employee_id === member.id) || []
        const pendingCount = memberGoals.filter(g => g.status === 'pending_approval').length
        const hasSubmission = pendingCount > 0
        
        return (
          <Card key={member.id} className="hover:shadow-md transition-shadow group">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-lg">
                  {member.full_name?.charAt(0)}
                </div>
                {hasSubmission && (
                  <Badge className="bg-blue-600 text-white animate-pulse">Action Required</Badge>
                )}
              </div>
              <div className="mt-4">
                <CardTitle className="text-xl">{member.full_name}</CardTitle>
                <p className="text-sm text-slate-500">{member.department || 'N/A'}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm border-t border-slate-50 pt-4">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Target className="w-4 h-4" /> Goals
                  </span>
                  <span className="font-semibold text-slate-900">{memberGoals.length}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Latest Status</span>
                  {getStatusBadge(memberGoals[0]?.status || 'none')}
                </div>

                <Link href={`/manager/approvals?employeeId=${member.id}`}>
                  <Button variant="outline" className="w-full mt-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    View Details
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default function TeamPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Team Goals</h1>
        <p className="text-slate-500">Monitor and manage the performance goals of your direct reports.</p>
      </div>
      <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[1,2,3].map(i => <div key={i} className="h-64 bg-slate-100 rounded-xl" />)}
      </div>}>
        <TeamContent />
      </Suspense>
    </div>
  )
}
