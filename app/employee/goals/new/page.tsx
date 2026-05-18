'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { goalService } from '@/services/goals'
import { authService } from '@/services/auth'
import { createClient } from '@/utils/supabase/client'
import { cn } from '@/lib/utils'
import { Goal, GoalFormData, UOMType } from '@/types/goals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import { 
  Plus, 
  Trash2, 
  Save, 
  Send, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  Sparkles, 
  Hash, 
  Percent, 
  Calendar, 
  Activity, 
  ArrowLeft,
  Edit,
  RotateCcw,
  BookOpen
} from 'lucide-react'

const supabase = createClient()

// Curated list of corporate thrust areas
const THRUST_AREAS = [
  'Operational Excellence',
  'Business Growth & Scaling',
  'Customer Success & Experience',
  'R&D, Technology & Product Innovation',
  'Organization & Capabilities (People)',
  'Financial Strategy & Governance',
  'Custom Thrust Area...'
]

function GoalSetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editingId = searchParams.get('id')
  
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [customThrust, setCustomThrust] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)

  // Core Goal Form State
  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    description: '',
    weightage: 10,
    target: '',
    thrust_area: 'Operational Excellence',
    uom_type: 'numeric',
    is_shared: false,
    is_primary_owner: false,
    shared_goal_id: null
  })

  useEffect(() => {
    const init = async () => {
      try {
        const user = await authService.getCurrentUser()
        if (!user) {
          router.push('/login')
          return
        }
        setUserId(user.id)
        
        // Fetch existing goals
        const fetchedGoals = await goalService.getEmployeeGoals(user.id)
        setGoals(fetchedGoals)

        // Check if we are in Edit Mode by preloading a goal from query parameter
        if (editingId) {
          const goalToEdit = fetchedGoals.find(g => g.id === editingId)
          if (goalToEdit) {
            setIsEditMode(true)
            
            // Determine if custom thrust area was chosen
            const hasCustomThrust = !THRUST_AREAS.includes(goalToEdit.thrust_area)
            
            setFormData({
              title: goalToEdit.title,
              description: goalToEdit.description,
              weightage: goalToEdit.weightage,
              target: goalToEdit.target,
              thrust_area: hasCustomThrust ? 'Custom Thrust Area...' : goalToEdit.thrust_area,
              uom_type: goalToEdit.uom_type,
              is_shared: goalToEdit.is_shared || false,
              is_primary_owner: goalToEdit.is_primary_owner || false,
              shared_goal_id: goalToEdit.shared_goal_id || null
            })

            if (hasCustomThrust) {
              setCustomThrust(goalToEdit.thrust_area)
            }
          }
        }
      } catch (error) {
        toast.error('Failed to load goal details')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router, editingId])

  // Total weightage from other goals (excluding the one being edited currently)
  const otherGoalsWeightage = goals
    .filter(g => g.id !== editingId)
    .reduce((sum, g) => sum + g.weightage, 0)

  const maxAvailableWeight = Math.max(0, 100 - otherGoalsWeightage)
  const totalWeightage = otherGoalsWeightage + formData.weightage
  const currentSavedWeightage = goals.reduce((sum, g) => sum + g.weightage, 0)
  const isWeightageValid = currentSavedWeightage === 100
  const isRosterSubmitted = goals.length > 0 && goals.every(g => g.status === 'pending_approval' || g.status === 'approved')
  const canAddMore = (goals.length < 8 || isEditMode) && !isRosterSubmitted

  // Keep form weightage in sync with available remaining weightage
  useEffect(() => {
    const maxAllowed = Math.max(0, 100 - otherGoalsWeightage)
    if (formData.weightage > maxAllowed) {
      setFormData(prev => ({ ...prev, weightage: maxAllowed }))
    } else if (formData.weightage < 5 && maxAllowed >= 5) {
      setFormData(prev => ({ ...prev, weightage: 5 }))
    } else if (maxAllowed === 0) {
      setFormData(prev => ({ ...prev, weightage: 0 }))
    }
  }, [otherGoalsWeightage])

  // Validation indicators
  const isFormValid = 
    formData.title.trim().length > 0 &&
    formData.title.trim().length <= 80 &&
    formData.description.trim().length >= 10 &&
    formData.target.trim().length > 0 &&
    (formData.thrust_area !== 'Custom Thrust Area...' || customThrust.trim().length > 0) &&
    formData.weightage >= 5 &&
    otherGoalsWeightage + formData.weightage <= 100

  // Quick reset form handler
  const handleResetForm = () => {
    setFormData({ 
      title: '', 
      description: '', 
      weightage: 10, 
      target: '',
      thrust_area: 'Operational Excellence',
      uom_type: 'numeric',
      is_shared: false,
      is_primary_owner: false,
      shared_goal_id: null
    })
    setCustomThrust('')
    setIsEditMode(false)
    router.replace('/employee/goals/new')
  }

  // Handle addition/update of goals
  const handleSaveGoal = async () => {
    if (!userId) return
    if (!canAddMore) {
      toast.error('You can only set up to 8 performance goals.')
      return
    }

    const finalThrustArea = formData.thrust_area === 'Custom Thrust Area...' 
      ? customThrust.trim() 
      : formData.thrust_area

    const dataToSubmit = {
      ...formData,
      thrust_area: finalThrustArea,
      id: editingId || undefined
    }

    try {
      const savedGoal = await goalService.upsertGoal(userId, dataToSubmit)
      
      if (isEditMode) {
        setGoals(prev => prev.map(g => g.id === editingId ? savedGoal : g))
        toast.success('Performance goal updated successfully!')
      } else {
        setGoals(prev => [...prev, savedGoal])
        toast.success('Performance goal draft saved!')
      }

      handleResetForm()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save your performance goal.')
    }
  }

  // Handle deletion of draft goals
  const handleDeleteGoal = async (id: string) => {
    try {
      await goalService.deleteGoal(id)
      setGoals(prev => prev.filter(g => g.id !== id))
      toast.success('Goal draft removed successfully.')
      if (editingId === id) {
        handleResetForm()
      }
    } catch (error) {
      toast.error('Only draft/rework goals can be deleted.')
    }
  }

  // Batch Submit entire roster for approval
  const handleSubmitAll = async () => {
    if (!userId) return
    if (goals.length === 0) {
      toast.error('Please configure at least one goal draft before submitting.')
      return
    }
    if (currentSavedWeightage !== 100) {
      toast.error(`Your total weightage is currently ${currentSavedWeightage}%. It must equal exactly 100% to submit.`)
      return
    }

    try {
      await goalService.submitGoalsForApproval(userId)

      // Create an audit log for the submission to trigger manager notifications
      try {
        const profile = await authService.getUserProfile(userId)
        if (profile && profile.manager_id) {
          await supabase.from('audit_logs').insert({
            user_id: userId,
            action: 'submit_goals',
            entity_type: 'goal_batch',
            entity_id: profile.manager_id,
            new_value: { goalIds: goals.map(g => g.id) }
          })
        }
      } catch (err) {
        console.error('Failed to write submit_goals audit log:', err)
      }

      toast.success('Perfect! Your goal roster has been successfully submitted and locked.')
      router.push('/employee/dashboard')
    } catch (error) {
      toast.error('Failed to submit goals roster for review.')
    }
  }

  // Format UOM placeholders nicely to improve UX
  const getTargetPlaceholder = (uom: UOMType) => {
    switch (uom) {
      case 'percentage':
        return 'e.g., Achieve 98.5% uptime on key servers'
      case 'numeric':
        return 'e.g., Target 45 new client acquisitions'
      case 'timeline':
        return 'e.g., Implement system migration by Sept 30, 2026'
      case 'zero':
        return 'e.g., Maintain 0 critical security incidents'
      default:
        return 'e.g., Enter target value'
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500">Loading performance framework...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-8">
      {/* Visual Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Set Your Goals</h1>
          </div>
          <p className="text-xs text-slate-500">
            Define, balance, and align your target goals to complete your performance profile for FY 2026.
          </p>
        </div>

        <Button
          onClick={handleSubmitAll}
          disabled={!isWeightageValid || goals.length === 0 || isRosterSubmitted}
          className={cn(
            "font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-md transition-all",
            isWeightageValid && !isRosterSubmitted
              ? "bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.02]"
              : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
          )}
        >
          {isRosterSubmitted ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              Roster Submitted
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Roster for Approval
            </>
          )}
        </Button>
      </div>

      {/* Real-time Goals Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <BookOpen className="w-4 h-4 text-blue-500" />
              Goal Count (Min 1, Max 8)
            </span>
            <span className={cn("text-sm font-extrabold", goals.length === 8 ? "text-amber-600" : "text-slate-800")}>
              {goals.length} / 8
            </span>
          </div>
          <Progress value={(goals.length / 8) * 100} className="h-2.5" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Activity className="w-4 h-4 text-emerald-500" />
              Goal Roster Weightage (Must equal 100%)
            </span>
            <span className={cn("text-sm font-extrabold", totalWeightage === 100 ? "text-emerald-600" : "text-[#00288e]")}>
              {totalWeightage}% / 100%
            </span>
          </div>
          <Progress 
            value={totalWeightage} 
            className={cn("h-2.5 transition-all duration-300", totalWeightage === 100 ? "[&>div]:bg-emerald-500" : totalWeightage > 100 ? "[&>div]:bg-rose-500 animate-pulse" : "[&>div]:bg-blue-600")} 
          />
        </div>
      </div>

      {/* Main Form Work-grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Builder Card */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 sticky top-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-800 tracking-tight">
                  {isEditMode ? 'Modify Performance Goal' : 'Goal Target Builder'}
                </h3>
              </div>
              {isEditMode && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleResetForm}
                  className="h-8 text-xs font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-50 gap-1 rounded-lg"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Cancel Edit
                </Button>
              )}
            </div>

            {/* Collapsible shared goal or locked info banner */}
            {isRosterSubmitted ? (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-emerald-900">Roster Locked & Submitted</p>
                  <p className="text-emerald-700/80 mt-0.5 leading-relaxed">
                    Your performance goal roster has been submitted for manager review and is currently locked. To make edits, your manager or administrator must return it for rework.
                  </p>
                </div>
              </div>
            ) : formData.is_shared ? (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-start gap-2 animate-in fade-in duration-200">
                <Info className="w-4.5 h-4.5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-blue-900">Shared Departmental KPI</p>
                  <p className="text-blue-700/80 mt-0.5 leading-relaxed">
                    This goal is shared across team portfolios. The title, description, target, and unit of measurement are read-only. You may adjust its weightage to align with your overall portfolio targets.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Core input fields */}
            <div className="space-y-4 text-slate-700">
              {/* Thrust Area Choice Dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Thrust Area</label>
                <select
                  value={formData.thrust_area}
                  disabled={formData.is_shared || isRosterSubmitted}
                  onChange={(e) => setFormData(prev => ({ ...prev, thrust_area: e.target.value }))}
                  className="w-full h-11 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-[#151c27] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-all font-medium cursor-pointer disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  {THRUST_AREAS.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              {/* Collapsible custom input field if 'Custom Thrust Area...' is active */}
              {formData.thrust_area === 'Custom Thrust Area...' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Custom Area</label>
                  <Input 
                    placeholder="e.g., Supply Chain Agility" 
                    value={customThrust}
                    disabled={formData.is_shared || isRosterSubmitted}
                    onChange={(e) => setCustomThrust(e.target.value)}
                    className="border-slate-200 focus:border-[#00288e] focus:ring-[#00288e] rounded-xl h-11 text-sm text-[#151c27] placeholder:text-xs placeholder:text-slate-400/70 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>
              )}

              {/* Goal Title */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Title</label>
                  <span className="text-[10px] font-semibold text-slate-400">{formData.title.length}/80 chars</span>
                </div>
                <Input 
                  placeholder="e.g., Drive digital transformation across team workflows" 
                  value={formData.title}
                  maxLength={80}
                  disabled={formData.is_shared || isRosterSubmitted}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="border-slate-200 focus:border-[#00288e] focus:ring-[#00288e] rounded-xl h-11 text-sm text-[#151c27] placeholder:text-xs placeholder:text-slate-400/70 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>

              {/* Goal Description */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Description</label>
                <Textarea 
                  placeholder="Outline the detailed key activities, milestones, and dependencies to deliver this objective successfully." 
                  rows={4}
                  value={formData.description}
                  disabled={formData.is_shared || isRosterSubmitted}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="border-slate-200 focus:border-[#00288e] focus:ring-[#00288e] rounded-xl text-sm text-[#151c27] resize-none placeholder:text-xs placeholder:text-slate-400/70 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>

              {/* Visual Choice Selector cards for UOM (Unit of Measurement) */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">UOM</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'numeric', label: 'Numeric', icon: Hash, desc: 'e.g. integer counts' },
                    { id: 'percentage', label: 'Percentage', icon: Percent, desc: 'e.g. shares, rates' },
                    { id: 'timeline', label: 'Timeline', icon: Calendar, desc: 'e.g. calendar target' },
                    { id: 'zero', label: 'Zero-Based', icon: AlertCircle, desc: 'e.g. zero occurrences' },
                  ].map(item => {
                    const isSelected = formData.uom_type === item.id
                    const isDisabled = formData.is_shared || isRosterSubmitted
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return
                          setFormData(prev => ({ ...prev, uom_type: item.id as UOMType }))
                        }}
                        className={cn(
                          "p-3 rounded-xl border flex flex-col items-start gap-1 transition-all text-left group",
                          isSelected 
                            ? "bg-blue-50/50 border-[#00288e] text-[#00288e] ring-1 ring-[#00288e]" 
                            : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50",
                          isDisabled && "opacity-60 cursor-not-allowed hover:bg-white border-slate-100 text-slate-400"
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <item.icon className={cn("w-4 h-4", isSelected ? "text-[#00288e]" : "text-slate-400 group-hover:text-slate-500", isDisabled && "text-slate-300")} />
                          {item.label}
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium leading-tight">{item.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Target Metric */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Target</label>
                <Input 
                  placeholder={getTargetPlaceholder(formData.uom_type)}
                  value={formData.target}
                  disabled={formData.is_shared || isRosterSubmitted}
                  onChange={(e) => setFormData(prev => ({ ...prev, target: e.target.value }))}
                  className="border-slate-200 focus:border-[#00288e] focus:ring-[#00288e] rounded-xl h-11 text-sm text-[#151c27] font-semibold placeholder:text-xs placeholder:text-slate-400/70 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>

              {/* Goal Weightage Picker */}
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Weightage (%)</label>
                  <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      type="button"
                      className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-all font-extrabold text-sm shadow-none"
                      onClick={() => setFormData(prev => ({ ...prev, weightage: Math.max(5, prev.weightage - 5) }))}
                      disabled={formData.weightage <= 5 || isRosterSubmitted}
                    >
                      -
                    </Button>
                    <Input 
                      type="text" 
                      className="w-16 h-9 text-center font-extrabold text-sm border border-slate-200 focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] rounded-xl text-slate-800 bg-white shadow-none focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                      value={formData.weightage}
                      disabled={isRosterSubmitted}
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/\D/g, '')) || 0
                        const maxAllowed = Math.max(0, 100 - otherGoalsWeightage)
                        setFormData(prev => ({ ...prev, weightage: Math.min(maxAllowed, Math.max(0, val)) }))
                      }}
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      type="button"
                      className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-all font-extrabold text-sm shadow-none"
                      onClick={() => setFormData(prev => ({ ...prev, weightage: Math.min(Math.max(0, 100 - otherGoalsWeightage), prev.weightage + 5) }))}
                      disabled={formData.weightage >= Math.max(0, 100 - otherGoalsWeightage) || isRosterSubmitted}
                    >
                      +
                    </Button>
                  </div>
                </div>
                
                <Slider 
                  value={[formData.weightage]}
                  min={maxAvailableWeight > 0 ? Math.min(5, maxAvailableWeight) : 0}
                  max={maxAvailableWeight}
                  step={5}
                  onValueChange={(val) => {
                    const value = Array.isArray(val) ? val[0] : val;
                    setFormData(prev => ({ ...prev, weightage: value }));
                  }}
                  disabled={maxAvailableWeight <= 0 || isRosterSubmitted}
                  className="py-2 cursor-pointer"
                />
                
                {otherGoalsWeightage >= 100 && (
                  <p className="text-[10px] text-red-500 font-bold bg-red-50 border border-red-100 p-2.5 rounded-xl">
                    Cumulative goals weightage has already reached 100%. Please delete or modify current drafts first.
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Add/Save CTA */}
            <div className="pt-2 border-t border-slate-100">
              <Button 
                onClick={handleSaveGoal} 
                disabled={!canAddMore || !isFormValid || isRosterSubmitted}
                className={cn(
                  "w-full font-bold h-11 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2",
                  isFormValid && !isRosterSubmitted
                    ? "bg-[#00288e] hover:bg-[#001f66] text-white hover:scale-[1.02]" 
                    : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none"
                )}
              >
                {isEditMode ? (
                  <>
                    <Save className="w-4 h-4" />
                    Save Goal Changes
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Goal Draft
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side: Draft List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-extrabold text-slate-800 tracking-tight text-lg">Goal Roster Drafts</h3>
            <span className="text-xs font-semibold text-slate-400">Total: {goals.length} target(s)</span>
          </div>

          {goals.length === 0 ? (
            <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-16 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner">
                <Plus className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Your draft roster is empty</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Configure performance criteria in the Goal Builder panel to start building your professional roster.
                </p>
              </div>
            </div>
          ) : (
            goals.map((goal) => {
              const isCurrentlyEditing = goal.id === editingId
              return (
                <div 
                  key={goal.id} 
                  className={cn(
                    "bg-white border rounded-2xl p-5 lg:p-6 shadow-sm relative overflow-hidden transition-all flex flex-col justify-between gap-5",
                    isCurrentlyEditing 
                      ? "border-[#00288e] ring-1 ring-[#00288e] bg-blue-50/10" 
                      : goal.locked 
                        ? "border-slate-200 opacity-80 bg-slate-50/50" 
                        : "border-slate-200"
                  )}
                >
                  {/* Status Sidebar Ribbons */}
                  {goal.status === 'rework_requested' && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                  )}
                  {goal.locked && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                  )}

                  {/* Card Header details */}
                  <div className="space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Thrust Area Pill */}
                        <span className="px-3 py-0.5 bg-[#f0f3ff] text-[#00288e] border border-[#dce2ff] text-[10px] font-bold rounded-xl tracking-tight">
                          {goal.thrust_area}
                        </span>

                        {/* Shared KPI Badge */}
                        {goal.is_shared && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-extrabold rounded-lg uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            Shared KPI
                          </span>
                        )}

                        {/* Status indicators */}
                        {goal.status === 'rework_requested' && (
                          <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 text-[9px] font-extrabold rounded-lg uppercase tracking-wider border border-rose-100">
                            Rework Required
                          </span>
                        )}
                        {goal.status === 'pending_approval' && !goal.locked && (
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-extrabold rounded-lg uppercase tracking-wider border border-blue-100">
                            Pending Approval
                          </span>
                        )}
                        {goal.locked && (
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-extrabold rounded-lg uppercase tracking-wider border border-emerald-100">
                            Approved & Locked
                          </span>
                        )}
                      </div>

                      {/* Weight Display info */}
                      <div className="text-right flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Weight:</span>
                        <span className="text-xs font-extrabold text-slate-800">{goal.weightage}%</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-base font-extrabold text-slate-800 tracking-tight leading-snug">
                        {goal.title}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {goal.description}
                      </p>
                    </div>

                    {/* Meta Targets block */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-xs text-slate-600 font-medium">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">UOM:</span>
                        <span className="font-bold text-slate-800 capitalize">{goal.uom_type}</span>
                      </div>
                      <div className="h-3.5 w-px bg-slate-200"></div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Target Value:</span>
                        <span className="font-extrabold text-slate-800">{goal.target}</span>
                      </div>
                    </div>
                  </div>

                  {/* Locked / Rework feedback alert bubble */}
                  {goal.status === 'rework_requested' && goal.rework_comments && (
                    <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-2 text-slate-700">
                      <AlertCircle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-xs text-slate-800">Manager Rework Remark:</p>
                        <p className="text-xs text-slate-600 mt-0.5 font-medium italic">"{goal.rework_comments}"</p>
                      </div>
                    </div>
                  )}

                  {/* Card Controls Panel (Edit / Delete) */}
                  {(goal.status === 'draft' || goal.status === 'rework_requested') && (
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 mt-1">
                      {/* Delete draft */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="text-xs font-bold text-slate-400 hover:text-red-600 hover:bg-red-50/50 flex items-center gap-1 px-3 py-1.5 h-auto rounded-xl transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </Button>
                      
                      {/* Load to edit form */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditMode(true)
                          router.push(`/employee/goals/new?id=${goal.id}`)
                        }}
                        className={cn(
                          "text-xs font-bold flex items-center gap-1 px-3 py-1.5 h-auto rounded-xl transition-all border-slate-200",
                          isCurrentlyEditing 
                            ? "bg-[#00288e] border-[#00288e] text-white hover:bg-[#001f66]" 
                            : "text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-200"
                        )}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        {isCurrentlyEditing ? 'Editing Now' : 'Edit Goal'}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })
          )}

          {/* Sub-threshold total balance hint */}
          {!isWeightageValid && goals.length > 0 && (
            <div className="flex items-center gap-2.5 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-blue-800 text-xs shadow-sm animate-pulse">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-blue-600" />
              <p className="font-medium">
                Your goals roster is currently balanced at <strong>{currentSavedWeightage}%</strong> weightage. 
                Please adjust your goal draft weights to reach exactly <strong>100%</strong> to submit for approval.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function NewGoalsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-base font-semibold text-slate-500">Loading dynamic goal builder...</p>
      </div>
    }>
      <GoalSetForm />
    </Suspense>
  )
}
