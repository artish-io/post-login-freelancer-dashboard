export type UserType = "freelancer" | "commissioner";

export interface ProjectRating {
  projectId: number;
  subjectUserId: number;
  subjectUserType: UserType;
  raterUserId: number;
  raterUserType: UserType;
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  version: number;   // start at 1
}

export interface UserRatingsSummary {
  ratings: ProjectRating[];
  average: number; // 0 if none
  count: number;
}

export interface RatingSubmissionRequest {
  projectId: number;
  subjectUserId: number;
  subjectUserType: UserType;
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

export interface RatingExistsResponse {
  exists: boolean;
  rating?: ProjectRating;
}

export interface RatingSubmissionResponse {
  ok: boolean;
  saved: ProjectRating;
}
