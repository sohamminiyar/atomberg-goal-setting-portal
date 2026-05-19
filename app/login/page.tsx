'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/services/auth'
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Users, Shield, Target } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const user = await authService.signIn(formData.email, formData.password)
      if (!user) throw new Error('Login failed')

      toast.success('Logged in successfully!')
      
      // Fetch role to redirect
      const role = await authService.getUserRole(user.id)
      
      if (role === 'admin') router.push('/admin/dashboard')
      else if (role === 'manager') router.push('/manager/dashboard')
      else router.push('/employee/dashboard')
      
    } catch (error: any) {
      toast.error(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // QoL function to autofill test credentials for quick local verification
  const handleAutofill = (email: string, password: string, roleName: string) => {
    setFormData({
      email,
      password,
    })
    toast.info(`Autofilled credentials for ${roleName}!`)
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f9f9ff] text-[#151c27]">
      {/* Left Side: Branded Welcome Area (Hidden on mobile/tablet) */}
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
          <div className="w-32 h-16 flex items-center justify-center mx-auto mb-4 transform hover:scale-105 transition-transform duration-300">
            <img 
              src="/atomberg.jpg" 
              alt="Atomberg Logo" 
              className="w-full h-full object-contain mix-blend-multiply rounded-md"
            />
          </div>
          <div>
            <h1 className="text-5xl font-extrabold text-[#00288e] mb-4 tracking-tight">AtomQuest</h1>
            <p className="text-xl text-[#444653] font-light">Align. Track. Achieve.</p>
          </div>
        </div>
      </div>

      {/* Right Side: Authentication Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        {/* Login Card */}
        <div className="w-full max-w-[390px] bg-white border border-[#E5E7EB] rounded-2xl p-6 lg:p-8 shadow-sm flex flex-col gap-5">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-[#151c27]">Sign in to AtomQuest</h2>
            <p className="text-xs text-slate-500">Enter your credentials to access your goal setting dashboard.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#151c27]" htmlFor="email">
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
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-[#151c27]" htmlFor="password">
                  Password
                </label>
                <Link
                  href="#"
                  className="text-xs font-semibold text-[#00288e] hover:text-[#001f66] transition-colors hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-[#00288e] hover:bg-[#001f66] text-white font-semibold py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00288e] transition-colors flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider & Switch */}
          <div className="text-center text-xs text-slate-500 my-1">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-[#00288e] hover:underline">
              Create an account
            </Link>
          </div>

          {/* Divider for Testing Credentials */}
          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 font-semibold text-[#757684] text-[10px] tracking-wider">
                Quick Testing Access
              </span>
            </div>
          </div>

          {/* Testing Credentials Switcher */}
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => handleAutofill('employee@test.com', 'employee@123', 'Employee')}
              className="px-3.5 py-1.5 rounded-full border border-[#c4c5d5] bg-white font-semibold text-xs text-[#444653] hover:bg-slate-50 hover:text-[#00288e] hover:border-[#00288e] transition-all flex items-center gap-1.5 shadow-sm"
              type="button"
            >
              <User className="w-3.5 h-3.5" />
              Employee
            </button>
            <button
              onClick={() => handleAutofill('manager@test.com', 'manager@123', 'Manager')}
              className="px-3.5 py-1.5 rounded-full border border-[#c4c5d5] bg-white font-semibold text-xs text-[#444653] hover:bg-slate-50 hover:text-[#00288e] hover:border-[#00288e] transition-all flex items-center gap-1.5 shadow-sm"
              type="button"
            >
              <Users className="w-3.5 h-3.5" />
              Manager
            </button>
            <button
              onClick={() => handleAutofill('admin@test.com', 'admin@123', 'Admin')}
              className="px-3.5 py-1.5 rounded-full border border-[#c4c5d5] bg-white font-semibold text-xs text-[#444653] hover:bg-slate-50 hover:text-[#00288e] hover:border-[#00288e] transition-all flex items-center gap-1.5 shadow-sm"
              type="button"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
