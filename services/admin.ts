import { createClient } from '@/utils/supabase/client'
import { UserRole, Profile } from '@/types/auth'
import { Goal } from '@/types/goals'

const supabase = createClient()

export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_value: any
  new_value: any
  created_at: string
  profiles?: {
    full_name: string | null
    email: string | null
  } | null
}

export const adminService = {
  /**
   * Fetch core metrics for the Admin Dashboard
   */
  async getDashboardStats() {
    try {
      const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      const { count: totalManagers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'manager')
      const { count: totalEmployees } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'employee')
      
      const { data: pendingGoals } = await supabase.from('goals').select('employee_id').eq('status', 'pending_approval')
      const uniquePendingEmployees = new Set(pendingGoals?.map(g => g.employee_id) || [])
      
      const { count: lockedGoals } = await supabase.from('goals').select('*', { count: 'exact', head: true }).eq('locked', true)
      
      // Calculate active cycles statically as defined in the overview
      const activeCycles = 1 
      
      return {
        totalUsers: totalUsers || 0,
        totalManagers: totalManagers || 0,
        totalEmployees: totalEmployees || 0,
        pendingApprovals: uniquePendingEmployees.size,
        lockedGoals: lockedGoals || 0,
        activeCycles
      }
    } catch (error) {
      console.error('Error fetching admin dashboard stats:', error)
      return {
        totalUsers: 0,
        totalManagers: 0,
        totalEmployees: 0,
        pendingApprovals: 0,
        lockedGoals: 0,
        activeCycles: 1
      }
    }
  },

  /**
   * Fetch all user profiles with reporting manager details
   */
  async getAllUsers(): Promise<(Profile & { manager_name?: string | null })[]> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    if (!profiles) return []

    // Fetch all managers to resolve manager names locally to prevent deep nested joins issues in Supabase
    const { data: managers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'manager')

    const managerMap = new Map<string, string>()
    managers?.forEach(m => {
      if (m.full_name) managerMap.set(m.id, m.full_name)
    })

    return profiles.map(p => ({
      ...p,
      manager_name: p.manager_id ? managerMap.get(p.manager_id) || 'Unknown' : null
    }))
  },

  /**
   * Update a user profile (role, department, manager)
   */
  async updateUserProfile(userId: string, updates: Partial<Profile>, adminId: string) {
    // 1. Fetch old value for audit logging
    const { data: oldProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // 2. Perform update
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error("Update failed. Please ensure you have an RLS policy in Supabase allowing UPDATE on the 'profiles' table.")
    }
    
    const updatedProfile = data[0]

    // 3. Create Audit Log entry
    await this.createAuditLog(
      adminId,
      'update_user_profile',
      'profile',
      userId,
      oldProfile,
      updatedProfile
    )

    return updatedProfile
  },

  /**
   * Fetch all employee goals across the company with creator details
   */
  async getAllGoals(): Promise<(Goal & { employee_name?: string | null; employee_email?: string | null; employee_role?: string | null })[]> {
    const { data: goals, error } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!goals) return []

    // Fetch all employee details to join locally
    const { data: employees } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')

    const employeeMap = new Map<string, { name: string | null; email: string | null; role: string | null }>()
    employees?.forEach(e => {
      employeeMap.set(e.id, { name: e.full_name, email: e.email, role: e.role })
    })

    return goals.map(g => {
      const emp = employeeMap.get(g.employee_id)
      return {
        ...g,
        employee_name: emp?.name || 'Unknown',
        employee_email: emp?.email || 'N/A',
        employee_role: emp?.role || 'employee'
      }
    })
  },

  /**
   * Unlock an approved/locked employee goal sheets (reverts status to draft, locked to false)
   */
  async unlockEmployeeGoals(employeeId: string, adminId: string) {
    // 1. Fetch old goals state
    const { data: oldGoals } = await supabase
      .from('goals')
      .select('*')
      .eq('employee_id', employeeId)

    // 2. Reset status to draft & unlock
    const { error } = await supabase
      .from('goals')
      .update({
        status: 'draft',
        locked: false
      })
      .eq('employee_id', employeeId)

    if (error) throw error

    // 3. Create Audit Log
    await this.createAuditLog(
      adminId,
      'unlock_goals',
      'goal_batch',
      employeeId,
      { status: 'approved', locked: true },
      { status: 'draft', locked: false }
    )
  },

  /**
   * Force approve an employee's goals (overrides and locks status to approved)
   */
  async forceApproveEmployeeGoals(employeeId: string, adminId: string) {
    // 1. Fetch old goals state
    const { data: oldGoals } = await supabase
      .from('goals')
      .select('*')
      .eq('employee_id', employeeId)

    // 2. Lock & Approve
    const { error } = await supabase
      .from('goals')
      .update({
        status: 'approved',
        locked: true
      })
      .eq('employee_id', employeeId)

    if (error) throw error

    // 3. Create Audit Log
    await this.createAuditLog(
      adminId,
      'force_approve_goals',
      'goal_batch',
      employeeId,
      oldGoals ? { count: oldGoals.length } : null,
      { status: 'approved', locked: true }
    )
  },

  /**
   * Fetch all audit logs with actor profiles
   */
  async getAuditLogs(): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as AuditLog[]
  },

  /**
   * Helper to insert entries into the audit log trail
   */
  async createAuditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValue: any = null,
    newValue: any = null
  ) {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_value: oldValue,
        new_value: newValue,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to write to audit log:', error)
    }
  }
}
