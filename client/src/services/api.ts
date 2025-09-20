// API service for pattern and variant management
import { PatternFormData, VariantFormData, Concept, Technique, Goal, TemplateBasic, Pattern } from '../components/AddEntryForm';

const API_BASE_URL = '';

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface CreatedPattern {
  id: number;
  name: string;
  description?: string;
  template_id?: number;
  concept_id?: number;
  created_at: string;
  concept_name?: string;
  template_description?: string;
}

export interface CreatedVariant {
  id: number;
  name: string;
  use_when: string;
  notes: string;
  pattern_id: number;
  technique_id?: number;
  goal_id?: number;
  concept_id?: number;
  template_pattern_id?: number;
  created_at: string;
  pattern_name?: string;
  technique_name?: string;
  goal_name?: string;
  concept_name?: string;
}

// Custom error class for API errors
export class ApiError extends Error {
  public status: number;
  public details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const config = { ...defaultOptions, ...options };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorDetails;

      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
        errorDetails = errorData;
      } catch {
        // If response is not JSON, use the status text
      }

      throw new ApiError(errorMessage, response.status, errorDetails);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error occurred',
      0,
      error
    );
  }
}

// Reference data API functions
export const referenceDataApi = {
  async getConcepts(): Promise<Concept[]> {
    return apiRequest<Concept[]>('/api/concepts');
  },

  async getTechniques(): Promise<Technique[]> {
    return apiRequest<Technique[]>('/api/techniques');
  },

  async getGoals(): Promise<Goal[]> {
    return apiRequest<Goal[]>('/api/goals');
  },

  async getTemplateBasics(): Promise<TemplateBasic[]> {
    return apiRequest<TemplateBasic[]>('/api/template-basics');
  },

  async getPatterns(): Promise<Pattern[]> {
    return apiRequest<Pattern[]>('/api/patterns');
  },
};

// Pattern API functions
export const patternApi = {
  async create(data: PatternFormData): Promise<CreatedPattern> {
    // Validate required fields
    if (!data.name?.trim()) {
      throw new ApiError('Pattern name is required', 400);
    }
    if (!data.description?.trim()) {
      throw new ApiError('Pattern description is required', 400);
    }

    // Clean the data
    const cleanData = {
      name: data.name.trim(),
      description: data.description.trim(),
      template_id: data.template_id || null,
      concept_id: data.concept_id || null,
    };

    return apiRequest<CreatedPattern>('/api/patterns', {
      method: 'POST',
      body: JSON.stringify(cleanData),
    });
  },

  async getById(id: number): Promise<Pattern> {
    return apiRequest<Pattern>(`/api/patterns/${id}`);
  },

  async update(id: number, data: Partial<PatternFormData>): Promise<CreatedPattern> {
    return apiRequest<CreatedPattern>(`/api/patterns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<void> {
    return apiRequest<void>(`/api/patterns/${id}`, {
      method: 'DELETE',
    });
  },
};

// Variant API functions
export const variantApi = {
  async create(data: VariantFormData): Promise<CreatedVariant> {
    // Validate required fields
    if (!data.name?.trim()) {
      throw new ApiError('Variant name is required', 400);
    }
    if (!data.use_when?.trim()) {
      throw new ApiError('Use when description is required', 400);
    }
    if (!data.pattern_id) {
      throw new ApiError('Pattern selection is required', 400);
    }

    // Clean the data
    const cleanData = {
      name: data.name.trim(),
      use_when: data.use_when.trim(),
      notes: data.notes?.trim() || '',
      pattern_id: data.pattern_id,
      technique_id: data.technique_id || null,
      goal_id: data.goal_id || null,
      concept_id: data.concept_id || null,
      template_pattern_id: data.template_pattern_id || null,
    };

    return apiRequest<CreatedVariant>('/api/variants', {
      method: 'POST',
      body: JSON.stringify(cleanData),
    });
  },

  async getById(id: number): Promise<CreatedVariant> {
    return apiRequest<CreatedVariant>(`/api/variants/${id}`);
  },

  async getByPattern(patternId: number): Promise<CreatedVariant[]> {
    return apiRequest<CreatedVariant[]>(`/api/variants?pattern_id=${patternId}`);
  },

  async update(id: number, data: Partial<VariantFormData>): Promise<CreatedVariant> {
    return apiRequest<CreatedVariant>(`/api/variants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<void> {
    return apiRequest<void>(`/api/variants/${id}`, {
      method: 'DELETE',
    });
  },
};

// Generic request method for other services to use
export { apiRequest };

// Review API functions for spaced repetition system
export const reviewApi = {
  async submitReview(data: {
    problem_id: number;
    result: 'remembered' | 'forgot';
    time_spent?: number;
    notes?: string;
    confusion_notes?: string;
    specific_mistakes?: string[];
  }): Promise<any> {
    return apiRequest('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getDueToday(): Promise<any[]> {
    return apiRequest('/api/reviews/due-today');
  },

  async getReviewHistory(problemId: number): Promise<any> {
    return apiRequest(`/api/reviews/history/${problemId}`);
  },

  async handleForgetting(data: {
    problem_id: number;
    forgotten_stage: number;
    time_spent?: number;
    confusion_notes?: string;
    specific_mistakes?: string[];
  }): Promise<any> {
    return apiRequest('/api/reviews/handle-forgetting', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async processIntensiveCycle(data: {
    problem_id: number;
    result: 'remembered' | 'forgot';
    notes?: string;
    time_spent?: number;
  }): Promise<any> {
    return apiRequest('/api/reviews/intensive-cycle', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async scheduleInitial(data: { problem_id: number }): Promise<any> {
    return apiRequest('/api/reviews/schedule-initial', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getActiveRecoveryCycles(): Promise<any[]> {
    return apiRequest('/api/reviews/active-cycles');
  },

  async createRecoveryCycle(data: {
    problem_id: number;
    cycles_remaining: number;
    cycle_interval_days: number;
  }): Promise<any> {
    return apiRequest('/api/reviews/create-cycle', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async completeRecoveryCycle(data: { problem_id: number }): Promise<any> {
    return apiRequest('/api/reviews/complete-cycle', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Combined API object for easy importing
export const api = {
  referenceData: referenceDataApi,
  patterns: patternApi,
  variants: variantApi,
  reviews: reviewApi,
  request: apiRequest, // Expose generic request method
};

export default api;