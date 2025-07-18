// Form persistence utility for post-a-gig flow

export interface PostGigFormData {
  // Step 1 & 2
  selectedCategory?: string;
  selectedSubcategory?: string;
  
  // Step 3
  startType?: 'Immediately' | 'Custom';
  customStartDate?: string;
  endDate?: string;
  executionMethod?: 'completion' | 'milestone';
  lowerBudget?: string;
  upperBudget?: string;
  
  // Step 4
  projectDescription?: string;
  projectBriefFile?: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
  skills?: string[];
  tools?: string[];
  milestones?: Array<{
    id: string;
    title: string;
    description: string;
    startDate: string | null;
    endDate: string | null;
    amount?: number;
  }>;
  
  // Step 5
  organizationData?: {
    id?: number;
    name: string;
    email: string;
    logo: string;
    address: string;
    contactPersonId: number;
    website?: string;
    description?: string;
  };
}

const STORAGE_KEY = 'post-gig-form-data';

export class FormPersistence {
  // Save form data to localStorage
  static saveFormData(data: Partial<PostGigFormData>): void {
    try {
      const existingData = this.getFormData();
      const updatedData = { ...existingData, ...data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    } catch (error) {
      console.warn('Failed to save form data:', error);
    }
  }

  // Get form data from localStorage
  static getFormData(): PostGigFormData {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.warn('Failed to load form data:', error);
      return {};
    }
  }

  // Clear form data from localStorage
  static clearFormData(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear form data:', error);
    }
  }

  // Save specific step data
  static saveStepData(step: number, data: Partial<PostGigFormData>): void {
    const timestamp = new Date().toISOString();
    const stepData = { ...data, [`step${step}Timestamp`]: timestamp };
    this.saveFormData(stepData);
  }

  // Check if form data exists
  static hasFormData(): boolean {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data !== null && Object.keys(JSON.parse(data)).length > 0;
    } catch {
      return false;
    }
  }

  // Get form data for URL parameters
  static getUrlParams(): URLSearchParams {
    const data = this.getFormData();
    const params = new URLSearchParams();

    // Add all non-null, non-undefined values to params
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (typeof value === 'object') {
          params.set(key, JSON.stringify(value));
        } else {
          params.set(key, String(value));
        }
      }
    });

    return params;
  }

  // Restore form data from URL parameters
  static restoreFromUrlParams(searchParams: URLSearchParams): PostGigFormData {
    const data: PostGigFormData = {};

    // Parse URL parameters back to form data
    for (const [key, value] of searchParams.entries()) {
      try {
        // Try to parse as JSON first (for objects and arrays)
        if (value.startsWith('{') || value.startsWith('[')) {
          data[key as keyof PostGigFormData] = JSON.parse(value);
        } else {
          data[key as keyof PostGigFormData] = value as any;
        }
      } catch {
        // If JSON parsing fails, use as string
        data[key as keyof PostGigFormData] = value as any;
      }
    }

    return data;
  }

  // Merge URL params with localStorage data (URL params take precedence)
  static getMergedFormData(searchParams?: URLSearchParams): PostGigFormData {
    const localData = this.getFormData();
    
    if (!searchParams) {
      return localData;
    }

    const urlData = this.restoreFromUrlParams(searchParams);
    return { ...localData, ...urlData };
  }
}
