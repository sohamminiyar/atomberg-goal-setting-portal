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
  Undo
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
    
    // Safety governance: check if current quarter matches detected system quarter
    const systemQuarter = getCurrentQuarter()
    if (currentQuarter !== systemQuarter) {
      toast.error(`Submission blocked! You can only update goals for the active quarter: ${systemQuarter}`)
      return
    }

    setSaving(true)
    try {
      const promises = goals.map(async goal => {
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
      toast.success(`Success! Q1 quarterly achievements saved successfully.`)
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
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {getQuarterMonthUpdateLabel(currentQuarter)}
          </h1>
          <p className="text-xs text-slate-500">
            Record actual achievements and status for {profile?.full_name}'s approved {currentQuarter} ({getQuarterRangeLabel(currentQuarter)}) goals.
          </p>
        </div>

        {/* Due Date Indicator Badge */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-sm self-start md:self-auto">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Update Window</p>
            <p className="text-sm font-extrabold text-slate-800">{getQuarterDueLabel(currentQuarter)}</p>
          </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {goals.map((goal, idx) => {
            const state = formStates[goal.id] || {
              actual_value: '',
              status: 'not_started',
              employee_comment: '',
              progress_score: 0
            }

            return (
              <div 
                key={goal.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-7 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-6 relative overflow-hidden"
              >
                {/* Goal indicator index top border */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-[#00288e]/10" />

                {/* Card Title Segment */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#00288e] font-extrabold text-xs flex items-center justify-center shadow-sm">
                        {idx + 1}
                      </span>
                      <span className="px-3 py-1 bg-slate-50 border border-slate-100 text-slate-500 font-bold text-[10px] rounded-full uppercase tracking-tight">
                        {goal.thrust_area}
                      </span>
                    </div>

                    {/* Weight badge */}
                    <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-[#f0f3ff] text-[#00288e] border border-[#dce2ff]">
                      {goal.weightage}% Weight
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-slate-800 leading-snug">{goal.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{goal.description}</p>
                  </div>

                  {/* UOM and Target visual summary */}
                  <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                    <div className="flex items-center gap-2">
                      {getUOMIcon(goal.uom_type)}
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">UOM Type</p>
                        <p className="text-xs font-bold text-slate-700 capitalize">{goal.uom_type}</p>
                      </div>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Target Value</p>
                      <p className="text-xs font-extrabold text-slate-800">{goal.target}</p>
                    </div>
                  </div>
                </div>

                {/* Form Fields Segment */}
                <div className="space-y-4 border-t border-slate-100 pt-5">
                  
                  {/* Synced shared KPI information banner */}
                  {goal.is_shared && !goal.is_primary_owner && (
                    <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-2xl flex items-start gap-2.5 text-blue-800 my-1 animate-in fade-in duration-200">
                      <Info className="w-4.5 h-4.5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-xs text-blue-900">Synchronized KPI Progress</p>
                        <p className="text-[10px] text-blue-700/70 mt-0.5 leading-relaxed">
                          This is a shared departmental KPI. Achievement metrics, scoring progress, and comments are synchronized in real-time from the designated Primary Owner.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Primary Owner shared KPI info banner */}
                  {goal.is_shared && goal.is_primary_owner && (
                    <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl flex items-start gap-2.5 text-indigo-800 my-1 animate-in fade-in duration-200">
                      <Info className="w-4.5 h-4.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-xs text-indigo-900">Primary Owner Portfolio</p>
                        <p className="text-[10px] text-indigo-700/70 mt-0.5 leading-relaxed">
                          You are the Primary Owner for this shared departmental KPI. Your check-in achievements, status, and comments will instantly replicate across all other linked team portfolios.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Actual Achievement Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Actual Achievement
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. 12"
                        value={state.actual_value}
                        disabled={goal.is_shared && !goal.is_primary_owner}
                        onChange={(e) => handleInputChange(
                          goal.id, 
                          'actual_value', 
                          e.target.value,
                          goal.uom_type,
                          goal.target
                        )}
                        className="border-slate-200 focus:border-[#00288e] focus:ring-[#00288e] rounded-xl h-11 text-sm text-[#151c27] font-semibold placeholder:text-xs placeholder:text-slate-400/60 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Status Dropdown */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Status
                      </label>
                      <select
                        value={state.status}
                        disabled={goal.is_shared && !goal.is_primary_owner}
                        onChange={(e) => handleInputChange(
                          goal.id, 
                          'status', 
                          e.target.value as any,
                          goal.uom_type,
                          goal.target
                        )}
                        className="w-full h-11 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-[#151c27] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-all font-medium cursor-pointer disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="on_track">On Track</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  {/* Comment Textarea */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Employee Remarks / Comments
                    </label>
                    <Textarea
                      placeholder="Detail your activities, wins, roadblocks, and dependencies for this quarter's achievement."
                      value={state.employee_comment}
                      disabled={goal.is_shared && !goal.is_primary_owner}
                      onChange={(e) => handleInputChange(
                        goal.id, 
                        'employee_comment', 
                        e.target.value,
                        goal.uom_type,
                        goal.target
                      )}
                      rows={3}
                      className="border-slate-200 focus:border-[#00288e] focus:ring-[#00288e] rounded-xl text-sm text-[#151c27] resize-none placeholder:text-xs placeholder:text-slate-400/60 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Manager Comment Display (if exists) */}
                  {goal.quarterly_update?.manager_comment && (
                    <div className="bg-amber-50/70 border border-amber-100 p-4 rounded-2xl flex items-start gap-2.5 text-slate-700 mt-2">
                      <AlertCircle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-xs text-slate-800">Manager Review Remark:</p>
                        <p className="text-xs text-slate-600 mt-0.5 italic">"{goal.quarterly_update.manager_comment}"</p>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Progress Score Card Visual Feedback */}
                  <div className="border-t border-slate-50 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold text-slate-500">Calculated Q1 Progress:</span>
                      <span className={cn(
                        "text-sm font-extrabold",
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
                    <div className="w-full sm:w-48 bg-slate-100 h-2 rounded-full overflow-hidden">
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
      )}

      {/* Floating Bottom Action Bar */}
      {goals.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-4 z-40 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
            <span className="text-[10px] sm:text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4.5 h-4.5 text-blue-500" />
              Progress auto-calculates as you enter achievement values.
            </span>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/employee/dashboard')}
                className="border-slate-200 text-slate-600 font-bold hover:bg-slate-50 rounded-xl"
              >
                <Undo className="w-4 h-4 mr-1.5" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveUpdates}
                disabled={saving}
                className="bg-[#00288e] hover:bg-[#001f66] text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-md transition-all hover:scale-[1.02] active:scale-98"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving Updates...' : `Save ${currentQuarter} Updates`}
              </Button>
            </div>
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
