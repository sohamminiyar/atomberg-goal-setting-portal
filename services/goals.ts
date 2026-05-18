import { createClient } from '@/utils/supabase/client'
import { Goal, GoalFormData } from '@/types/goals'

const supabase = createClient()

export const goalService = {
  async getEmployeeGoals(employeeId: string): Promise<Goal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as Goal[]
  },

  async upsertGoal(employeeId: string, goal: GoalFormData & { id?: string }) {
    const { data, error } = await supabase
      .from('goals')
      .upsert({
        id: goal.id,
        employee_id: employeeId,
        title: goal.title,
        description: goal.description,
        weightage: goal.weightage,
        target: goal.target,
        thrust_area: goal.thrust_area,
        uom_type: goal.uom_type,
        status: 'draft', // Any edit resets it to draft unless submitted
        updated_at: new Date().toISOString(),
        shared_goal_id: goal.shared_goal_id !== undefined ? goal.shared_goal_id : null,
        is_shared: goal.is_shared !== undefined ? goal.is_shared : false,
        is_primary_owner: goal.is_primary_owner !== undefined ? goal.is_primary_owner : false,
      })
      .select()
      .single()

    if (error) throw error
    return data as Goal
  },

  async deleteGoal(goalId: string) {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)
      .in('status', ['draft', 'rework_requested'])

    if (error) throw error
  },

  async submitGoalsForApproval(employeeId: string) {
    const { error } = await supabase
      .from('goals')
      .update({ status: 'pending_approval' })
      .eq('employee_id', employeeId)
      .or('status.eq.draft,status.eq.rework_requested')

    if (error) throw error
  }
}
