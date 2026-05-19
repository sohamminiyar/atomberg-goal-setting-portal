'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { authService } from '@/services/auth'
import { adminService } from '@/services/admin'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { 
  Network, 
  Sparkles, 
  Plus, 
  Trash2, 
  Users, 
  Target, 
  Hash, 
  Percent, 
  Calendar, 
  AlertCircle, 
  UserCheck, 
  FileText,
  Bookmark,
  ShieldAlert,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const supabase = createClient()

const THRUST_AREAS = [
  'Operational Excellence',
  'Customer Centricity',
  'Innovation & Product Leadership',
  'People & Culture',
  'Sustainability & ESG',
  'Digital Transformation'
]

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  role: string
  department: string | null
}

interface SharedGoal {
  id: string
  title: string
  description: string
  thrust_area: string
  uom_type: string
  target: string
  created_at: string
  linked_goals_count?: number
  assignments?: {
    employee_id: string
    full_name: string | null
    is_primary_owner: boolean
  }[]
}

export default function AdminSharedGoalsPage() {
  const router = useRouter()
  const [adminUser, setAdminUser] = useState<any>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [sharedGoals, setSharedGoals] = useState<SharedGoal[]>([])
  
  // Loading indicators
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  // Creation form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [thrustArea, setThrustArea] = useState('Operational Excellence')
  const [uomType, setUomType] = useState('percentage')
  const [target, setTarget] = useState('')
  
  // Selection states
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [primaryOwnerId, setPrimaryOwnerId] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const user = await authService.getCurrentUser()
        if (!user) {
          router.push('/login')
          return
        }
        setAdminUser(user)

        // Fetch all profiles to populate employee choices
        const allProfiles = await adminService.getAllUsers()
        // Filter profiles that are not admins
        const staffProfiles = allProfiles.filter(p => p.role !== 'admin')
        setProfiles(staffProfiles)

        await loadSharedGoals()
      } catch (err) {
        console.error('Error seeding shared goals workspace:', err)
        toast.error('Failed to initialize shared goals console.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [router])

  const loadSharedGoals = async () => {
    try {
      // Fetch shared goals
      const { data: shared, error: sharedError } = await supabase
        .from('shared_goals')
        .select('*')
        .order('created_at', { ascending: false })

      if (sharedError) throw sharedError

      if (shared && shared.length > 0) {
        // Fetch all linked employee goals to group them in the frontend dashboard
        const { data: linked, error: linkedError } = await supabase
          .from('goals')
          .select('id, shared_goal_id, employee_id, is_primary_owner')
          .not('shared_goal_id', 'is', null)

        if (linkedError) throw linkedError

        // Fetch profiles to map in memory (bypasses PostgREST relation cache issues)
        const { data: profilesList, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')

        if (profilesError) throw profilesError

        const profileMap = new Map<string, string>()
        profilesList?.forEach((p: any) => {
          if (p.full_name) profileMap.set(p.id, p.full_name)
        })

        const mapped = shared.map((sg: any) => {
          const linkedGoals = linked?.filter(g => g.shared_goal_id === sg.id) || []
          const assignments = linkedGoals.map((g: any) => ({
            employee_id: g.employee_id,
            full_name: profileMap.get(g.employee_id) || 'Staff User',
            is_primary_owner: g.is_primary_owner || false
          }))

          return {
            ...sg,
            linked_goals_count: linkedGoals.length,
            assignments
          }
        })
        setSharedGoals(mapped)
      } else {
        setSharedGoals([])
      }
    } catch (err) {
      console.error('Failed to load shared master list:', err)
    }
  }

  // Handle employee list checkboxes
  const handleEmployeeToggle = (id: string) => {
    setSelectedEmployees(prev => {
      const exists = prev.includes(id)
      const nextList = exists ? prev.filter(item => item !== id) : [...prev, id]
      
      // Auto-adjust Primary Owner selection if the owner is removed from the checked list
      if (primaryOwnerId === id && exists) {
        setPrimaryOwnerId(nextList[0] || '')
      } else if (!primaryOwnerId && nextList.length > 0) {
        setPrimaryOwnerId(nextList[0])
      }
      
      return nextList
    })
  }

  // Deploy Master Shared KPI
  const handleDeploySharedGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !target.trim() || selectedEmployees.length === 0 || !primaryOwnerId) {
      toast.error('Please complete the title, target, select employees, and assign a Primary Owner.')
      return
    }

    setSubmitting(true)
    try {
      // 1. Create entry in shared_goals
      const { data: sharedGoal, error: sharedError } = await supabase
        .from('shared_goals')
        .insert({
          title: title.trim(),
          description: description.trim(),
          thrust_area: thrustArea,
          uom_type: uomType,
          target: target.trim(),
          created_by: adminUser.id
        })
        .select()
        .single()

      if (sharedError) throw sharedError

      // 2. Create individual goal copy for each selected staff
      const goalCopies = selectedEmployees.map(empId => ({
        employee_id: empId,
        thrust_area: thrustArea,
        title: title.trim(),
        description: description.trim(),
        uom_type: uomType,
        target: target.trim(),
        weightage: 10, // Default baseline weightage
        status: 'draft', // Deployed as Draft so employees can review and submit
        shared_goal_id: sharedGoal.id,
        is_shared: true,
        is_primary_owner: empId === primaryOwnerId,
        locked: false
      }))

      const { error: copiesError } = await supabase
        .from('goals')
        .insert(goalCopies)

      if (copiesError) throw copiesError

      // 3. Write audit log trail
      await adminService.createAuditLog(
        adminUser.id,
        'deploy_shared_goal',
        'shared_goal',
        sharedGoal.id,
        null,
        {
          title: title.trim(),
          assigned_count: selectedEmployees.length,
          primary_owner: primaryOwnerId
        }
      )

      // 4. Dispatch individual notifications to all selected employees
      for (const empId of selectedEmployees) {
        await adminService.createAuditLog(
          adminUser.id,
          'assign_shared_goal',
          'shared_goal',
          empId, // Target the employee specifically so their bell icon lights up
          null,
          {
            title: title.trim(),
            shared_goal_id: sharedGoal.id
          }
        )
      }

      toast.success('Departmental Master KPI successfully deployed to selected employees!')
      
      // Reset form variables
      setTitle('')
      setDescription('')
      setThrustArea('Operational Excellence')
      setUomType('percentage')
      setTarget('')
      setSelectedEmployees([])
      setPrimaryOwnerId('')
      
      await loadSharedGoals()
    } catch (err: any) {
      console.error('Error deploying master goal:', err)
      toast.error(err.message || 'Failed to deploy shared KPI.')
    } finally {
      setSubmitting(false)
    }
  }

  // Revoke/Delete Master Shared Goal
  const handleRevokeGoal = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this shared KPI? This will immediately remove all copied goal parameters and check-ins from all employee sheets.')) {
      return
    }

    setRevokingId(id)
    try {
      // Delete from shared_goals (will automatically cascade delete copied goals)
      const { error } = await supabase
        .from('shared_goals')
        .delete()
        .eq('id', id)

      if (error) throw error

      await adminService.createAuditLog(
        adminUser.id,
        'revoke_shared_goal',
        'shared_goal',
        id
      )

      toast.success('Central shared KPI revoked and sheets successfully updated.')
      await loadSharedGoals()
    } catch (err: any) {
      console.error('Failed to revoke shared goal:', err)
      toast.error(err.message || 'Failed to revoke shared goal.')
    } finally {
      setRevokingId(null)
    }
  }

  const getUOMIcon = (uom: string) => {
    switch (uom) {
      case 'percentage':
        return <Percent className="w-4.5 h-4.5 text-blue-600" />
      case 'numeric':
        return <Hash className="w-4.5 h-4.5 text-emerald-600" />
      case 'timeline':
        return <Calendar className="w-4.5 h-4.5 text-amber-600" />
      default:
        return <AlertCircle className="w-4.5 h-4.5 text-slate-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading shared master KPI engine...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-20">
      {/* Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
              <Network className="w-3.5 h-3.5 animate-pulse" />
              Corporate Operations Master Panel
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Shared Departmental KPIs</h1>
          <p className="text-xs text-slate-400 mt-1">
            Deploy baseline goals, targets, and parameters directly into multiple employee rosters. Quarterly achievements sync automatically in real-time from the Primary Owner.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Creation Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-slate-800 text-base tracking-tight">Deploy central KPI</h3>
            </div>

            <form onSubmit={handleDeploySharedGoal} className="space-y-4">
              {/* Thrust Area */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Thrust Area</label>
                <select
                  value={thrustArea}
                  onChange={(e) => setThrustArea(e.target.value)}
                  className="w-full h-11 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-[#151c27] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-all font-medium cursor-pointer"
                >
                  {THRUST_AREAS.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Goal Title</label>
                <Input 
                  placeholder="e.g. Enhance Server Efficiency Metrics"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-slate-200 focus:border-[#00288e] focus:ring-[#00288e] rounded-xl h-11 text-sm text-[#151c27] placeholder:text-xs"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Description</label>
                <Textarea
                  placeholder="Outline key master milestones, deliverables, and sync expectations."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="border-slate-200 focus:border-[#00288e] focus:ring-[#00288e] rounded-xl text-sm text-[#151c27] resize-none placeholder:text-xs"
                />
              </div>

              {/* UOM Type and Target */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">UOM Type</label>
                  <select
                    value={uomType}
                    onChange={(e) => setUomType(e.target.value)}
                    className="w-full h-11 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-[#151c27] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-all font-medium cursor-pointer"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="numeric">Numeric</option>
                    <option value="timeline">Timeline</option>
                    <option value="zero">Zero-Based</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Target Metric</label>
                  <Input 
                    placeholder="e.g. 95%"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="border-slate-200 focus:border-[#00288e] focus:ring-[#00288e] rounded-xl h-11 text-sm text-[#151c27] font-semibold placeholder:text-xs"
                  />
                </div>
              </div>

              {/* Multi-Select Employee List Checklist */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  Assign Team Members ({selectedEmployees.length} selected)
                </label>
                <div className="border border-slate-200 rounded-2xl p-3 max-h-48 overflow-y-auto space-y-2 bg-slate-50/50">
                  {profiles.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No employees registered yet.</p>
                  ) : (
                    profiles.map(p => {
                      const isChecked = selectedEmployees.includes(p.id)
                      return (
                        <label 
                          key={p.id} 
                          className={cn(
                            "flex items-center justify-between p-2 rounded-xl border text-xs font-medium cursor-pointer transition-all",
                            isChecked 
                              ? "bg-blue-50/50 border-blue-200 text-blue-900" 
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={() => handleEmployeeToggle(p.id)}
                              className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                            />
                            <div className="text-left">
                              <p className="font-bold">{p.full_name || 'Staff Member'}</p>
                              <p className="text-[10px] text-slate-400 font-normal truncate max-w-[180px]">{p.email}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border capitalize">
                            {p.role}
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Primary Owner Designation */}
              {selectedEmployees.length > 0 && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    Designate Primary Owner
                  </label>
                  <select
                    value={primaryOwnerId}
                    onChange={(e) => setPrimaryOwnerId(e.target.value)}
                    className="w-full h-11 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-[#151c27] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-all font-bold cursor-pointer"
                  >
                    <option value="" disabled>-- Select Primary Owner --</option>
                    {profiles
                      .filter(p => selectedEmployees.includes(p.id))
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.full_name || 'Staff Member'}</option>
                      ))
                    }
                  </select>
                  <p className="text-[10px] text-slate-400 font-medium">
                    * The Primary Owner's quarterly achievement progress and remarks will sync automatically to all other assigned employee sheets.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || selectedEmployees.length === 0 || !primaryOwnerId}
                className="w-full bg-[#00288e] hover:bg-[#001f66] text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deploying KPI...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Deploy Master KPI
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Right Side: Active Master KPIs Grid */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-800 text-base tracking-tight">Active Central KPIs</h3>
              </div>
              <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                {sharedGoals.length} Master KPIs
              </span>
            </div>

            {sharedGoals.length === 0 ? (
              <div className="text-center py-20 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-slate-50 border rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-700">No active shared KPIs</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Create and push a Shared Departmental KPI using the deployment panel to distribute master corporate objectives.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {sharedGoals.map((sg) => (
                  <div 
                    key={sg.id}
                    className="border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all space-y-4 relative overflow-hidden"
                  >
                    {/* Index Strip color */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#00288e]/10" />

                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="px-2.5 py-0.5 bg-slate-50 border text-slate-500 font-bold text-[9px] rounded-full uppercase tracking-tight">
                          {sg.thrust_area}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-800 leading-snug">{sg.title}</h4>
                        {sg.description && <p className="text-xs text-slate-500 leading-relaxed">{sg.description}</p>}
                      </div>

                      {/* Revoke Action */}
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={revokingId === sg.id}
                        onClick={() => handleRevokeGoal(sg.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 rounded-lg flex-shrink-0"
                      >
                        {revokingId === sg.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* Target and UOM Row */}
                    <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs font-semibold text-slate-600">
                      <div className="flex items-center gap-1.5">
                        {getUOMIcon(sg.uom_type)}
                        <span className="capitalize">{sg.uom_type}</span>
                      </div>
                      <div className="h-4 w-px bg-slate-200" />
                      <div>
                        Target: <span className="font-extrabold text-slate-800">{sg.target}</span>
                      </div>
                      <div className="h-4 w-px bg-slate-200" />
                      <div>
                        Assigned To: <span className="font-extrabold text-blue-600">{sg.linked_goals_count} portfolios</span>
                      </div>
                    </div>

                    {/* Assignments and badges list */}
                    {sg.assignments && sg.assignments.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Portfolio Assignments:</p>
                        <div className="flex flex-wrap gap-2">
                          {sg.assignments.map(ass => (
                            <div 
                              key={ass.employee_id}
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all",
                                ass.is_primary_owner 
                                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" 
                                  : "bg-slate-50 border-slate-200 text-slate-600"
                              )}
                            >
                              {ass.is_primary_owner ? (
                                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <Users className="w-3 h-3 text-slate-400" />
                              )}
                              <span>{ass.full_name}</span>
                              {ass.is_primary_owner && <span className="text-[8px] font-extrabold text-indigo-500 uppercase tracking-wide">Owner</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
