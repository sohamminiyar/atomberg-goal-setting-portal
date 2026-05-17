'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Goal } from '@/types/goals'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  CheckCircle, 
  RotateCcw, 
  Save, 
  User, 
  ChevronLeft,
  MessageSquare,
  AlertCircle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const supabase = createClient()

function ApprovalsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const employeeIdParam = searchParams.get('employeeId')
  
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false)
  const [reworkComment, setReworkComment] = useState('')

  useEffect(() => {
    fetchPendingRequests()
  }, [])

  useEffect(() => {
    if (employeeIdParam && employees.length > 0) {
      const emp = employees.find(e => e.id === employeeIdParam)
      if (emp) handleSelectEmployee(emp)
    }
  }, [employeeIdParam, employees])

  const fetchPendingRequests = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch employees reporting to this manager
      const { data: team } = await supabase
        .from('profiles')
        .select('*')
        .eq('manager_id', user.id)

      if (!team) return

      // Fetch goals for these employees that are pending approval
      const { data: pendingGoals } = await supabase
        .from('goals')
        .select('*')
        .in('employee_id', team.map(t => t.id))
        .eq('status', 'pending_approval')

      // Filter employees who have pending goals
      const pendingEmpIds = new Set(pendingGoals?.map(g => g.employee_id) || [])
      const empWithPending = team.filter(t => pendingEmpIds.has(t.id))
      
      setEmployees(empWithPending)
    } catch (error) {
      toast.error('Failed to load pending requests')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectEmployee = async (employee: any) => {
    try {
      setSelectedEmployee(employee)
      const { data } = await supabase
        .from('goals')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('status', 'pending_approval')
      
      setGoals(data || [])
    } catch (error) {
      toast.error('Failed to load goals for review')
    }
  }

  const handleUpdateGoal = (id: string, field: string, value: any) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g))
  }

  const handleApproveAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('goals')
        .update({ status: 'approved', locked: true })
        .in('id', goals.map(g => g.id))

      if (error) throw error

      // Create Audit Log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'approve_goals',
        entity_type: 'goal_batch',
        entity_id: selectedEmployee.id,
        new_value: { goalIds: goals.map(g => g.id) }
      })
      
      toast.success('Goals approved successfully')
      setSelectedEmployee(null)
      fetchPendingRequests()
    } catch (error) {
      toast.error('Failed to approve goals')
    }
  }

  const handleRequestRework = async () => {
    if (!reworkComment) {
      toast.error('Please provide a reason for rework')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('goals')
        .update({ 
          status: 'rework_requested', 
          rework_comments: reworkComment 
        })
        .in('id', goals.map(g => g.id))

      if (error) throw error

      // Create Audit Log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'rework_requested',
        entity_type: 'goal_batch',
        entity_id: selectedEmployee.id,
        remarks: reworkComment,
        new_value: { goalIds: goals.map(g => g.id) }
      })

      toast.success('Rework requested')
      setIsReworkModalOpen(false)
      setReworkComment('')
      setSelectedEmployee(null)
      fetchPendingRequests()
    } catch (error) {
      toast.error('Failed to request rework')
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>

  if (!selectedEmployee) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Pending Approvals</h1>
        {employees.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-dashed text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900">All caught up!</h3>
            <p className="text-slate-500">No pending goal submissions to review.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {employees.map(emp => (
              <Card key={emp.id} className="hover:border-blue-200 cursor-pointer transition-colors" onClick={() => handleSelectEmployee(emp)}>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold">
                      {emp.full_name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{emp.full_name}</h3>
                      <p className="text-xs text-slate-500">{emp.department}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-none">
                    Review Required
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => setSelectedEmployee(null)} className="mb-4">
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to List
      </Button>

      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl">
            {selectedEmployee.full_name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{selectedEmployee.full_name}</h1>
            <p className="text-slate-500">Reviewing Goal Submission</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => setIsReworkModalOpen(true)}>
            <RotateCcw className="w-4 h-4 mr-2" /> Request Rework
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={handleApproveAll}>
            <CheckCircle className="w-4 h-4 mr-2" /> Approve All
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {goals.map((goal) => (
          <Card key={goal.id}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{goal.title}</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Weightage</p>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        value={goal.weightage}
                        className="w-16 h-8 text-sm font-bold text-center"
                        onChange={(e) => handleUpdateGoal(goal.id, 'weightage', parseInt(e.target.value))}
                      />
                      <span className="text-sm font-bold text-slate-500">%</span>
                    </div>
                  </div>
                </div>
              </div>
              <CardDescription>{goal.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 border-t border-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thrust Area</label>
                  <Input 
                    value={goal.thrust_area} 
                    onChange={(e) => handleUpdateGoal(goal.id, 'thrust_area', e.target.value)}
                    className="bg-slate-50 border-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target / Metric</label>
                  <Input 
                    value={goal.target} 
                    onChange={(e) => handleUpdateGoal(goal.id, 'target', e.target.value)}
                    className="bg-slate-50 border-none font-medium"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isReworkModalOpen} onOpenChange={setIsReworkModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Rework</DialogTitle>
            <DialogDescription>
              Provide feedback to {selectedEmployee.full_name} about what needs to be updated.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="e.g., Please increase the weightage of the sales goal and refine the targets for Q2." 
              value={reworkComment}
              onChange={(e) => setReworkComment(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsReworkModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestRework} className="bg-orange-600 hover:bg-orange-700 text-white">
              Send Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PendingApprovalsPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Suspense fallback={<div>Loading...</div>}>
        <ApprovalsContent />
      </Suspense>
    </div>
  )
}
