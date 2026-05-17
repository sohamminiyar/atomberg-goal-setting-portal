'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { goalService } from '@/services/goals'
import { authService } from '@/services/auth'
import { cn } from '@/lib/utils'
import { Goal, GoalFormData } from '@/types/goals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import { Plus, Trash2, Save, Send, AlertCircle, Info, CheckCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export default function NewGoalsPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  
  // New goal form state
  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    description: '',
    weightage: 10,
    target: '',
    thrust_area: 'Operational Excellence',
    uom_type: 'numeric'
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
        const fetchedGoals = await goalService.getEmployeeGoals(user.id)
        setGoals(fetchedGoals.filter(g => g.status === 'draft' || g.status === 'rework_requested'))
      } catch (error) {
        toast.error('Failed to load goals')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0)
  const isWeightageValid = totalWeightage === 100
  const canAddMore = goals.length < 8

  const handleAddGoal = async () => {
    if (!userId) return
    if (!canAddMore) {
      toast.error('You can only have up to 8 goals')
      return
    }
    if (totalWeightage + formData.weightage > 100) {
      toast.error('Total weightage cannot exceed 100%')
      return
    }

    try {
      const newGoal = await goalService.upsertGoal(userId, formData)
      setGoals([...goals, newGoal])
      setFormData({ 
        title: '', 
        description: '', 
        weightage: 10, 
        target: '',
        thrust_area: 'Operational Excellence',
        uom_type: 'numeric'
      })
      toast.success('Goal added as draft')
    } catch (error) {
      toast.error('Failed to add goal')
    }
  }

  const handleDeleteGoal = async (id: string) => {
    try {
      await goalService.deleteGoal(id)
      setGoals(goals.filter(g => g.id !== id))
      toast.success('Goal removed')
    } catch (error) {
      toast.error('Failed to remove goal')
    }
  }

  const handleSubmitAll = async () => {
    if (!userId) return
    if (goals.length === 0) {
      toast.error('Please add at least one goal')
      return
    }
    if (!isWeightageValid) {
      toast.error('Total weightage must be exactly 100% to submit')
      return
    }

    try {
      await goalService.submitGoalsForApproval(userId)
      toast.success('Goals submitted for approval!')
      router.push('/employee/dashboard')
    } catch (error) {
      toast.error('Failed to submit goals')
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Set Your Goals</h1>
          <p className="text-slate-500 mt-1">Define your performance targets for this cycle.</p>
        </div>
        <Button 
          onClick={handleSubmitAll} 
          disabled={!isWeightageValid || goals.length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          <Send className="w-4 h-4 mr-2" />
          Submit for Approval
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-50 border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-600 flex items-center">
                Goal Count
                <Tooltip>
                  <TooltipTrigger><Info className="w-3 h-3 ml-1 text-slate-400" /></TooltipTrigger>
                  <TooltipContent>Maximum of 8 goals allowed.</TooltipContent>
                </Tooltip>
              </span>
              <span className={goals.length === 8 ? "text-orange-600 font-bold" : "text-slate-900 font-bold"}>
                {goals.length} / 8
              </span>
            </div>
            <Progress value={(goals.length / 8) * 100} className="h-2" />
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-600 flex items-center">
                Total Weightage
                <Tooltip>
                  <TooltipTrigger><Info className="w-3 h-3 ml-1 text-slate-400" /></TooltipTrigger>
                  <TooltipContent>Must sum to exactly 100%.</TooltipContent>
                </Tooltip>
              </span>
              <span className={isWeightageValid ? "text-green-600 font-bold" : "text-blue-600 font-bold"}>
                {totalWeightage}%
              </span>
            </div>
            <Progress 
              value={totalWeightage} 
              className={cn("h-2", isWeightageValid ? "bg-green-100 [&>div]:bg-green-600" : "")} 
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Add Goal</CardTitle>
              <CardDescription>Enter goal details below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Thrust Area</label>
                <Input 
                  placeholder="e.g., Operational Excellence" 
                  value={formData.thrust_area}
                  onChange={(e) => setFormData({...formData, thrust_area: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input 
                  placeholder="e.g., Increase sales by 20%" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea 
                  placeholder="How will you achieve this?" 
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">UOM Type</label>
                  <select 
                    className="w-full h-10 px-3 py-2 text-sm border rounded-md bg-white border-slate-200"
                    value={formData.uom_type}
                    onChange={(e) => setFormData({...formData, uom_type: e.target.value as any})}
                  >
                    <option value="numeric">Numeric</option>
                    <option value="percentage">Percentage</option>
                    <option value="timeline">Timeline</option>
                    <option value="zero">Zero-Based</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target</label>
                  <Input 
                    placeholder="e.g., 500" 
                    value={formData.target}
                    onChange={(e) => setFormData({...formData, target: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Weightage (%)</label>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setFormData(prev => ({ ...prev, weightage: Math.max(5, prev.weightage - 5) }))}
                      disabled={formData.weightage <= 5}
                    >
                      -
                    </Button>
                    <Input 
                      type="number" 
                      className="w-16 h-8 text-center font-bold"
                      value={formData.weightage}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0
                        const maxAllowed = 100 - totalWeightage
                        setFormData(prev => ({ ...prev, weightage: Math.min(maxAllowed, Math.max(0, val)) }))
                      }}
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setFormData(prev => ({ ...prev, weightage: Math.min(100 - totalWeightage, prev.weightage + 5) }))}
                      disabled={formData.weightage >= (100 - totalWeightage)}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <Slider 
                  value={[formData.weightage]}
                  min={0}
                  max={Math.max(formData.weightage, 100 - totalWeightage)}
                  step={5}
                  onValueChange={(val) => {
                    const value = Array.isArray(val) ? val[0] : val;
                    setFormData({...formData, weightage: value});
                  }}
                  disabled={totalWeightage >= 100 && formData.weightage === 0}
                />
                {totalWeightage >= 100 && (
                  <p className="text-[10px] text-orange-600 font-medium">
                    Total weightage is already 100%. Remove a goal to add more.
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleAddGoal} 
                className="w-full" 
                disabled={!canAddMore || !formData.title || totalWeightage + formData.weightage > 100}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Goal Draft
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2 space-y-4">
          {goals.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed border-slate-200">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 mb-4">
                <Plus className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-slate-900 font-medium">No goals added yet</h3>
              <p className="text-slate-500 text-sm">Use the form on the left to start adding your goals.</p>
            </div>
          ) : (
            goals.map((goal) => (
              <Card key={goal.id} className={cn("relative overflow-hidden group", goal.locked && "opacity-80 bg-slate-50")}>
                {goal.status === 'rework_requested' && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                )}
                {goal.locked && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                )}
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{goal.title}</CardTitle>
                        {goal.status === 'rework_requested' && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase tracking-wider">
                            Rework
                          </span>
                        )}
                        {goal.locked && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">{goal.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-tight">Weight</p>
                        <p className="text-lg font-bold text-slate-900">{goal.weightage}%</p>
                      </div>
                      {!goal.locked && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-slate-400 hover:text-red-600 transition-colors"
                          onClick={() => handleDeleteGoal(goal.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">Target:</span>
                      {goal.target}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      <span>Area: {goal.thrust_area}</span>
                      <span>UOM: {goal.uom_type}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {!isWeightageValid && goals.length > 0 && (
            <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p>Your total weightage is <strong>{totalWeightage}%</strong>. It must be exactly <strong>100%</strong> to submit for approval.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
