'use client'

import { useEffect, useState } from 'react'
import { adminService } from '@/services/admin'
import { authService } from '@/services/auth'
import { Goal } from '@/types/goals'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { 
  Target, 
  Search, 
  Lock, 
  Unlock, 
  CheckCircle, 
  Eye, 
  User, 
  Sparkles, 
  AlertTriangle,
  Scale
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface GroupedEmployeeGoals {
  employeeId: string
  employeeName: string
  employeeEmail: string
  employeeRole: string
  goals: Goal[]
  totalWeightage: number
  overallStatus: string
  isLocked: boolean
}

export default function GoalGovernancePage() {
  const [goals, setGoals] = useState<(Goal & { employee_name?: string | null; employee_email?: string | null; employee_role?: string | null })[]>([])
  const [loading, setLoading] = useState(true)
  const [currentAdminId, setCurrentAdminId] = useState<string>('')
  
  // Filtering & search
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Detailed Modal state
  const [selectedGroup, setSelectedGroup] = useState<GroupedEmployeeGoals | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const user = await authService.getCurrentUser()
      if (user) {
        setCurrentAdminId(user.id)
      }

      const allGoals = await adminService.getAllGoals()
      setGoals(allGoals)
    } catch (error) {
      toast.error('Failed to retrieve goals database.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Group goals by employee
  const groupedGoalsMap = new Map<string, GroupedEmployeeGoals>()
  
  goals.forEach(goal => {
    const empId = goal.employee_id
    const empName = goal.employee_name || 'Unknown'
    const empEmail = goal.employee_email || 'N/A'
    const empRole = goal.employee_role || 'employee'

    if (!groupedGoalsMap.has(empId)) {
      groupedGoalsMap.set(empId, {
        employeeId: empId,
        employeeName: empName,
        employeeEmail: empEmail,
        employeeRole: empRole,
        goals: [],
        totalWeightage: 0,
        overallStatus: 'draft',
        isLocked: false
      })
    }

    const group = groupedGoalsMap.get(empId)!
    group.goals.push(goal)
    group.totalWeightage += goal.weightage
    
    // Overall status priority: if any pending_approval -> pending_approval, if any rework -> rework_requested, etc.
    if (goal.status === 'pending_approval') group.overallStatus = 'pending_approval'
    else if (goal.status === 'rework_requested' && group.overallStatus !== 'pending_approval') group.overallStatus = 'rework_requested'
    else if (goal.status === 'approved' && group.overallStatus !== 'pending_approval' && group.overallStatus !== 'rework_requested') group.overallStatus = 'approved'
    
    if (goal.locked) group.isLocked = true
  })

  const groupedGoalsList = Array.from(groupedGoalsMap.values())

  // Filters grouped list
  const filteredGroups = groupedGoalsList.filter(group => {
    const search = searchTerm.toLowerCase()
    const nameMatch = group.employeeName.toLowerCase().includes(search) || 
                      group.employeeEmail.toLowerCase().includes(search)
    
    const statusMatch = statusFilter === 'all' || group.overallStatus === statusFilter
    const roleMatch = roleFilter === 'all' || group.employeeRole === roleFilter
    return nameMatch && statusMatch && roleMatch
  })

  // Action: Force Approve
  const handleForceApprove = async (group: GroupedEmployeeGoals) => {
    if (!currentAdminId) return
    try {
      await adminService.forceApproveEmployeeGoals(group.employeeId, currentAdminId)
      toast.success(`Force approved goals for ${group.employeeName}`)
      loadData()
      if (selectedGroup && selectedGroup.employeeId === group.employeeId) {
        setIsDetailsOpen(false)
      }
    } catch (error) {
      toast.error('Failed to override approval.')
    }
  }

  // Action: Force Unlock / Reset to Draft
  const handleForceUnlock = async (group: GroupedEmployeeGoals) => {
    if (!currentAdminId) return
    try {
      await adminService.unlockEmployeeGoals(group.employeeId, currentAdminId)
      toast.success(`Reset goals status to Draft and unlocked for ${group.employeeName}`)
      loadData()
      if (selectedGroup && selectedGroup.employeeId === group.employeeId) {
        setIsDetailsOpen(false)
      }
    } catch (error) {
      toast.error('Failed to unlock goals.')
    }
  }

  const handleOpenDetails = (group: GroupedEmployeeGoals) => {
    setSelectedGroup(group)
    setIsDetailsOpen(true)
  }

  // Visual initial generator
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Goal Governance</h1>
        <p className="text-sm text-slate-500 mt-1">Audit, unlock, or force approve quarterly goals across organization levels.</p>
      </div>

      {/* Control panel & filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="absolute inset-y-0 left-3 w-4 h-4 my-auto text-slate-400" />
          <Input
            placeholder="Search employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs bg-white text-slate-800 focus:ring-blue-600 w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Role Filter Dropdown */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer min-w-[120px]"
          >
            <option value="all">All Roles</option>
            <option value="employee">Employees</option>
            <option value="manager">Managers</option>
          </select>

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer min-w-[120px]"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Drafts</option>
            <option value="pending_approval">Pending Manager</option>
            <option value="approved">Approved</option>
            <option value="rework_requested">Rework Requested</option>
          </select>
        </div>
      </div>

      {/* Grouped lists */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400 font-medium bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Target className="w-8 h-8 text-slate-300 mx-auto mb-3 animate-spin" />
          Syncing enterprise goal sheets...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-400 font-medium bg-white border border-slate-200 rounded-2xl shadow-sm">
          No employee goal cycles found matching filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map(group => (
            <Card key={group.employeeId} className="border border-slate-200 bg-white hover:shadow-md transition-all duration-200 flex flex-col group/card">
              {/* Card Header details */}
              <CardHeader className="pb-4 shrink-0 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm shadow-sm select-none">
                  {getInitials(group.employeeName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-sm truncate leading-none group-hover/card:text-blue-600 transition-colors">
                      {group.employeeName}
                    </h3>
                    <Badge className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider leading-none shrink-0 border",
                      group.employeeRole === 'manager' 
                        ? "bg-purple-50 text-purple-700 border-purple-200" 
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    )}>
                      {group.employeeRole}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate font-light leading-none">{group.employeeEmail}</span>
                </div>
              </CardHeader>

              {/* Card Body summary stats */}
              <CardContent className="py-5 flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Total Goals */}
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Defined Goals</span>
                    <span className="text-lg font-extrabold text-slate-700 mt-1 block leading-none">{group.goals.length} Goals</span>
                  </div>
                  
                  {/* Total Weightage */}
                  <div className={cn(
                    "p-3 rounded-xl border",
                    group.totalWeightage === 100 
                      ? "bg-emerald-50/40 border-emerald-100 text-emerald-950" 
                      : "bg-amber-50/40 border-amber-100 text-amber-950"
                  )}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Weightage</span>
                    <span className="text-lg font-extrabold mt-1 block leading-none flex items-center gap-1">
                      {group.totalWeightage}%
                      {group.totalWeightage !== 100 && (
                        <span title="Weightage must sum exactly to 100%">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 inline shrink-0" />
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-4.5">
                  {/* Status Badge */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">State Status</span>
                    {group.overallStatus === 'approved' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Approved
                      </span>
                    )}
                    {group.overallStatus === 'pending_approval' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50">
                        <Unlock className="w-3 h-3 text-amber-600" />
                        Pending Manager
                      </span>
                    )}
                    {group.overallStatus === 'rework_requested' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200/50">
                        Rework Requested
                      </span>
                    )}
                    {group.overallStatus === 'draft' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/50">
                        Draft
                      </span>
                    )}
                  </div>

                  {/* Lock Indicator badge */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 text-right">Access Lock</span>
                    {group.isLocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white shadow-sm">
                        <Lock className="w-3 h-3 text-white" />
                        Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/50">
                        <Unlock className="w-3 h-3 text-slate-400" />
                        Unlocked
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick actions box */}
                <div className="flex gap-2 border-t border-slate-50 pt-4 shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => handleOpenDetails(group)}
                    className="flex-1 text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Inspect
                  </Button>

                  {group.isLocked ? (
                    <Button
                      onClick={() => handleForceUnlock(group)}
                      className="flex-1 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100/80 font-bold text-xs rounded-xl"
                      title="Reset sheet to Unlocked Draft state"
                    >
                      <Unlock className="w-3.5 h-3.5 mr-1" />
                      Unlock Draft
                    </Button>
                  ) : (
                    group.overallStatus !== 'approved' && (
                      <Button
                        onClick={() => handleForceApprove(group)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                        title="Force lock and approve goal batch sheet"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Approve
                      </Button>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Goal Items Detail Inspection modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-white text-slate-800 max-w-[680px] p-6 max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0 pb-4 border-b border-slate-100">
            <DialogTitle className="text-slate-900 font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Sheet Goals Detail
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-0.5">
              Inspect defined metrics for <strong className="text-slate-700">{selectedGroup?.employeeName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Goals Detail scroll area */}
          <div className="flex-1 overflow-y-auto py-5 space-y-5">
            {selectedGroup?.goals.map((g, i) => (
              <div key={g.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Goal #{i + 1}: {g.thrust_area}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-2">{g.title}</h4>
                  </div>
                  
                  <Badge variant="secondary" className="bg-slate-100 border-none font-bold text-slate-700 text-xs shrink-0 flex items-center gap-1 py-1 px-2.5">
                    <Scale className="w-3.5 h-3.5 text-slate-400" />
                    Weight: {g.weightage}%
                  </Badge>
                </div>

                <p className="text-xs text-slate-500 font-light leading-normal">{g.description || 'No detailed specifications entered.'}</p>
                
                <div className="grid grid-cols-2 gap-4 border-t border-slate-100/70 pt-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] block">Unit of Measurement (UOM)</span>
                    <span className="font-bold text-slate-700 mt-1 block uppercase">{g.uom_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] block">Target Score Value</span>
                    <span className="font-bold text-slate-700 mt-1 block">{g.target}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="shrink-0 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-400 font-light">
              Combined weight: <strong className="text-slate-700 font-bold">{selectedGroup?.totalWeightage}%</strong>
            </div>

            <div className="space-x-2">
              <Button variant="ghost" onClick={() => setIsDetailsOpen(false)} className="text-slate-500">
                Close
              </Button>
              {selectedGroup?.isLocked ? (
                <Button
                  onClick={() => selectedGroup && handleForceUnlock(selectedGroup)}
                  className="bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"
                >
                  Unlock Draft
                </Button>
              ) : (
                selectedGroup && selectedGroup.overallStatus !== 'approved' && (
                  <Button
                    onClick={() => selectedGroup && handleForceApprove(selectedGroup)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Force Approve
                  </Button>
                )
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
