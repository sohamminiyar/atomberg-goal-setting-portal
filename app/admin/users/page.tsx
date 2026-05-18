'use client'

import { useEffect, useState } from 'react'
import { adminService } from '@/services/admin'
import { authService } from '@/services/auth'
import { cn } from '@/lib/utils'
import { Profile, UserRole } from '@/types/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { 
  Users, 
  Search, 
  UserPlus, 
  UserCheck, 
  Edit3, 
  UserMinus, 
  Mail, 
  Building2,
  Lock
} from 'lucide-react'
import { toast } from 'sonner'

export default function UserManagementPage() {
  const [users, setUsers] = useState<(Profile & { manager_name?: string | null })[]>([])
  const [managers, setManagers] = useState<{ id: string; full_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [currentAdminId, setCurrentAdminId] = useState<string>('')
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<(Profile & { manager_name?: string | null }) | null>(null)
  
  // Form fields
  const [formRole, setFormRole] = useState<UserRole>('employee')
  const [formDept, setFormDept] = useState<string>('')
  const [formManagerId, setFormManagerId] = useState<string>('')

  const loadData = async () => {
    try {
      setLoading(true)
      const user = await authService.getCurrentUser()
      if (user) {
        setCurrentAdminId(user.id)
      }
      
      const userList = await adminService.getAllUsers()
      setUsers(userList)

      const managerList = await authService.getManagers()
      setManagers(managerList)
    } catch (error) {
      toast.error('Failed to load system users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenEdit = (user: Profile & { manager_name?: string | null }) => {
    setSelectedUser(user)
    setFormRole(user.role)
    setFormDept(user.department || '')
    setFormManagerId(user.manager_id || 'none')
    setIsEditModalOpen(true)
  }

  const handleSaveUser = async () => {
    if (!selectedUser || !currentAdminId) return

    try {
      const updates: Partial<Profile> = {
        role: formRole,
        department: formDept || null,
        manager_id: formManagerId === 'none' ? null : formManagerId
      }

      await adminService.updateUserProfile(selectedUser.id, updates, currentAdminId)
      toast.success(`Successfully updated ${selectedUser.full_name || 'user'} profile!`)
      setIsEditModalOpen(false)
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user profile.')
    }
  }

  const handleRemoveManager = async (user: Profile & { manager_name?: string | null }) => {
    if (!currentAdminId) return
    try {
      await adminService.updateUserProfile(user.id, { manager_id: null }, currentAdminId)
      toast.success(`Removed reporting manager for ${user.full_name}`)
      loadData()
    } catch (error) {
      toast.error('Failed to remove reporting manager.')
    }
  }

  // Initials generator for premium avatars
  const getInitials = (name: string | null) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarBg = (name: string | null) => {
    if (!name) return 'bg-slate-100 text-slate-600'
    const colors = [
      'bg-blue-50 text-blue-700 border-blue-100',
      'bg-indigo-50 text-indigo-700 border-indigo-100',
      'bg-violet-50 text-violet-700 border-violet-100',
      'bg-purple-50 text-purple-700 border-purple-100',
      'bg-sky-50 text-sky-700 border-sky-100',
    ]
    const sum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[sum % colors.length]
  }

  // Filter users matching criteria
  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase()
    const nameMatch = user.full_name?.toLowerCase().includes(search) || false
    const emailMatch = user.email?.toLowerCase().includes(search) || false
    const deptMatch = user.department?.toLowerCase().includes(search) || false
    
    const roleMatch = roleFilter === 'all' || user.role === roleFilter

    return (nameMatch || emailMatch || deptMatch) && roleMatch
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner Control Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between md:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">User Registry</h2>
            <p className="text-xs text-slate-500 mt-0.5">Control employee access levels, corporate departments, and manager lines.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <Input
                type="text"
                placeholder="Search name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-xs bg-white text-slate-800 focus:ring-blue-600 w-full sm:w-56"
              />
            </div>

            {/* Role Filter dropdown */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer min-w-[120px]"
            >
              <option value="all">All Roles</option>
              <option value="employee">Employees</option>
              <option value="manager">Managers</option>
              <option value="admin">Administrators</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400 font-medium animate-pulse">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-3 animate-bounce" />
              Syncing user database registry...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400 font-medium">
              No registered profiles match your current queries.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4 w-[30%]">User Profile Details</th>
                  <th className="px-6 py-4 w-[18%]">Portal Role</th>
                  <th className="px-6 py-4 w-[20%]">Department</th>
                  <th className="px-6 py-4 w-[18%]">Reporting Manager</th>
                  <th className="px-6 py-4 w-[14%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredUsers.map((user) => {
                  const avatarColor = getAvatarBg(user.full_name)
                  const initials = getInitials(user.full_name)

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group">
                      {/* Avatar & Email */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border", avatarColor)}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                              {user.full_name || 'N/A'}
                            </div>
                            <div className="text-xs text-slate-400 font-light truncate flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-300" />
                              {user.email || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-6 py-4.5">
                        {user.role === 'admin' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/50">
                            Admin
                          </span>
                        )}
                        {user.role === 'manager' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                            Manager
                          </span>
                        )}
                        {user.role === 'employee' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/50">
                            Employee
                          </span>
                        )}
                      </td>

                      {/* Department */}
                      <td className="px-6 py-4.5 text-sm text-slate-600 font-medium">
                        {user.department ? (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {user.department}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-light text-xs">Not Assigned</span>
                        )}
                      </td>

                      {/* Manager Name */}
                      <td className="px-6 py-4.5 text-sm text-slate-600 font-medium">
                        {user.role === 'employee' ? (
                          user.manager_name ? (
                            <span className="flex items-center gap-1 text-slate-700">
                              <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                              {user.manager_name}
                            </span>
                          ) : (
                            <span className="text-amber-500 italic font-medium text-xs flex items-center gap-1">
                              No Manager Assigned
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300 font-light text-xs">—</span>
                        )}
                      </td>

                      {/* Actions Buttons */}
                      <td className="px-6 py-4.5 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(user)}
                          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit User profile"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        {user.role === 'employee' && user.manager_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveManager(user)}
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Remove reporting manager"
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit User dialog modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-white text-slate-800 max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold">Edit Profile Registry</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Modify details for <strong className="text-slate-700">{selectedUser?.full_name}</strong> below.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* User Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Access Role</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as UserRole)}
                className="w-full h-10 px-3 py-2 text-sm border rounded-lg bg-white border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Corporate Department */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department</label>
              <Input
                placeholder="e.g. Sales Operations"
                value={formDept}
                onChange={(e) => setFormDept(e.target.value)}
                className="bg-white border border-slate-200"
              />
            </div>

            {/* Reporting Manager selection (only show if role = employee) */}
            {formRole === 'employee' && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reporting Manager</label>
                <select
                  value={formManagerId}
                  onChange={(e) => setFormManagerId(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm border rounded-lg bg-white border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="none">No Manager (Unassigned)</option>
                  {managers
                    .filter(m => m.id !== selectedUser?.id) // exclude self
                    .map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.full_name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="text-slate-500">
              Cancel
            </Button>
            <Button onClick={handleSaveUser} className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
