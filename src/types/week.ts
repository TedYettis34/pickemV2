// Week entity type definitions

export interface Week {
  id: number;
  name: string;
  start_date: string; // ISO date string
  end_date: string;   // ISO date string
  description?: string;
  is_locked: boolean;
  locked_at?: string; // ISO date string
  locked_by?: string; // Admin who locked the week
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface CreateWeekInput {
  name: string;
  start_date: string; // ISO date string
  end_date: string;   // ISO date string
  description?: string;
}

export interface UpdateWeekInput {
  name?: string;
  start_date?: string; // ISO date string
  end_date?: string;   // ISO date string
  description?: string;
}

export interface WeekFilters {
  name?: string;
  start_date_from?: string;
  start_date_to?: string;
  end_date_from?: string;
  end_date_to?: string;
  active_on?: string; // Find weeks active on a specific date
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

// Form validation types
export interface WeekValidationError {
  field: keyof CreateWeekInput | keyof UpdateWeekInput;
  message: string;
}

export interface WeekFormState {
  values: CreateWeekInput;
  errors: WeekValidationError[];
  isSubmitting: boolean;
  isValid: boolean;
}