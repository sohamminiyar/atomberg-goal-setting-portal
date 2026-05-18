'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Goal } from '@/types/goals'
import { cn } from '@/lib/utils'
import { goalService } from '@/services/goals'
import { toast } from 'sonner'
import { 
  Target, 
  Lock, 
  Unlock, 
  Edit, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Briefcase, 
  Calendar, 
  Percent, 
  Hash, 
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GoalRosterProps {
  initialGoals: Goal[]
  employeeId: string
}

export default function GoalRoster({ initialGoals, employeeId }: GoalRosterProps) {
  const router = useRouter()
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sync state with props when initialGoals updates from database
  useEffect(() => {
    setGoals(initialGoals)
  }, [initialGoals])

  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0)
  const hasDrafts = goals.some(g => g.status === 'draft' || g.status === 'rework_requested')
  const isPendingApproval = goals.some(g => g.status === 'pending_approval')
  const allApproved = goals.length > 0 && goals.every(g => g.status === 'approved')

  const handleRosterSubmit = async () => {
    if (totalWeightage !== 100) {
      toast.error('Your total goal weightage must equal exactly 100% to submit.')
      return
    }

    setIsSubmitting(true)
    try {
      await goalService.submitGoalsForApproval(employeeId)
      toast.success('Goal roster submitted successfully for manager approval!')
      
      // Reload goals list
      const updatedGoals = await goalService.getEmployeeGoals(employeeId)
      setGoals(updatedGoals)
      router.refresh()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Submission failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper to format status badges nicely
  const getStatusBadge = (status: Goal['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Locked & Approved
          </span>
        )
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Pending Approval
          </span>
        )
      case 'rework_requested':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Rework Requested
          </span>
        )
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Draft
          </span>
        )
    }
  }

  // Helper to get UOM icons
  const getUOMIcon = (uom: Goal['uom_type']) => {
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

  return (
    <div className="space-y-6">
      {/* Weightage Tracker and Submission Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              FY 2026 Performance Goal Roster
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your overall goal weightages must sum up to exactly 100% to submit your goals.
            </p>
          </div>

          {/* Dynamic Weightage Visual Badge */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Weightage Balanced:</span>
            <span className={cn(
              "px-3.5 py-1.5 rounded-xl font-extrabold text-sm shadow-sm flex items-center gap-1.5 border",
              totalWeightage === 100 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                : totalWeightage > 100 
                  ? "bg-rose-50 text-rose-700 border-rose-200" 
                  : "bg-amber-50 text-amber-700 border-amber-200"
            )}>
              {totalWeightage}% / 100%
            </span>
          </div>
        </div>

        {/* Custom Progress Bar */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500 ease-out",
              totalWeightage === 100 
                ? "bg-emerald-500" 
                : totalWeightage > 100 
                  ? "bg-rose-500" 
                  : "bg-amber-500"
            )}
            style={{ width: `${Math.min(totalWeightage, 100)}%` }}
          />
        </div>

        {/* Dynamic Workflow Alert Banner */}
        {hasDrafts ? (
          <div className={cn(
            "p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border animate-in fade-in slide-in-from-top-2 duration-300",
            totalWeightage === 100
              ? "bg-[#00288e]/5 border-[#00288e]/10 text-slate-700"
              : "bg-amber-50/50 border-amber-100 text-slate-700"
          )}>
            <div className="flex items-start gap-3">
              {totalWeightage === 100 ? (
                <CheckCircle2 className="w-5 h-5 text-[#00288e] flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold text-sm text-slate-800">
                  {totalWeightage === 100 ? 'Goal Roster Ready for Submission!' : 'Goals Balance Action Required'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {totalWeightage === 100 
                    ? 'All your weightages sum up to exactly 100%. Submit now for manager lock-in.'
                    : goals.some(g => g.is_shared) && totalWeightage > 100
                      ? `💡 Alignment Tip: A new shared departmental KPI has been deployed to your roster, causing your total weightage to reach ${totalWeightage}%. Please edit your custom draft goals to reduce their weights, or adjust the shared KPI's weightage directly, to re-balance to exactly 100% so you can submit.`
                      : `Please adjust your goals to equal exactly 100% total weightage (currently at ${totalWeightage}%).`}
                </p>
              </div>
            </div>

            <Button
              disabled={totalWeightage !== 100 || isSubmitting || isPendingApproval || allApproved}
              onClick={handleRosterSubmit}
              className={cn(
                "font-bold py-2.5 px-5 rounded-xl transition-all shadow-sm flex items-center gap-2",
                totalWeightage === 100 && !isPendingApproval && !allApproved
                  ? "bg-[#00288e] hover:bg-[#001f66] text-white hover:scale-[1.02] active:scale-98"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              {isSubmitting ? 'Submitting Roster...' : isPendingApproval || allApproved ? 'Roster Locked' : 'Submit Roster'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        ) : isPendingApproval ? (
          <div className="bg-amber-50/40 border border-amber-100 p-5 rounded-2xl flex items-start gap-3 text-slate-700">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-slate-800">Locked pending review</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Your goals have been submitted and are locked while awaiting approval from your manager.
              </p>
            </div>
          </div>
        ) : allApproved ? (
          <div className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-2xl flex items-start gap-3 text-slate-700">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-slate-800">All Goals Approved & Locked</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Excellent! All performance targets have been approved by your manager and locked in place.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Dynamic FY 2026 Goal Grid List */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner">
              <Target className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No Goals Created</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Align your quarterly targets and thrust areas to start tracking your performance goals for FY 2026.
              </p>
            </div>
            <Link href="/employee/goals/new" className="mt-2">
              <Button className="bg-[#00288e] hover:bg-[#001f66] text-white font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02]">
                <Plus className="w-4 h-4" />
                Add Your First Goal
              </Button>
            </Link>
          </div>
        ) : (
          goals.map((goal, idx) => (
            <div 
              key={goal.id} 
              className="bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              {/* Left Segment: Goal Description */}
              <div className="flex-1 space-y-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Goal Count Badge */}
                  <span className="w-7 h-7 rounded-xl bg-blue-50 text-[#00288e] font-extrabold text-xs flex items-center justify-center shadow-sm">
                    {idx + 1}
                  </span>
                  
                  {/* Thrust Area Label */}
                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#f0f3ff] text-[#00288e] border border-[#dce2ff] tracking-tight">
                    {goal.thrust_area}
                  </span>

                  {/* Shared KPI Badge */}
                  {goal.is_shared && (
                    <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 tracking-tight flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                      Shared KPI
                    </span>
                  )}

                  {/* Primary Owner Badge */}
                  {goal.is_shared && goal.is_primary_owner && (
                    <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 tracking-tight">
                      Primary Owner
                    </span>
                  )}

                  {/* Lock Status */}
                  {goal.status === 'approved' ? (
                    <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100" title="Locked">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="p-1 rounded-lg bg-slate-50 text-slate-400 border border-slate-100" title="Editable">
                      <Unlock className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-800 tracking-tight">{goal.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">{goal.description}</p>
                </div>

                {/* Meta details: UOM, Target & Weightage */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 border-t border-slate-50">
                  {/* UOM Type & Target */}
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    {getUOMIcon(goal.uom_type)}
                    <span className="font-semibold capitalize">{goal.uom_type}:</span>
                    <span className="font-bold text-slate-800">{goal.target}</span>
                  </div>

                  {/* Weightage Label */}
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    <Percent className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold">Goal Weightage:</span>
                    <span className="font-bold text-slate-800">{goal.weightage}%</span>
                  </div>
                </div>
              </div>

              {/* Right Segment: Status Badge and Actions */}
              <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4 min-w-[160px] border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                {/* Status Indicator */}
                {getStatusBadge(goal.status)}

                {/* Secondary Action Triggers */}
                {(goal.status === 'draft' || goal.status === 'rework_requested') && (
                  <Link href={`/employee/goals/new?id=${goal.id}`} className="lg:mt-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-200 font-semibold flex items-center gap-1 px-3 py-1.5 h-auto text-xs rounded-xl shadow-none"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit Goal
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
