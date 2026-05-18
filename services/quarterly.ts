import { createClient } from '@/utils/supabase/client'
import { Goal } from '@/types/goals'
import { QuarterType } from '@/utils/getCurrentQuarter'

const supabase = createClient()

export interface QuarterlyUpdate {
  id?: string
  goal_id: string
  quarter: QuarterType
  planned_value: string
  actual_value: string
  status: 'not_started' | 'on_track' | 'completed'
  progress_score: number
  employee_comment: string
  manager_comment?: string
  updated_at?: string
}

export interface GoalWithQuarterlyUpdate extends Goal {
  quarterly_update?: QuarterlyUpdate | null
}

export const quarterlyService = {
  /**
   * Fetch approved goals for an employee and merge them with any existing quarterly updates.
   */
  async getApprovedGoalsAndUpdates(employeeId: string, quarter: QuarterType): Promise<GoalWithQuarterlyUpdate[]> {
    // 1. Fetch approved goals
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('status', 'approved')
      .order('created_at', { ascending: true })

    if (goalsError) {
      console.error('Error fetching approved goals:', goalsError)
      throw goalsError
    }

    if (!goals || goals.length === 0) {
      return []
    }

    // 2. Fetch quarterly updates for these goals for the active quarter
    const goalIds = goals.map(g => g.id)
    const { data: updates, error: updatesError } = await supabase
      .from('quarterly_updates')
      .select('*')
      .in('goal_id', goalIds)
      .eq('quarter', quarter)

    if (updatesError) {
      console.error('Error fetching quarterly updates:', updatesError)
      throw updatesError
    }

    // 3. Map updates to goals
    return goals.map(goal => {
      const update = updates?.find(u => u.goal_id === goal.id) || null
      return {
        ...goal,
        quarterly_update: update
      }
    })
  },

  /**
   * Save (upsert) a quarterly update for a goal.
   */
  async upsertQuarterlyUpdate(update: QuarterlyUpdate): Promise<QuarterlyUpdate> {
    // 1. Fetch the goal metadata to determine if it is a shared KPI and check ownership status
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id, shared_goal_id, is_shared, is_primary_owner')
      .eq('id', update.goal_id)
      .single()

    if (goalError) {
      console.error('Error verifying goal details for sync check:', goalError)
      throw goalError
    }

    // 2. Perform governance checks: only primary owner can update achievements of shared KPIs
    if (goal && goal.is_shared) {
      if (!goal.is_primary_owner) {
        throw new Error('Only the designated Primary Owner is permitted to update achievements for this shared KPI.')
      }
    }

    // 3. Perform primary update
    const { data, error } = await supabase
      .from('quarterly_updates')
      .upsert({
        id: update.id, // if undefined, Supabase creates a new row (or matches unique constraint if set)
        goal_id: update.goal_id,
        quarter: update.quarter,
        planned_value: update.planned_value,
        actual_value: update.actual_value,
        status: update.status,
        progress_score: update.progress_score,
        employee_comment: update.employee_comment,
        manager_comment: update.manager_comment,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting quarterly update:', error)
      throw error
    }

    // 4. If this is a shared goal and updated by the Primary Owner, sync to all sibling goals!
    if (goal && goal.is_shared && goal.is_primary_owner && goal.shared_goal_id) {
      try {
        // Fetch all other goals linked to the same shared KPI (excluding the primary owner's goal itself)
        const { data: siblingGoals, error: siblingFetchError } = await supabase
          .from('goals')
          .select('id')
          .eq('shared_goal_id', goal.shared_goal_id)
          .neq('id', goal.id)

        if (siblingFetchError) throw siblingFetchError

        if (siblingGoals && siblingGoals.length > 0) {
          const siblingGoalIds = siblingGoals.map(sg => sg.id)

          // Query existing quarterly updates for all siblings for this active quarter
          const { data: existingSiblingUpdates, error: existingUpdatesError } = await supabase
            .from('quarterly_updates')
            .select('id, goal_id')
            .in('goal_id', siblingGoalIds)
            .eq('quarter', update.quarter)

          if (existingUpdatesError) throw existingUpdatesError

          // Prepare bulk upsert payload to overwrite siblings with matching progress metrics
          const siblingPayloads = siblingGoals.map(sg => {
            const existingUpdate = existingSiblingUpdates?.find(u => u.goal_id === sg.id)
            return {
              id: existingUpdate?.id, // if found, updates existing record; otherwise Supabase inserts new row
              goal_id: sg.id,
              quarter: update.quarter,
              planned_value: update.planned_value,
              actual_value: update.actual_value,
              status: update.status,
              progress_score: update.progress_score,
              employee_comment: update.employee_comment,
              manager_comment: update.manager_comment,
              updated_at: new Date().toISOString()
            }
          })

          const { error: bulkUpsertError } = await supabase
            .from('quarterly_updates')
            .upsert(siblingPayloads)

          if (bulkUpsertError) throw bulkUpsertError
        }
      } catch (syncErr) {
        console.error('Failed to sync quarterly progress to sibling goals:', syncErr)
        // We log the error but don't break the user request flow since the primary update succeeded
      }
    }

    return data as QuarterlyUpdate
  }

}
