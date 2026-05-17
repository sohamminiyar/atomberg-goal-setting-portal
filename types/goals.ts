export type GoalStatus = 'draft' | 'pending_approval' | 'approved' | 'rework_requested';
export type UOMType = 'numeric' | 'percentage' | 'timeline' | 'zero';

export interface Goal {
  id: string;
  employee_id: string;
  thrust_area: string;
  title: string;
  description: string;
  uom_type: UOMType;
  target: string;
  weightage: number;
  status: GoalStatus;
  locked: boolean;
  manager_id?: string;
  created_at: string;
  updated_at: string;
}

export interface GoalFormData {
  title: string;
  description: string;
  weightage: number;
  target: string;
  thrust_area: string;
  uom_type: UOMType;
}
