# Data Structure Documentation

## 🎯 Overview

The data structure has been normalized to eliminate redundancy and follow database best practices. User information is centralized in `users.json`, while role-specific data is stored in separate files.

## 📁 File Structure

### `data/users.json`
**Central user repository** - Contains all user information regardless of role.

```json
{
  "id": 1,
  "name": "Tobi Philly",
  "title": "Web3 Engineer", 
  "avatar": "/avatars/tobi.png",
  "type": "freelancer", // or "commissioner"
  "email": "tobi.philly@example.com",
  "address": "1 Remote Lane, Virtual City, Country"
}
```

### `data/freelancers.json`
**Freelancer-specific data** - References users via `userId`.

```json
{
  "id": 1,
  "userId": 1, // References users.json
  "category": "Software Development",
  "skills": ["Programming", "JavaScript"],
  "rate": "80-200/hr",
  "minRate": 80,
  "maxRate": 200,
  "location": "NG",
  "rating": 5,
  "availability": "Available",
  "withdrawalMethod": "bank_transfer",
  "specializations": ["Web3"] // Optional
}
```

## 🔗 Data Relationships

```
users.json (id) ←→ freelancers.json (userId)
users.json (id) ←→ organizations.json (contactPersonId)
```

## 📊 Benefits of Normalization

### ✅ Before vs After

**❌ Before (Redundant):**
```json
// freelancers.json
{
  "id": 1,
  "name": "Tobi Philly", // Duplicated
  "title": "Web3 Engineer", // Duplicated
  "avatar": "/avatars/tobi.png", // Duplicated
  "category": "Software Development"
}

// users.json  
{
  "id": 1,
  "name": "Tobi Philly", // Duplicated
  "title": "Web3 Engineer", // Duplicated
  "avatar": "/avatars/tobi.png" // Duplicated
}
```

**✅ After (Normalized):**
```json
// freelancers.json
{
  "id": 1,
  "userId": 1, // Reference only
  "category": "Software Development"
}

// users.json
{
  "id": 1,
  "name": "Tobi Philly", // Single source of truth
  "title": "Web3 Engineer",
  "avatar": "/avatars/tobi.png"
}
```

## 🛠️ API Implementation

### Joining Data in APIs

```typescript
// Example: Get freelancer with user data
const freelancer = freelancers.find(f => f.id === id);
const user = users.find(u => u.id === freelancer.userId);

return {
  id: freelancer.id,
  name: user.name,        // From users.json
  title: user.title,      // From users.json
  avatar: user.avatar,    // From users.json
  category: freelancer.category, // From freelancers.json
  skills: freelancer.skills,     // From freelancers.json
  rate: freelancer.rate          // From freelancers.json
};
```

### Updated API Endpoints

All these endpoints now properly join data:
- `/api/user/profile/[id]`
- `/api/dashboard/freelancer/meta/[id]`
- `/api/dashboard/invoice-meta/freelancer`
- `/api/availability/[id]`
- `/api/updateAvailability`

## 🎨 Frontend Usage

### Components Should Join Data

```tsx
// ✅ Correct approach
const [freelancer, setFreelancer] = useState(null);
const [user, setUser] = useState(null);

useEffect(() => {
  // Fetch joined data from API
  fetch(`/api/freelancer-with-user/${id}`)
    .then(res => res.json())
    .then(data => {
      // API returns joined data
      setFreelancer(data);
    });
}, [id]);

// ❌ Avoid manual joining in components
const freelancerData = freelancers.find(f => f.id === id);
const userData = users.find(u => u.id === freelancerData.userId);
```

## 🔧 Migration Notes

### What Changed
1. **Removed duplicate fields** from `freelancers.json`:
   - `name` → Use `users.json` via `userId`
   - `title` → Use `users.json` via `userId`  
   - `avatar` → Use `users.json` via `userId`

2. **Added reference field**:
   - `userId` → Links to `users.json`

3. **Moved user-specific data**:
   - ID 31's extra fields moved to `users.json`

### API Updates Required
- ✅ Updated all affected endpoints
- ✅ Proper data joining implemented
- ✅ Error handling for missing references

## 🚀 Best Practices

### For New Features
1. **Store user info in `users.json`** only
2. **Store role-specific info** in respective files
3. **Use APIs for data joining** - don't join in components
4. **Always validate references** exist

### Data Integrity
- Every `freelancer.userId` must exist in `users.json`
- Every `organization.contactPersonId` must exist in `users.json`
- Use the normalization script for bulk updates

## 🔍 Validation

Run this to check data integrity:
```bash
node scripts/validate-data-integrity.js
```

## 📈 Performance Benefits

1. **Reduced file sizes** - No duplicate data
2. **Faster updates** - Single source of truth
3. **Consistent data** - No sync issues
4. **Scalable structure** - Easy to extend

The data structure now follows database normalization principles and eliminates all redundancy! 🎉
