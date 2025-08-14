/**
 * Rating System Types
 * 
 * Defines the structure for project ratings and user rating summaries
 * following the hierarchical storage pattern used throughout the application.
 */

export interface ProjectRating {
  /** Unique identifier for the rating */
  ratingId: string;
  
  /** ID of the project being rated */
  projectId: number;
  
  /** ID of the user giving the rating */
  raterUserId: number;
  
  /** Type of the user giving the rating */
  raterUserType: 'freelancer' | 'commissioner';
  
  /** ID of the user being rated */
  subjectUserId: number;
  
  /** Type of the user being rated */
  subjectUserType: 'freelancer' | 'commissioner';
  
  /** Rating value (1-5 stars) */
  rating: number;
  
  /** Optional context/comment, especially for low ratings */
  comment?: string;
  
  /** When the rating was created */
  createdAt: string;
  
  /** Project title for display purposes */
  projectTitle?: string;
  
  /** Organization logo URL for display purposes */
  organizationLogoUrl?: string;
}

export interface UserRatingsSummary {
  /** User ID being summarized */
  userId: number;
  
  /** User type */
  userType: 'freelancer' | 'commissioner';
  
  /** Average rating (1-5, with 1 decimal place) */
  averageRating: number;
  
  /** Total number of ratings received */
  totalRatings: number;
  
  /** Individual ratings with project context */
  ratings: ProjectRating[];
  
  /** When this summary was last calculated */
  lastUpdated: string;
}

export interface RatingSubmissionRequest {
  /** ID of the project being rated */
  projectId: number;
  
  /** ID of the user being rated */
  subjectUserId: number;
  
  /** Type of the user being rated */
  subjectUserType: 'freelancer' | 'commissioner';
  
  /** Rating value (1-5 stars) */
  rating: number;
  
  /** Optional context/comment */
  comment?: string;
}

export interface RatingExistsResponse {
  /** Whether a rating already exists for this rater->subject pair on this project */
  exists: boolean;
  
  /** The existing rating if it exists */
  existingRating?: ProjectRating;
}

export interface RatingGuardResult {
  /** Whether the user can rate this project */
  canRate: boolean;
  
  /** Reason why rating is not allowed (if canRate is false) */
  reason?: string;
  
  /** Additional context for the guard decision */
  context?: {
    projectStatus: string;
    allMilestonesComplete: boolean;
    isParticipant: boolean;
    hasExistingRating: boolean;
  };
}

/**
 * Type guard to validate ProjectRating structure
 */
export function isValidProjectRating(data: unknown): data is ProjectRating {
  if (!data || typeof data !== 'object') return false;

  const rating = data as Record<string, unknown>;

  return (
    typeof rating.ratingId === 'string' &&
    typeof rating.projectId === 'number' &&
    typeof rating.raterUserId === 'number' &&
    (rating.raterUserType === 'freelancer' || rating.raterUserType === 'commissioner') &&
    typeof rating.subjectUserId === 'number' &&
    (rating.subjectUserType === 'freelancer' || rating.subjectUserType === 'commissioner') &&
    typeof rating.rating === 'number' &&
    rating.rating >= 1 &&
    rating.rating <= 5 &&
    typeof rating.createdAt === 'string' &&
    (rating.comment === undefined || typeof rating.comment === 'string') &&
    (rating.projectTitle === undefined || typeof rating.projectTitle === 'string') &&
    (rating.organizationLogoUrl === undefined || typeof rating.organizationLogoUrl === 'string')
  );
}

/**
 * Type guard to validate UserRatingsSummary structure
 */
export function isValidUserRatingsSummary(data: unknown): data is UserRatingsSummary {
  if (!data || typeof data !== 'object') return false;
  
  const summary = data as Record<string, unknown>;
  
  return (
    typeof summary.userId === 'number' &&
    (summary.userType === 'freelancer' || summary.userType === 'commissioner') &&
    typeof summary.averageRating === 'number' &&
    typeof summary.totalRatings === 'number' &&
    Array.isArray(summary.ratings) &&
    summary.ratings.every(isValidProjectRating) &&
    typeof summary.lastUpdated === 'string'
  );
}

/**
 * Generate hierarchical storage path for a rating
 */
export function getRatingStoragePath(projectId: number, subjectUserType: 'freelancer' | 'commissioner', raterUserId: number): string {
  return `data/projects/${projectId}/ratings/${subjectUserType}/rating-${raterUserId}.json`;
}

/**
 * Generate unique rating ID
 */
export function generateRatingId(projectId: number, raterUserId: number, subjectUserId: number): string {
  return `rating-${projectId}-${raterUserId}-${subjectUserId}-${Date.now()}`;
}
