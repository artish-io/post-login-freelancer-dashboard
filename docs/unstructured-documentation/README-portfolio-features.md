# ARTISH Freelancer Profile Portfolio Features

This document describes the implementation of editable portfolio/outlinks and hourly rate range features for ARTISH freelancer profiles.

## Features Implemented

### 1. Portfolio Icons (Outlinks)
- **Location**: Displayed beneath the rating stars in freelancer profiles
- **Edit Mode**: Click anywhere in the portfolio area to open the Outlinks Modal
- **Capacity**: Up to 3 portfolio links supported
- **Platforms**: LinkedIn, Behance, Dribbble, GitHub, Notion, Google Docs, Airtable, Personal Website, Other
- **Auto-detection**: Automatically detects platform from URL and pre-selects in dropdown

### 2. Rate Range Editor
- **Location**: Replaces the existing hourly rate pill
- **Edit Mode**: Two numeric inputs with a static dash separator
- **Validation**: Ensures rateMin ≤ rateMax, positive integers only
- **Display**: Shows as `$80–200/hr` format when not editing

## API Contract

### Update Outlinks
```http
PUT /api/profile/outlinks
Content-Type: application/json

{
  "outlinks": [
    {
      "platform": "linkedin",
      "url": "https://linkedin.com/in/username",
      "label": "LinkedIn",
      "order": 0
    },
    {
      "platform": "behance",
      "url": "https://behance.net/username",
      "label": "Behance", 
      "order": 1
    }
  ]
}
```

**Response (200)**:
```json
{
  "success": true,
  "outlinks": [
    {
      "id": "ol_uuid_123",
      "platform": "linkedin",
      "url": "https://linkedin.com/in/username",
      "label": "LinkedIn",
      "order": 0,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "message": "Outlinks updated successfully"
}
```

### Update Rate Range
```http
PUT /api/profile/rate-range
Content-Type: application/json

{
  "rateMin": 80,
  "rateMax": 200,
  "rateUnit": "hour"
}
```

**Response (200)**:
```json
{
  "success": true,
  "rateRange": {
    "rateMin": 80,
    "rateMax": 200,
    "rateUnit": "hour"
  },
  "message": "Rate range updated successfully"
}
```

### Unified Profile Update (Optional)
```http
PUT /api/profile
Content-Type: application/json

{
  "outlinks": [...],
  "rateRange": {...}
}
```

## Data Model Changes

### User Profile Schema
```typescript
interface UserProfile {
  // ... existing fields
  outlinks?: Outlink[];
  rateRange?: RateRange;
}

interface Outlink {
  id: string;           // server-assigned UUID
  platform: string;     // 'linkedin', 'behance', 'github', etc.
  url: string;          // full URL
  label?: string;       // display label
  order: number;        // 0-based ordering
  createdAt?: string;   // ISO timestamp
}

interface RateRange {
  rateMin: number;      // positive integer
  rateMax: number;      // positive integer >= rateMin
  rateUnit?: 'hour' | 'project' | 'day'; // default: 'hour'
}
```

### Example Profile Data
```json
{
  "id": 34,
  "name": "Tobi Philly",
  "type": "freelancer",
  "outlinks": [
    {
      "id": "ol_01",
      "platform": "linkedin", 
      "url": "https://linkedin.com/in/tobiphilly",
      "order": 0
    }
  ],
  "rateRange": {
    "rateMin": 80,
    "rateMax": 200,
    "rateUnit": "hour"
  },
  "rate": "$80–200/hr"
}
```

## Validation Rules

### Outlinks
- Maximum 3 outlinks per profile
- URLs must be valid http/https
- No duplicate URLs allowed
- Platform field required
- Auto-detection from common domains (github.com → github)

### Rate Range
- Both rateMin and rateMax required
- Must be positive integers
- rateMin ≤ rateMax
- rateUnit must be 'hour', 'project', or 'day'
- Reasonable upper bounds (≤ 10,000) enforced

## Component Architecture

### Frontend Components
- `components/profile/PortfolioIcons.tsx` - Renders portfolio icons with edit mode
- `components/profile/OutlinksModal.tsx` - Modal for editing outlinks
- `components/profile/PlatformDropdown.tsx` - Searchable platform selector
- `components/profile/RateRangeEditor.tsx` - Rate range input with static dash
- `lib/api/profile.ts` - API client functions

### Integration Points
- `components/user-profiles/profile-header.tsx` - Main integration point
- `src/app/freelancer-dashboard/profile/[id]/page.tsx` - Profile page integration

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Focus Management**: Proper focus trapping in modals
- **ARIA Labels**: Comprehensive labeling for screen readers
- **Role Attributes**: Proper semantic roles for interactive elements

## Gig Categories Enhancement

Updated `data/gigs/gig-categories.json` to include:
- IDs for all subcategories
- Tags array for better categorization
- New "Portfolio Services" category with subcategories:
  - Notion Portfolio
  - GitHub Portfolio  
  - Behance Curation
  - LinkedIn Optimization
  - Personal Website

## Testing Checklist

### Unit Tests
- [ ] Platform auto-detection from URLs
- [ ] Outlinks validation (max 3, unique URLs, valid formats)
- [ ] Rate range validation (numeric, min ≤ max)
- [ ] Component keyboard navigation

### Integration Tests  
- [ ] Outlinks CRUD operations persist correctly
- [ ] Rate range updates reflect in profile view
- [ ] Edit mode toggles work across all sections
- [ ] API error handling displays user-friendly messages

### Accessibility Tests
- [ ] Modal focus trap and keyboard navigation
- [ ] Screen reader compatibility
- [ ] High contrast mode support
- [ ] Keyboard-only navigation

## Error Handling

- **Client-side**: Form validation with inline error messages
- **Server-side**: Comprehensive validation with descriptive error responses
- **Network**: Graceful handling of connection issues with retry options
- **User Feedback**: Toast notifications for success/error states

## Performance Considerations

- **Optimistic Updates**: UI updates immediately, rolls back on error
- **Debounced Validation**: Rate range inputs validate on blur, not on every keystroke
- **Lazy Loading**: Modal components loaded only when needed
- **Caching**: Profile data cached to minimize API calls
