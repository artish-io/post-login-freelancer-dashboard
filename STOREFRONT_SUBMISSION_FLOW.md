# Storefront Product Submission Flow

## Overview
This document outlines the complete flow for digital product submissions in the ARTISH storefront system.

## Components

### 1. Product Submission Modal
**File**: `components/freelancer-dashboard/storefront/list-new-product-modal.tsx`

**Features**:
- ✅ Improved input styling matching design system (thin borders, proper focus states)
- ✅ File upload functionality with drag-and-drop support
- ✅ Custom category selector component
- ✅ Form validation and submission handling
- ✅ Success/error messaging
- ✅ Slide-up animation with Framer Motion

### 2. Category Selector
**File**: `components/freelancer-dashboard/storefront/category-selector.tsx`

**Features**:
- ✅ Custom dropdown component (not native select)
- ✅ Loads categories from `data/storefront/categories.json`
- ✅ Displays category descriptions
- ✅ Proper keyboard navigation and accessibility

### 3. Categories Data
**File**: `data/storefront/categories.json`

**Categories**:
1. Software development
2. Design
3. Events & live shows
4. Photography
5. Finance & business
6. Writing and publishing
7. Film and video
8. E-Books & courses
9. Education
10. Comics & graphic novels
11. Music and Audio
12. Fitness and wellness
13. Gaming
14. Others

## API Endpoints

### Submit Product
**Endpoint**: `POST /api/storefront/submit-product`

**Functionality**:
- Accepts FormData with product details and file
- Saves file to `public/storefront-submissions/files/`
- Stores submission data in `public/storefront-submissions/submissions.json`
- Returns submission ID and success status

### Approve Product
**Endpoint**: `POST /api/storefront/approve-product`

**Functionality**:
- Moves approved product from submissions to approved products
- Copies file from submissions to approved directory
- Updates submission status to 'approved'
- Adds product to `public/storefront/approved/products.json`

## Admin Interface

### Storefront Admin Page
**File**: `src/app/admin/storefront/page.tsx`

**Features**:
- ✅ View all pending submissions
- ✅ Approve/reject products
- ✅ Download submitted files
- ✅ View submission details and metadata
- ✅ Status tracking (pending, approved, rejected)

## File Structure

```
public/
├── storefront-submissions/
│   ├── submissions.json          # All submissions
│   └── files/                    # Uploaded files
│       └── {submissionId}_{filename}
└── storefront/
    └── approved/
        ├── products.json         # Approved products
        └── files/                # Approved product files
            └── {submissionId}_{filename}
```

## Usage Flow

### For Users (Freelancers):
1. Click "List a new product" button in storefront dashboard
2. Modal slides up with form
3. Fill in product details:
   - Product name (required)
   - Description (required)
   - Category selection (required)
   - Tags (optional)
   - File upload (optional)
4. Submit for review
5. Receive confirmation message

### For Admins:
1. Navigate to `/admin/storefront`
2. View all pending submissions
3. Review product details and download files
4. Approve or reject submissions
5. Approved products automatically move to storefront

## Technical Implementation

### Form Validation
- Required fields: Product name, description, category
- File type validation for digital products
- Real-time form state management

### File Handling
- Secure file upload with size limits
- Automatic file naming with submission ID
- File type restrictions for security

### Data Persistence
- JSON-based storage for easy management
- Atomic operations for data consistency
- Backup-friendly file structure

### Security Considerations
- File type validation
- Size limits on uploads
- Sanitized file names
- Admin-only approval interface

## Future Enhancements
- Email notifications for submissions/approvals
- Bulk approval operations
- Product pricing and metadata management
- Integration with payment processing
- Advanced file preview capabilities
