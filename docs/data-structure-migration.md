# Data Structure Migration: Skills and Tools Normalization

## Overview

We've migrated from hardcoded skill and tool names in `freelancers.json` to a normalized structure that references centralized data from `gig-categories.json` and `gig-tools.json`.

## Benefits

1. **Data Consistency**: Single source of truth for skills and tools
2. **Maintainability**: Easy to add/update skills and tools globally
3. **Scalability**: No duplication across freelancer profiles
4. **Rich Metadata**: Tools include icons and category associations
5. **Flexibility**: Easy to extend with additional properties

## New Data Structure

### Before (Old Structure)
```json
{
  "id": 31,
  "userId": 31,
  "skills": [
    "Wireframes",
    "Figma", 
    "Adobe XD",
    "Iconography",
    "Prototyping"
  ]
}
```

### After (New Structure)
```json
{
  "id": 31,
  "userId": 31,
  "skillCategories": [
    "UI/UX Design",
    "Graphic Design",
    "Brand Design"
  ],
  "tools": [
    "Figma",
    "Adobe Illustrator",
    "Adobe Photoshop",
    "Sketch"
  ]
}
```

## Reference Data Sources

### Skills: `data/gigs/gig-categories.json`
Skills are now referenced from the `subcategories` array in gig-categories.json:

```json
[
  {
    "id": "design",
    "label": "Design",
    "subcategories": [
      "UI/UX Design",
      "Graphic Design", 
      "Brand Design",
      "Marketing Design"
    ]
  }
]
```

### Tools: `data/gigs/gig-tools.json`
Tools are referenced by name and include metadata like icons:

```json
[
  {
    "category": "Design",
    "tools": [
      { "name": "Figma", "icon": "/icons/tools/figma.png" },
      { "name": "Adobe Illustrator", "icon": "/icons/tools/adobe-illustrator.png" }
    ]
  }
]
```

## API Changes

The profile API (`/api/user/profile/[id]`) now:

1. **Reads both reference files** during startup
2. **Maps skillCategories** directly from freelancer data
3. **Enriches tools** with icon metadata from gig-tools.json
4. **Maintains backward compatibility** with old `skills` field during transition

### API Response Structure
```json
{
  "skills": ["UI/UX Design", "Graphic Design"],
  "tools": [
    { "name": "Figma", "icon": "/icons/tools/figma.png" },
    { "name": "Adobe Illustrator", "icon": "/icons/tools/adobe-illustrator.png" }
  ]
}
```

## Migration Strategy

### Phase 1: Dual Support (Current)
- API supports both old `skills` and new `skillCategories`/`tools` fields
- Gradual migration of freelancer entries
- Backward compatibility maintained

### Phase 2: Full Migration
- All freelancer entries use new structure
- Remove old `skills` field
- Update all dependent components

### Phase 3: Cleanup
- Remove backward compatibility code
- Optimize API performance
- Update documentation

## Usage Examples

### Adding New Skills
1. Add subcategory to appropriate category in `gig-categories.json`
2. Reference in freelancer's `skillCategories` array

### Adding New Tools
1. Add tool with icon to appropriate category in `gig-tools.json`
2. Reference by name in freelancer's `tools` array

### Profile Display
- Skills display as pills with #FCD5E3 background
- Tools display as pills with icons when available
- Both are searchable in add work sample modal

## Migration Script

Use `scripts/migrate-freelancer-data.js` to help migrate individual freelancer entries:

```bash
node scripts/migrate-freelancer-data.js
```

The script provides:
- Automatic mapping of common skills to subcategories
- Tool detection and separation
- Manual mapping for edge cases
- Validation and suggestions

## Testing

Test the new structure with these profiles:
- **User 31**: Updated with new structure (Design skills)
- **User 1**: Updated with new structure (Engineering skills)
- **User 32**: Commissioner with responsibilities (no skills/tools)

Access at: `http://localhost:3001/freelancer-dashboard/profile/[id]`
