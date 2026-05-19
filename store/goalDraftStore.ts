import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { GoalFormData } from '@/types/goals'

const defaultDraft: GoalFormData = {
  title: '',
  description: '',
  weightage: 10,
  target: '',
  thrust_area: 'Operational Excellence',
  uom_type: 'numeric',
  is_shared: false,
  is_primary_owner: false,
  shared_goal_id: null
}

interface GoalDraftState {
  activeDraft: GoalFormData
  updateDraft: (updates: Partial<GoalFormData>) => void
  clearDraft: () => void
}

export const useGoalDraftStore = create<GoalDraftState>()(
  persist(
    (set) => ({
      activeDraft: defaultDraft,
      updateDraft: (updates) => set((state) => ({ 
        activeDraft: { ...state.activeDraft, ...updates } 
      })),
      clearDraft: () => set({ activeDraft: defaultDraft }),
    }),
    {
      name: 'atomberg-active-goal-draft', // Unique key in localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
)
