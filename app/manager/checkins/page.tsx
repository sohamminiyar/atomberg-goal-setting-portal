'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
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
  Lock, 
  History, 
  Target, 
  Percent, 
  Hash, 
  HelpCircle, 
  Check,
  Save,
  Undo,
  Search,
  Users,
  MessageCircle,
  ArrowRight,
  UserCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

// Interface for direct report profiles
interface DirectReport {
  id: string
  full_name: string
  email: string
  department: string | null
}

function ManagerCheckinsContent() {
  const router = useRouter()
  const supabase = createClient()
  
  // State variables
  const [managerId, setManagerId] = useState<string | null>(null)
  const [reports, setReports] = useState<DirectReport[]>([])
  const [selectedReport, setSelectedReport] = useState<DirectReport | null>(null)
  const [goals, setGoals] = useState<GoalWithQuarterlyUpdate[]>([])
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterType>('Q1')
  
  const [loading, setLoading] = useState(true)
  const [loadingGoals, setLoadingGoals] = useState(false)
  const [saving, setSaving] = useState(false)

  // Manager comments form state: key is goal_id
  const [managerComments, setManagerComments] = useState<Record<string, string>>({})

  // 1. Initial Load: Fetch manager account and their direct reports
  useEffect(() => {
    async function loadManagerAndReports() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        setManagerId(user.id)

        // Detect current system quarter
        const activeQuarter = getCurrentQuarter()
        setSelectedQuarter(activeQuarter)

        // Fetch direct reports
        const { data: teamProfiles, error: teamError } = await supabase
          .from('profiles')
          .select('id, full_name, email, department')
          .eq('manager_id', user.id)
          .order('full_name', { ascending: true })

        if (teamError) throw teamError

        if (teamProfiles && teamProfiles.length > 0) {
          setReports(teamProfiles as DirectReport[])
          // Select the first direct report by default
          setSelectedReport(teamProfiles[0] as DirectReport)
        }
      } catch (err) {
        console.error('Error loading manager checkins metadata:', err)
        toast.error('Failed to load team roster.')
      } finally {
        setLoading(false)
      }
    }
    loadManagerAndReports()
  }, [router])

  // 2. Secondary Load: Fetch goals and updates for selected report & quarter
  useEffect(() => {
    if (!selectedReport) return

    const reportId = selectedReport.id
    const reportName = selectedReport.full_name

    async function loadReportGoals() {
      setLoadingGoals(true)
      try {
        const reportGoals = await quarterlyService.getApprovedGoalsAndUpdates(
          reportId,
          selectedQuarter
        )
        setGoals(reportGoals)
        // Select all goals by default
        setSelectedGoalIds(reportGoals.map(g => g.id))

        // Initialize manager comments form states
        const initialComments: Record<string, string> = {}
        reportGoals.forEach(g => {
          initialComments[g.id] = g.quarterly_update?.manager_comment || ''
        })
        setManagerComments(initialComments)
      } catch (err) {
        console.error('Error fetching report goals:', err)
        toast.error(`Failed to load approved goals for ${reportName}`)
      } finally {
        setLoadingGoals(false)
      }
    }
    loadReportGoals()
  }, [selectedReport, selectedQuarter])

  // Handle comment editing
  const handleCommentChange = (goalId: string, val: string) => {
    setManagerComments(prev => ({
      ...prev,
      [goalId]: val
    }))
  }

  // Toggle single goal selection
  const toggleGoalSelection = (goalId: string) => {
    setSelectedGoalIds(prev => 
      prev.includes(goalId) 
        ? prev.filter(id => id !== goalId) 
        : [...prev, goalId]
    )
  }

  // Toggle select/deselect all goals
  const toggleSelectAll = () => {
    if (selectedGoalIds.length === goals.length) {
      setSelectedGoalIds([])
    } else {
      setSelectedGoalIds(goals.map(g => g.id))
    }
  }

  // Handle saving manager comments in batch
  const handleSaveReviews = async () => {
    if (!selectedReport) return

    if (selectedGoalIds.length === 0) {
      toast.error('Please select at least one review to submit.')
      return
    }

    // Governance: check if selected quarter matches detected system quarter
    const systemQuarter = getCurrentQuarter()
    if (selectedQuarter !== systemQuarter) {
      toast.error(`Blocked! Reviews can only be submitted for the active financial quarter: ${systemQuarter}`)
      return
    }

    setSaving(true)
    try {
      const selectedGoals = goals.filter(g => selectedGoalIds.includes(g.id))
      const promises = selectedGoals.map(async goal => {
        const comment = managerComments[goal.id] || ''
        const update = goal.quarterly_update

        const updatePayload: QuarterlyUpdate = {
          id: update?.id, // if exists, we update the existing row
          goal_id: goal.id,
          quarter: selectedQuarter,
          planned_value: update?.planned_value || goal.target,
          actual_value: update?.actual_value || '',
          status: update?.status || 'not_started',
          progress_score: update?.progress_score || 0,
          employee_comment: update?.employee_comment || '',
          manager_comment: comment
        }

        return quarterlyService.upsertQuarterlyUpdate(updatePayload)
      })

      await Promise.all(promises)
      toast.success(`Success! Saved ${selectedGoalIds.length} check-in review(s) for ${selectedReport.full_name}.`)
      
      // Re-fetch to sync fresh data
      const refreshedGoals = await quarterlyService.getApprovedGoalsAndUpdates(
        selectedReport.id,
        selectedQuarter
      )
      setGoals(refreshedGoals)
    } catch (err: any) {
      console.error('Failed to save reviews:', err)
      toast.error(err.message || 'Error occurred while saving reviews.')
    } finally {
      setSaving(false)
    }
  }

  // Filter direct reports list based on search bar
  const filteredReports = reports.filter(r => 
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.department && r.department.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Format dynamic progress colors
  const getProgressColor = (score: number) => {
    if (score >= 100) return 'text-emerald-600'
    if (score > 0) return 'text-blue-600'
    return 'text-slate-400'
  }

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
        <p className="text-sm font-semibold text-slate-500">Loading manager check-in workspace...</p>
      </div>
    )
  }

  const systemQuarter = getCurrentQuarter()
  const isQuarterActive = selectedQuarter === systemQuarter

  return (
    <div className="h-full flex flex-col lg:flex-row pb-8">
      {/* 1. Left Side Panel: Direct Reports Selection (320px width) */}
      <aside className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-6 flex flex-col h-auto lg:h-[calc(100vh-4rem)] flex-shrink-0">
        <div className="space-y-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Direct Reports</h2>
            <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 font-extrabold text-[10px] rounded-full">
              {reports.length} Team
            </span>
          </div>

          {/* Search bar inside Sidebar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search team member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-slate-200 focus:border-blue-600 focus:ring-blue-600 rounded-xl h-10 text-xs placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Scrollable Team Card Roster */}
        <div className="flex-1 overflow-y-auto mt-5 space-y-2.5 -mx-2 px-2 pb-6">
          {filteredReports.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs">No direct reports found</p>
            </div>
          ) : (
            filteredReports.map((member) => {
              const isSelected = selectedReport?.id === member.id
              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedReport(member)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-2xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center gap-3.5 group cursor-pointer",
                    isSelected
                      ? "bg-blue-50/70 border-blue-200 shadow-sm"
                      : "bg-white border-slate-150 hover:bg-slate-50/60"
                  )}
                >
                  {/* Circle Initial */}
                  <div className={cn(
                    "w-10 h-10 rounded-xl font-extrabold text-sm flex items-center justify-center shadow-sm flex-shrink-0 transition-colors",
                    isSelected
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600"
                  )}>
                    {member.full_name.charAt(0)}
                  </div>

                  {/* Profile info */}
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      "text-xs font-extrabold truncate leading-tight",
                      isSelected ? "text-blue-700" : "text-slate-700 group-hover:text-slate-900"
                    )}>
                      {member.full_name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                      {member.department || 'General Department'}
                    </p>
                  </div>

                  <ArrowRight className={cn(
                    "w-4 h-4 flex-shrink-0 transition-all",
                    isSelected 
                      ? "text-blue-600 translate-x-0.5" 
                      : "text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-slate-500"
                  )} />
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* 2. Right Side workspace: Review Area */}
      <section className="flex-1 bg-slate-50 overflow-y-auto h-auto lg:h-[calc(100vh-4rem)] p-6 lg:p-8 space-y-8">
        {!selectedReport ? (
          // Empty State: No team members assigned
          <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center flex flex-col items-center gap-6 max-w-2xl mx-auto shadow-sm mt-10">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400 shadow-inner">
              <Users className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">No Direct Reports</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                You do not have any employees assigned to report to you in the system hierarchy. Direct reports can be assigned by the HR administrator under the Control Center.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-100">
                    Reviewing: {selectedReport.full_name}
                  </span>
                  {!isQuarterActive && (
                    <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-100 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Read Only View
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
                  {getQuarterMonthUpdateLabel(selectedQuarter)}
                </h1>
                <p className="text-xs text-slate-400">
                  Assess achievements, analyze scores, and write feedback for {selectedReport.full_name}'s locked goals.
                </p>
              </div>

              {/* Update Window Indicator */}
              <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-sm self-start md:self-auto">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Review Window</p>
                  <p className="text-xs font-extrabold text-slate-800">{getQuarterDueLabel(selectedQuarter)}</p>
                </div>
              </div>
            </div>

            {/* Quarter Selection Slider & Actions Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Quarter Filter Selection Tabs */}
              <div className="flex gap-2 bg-slate-200/60 p-1.5 rounded-2xl w-full sm:w-fit border border-slate-200/20">
                {(['Q1', 'Q2', 'Q3', 'Q4'] as QuarterType[]).map(q => {
                  const isActive = selectedQuarter === q
                  const isSystemQ = systemQuarter === q
                  return (
                    <button
                      key={q}
                      onClick={() => setSelectedQuarter(q)}
                      className={cn(
                        "px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer",
                        isActive
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-650 hover:text-slate-900 hover:bg-white/40"
                      )}
                    >
                      {q} {isSystemQ && '• Active'}
                    </button>
                  )
                })}
              </div>

              {/* Action Buttons (Reset Selected & Submit Reviews) */}
              {isQuarterActive && goals.length > 0 && (
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Revert selected input fields to original goal database values
                      const reverted = { ...managerComments }
                      goals.forEach(g => {
                        if (selectedGoalIds.includes(g.id)) {
                          reverted[g.id] = g.quarterly_update?.manager_comment || ''
                        }
                      })
                      setManagerComments(reverted)
                      toast.success('Selected reviews reset to database records.')
                    }}
                    disabled={saving || selectedGoalIds.length === 0}
                    className="border-slate-200 text-slate-650 font-bold hover:bg-slate-50 rounded-xl text-xs h-10 shadow-sm"
                  >
                    <Undo className="w-4 h-4 mr-1.5" />
                    Reset Selected
                  </Button>
                  <Button
                    onClick={handleSaveReviews}
                    disabled={saving || selectedGoalIds.length === 0}
                    className="bg-[#00288e] hover:bg-[#001f66] text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all hover:scale-[1.01] active:scale-99 h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {saving 
                      ? 'Saving Reviews...' 
                      : `Submit Reviews (${selectedGoalIds.length})`}
                  </Button>
                </div>
              )}
            </div>

            {/* Loader for Goals list */}
            {loadingGoals ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-slate-400 font-semibold">Loading approved goal check-ins...</p>
              </div>
            ) : goals.length === 0 ? (
              // Empty State: Employee has no approved goals
              <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center flex flex-col items-center gap-6 max-w-2xl mx-auto shadow-sm mt-4">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner">
                  <Lock className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">No Approved Goals Found</h3>
                  <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                    Achievements can only be updated and reviewed for employee goals that are in <b>approved</b> status. {selectedReport.full_name} has not had goals approved for this cycle yet.
                  </p>
                </div>
                <Link href={`/manager/approvals?employeeId=${selectedReport.id}`}>
                  <Button className="bg-[#00288e] hover:bg-[#001f66] text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all hover:scale-[1.01]">
                    <UserCheck className="w-4 h-4" />
                    Go to Approvals Center
                  </Button>
                </Link>
              </div>
            ) : (
              // Approved Goals and Check-ins list
              <div className="space-y-6">
                {/* Select All Row */}
                <div className="flex justify-between items-center bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-sm">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-600 uppercase tracking-wider select-none">
                    <input 
                      type="checkbox"
                      checked={selectedGoalIds.length === goals.length && goals.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-[#00288e] cursor-pointer accent-[#00288e]"
                    />
                    Select All Goals ({selectedGoalIds.length} / {goals.length})
                  </label>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
                    Choose reviews to submit
                  </span>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {goals.map((goal, idx) => {
                    const update = goal.quarterly_update
                    const commentValue = managerComments[goal.id] || ''
                    const isSelected = selectedGoalIds.includes(goal.id)

                    return (
                      <div
                        key={goal.id}
                        className={cn(
                          "bg-white border rounded-3xl p-6 lg:p-7 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-6 relative overflow-hidden",
                          isSelected ? "border-blue-200 bg-blue-50/5" : "border-slate-200"
                        )}
                      >
                        {/* Top border indicator */}
                        {isSelected ? (
                          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#00288e]" />
                        ) : (
                          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#00288e]/10" />
                        )}

                        {/* Header details */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleGoalSelection(goal.id)}
                                className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-[#00288e] cursor-pointer accent-[#00288e]"
                              />
                              <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#00288e] font-extrabold text-xs flex items-center justify-center shadow-sm">
                                {idx + 1}
                              </span>
                              <span className="px-3 py-1 bg-slate-50 border border-slate-100 text-slate-500 font-bold text-[10px] rounded-full uppercase tracking-tight">
                                {goal.thrust_area}
                              </span>
                            </div>

                            <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-[#f0f3ff] text-[#00288e] border border-[#dce2ff]">
                              {goal.weightage}% Weight
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-base font-extrabold text-slate-800 leading-snug">{goal.title}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">{goal.description}</p>
                          </div>

                          {/* UOM and Targets details */}
                          <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
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
                              <p className="text-xs font-extrabold text-slate-850">{goal.target}</p>
                            </div>
                          </div>
                        </div>

                        {/* Employee Check-in Section Display */}
                        <div className="border-t border-slate-100 pt-5 space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-150">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                            Employee Check-in Details
                          </h4>

                          {!update ? (
                            <div className="text-left text-slate-400 flex items-center gap-2 py-1">
                              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                              <span className="text-xs font-semibold">No progress check-in submitted for this quarter.</span>
                            </div>
                          ) : (
                            <div className="space-y-3.5">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Actual Achieved</p>
                                  <p className="text-xs font-extrabold text-slate-800">{update.actual_value || 'None recorded'}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Employee Status</p>
                                  <span className={cn(
                                    "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase mt-0.5",
                                    update.status === 'completed' 
                                      ? "bg-green-50 text-green-700 border border-green-200"
                                      : update.status === 'on_track'
                                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                                        : "bg-slate-100 text-slate-600 border border-slate-200"
                                  )}>
                                    {update.status.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>

                              {/* Comment */}
                              <div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Employee Comment</p>
                                <div className="bg-white border border-slate-150 rounded-xl p-3 text-xs text-slate-650 leading-relaxed italic mt-1 shadow-sm">
                                  "{update.employee_comment || 'No comments provided.'}"
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5">
                                  <TrendingUp className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                  <span className="text-[10px] font-bold text-slate-500">Achievement Score:</span>
                                  <span className={cn("text-xs font-extrabold", getProgressColor(update.progress_score))}>
                                    {update.progress_score}%
                                  </span>
                                </div>

                                <div className="w-36 bg-slate-150 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full transition-all duration-300",
                                      update.progress_score >= 100 ? "bg-emerald-500" : "bg-blue-500"
                                    )}
                                    style={{ width: `${Math.min(update.progress_score, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Manager Feedback Textarea */}
                        <div className="border-t border-slate-100 pt-5 space-y-2">
                          <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                            <MessageCircle className="w-4 h-4 text-blue-600" />
                            Manager Review Comments
                          </label>
                          <Textarea
                            placeholder="Provide performance feedback, recommendations, or note achievements on this goal."
                            value={commentValue}
                            onChange={(e) => handleCommentChange(goal.id, e.target.value)}
                            disabled={!isQuarterActive || saving}
                            rows={3}
                            className="border-slate-200 focus:border-[#00288e] focus:ring-[#00288e] rounded-xl text-sm text-[#151c27] resize-none placeholder:text-xs placeholder:text-slate-400/50 disabled:bg-slate-50 disabled:text-slate-500"
                          />
                          {!isQuarterActive && (
                            <p className="text-[10px] text-slate-400 italic">
                              Comments are locked for read-only outside the active quarter check-in window.
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default function ManagerCheckinsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-base font-semibold text-slate-500">Loading manager check-ins workspace...</p>
      </div>
    }>
      <ManagerCheckinsContent />
    </Suspense>
  )
}
