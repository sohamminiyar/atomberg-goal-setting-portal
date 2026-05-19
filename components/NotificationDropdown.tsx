'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  Bell, 
  CheckCircle, 
  RotateCcw, 
  Unlock, 
  CheckSquare, 
  UserCog, 
  Send,
  Loader2,
  CheckCheck,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotificationStore } from '@/store/notificationStore'

// Relative time formatting utility
function formatRelativeTime(isoString: string) {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch (e) {
    return 'Just now'
  }
}

interface NotificationItem {
  id: string
  user_id?: string
  action: string
  entity_type: string
  entity_id: string
  old_value: any
  new_value: any
  created_at: string
  remarks?: string
  profiles?: {
    full_name: string | null
    email: string | null
  } | null
}

interface NotificationDropdownProps {
  currentUserId: string
  role: 'employee' | 'manager' | 'admin'
}

export default function NotificationDropdown({ currentUserId, role }: NotificationDropdownProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [readIds, setReadIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { setUnreadCount } = useNotificationStore()

  // Fetch notifications
  const fetchNotifications = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)

      let query = supabase
        .from('audit_logs')
        .select(`
          id,
          user_id,
          action,
          entity_type,
          entity_id,
          old_value,
          new_value,
          created_at,
          remarks,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      // For non-admin roles, filter notifications targeted directly to them
      if (role !== 'admin') {
        query = query.eq('entity_id', currentUserId)
      }

      // Filter based on role to only show action items relevant to them
      if (role === 'employee') {
        query = query.in('action', ['approve_goals', 'rework_requested', 'unlock_goals', 'force_approve_goals', 'update_user_profile', 'assign_shared_goal'])
      } else if (role === 'manager') {
        query = query.in('action', ['submit_goals', 'update_user_profile', 'assign_shared_goal'])
      }

      const { data, error } = await query

      if (error) throw error

      // Safely map the profiles join to handle array/object formats across versions
      const formatted = (data || []).map((item: any) => {
        let profileDetails = null
        if (item.profiles) {
          if (Array.isArray(item.profiles)) {
            profileDetails = item.profiles[0] || null
          } else {
            profileDetails = item.profiles
          }
        }
        return {
          ...item,
          profiles: profileDetails
        }
      })

      setNotifications(formatted as NotificationItem[])
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }

  // Initial fetch and set up polling + click outside listeners
  useEffect(() => {
    if (!currentUserId) return

    // Load read notifications list from localStorage
    const savedRead = localStorage.getItem(`read_notifications_${currentUserId}`)
    if (savedRead) {
      try {
        setReadIds(JSON.parse(savedRead))
      } catch (e) {
        console.error(e)
      }
    }

    fetchNotifications()

    // Supabase Realtime Subscription for Instant Updates
    const channel = supabase
      .channel(`audit_logs_${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
        },
        (payload) => {
          // Silently fetch latest notifications whenever a new audit_log is inserted
          fetchNotifications(true)
        }
      )
      .subscribe()

    // Close on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [currentUserId, role])

  // Mark all notifications as read
  const handleMarkAllRead = () => {
    const allIds = notifications.map(n => n.id)
    setReadIds(allIds)
    localStorage.setItem(`read_notifications_${currentUserId}`, JSON.stringify(allIds))
  }

  // Click individual notification
  const handleNotificationClick = (item: NotificationItem) => {
    // Mark as read
    if (!readIds.includes(item.id)) {
      const updated = [...readIds, item.id]
      setReadIds(updated)
      localStorage.setItem(`read_notifications_${currentUserId}`, JSON.stringify(updated))
    }
    setIsOpen(false)

    // Redirect to corresponding page based on role and action
    if (role === 'manager' && item.action === 'submit_goals') {
      router.push(`/manager/approvals?employeeId=${item.user_id || item.old_value?.employeeId || ''}`)
    } else if (role === 'employee') {
      if (item.action === 'rework_requested') {
        router.push('/employee/goals/new')
      } else {
        router.push('/employee/dashboard')
      }
    } else if (role === 'admin') {
      if (item.action === 'update_user_profile' || item.action === 'create_user_profile') {
        router.push('/admin/users')
      } else {
        router.push('/admin/goals')
      }
    }
  }

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length

  // Sync count to global Zustand store so other UI components can react instantly
  useEffect(() => {
    setUnreadCount(unreadCount)
  }, [unreadCount, setUnreadCount])

  // Build beautiful descriptive message and visual styling for each notification
  const getNotificationUI = (item: NotificationItem) => {
    const actorName = item.profiles?.full_name || 'System'
    let title = ''
    let description = ''
    let Icon = Bell
    let iconBg = 'bg-blue-50 text-blue-600'
    let actionColor = 'border-l-blue-500'

    switch (item.action) {
      case 'approve_goals':
        title = 'Goals Approved'
        description = role === 'admin'
          ? `${actorName} approved a goals roster.`
          : `Manager ${actorName} approved your goals roster. It is now locked.`
        Icon = CheckCircle
        iconBg = 'bg-emerald-50 text-emerald-600'
        actionColor = 'border-l-emerald-500'
        break
      case 'rework_requested':
        title = 'Rework Required'
        description = role === 'admin'
          ? `${actorName} requested changes: "${item.remarks || 'Please edit weights/targets'}"`
          : `Manager ${actorName} requested changes: "${item.remarks || 'Please edit weights/targets'}"`
        Icon = RotateCcw
        iconBg = 'bg-amber-50 text-amber-600'
        actionColor = 'border-l-amber-500'
        break
      case 'unlock_goals':
        title = 'Goals Unlocked'
        description = role === 'admin'
          ? `${actorName} unlocked a goals roster.`
          : 'An Administrator unlocked your goals. You can now edit and resubmit them.'
        Icon = Unlock
        iconBg = 'bg-blue-50 text-blue-600'
        actionColor = 'border-l-blue-500'
        break
      case 'force_approve_goals':
        title = 'Goals Force Approved'
        description = role === 'admin'
          ? `${actorName} force-approved a goals roster.`
          : 'An Administrator approved and locked your performance goals roster.'
        Icon = CheckSquare
        iconBg = 'bg-emerald-50 text-emerald-600 border border-emerald-100'
        actionColor = 'border-l-emerald-500'
        break
      case 'update_user_profile':
        title = 'Registry Profile Updated'
        description = role === 'admin'
          ? `${actorName} updated a registry profile.`
          : 'Your HR profile registry has been modified by an Administrator.'
        Icon = UserCog
        iconBg = 'bg-slate-50 text-slate-600'
        actionColor = 'border-l-slate-400'
        break
      case 'assign_shared_goal':
        title = 'New Goal Assigned'
        description = role === 'admin'
          ? `${actorName} assigned a new shared KPI.`
          : `${actorName} deployed a new shared KPI to your team roster.`
        Icon = Send
        iconBg = 'bg-indigo-50 text-indigo-600'
        actionColor = 'border-l-indigo-500'
        break
      case 'deploy_shared_goal':
        title = 'Shared Goal Deployed'
        description = `${actorName} deployed a departmental shared goal.`
        Icon = Send
        iconBg = 'bg-blue-50 text-blue-600'
        actionColor = 'border-l-blue-500'
        break
      case 'revoke_shared_goal':
        title = 'Shared Goal Revoked'
        description = `${actorName} revoked and deleted a shared goal.`
        Icon = RotateCcw
        iconBg = 'bg-rose-50 text-rose-600'
        actionColor = 'border-l-rose-500'
        break
      case 'submit_goals':
        title = 'Roster Submission'
        description = `${actorName} submitted a goals roster for approval.`
        Icon = Send
        iconBg = 'bg-indigo-50 text-indigo-600'
        actionColor = 'border-l-indigo-500'
        break
    }

    return { title, description, Icon, iconBg, actionColor }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dynamic Bell Icon Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-500 hover:text-[#00288e] hover:bg-slate-50 rounded-lg transition-all relative select-none hover:scale-105 active:scale-95"
      >
        <Bell className={cn("w-5 h-5 transition-transform", isOpen && "scale-110 text-[#00288e]")} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-extrabold shadow-sm animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notifications Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white/95 border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-[480px]">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Inbox Notifications</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{unreadCount} new notifications</p>
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-blue-600 hover:text-[#00288e] flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Scrollable Notifications list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar max-h-[360px]">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2.5">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Fetching operations...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 bg-slate-50 border rounded-2xl flex items-center justify-center text-slate-300">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Inbox is empty</h4>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-normal">
                    You have no new updates regarding performance goals at this time.
                  </p>
                </div>
              </div>
            ) : (
              notifications.map((item) => {
                const isRead = readIds.includes(item.id)
                const ui = getNotificationUI(item)
                const Icon = ui.Icon

                return (
                  <div 
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={cn(
                      "p-4 flex gap-3.5 cursor-pointer hover:bg-slate-50/50 transition-colors border-l-[3px] select-none group relative",
                      isRead ? "border-l-transparent opacity-75" : ui.actionColor,
                      !isRead && "bg-blue-50/10"
                    )}
                  >
                    {/* Icon container */}
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm", ui.iconBg)}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Meta info */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex justify-between items-center gap-2">
                        <span className={cn("text-xs tracking-tight", isRead ? "font-bold text-slate-700" : "font-extrabold text-slate-900")}>
                          {ui.title}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed break-words pr-2">
                        {ui.description}
                      </p>
                    </div>

                    {/* Navigation arrow hint on hover */}
                    <div className="absolute right-3.5 bottom-3.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
