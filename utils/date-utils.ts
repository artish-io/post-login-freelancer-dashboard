/**
 * Utility functions for date formatting and manipulation
 */

/**
 * Convert a date to relative time format (e.g., "2 hours ago", "3 days ago")
 */
export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
  // Handle invalid dates
  if (isNaN(targetDate.getTime())) {
    return 'Invalid date';
  }
  
  const diffInMs = now.getTime() - targetDate.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  // Future dates
  if (diffInMs < 0) {
    const absDiffInSeconds = Math.abs(diffInSeconds);
    const absDiffInMinutes = Math.abs(diffInMinutes);
    const absDiffInHours = Math.abs(diffInHours);
    const absDiffInDays = Math.abs(diffInDays);
    
    if (absDiffInSeconds < 60) {
      return 'in a few seconds';
    } else if (absDiffInMinutes < 60) {
      return `in ${absDiffInMinutes} minute${absDiffInMinutes === 1 ? '' : 's'}`;
    } else if (absDiffInHours < 24) {
      return `in ${absDiffInHours} hour${absDiffInHours === 1 ? '' : 's'}`;
    } else if (absDiffInDays < 7) {
      return `in ${absDiffInDays} day${absDiffInDays === 1 ? '' : 's'}`;
    } else {
      return targetDate.toLocaleDateString();
    }
  }

  // Past dates
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`;
  } else if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
  } else {
    return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
  }
}

/**
 * Format a date for display in a consistent format
 */
export function formatDate(date: string | Date): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(targetDate.getTime())) {
    return 'Invalid date';
  }
  
  return targetDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Check if a date is today
 */
export function isToday(date: string | Date): boolean {
  const today = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
  return today.toDateString() === targetDate.toDateString();
}

/**
 * Check if a date is within the last week
 */
export function isWithinLastWeek(date: string | Date): boolean {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffInMs = now.getTime() - targetDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  return diffInDays >= 0 && diffInDays <= 7;
}
