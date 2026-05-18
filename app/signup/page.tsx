'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/services/auth'
import { UserRole } from '@/types/auth'
import { Mail, Lock, Eye, EyeOff, UserPlus, User, Shield, Target, Users } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'employee' as UserRole,
  })
  const [managers, setManagers] = useState<{ id: string; full_name: string }[]>([])
  const [selectedManagerId, setSelectedManagerId] = useState('')

  // Redirect already authenticated users away from the auth page
  useEffect(() => {
    async function checkSession() {
      try {
        const user = await authService.getCurrentUser()
        if (user) {
          const role = await authService.getUserRole(user.id)
          if (role) {
            if (role === 'admin') router.push('/admin/dashboard')
            else if (role === 'manager') router.push('/manager/dashboard')
            else router.push('/employee/dashboard')
          }
        }
      } catch (err) {
        console.error('Error checking active session:', err)
      }
    }
    checkSession()
  }, [router])

  useEffect(() => {
    async function loadManagers() {
      try {
        const list = await authService.getManagers()
        setManagers(list)
        if (list.length > 0) {
          setSelectedManagerId(list[0].id)
        }
      } catch (err) {
        console.error('Failed to load managers:', err)
      }
    }
    loadManagers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.role === 'employee' && !selectedManagerId) {
      toast.error('Please assign a reporting manager to complete registration.')
      return
    }

    setLoading(true)

    try {
      await authService.signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.role,
        formData.role === 'employee' ? selectedManagerId : undefined
      )
      toast.success('Account created successfully!')
      
      // Redirect based on role
      if (formData.role === 'admin') router.push('/admin/dashboard')
      else if (formData.role === 'manager') router.push('/manager/dashboard')
      else router.push('/employee/dashboard')
      
    } catch (error: any) {
      toast.error(error.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f9f9ff] text-[#151c27]">
      {/* Left Side: Branded Welcome Area */}
      <div className="hidden lg:flex relative w-1/2 bg-[#e2e8f8] items-center justify-center overflow-hidden">
        {/* Abstract Background Image */}
        <img 
          alt="Abstract business alignment backdrop" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-multiply" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDecGV9PlC7u8h_XsCy80y9MrK3ct9jgFL57Ndhb3bFeafkRcsY3KSVYeTKvVSiXEiEl5PXD9UdN3w4Tzp7Rpzp4CtWjTjYEQwD2nPzGNixP6RZkMRKlgEWKYqY3tCwCBrzndHts3_dFRLQvD7IkzL6ZZeM5457HF9LG7Hc2gml_JPABTdB28VmTadITwzy5a39q5fH50QGppjnck2OyYqp8JIn7Yp6s70Kq3j3MOGzq6Wl9mpvoz3xtDpqb8CrvzW9_3dnj8ruIa-5"
        />
        {/* Gradient Overlay for high visual elegance */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#00288e]/10 to-[#e2e8f8]/90 mix-blend-overlay"></div>
        
        {/* Branded Content */}
        <div className="relative z-10 px-12 text-center max-w-lg flex flex-col gap-6">
          <div className="w-16 h-16 bg-[#00288e] rounded-2xl flex items-center justify-center mx-auto shadow-md mb-4 transform hover:scale-105 transition-transform duration-300">
            <Target className="text-white w-9 h-9" />
          </div>
          <div>
            <h1 className="text-5xl font-extrabold text-[#00288e] mb-4 tracking-tight">AtomQuest</h1>
            <p className="text-xl text-[#444653] font-light">Align. Track. Achieve.</p>
          </div>
        </div>
      </div>

      {/* Right Side: Authentication Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        {/* Signup Card */}
        <div className="w-full max-w-[440px] bg-white border border-[#E5E7EB] rounded-2xl p-8 lg:p-10 shadow-sm flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-[#151c27]">Create Account</h2>
            <p className="text-sm text-[#444653]">Enter your details below to register for the portal.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Full Name Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#151c27]" htmlFor="fullName">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5 text-[#757684]" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#c4c5d5] rounded-lg bg-white text-[#151c27] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#151c27]" htmlFor="email">
                Corporate Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5 text-[#757684]" />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="name@atomberg.com"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#c4c5d5] rounded-lg bg-white text-[#151c27] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#151c27]" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5 text-[#757684]" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-[#c4c5d5] rounded-lg bg-white text-[#151c27] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-[#757684]" />
                  ) : (
                    <Eye className="w-4 h-4 text-[#757684]" />
                  )}
                </button>
              </div>
            </div>

            {/* Role Select Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#151c27]" htmlFor="role">
                Select Portal Access Role
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10 text-slate-400">
                  <Shield className="w-5 h-5 text-[#757684]" />
                </div>
                <Select
                  value={formData.role}
                  onValueChange={(value) => {
                    if (value) {
                      setFormData({ ...formData, role: value as UserRole })
                    }
                  }}
                >
                  <SelectTrigger className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#c4c5d5] rounded-lg bg-white text-[#151c27] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-all justify-start gap-2 h-auto text-left shadow-none">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-[#E5E7EB] text-[#151c27]">
                    <SelectItem value="employee" className="hover:bg-[#f0f3ff] focus:bg-[#f0f3ff] cursor-pointer py-2">
                      Employee
                    </SelectItem>
                    <SelectItem value="manager" className="hover:bg-[#f0f3ff] focus:bg-[#f0f3ff] cursor-pointer py-2">
                      Manager
                    </SelectItem>
                    <SelectItem value="admin" className="hover:bg-[#f0f3ff] focus:bg-[#f0f3ff] cursor-pointer py-2">
                      Admin
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Manager Select Input (Only shown if role === 'employee') */}
            {formData.role === 'employee' && (
              <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="text-sm font-semibold text-[#151c27]" htmlFor="manager">
                  Assign Reporting Manager
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10 text-slate-400">
                    <Users className="w-5 h-5 text-[#757684]" />
                  </div>
                  <Select
                    value={selectedManagerId}
                    onValueChange={(value) => setSelectedManagerId(value || '')}
                  >
                    <SelectTrigger className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#c4c5d5] rounded-lg bg-white text-[#151c27] focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-all justify-start gap-2 h-auto text-left shadow-none">
                      <SelectValue placeholder="Select your reporting manager" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-[#E5E7EB] text-[#151c27]">
                      {managers.length === 0 ? (
                        <SelectItem value="none" disabled className="py-2 text-slate-400">
                          No active managers found
                        </SelectItem>
                      ) : (
                        managers.map((mgr) => (
                          <SelectItem 
                            key={mgr.id} 
                            value={mgr.id} 
                            className="hover:bg-[#f0f3ff] focus:bg-[#f0f3ff] cursor-pointer py-2"
                          >
                            {mgr.full_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-[#00288e] hover:bg-[#001f66] text-white font-semibold py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00288e] transition-colors flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
              <UserPlus className="w-4 h-4" />
            </button>
          </form>

          {/* Switch Link */}
          <div className="text-center text-xs text-slate-500 my-1">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[#00288e] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
