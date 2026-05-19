'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/services/auth'
import { quarterlyService, GoalWithQuarterlyUpdate, QuarterlyUpdate } from '@/services/quarterly'
import { 
  getCurrentQuarter, 
  getQuarterDueLabel, 
  getQuarterMonthUpdateLabel, 
  getQuarterRangeLabel,
  QuarterType
} from '@/utils/getCurrentQuarter'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  Lock, 
  Plus, 
  History, 
  Target, 
  Percent, 
  Hash, 
  ArrowLeft, 
  HelpCircle, 
  Info,
  Check,
  Save,
  Undo,
  Square,
  CheckSquare,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

/**
 * Robust utility to extract the first decimal or integer value from target string
 * e.g., "15%" -> 15, "Target 45" -> 45, "Achieve 98.5" -> 98.5
 */
function extractNumericValue(targetStr: string): number | null {
  if (!targetStr) return null
  const match = targetStr.match(/(\d+(?:\.\d+)?)/)
  return match ? parseFloat(match[1]) : null
}

/**
 * Calculates progress score dynamically based on UOM type, target value, and actual value
 */
function calculateProgress(uomType: string, targetStr: string, actualVal: string): number {
  if (!actualVal) return 0
  
  if (uomType === 'zero') {
    return actualVal.trim() === '0' ? 100 : 0
  }
  
  if (uomType === 'timeline') {
    return actualVal.trim() ? 100 : 0
  }
  
  const targetNum = extractNumericValue(targetStr)
  const actualNum = parseFloat(actualVal)
  
  if (targetNum !== null && !isNaN(actualNum) && targetNum > 0) {
    // Standard percentage/numeric progress score (capped at 120% standard corporate ceiling)
    return Math.min(Math.max(Math.round((actualNum / targetNum) * 100), 0), 120)
  }
  
  return 0
}

function CheckinsContent() {
  const router = useRouter()
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [goals, setGoals] = useState<GoalWithQuarterlyUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentQuarter, setCurrentQuarter] = useState<QuarterType>('Q1')
  
  // Track form values per goal: key is goal_id
  const [formStates, setFormStates] = useState<Record<string, {
    id?: string
    actual_value: string
    status: 'not_started' | 'on_track' | 'completed'
    employee_comment: string
    progress_score: number
  }>>({})

  // Multi-select goals state
  const [selectedGoalIds, setSelectedGoalIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function loadData() {
      try {
        const user = await authService.getCurrentUser()
        if (!user) {
          router.push('/login')
          return
        }
        setUserId(user.id)

        // Load profile
        const prof = await authService.getUserProfile(user.id)
        setProfile({
          full_name: prof?.full_name || 'Employee',
          email: prof?.email || user.email || ''
        })

        // Auto-detect quarter based on system date
        const detectedQuarter = getCurrentQuarter()
        setCurrentQuarter(detectedQuarter)

        // Fetch approved goals and updates
        const approvedGoals = await quarterlyService.getApprovedGoalsAndUpdates(user.id, detectedQuarter)
        setGoals(approvedGoals)

        // Select all by default so it's ready to update/save out-of-the-box
        setSelectedGoalIds(new Set(approvedGoals.map(g => g.id)))

        // Initialize form states
        const initialFormStates: typeof formStates = {}
        approvedGoals.forEach(g => {
          const update = g.quarterly_update
          initialFormStates[g.id] = {
            id: update?.id,
            actual_value: update?.actual_value || '',
            status: update?.status || 'not_started',
            employee_comment: update?.employee_comment || '',
            progress_score: update?.progress_score || 0
          }
        })
        setFormStates(initialFormStates)
      } catch (err) {
        console.error('Error loading check-in details:', err)
        toast.error('Failed to load approved goals roster.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [router])

  const toggleGoalSelection = (id: string) => {
    setSelectedGoalIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedGoalIds.size === goals.length) {
      setSelectedGoalIds(new Set())
    } else {
      setSelectedGoalIds(new Set(goals.map(g => g.id)))
    }
  }

  const handleBulkStatusChange = (status: 'not_started' | 'on_track' | 'completed') => {
    setFormStates(prev => {
      const next = { ...prev }
      goals.forEach(goal => {
        if (selectedGoalIds.has(goal.id)) {
          const currentState = next[goal.id] || {
            actual_value: '',
            status: 'not_started',
            employee_comment: '',
            progress_score: 0
          }
          next[goal.id] = {
            ...currentState,
            status,
            progress_score: calculateProgress(goal.uom_type, goal.target, currentState.actual_value)
          }
        }
      })
      return next
    })
    toast.success(`Bulk updated status of selected goals to: ${status.replace('_', ' ')}`)
  }

  // Handle updates to inputs inside cards
  const handleInputChange = (
    goalId: string, 
    field: 'actual_value' | 'status' | 'employee_comment', 
    value: string,
    uomType: string,
    target: string
  ) => {
    setFormStates(prev => {
      const currentState = prev[goalId] || {
        actual_value: '',
        status: 'not_started',
        employee_comment: '',
        progress_score: 0
      }
      
      const updatedState = {
        ...currentState,
        [field]: value
      }
      
      // Re-calculate progress score dynamically if actual value changes
      if (field === 'actual_value' || field === 'status') {
        const actual = field === 'actual_value' ? value : updatedState.actual_value
        updatedState.progress_score = calculateProgress(uomType, target, actual)
      }
      
      return {
        ...prev,
        [goalId]: updatedState
      }
    })
  }

  // Handle saving of quarterly updates
  const handleSaveUpdates = async () => {
    if (!userId) return
    if (selectedGoalIds.size === 0) {
      toast.error('Please select at least one goal to save updates.')
      return
    }
    
    // Safety governance: check if current quarter matches detected system quarter
    const systemQuarter = getCurrentQuarter()
    if (currentQuarter !== systemQuarter) {
      toast.error(`Submission blocked! You can only update goals for the active quarter: ${systemQuarter}`)
      return
    }

    // Validate if any selected goal is a shared KPI that the user is not the primary owner of
    const selectedSharedNonOwnerGoal = goals.find(goal => 
      selectedGoalIds.has(goal.id) && 
      goal.is_shared && 
      !goal.is_primary_owner
    )

    if (selectedSharedNonOwnerGoal) {
      toast.error(`Not allowed! "${selectedSharedNonOwnerGoal.title}" is a synchronized Shared KPI. Only the designated Primary Owner can record updates.`)
      return
    }

    setSaving(true)
    try {
      const targetGoals = goals.filter(goal => {
        // Must be selected
        if (!selectedGoalIds.has(goal.id)) return false
        
        // Cannot be a shared KPI we don't primary-own
        if (goal.is_shared && !goal.is_primary_owner) return false
        
        // Cannot be a locked & submitted check-in
        const isCheckinLocked = goal.quarterly_update !== null && goal.locked === true && goal.status !== 'rework_requested'
        if (isCheckinLocked) return false
        
        return true
      })

      if (targetGoals.length === 0) {
        toast.info('No pending updates to save.')
        setSaving(false)
        return
      }

      const promises = targetGoals.map(async goal => {
        const state = formStates[goal.id]
        if (!state) return

        const updatePayload: QuarterlyUpdate = {
          id: state.id,
          goal_id: goal.id,
          quarter: currentQuarter,
          planned_value: goal.target,
          actual_value: state.actual_value,
          status: state.status,
          progress_score: state.progress_score,
          employee_comment: state.employee_comment
        }

        return quarterlyService.upsertQuarterlyUpdate(updatePayload)
      })

      await Promise.all(promises)
      toast.success(`Success! Saved updates for ${targetGoals.length} goal(s).`)

      // Reload fresh database records to synchronize local 'goals' states and immediately lock them
      const approvedGoals = await quarterlyService.getApprovedGoalsAndUpdates(userId, currentQuarter)
      setGoals(approvedGoals)

      // Re-initialize form states to match the saved database records
      const updatedFormStates: typeof formStates = {}
      approvedGoals.forEach(g => {
        const update = g.quarterly_update
        updatedFormStates[g.id] = {
          id: update?.id,
          actual_value: update?.actual_value || '',
          status: update?.status || 'not_started',
          employee_comment: update?.employee_comment || '',
          progress_score: update?.progress_score || 0
        }
      })
      setFormStates(updatedFormStates)

      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to save quarterly updates.')
    } finally {
      setSaving(false)
    }
  }

  // UOM icon formatter helper
  const getUOMIcon = (uom: string) => {
    switch (uom) {
      case 'percentage':
        return <Percent className="w-4 h-4 text-blue-500" />
      case 'numeric':
        return <Hash className="w-4 h-4 text-emerald-500" />
      case 'timeline':
        return <Calendar className="w-4 h-4 text-amber-500" />
      default:
        return <Target className="w-4 h-4 text-slate-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500 font-sans">Loading active quarter check-ins...</p>
      </div>
    )
  }

  // Check if all goals are completed and have actual values filled
  const isAllSubmittedDisabled = goals.length > 0 && goals.every(goal => {
    const state = formStates[goal.id]
    return state && state.actual_value.trim() !== '' && state.status === 'completed'
  })

  // Check if there are any actual unsaved changes for the selected goals
  const hasSelectedUnsavedChanges = Array.from(selectedGoalIds).some(id => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return false
    
    // If check-in is already locked, it cannot have unsaved changes
    const isCheckinLocked = goal.quarterly_update !== null && goal.locked === true && goal.status !== 'rework_requested'
    if (isCheckinLocked) return false

    const state = formStates[id]
    if (!state) return false

    const dbUpdate = goal.quarterly_update
    const dbActual = dbUpdate?.actual_value || ''
    const dbStatus = dbUpdate?.status || 'not_started'
    const dbComment = dbUpdate?.employee_comment || ''

    return (
      state.actual_value !== dbActual ||
      state.status !== dbStatus ||
      state.employee_comment !== dbComment
    )
  })

  const isSaveButtonDisabled = saving || selectedGoalIds.size === 0 || isAllSubmittedDisabled || !hasSelectedUnsavedChanges

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-8 font-sans pb-28">
      {/* Visual Header Section matching stitch */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
              FY 2026 Active Quarter
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {getQuarterMonthUpdateLabel(currentQuarter)}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Record actual achievements and status for {profile?.full_name}'s approved {currentQuarter} ({getQuarterRangeLabel(currentQuarter)}) goals.
          </p>
        </div>

        {/* Header Action Controls */}
        <div className="flex flex-wrap items-center gap-4 self-start md:self-auto">
          {/* Due Date Indicator Badge */}
          <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-sm">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Update Window</p>
              <p className="text-sm font-extrabold text-slate-800">{getQuarterDueLabel(currentQuarter)}</p>
            </div>
          </div>

          {/* Relocated Save Updates Button */}
          {goals.length > 0 && (
            <Button
              onClick={handleSaveUpdates}
              disabled={isSaveButtonDisabled}
              className={cn(
                "font-bold py-3 px-6 rounded-2xl flex items-center gap-2 shadow-sm transition-all h-[50px] border",
                isSaveButtonDisabled
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none"
                  : "bg-[#00288e] hover:bg-[#001f66] text-white border-transparent hover:scale-[1.02] active:scale-98 cursor-pointer"
              )}
            >
              <Save className="w-4.5 h-4.5" />
              {saving 
                ? 'Saving...' 
                : isAllSubmittedDisabled 
                  ? 'All Updates Saved' 
                  : selectedGoalIds.size === 0
                    ? 'Select Goals'
                    : !hasSelectedUnsavedChanges
                      ? 'No Changes'
                      : `Save Selected (${selectedGoalIds.size})`
              }
            </Button>
          )}
        </div>
      </div>

      {/* Goal Cards List */}
      {goals.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center flex flex-col items-center gap-6 max-w-2xl mx-auto shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400 shadow-inner">
            <Lock className="w-9 h-9" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">No Approved Goals Found</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              Quarterly achievements can only be updated for goals that have been reviewed and approved by your manager. Please construct and submit your goals list first.
            </p>
          </div>
          <Link href="/employee/goals/new">
            <Button className="bg-[#00288e] hover:bg-[#001f66] text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02]">
              <Plus className="w-4 h-4" />
              Go to Goal Center
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Single/Multiple Selection Control Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm select-none">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={selectedGoalIds.size === goals.length && goals.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-[#00288e] cursor-pointer accent-[#00288e]"
                />
                <span>
                  {selectedGoalIds.size === goals.length 
                    ? `Deselect All Goals (${goals.length})` 
                    : `Select All Goals (${goals.length})`
                  }
                </span>
              </label>
              <div className="h-4 w-px bg-slate-200 hidden sm:block" />
              <span className="text-xs text-slate-500 font-medium">
                {selectedGoalIds.size === 0 
                  ? 'Select goals to enable saving updates.' 
                  : `Currently updating ${selectedGoalIds.size} of ${goals.length} goals`
                }
              </span>
            </div>

            {selectedGoalIds.size > 0 && (
              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bulk Status:</span>
                <div className="flex gap-1.5">
                  {(['not_started', 'on_track', 'completed'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleBulkStatusChange(status)}
                      className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase bg-slate-50 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Goal Cards Grid - reduced gap to 5 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {goals.map((goal, idx) => {
              const state = formStates[goal.id] || {
                actual_value: '',
                status: 'not_started',
                employee_comment: '',
                progress_score: 0
              }
              const isSelected = selectedGoalIds.has(goal.id)
              const isCheckinLocked = goal.quarterly_update !== null && goal.locked === true && goal.status !== 'rework_requested'

              return (
                <div 
                  key={goal.id}
                  className={cn(
                    "bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-5 relative overflow-hidden",
                    isCheckinLocked
                      ? "border-slate-200 bg-slate-50/50 shadow-none"
                      : isSelected 
                        ? "border-blue-600 ring-1 ring-blue-600/30" 
                        : "border-slate-200 hover:border-slate-300 opacity-95"
                  )}
                >
                  {/* Goal indicator index top border */}
                  <div className={cn("absolute top-0 left-0 w-full h-1 transition-colors", isCheckinLocked ? "bg-slate-300" : isSelected ? "bg-blue-600" : "bg-[#00288e]/10")} />

                  {/* Card Title Segment */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3">
                        {/* Selector checkbox matching manager style */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleGoalSelection(goal.id)}
                          disabled={isCheckinLocked}
                          className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-[#00288e] cursor-pointer accent-[#00288e] disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#00288e] font-extrabold text-xs flex items-center justify-center shadow-sm">
                          {idx + 1}
                        </span>
                        <span className="px-2.5 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 font-bold text-[9px] rounded-full uppercase tracking-tight">
                          {goal.thrust_area}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {goal.is_shared && (
                          <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-[9px] rounded-full uppercase tracking-tight flex items-center gap-1 shadow-sm animate-pulse">
                            <Users className="w-3 h-3 text-blue-600" /> Shared KPI
                          </span>
                        )}
                        {isCheckinLocked && (
                          <span className="px-2.5 py-0.5 bg-amber-50 border border-amber-250 text-amber-700 font-extrabold text-[9px] rounded-full uppercase tracking-tight flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-600" /> Submitted & Locked
                          </span>
                        )}
                        {/* Weight badge */}
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-[#f0f3ff] text-[#00288e] border border-[#dce2ff]">
                          {goal.weightage}% Weight
                        </span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <h3 className="text-sm font-extrabold text-slate-800 leading-snug">{goal.title}</h3>
                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2" title={goal.description}>{goal.description}</p>
                    </div>

                    {/* UOM and Target visual summary */}
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                      <div className="flex items-center gap-2">
                        {getUOMIcon(goal.uom_type)}
                        <div>
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">UOM Type</p>
                          <p className="text-[11px] font-bold text-slate-700 capitalize">{goal.uom_type}</p>
                        </div>
                      </div>
                      <div className="h-5 w-px bg-slate-200" />
                      <div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Target Value</p>
                        <p className="text-[11px] font-extrabold text-slate-800">{goal.target}</p>
                      </div>
                    </div>
                  </div>

                  {/* Form Fields Segment */}
                  <div className="space-y-3.5 border-t border-slate-100 pt-4">
                    
                    {/* Synced shared KPI information banner */}
                    {goal.is_shared && !goal.is_primary_owner && (
                      <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-xl flex items-start gap-2 text-blue-800 my-1 animate-in fade-in duration-200">
                        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[11px] text-blue-900">Synchronized KPI Progress</p>
                          <p className="text-[9px] text-blue-700/70 mt-0.5 leading-relaxed">
                            This is a shared departmental KPI. Achievement metrics, scoring progress, and comments are synchronized in real-time from the designated Primary Owner.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Primary Owner shared KPI info banner */}
                    {goal.is_shared && goal.is_primary_owner && (
                      <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl flex items-start gap-2 text-indigo-800 my-1 animate-in fade-in duration-200">
                        <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[11px] text-indigo-900">Primary Owner Portfolio</p>
                          <p className="text-[9px] text-indigo-700/70 mt-0.5 leading-relaxed">
                            You are the Primary Owner for this shared departmental KPI. Your check-in achievements, status, and comments will instantly replicate across all other linked team portfolios.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Actual Achievement Input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">
                          Actual Achievement
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. 12"
                          value={state.actual_value}
                          disabled={!isSelected || isCheckinLocked || (goal.is_shared && !goal.is_primary_owner)}
                          onChange={(e) => handleInputChange(
                            goal.id, 
                            'actual_value', 
                            e.target.value,
                            goal.uom_type,
                            goal.target
                          )}
                          className="border-slate-200 focus:border-[#00288e] focus:ring-[#00288e] rounded-xl h-10 text-xs text-[#151c27] font-semibold placeholder:text-[11px] placeholder:text-slate-400/60 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* Status Dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">
                          Status
                        </label>
                        <select
                          value={state.status}
                          disabled={!isSelected || isCheckinLocked || (goal.is_shared && !goal.is_primary_owner)}
                          onChange={(e) => handleInputChange(
                            goal.id, 
                            'status', 
                            e.target.value as any,
                            goal.uom_type,
                            goal.target
                          )}
                          className="w-full h-10 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-[#151c27] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-all font-medium cursor-pointer disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                        >
                          <option value="not_started">Not Started</option>
                          <option value="on_track">On Track</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>

                    {/* Comment Textarea */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">
                        Employee Remarks / Comments
                      </label>
                      <Textarea
                        placeholder="Detail your activities, wins, roadblocks, and dependencies for this quarter's achievement."
                        value={state.employee_comment}
                        disabled={!isSelected || isCheckinLocked || (goal.is_shared && !goal.is_primary_owner)}
                        onChange={(e) => handleInputChange(
                          goal.id, 
                          'employee_comment', 
                          e.target.value,
                          goal.uom_type,
                          goal.target
                        )}
                        rows={2.5}
                        className="border-slate-200 focus:border-[#00288e] focus:ring-[#00288e] rounded-xl text-xs text-[#151c27] resize-none placeholder:text-[11px] placeholder:text-slate-400/60 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Manager Comment Display (if exists) */}
                    {goal.quarterly_update?.manager_comment && (
                      <div className="bg-amber-50/70 border border-amber-100 p-3 rounded-xl flex items-start gap-2 text-slate-700 mt-1">
                        <AlertCircle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[10px] text-slate-800">Manager Review Remark:</p>
                          <p className="text-[11px] text-slate-600 mt-0.5 italic">"{goal.quarterly_update.manager_comment}"</p>
                        </div>
                      </div>
                    )}

                    {/* Dynamic Progress Score Card Visual Feedback */}
                    <div className="border-t border-slate-50 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[11px] font-bold text-slate-500">Calculated Q1 Progress:</span>
                        <span className={cn(
                          "text-xs font-extrabold",
                          state.progress_score >= 100 
                            ? "text-emerald-600" 
                            : state.progress_score > 0 
                              ? "text-blue-600" 
                              : "text-slate-400"
                        )}>
                          {state.progress_score}%
                        </span>
                      </div>

                      {/* Progress Slider Bar */}
                      <div className="w-full sm:w-40 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-300",
                            state.progress_score >= 100 
                              ? "bg-emerald-500" 
                              : "bg-blue-500"
                          )}
                          style={{ width: `${Math.min(state.progress_score, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CheckinsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-base font-semibold text-slate-500">Loading achievement workspace...</p>
      </div>
    }>
      <CheckinsContent />
    </Suspense>
  )
}
