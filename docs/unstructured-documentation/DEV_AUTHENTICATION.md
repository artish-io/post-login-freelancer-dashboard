# Development Authentication System

This document describes the development-only authentication system implemented for local testing. This system uses JSON file storage and magic links for passwordless authentication.

⚠️ **DEV-ONLY**: This implementation is for development testing only and must be replaced with production authentication services (Firebase/Cognito/Auth0) before deployment.

## Overview

The authentication system includes:
- **Magic Link Authentication**: Passwordless login via email
- **Traditional Login**: Username/password with bcrypt hashing
- **Sign-up Flows**: Separate flows for freelancers and commissioners
- **Session Management**: Simple cookie-based sessions
- **JSON Storage**: File-based user and organization storage

## API Endpoints

### 1. Sign-up Endpoint
```bash
POST /api/signup?role=freelancer|commissioner
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@example.com",
  "bio": "Experienced developer",
  "avatar": "data:image/jpeg;base64,...", // Optional base64 image
  "skills": ["JavaScript", "React"], // Freelancers only
  "tools": ["VSCode", "Figma"], // Freelancers only
  "links": {
    "portfolio": "https://johndoe.dev",
    "github": "https://github.com/johndoe",
    "linkedin": "https://linkedin.com/in/johndoe"
  },
  "organization": { // Commissioners only
    "name": "Acme Corp",
    "website": "https://acme.com",
    "bio": "Leading tech company",
    "logo": "data:image/jpeg;base64,..." // Optional
  }
}
```

**Example cURL:**
```bash
# Freelancer signup
curl -X POST http://localhost:3000/api/signup?role=freelancer \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "bio": "Full-stack developer with 5 years experience",
    "skills": ["React", "Node.js", "TypeScript"],
    "tools": ["VSCode", "Docker"],
    "links": {
      "github": "https://github.com/janesmith",
      "portfolio": "https://janesmith.dev"
    }
  }'

# Commissioner signup
curl -X POST http://localhost:3000/api/signup?role=commissioner \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Bob",
    "lastName": "Johnson",
    "email": "bob@acme.com",
    "bio": "Product manager at Acme Corp",
    "organization": {
      "name": "Acme Corporation",
      "website": "https://acme.com",
      "bio": "Leading technology solutions provider"
    }
  }'
```

### 2. Magic Link Generation
```bash
POST /api/auth/magic-link
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "jane@example.com"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Magic link generated! Check the server console for the link.",
  "devUrl": "http://localhost:3000/api/auth/verify?token=abc123..." // DEV-ONLY
}
```

### 3. Magic Link Verification
```bash
GET /api/auth/verify?token=<token>
```

**Example:**
```bash
# This URL will be logged to the server console
curl "http://localhost:3000/api/auth/verify?token=abc123def456..."
```

**Response:** Redirects to appropriate dashboard or returns JSON with session info.

### 4. Session Validation
```bash
GET /api/me
```

**Example cURL:**
```bash
curl -X GET http://localhost:3000/api/me \
  -H "Cookie: sid=session_id_here"
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Jane Smith",
    "email": "jane@example.com",
    "type": "freelancer",
    "title": "Full-stack Developer",
    "avatar": "/avatars/jane.png",
    "bio": "Full-stack developer with 5 years experience",
    "skills": ["React", "Node.js", "TypeScript"],
    "tools": ["VSCode", "Docker"],
    "links": {
      "github": "https://github.com/janesmith",
      "portfolio": "https://janesmith.dev"
    },
    "organizationId": null,
    "createdAt": "2025-01-01T12:00:00.000Z",
    "updatedAt": "2025-01-01T12:00:00.000Z"
  },
  "organization": null,
  "session": {
    "createdAt": "2025-01-01T12:00:00.000Z",
    "expiresAt": "2025-01-02T12:00:00.000Z"
  }
}
```

## Testing Checklist

### 1. Freelancer Sign-up Flow
- [ ] Navigate to `/sign-up-step-1-freelancer`
- [ ] Fill out Step 1: First name, last name, email, bio
- [ ] Upload profile photo (optional)
- [ ] Fill out Step 2: Add skills and tools
- [ ] Fill out Step 3: Add social links
- [ ] Submit and verify account creation
- [ ] Check `data/users/` for new user profile
- [ ] Verify user appears in `data/users-index.json`

### 2. Commissioner Sign-up Flow
- [ ] Navigate to `/sign-up-step-1-business`
- [ ] Fill out Step 1: First name, last name, email, bio
- [ ] Upload company logo (optional)
- [ ] Fill out Step 2: Company name, title, website, location
- [ ] Fill out Step 3: Social links
- [ ] Submit and verify account creation
- [ ] Check `data/users/` for new user profile
- [ ] Check `data/organizations/` for new organization
- [ ] Verify entries in both index files

### 3. Magic Link Authentication
- [ ] Navigate to `/sign-up`
- [ ] Enter email address of existing user
- [ ] Click "Send Magic Link"
- [ ] Check server console for magic link URL
- [ ] Copy and paste URL into browser
- [ ] Verify redirect to appropriate dashboard
- [ ] Check that session cookie is set
- [ ] Test `/api/me` endpoint with session

### 4. Password-based Authentication (Optional)
- [ ] Run `node scripts/seed-passwords.js` to add passwords
- [ ] Test existing login flow with seeded passwords
- [ ] Verify authentication works with both username and email

### 5. Error Handling
- [ ] Test signup with duplicate email (should return 409)
- [ ] Test magic link with non-existent email
- [ ] Test expired magic link tokens
- [ ] Test invalid session cookies
- [ ] Test file upload size limits (>2MB should fail)

## File Structure

The authentication system creates the following files:

```
data/
├── users/                     # Hierarchical user storage
│   └── 2025/01/01/1/
│       └── profile.json       # User profile data
├── organizations/             # Hierarchical organization storage
│   └── 2025/01/01/1000/
│       └── profile.json       # Organization data
├── users-index.json          # User ID to path mapping
├── organizations-index.json  # Organization ID to path mapping
├── auth-tokens.json          # Magic link tokens (temporary)
└── dev-sessions.json         # Active sessions (temporary)
```

## Development Scripts

### Password Seeding
```bash
# Add default password (password123) to all users
node scripts/seed-passwords.js

# Add custom password to all users
node scripts/seed-passwords.js --password=mypassword

# Add password to specific users only
node scripts/seed-passwords.js --users=1,2,3 --password=testpass

# Dry run to see what would be changed
node scripts/seed-passwords.js --dry-run
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **DEV-ONLY**: This system stores passwords in plain text for development convenience
2. **No Email Sending**: Magic links are logged to console instead of being emailed
3. **Simple Sessions**: Uses basic cookie-based sessions without encryption
4. **File Storage**: All data is stored in JSON files, not a proper database
5. **No Rate Limiting**: No protection against brute force attacks

**Before Production:**
- Replace with proper authentication service (Firebase Auth, Auth0, AWS Cognito)
- Implement proper password hashing and storage
- Add email delivery service for magic links
- Use secure session management
- Add rate limiting and security headers
- Implement proper database storage
- Add input validation and sanitization
