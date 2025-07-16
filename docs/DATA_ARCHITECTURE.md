# Data Architecture & Integrity Guidelines

## 🏗️ **Data Sources Overview**

### **Primary Data Files**
- **`data/projects.json`** - Static project metadata (title, description, manager, etc.)
- **`data/project-tasks.json`** - Dynamic task data with status tracking
- **`data/users.json`** - User profiles and information
- **`data/organizations.json`** - Organization details and relationships

### **Data Flow Principles**
1. **Static Data**: Basic project info that rarely changes (title, description, manager)
2. **Dynamic Data**: Task status, progress, completion - calculated in real-time
3. **Derived Data**: Progress percentages, project status - NEVER stored statically

## ⚠️ **Critical Data Integrity Rules**

### **❌ DO NOT Store These Fields in projects.json:**
- `progress` - Must be calculated from task approval status
- `completedTasks` - Derived from task data
- `activeTasks` - Derived from task data
- Any time-sensitive or status-dependent data

### **✅ Safe to Store in projects.json:**
- `projectId` - Unique identifier
- `title` - Project name
- `description` - Project description
- `organizationId` - Organization reference
- `freelancerId` - Assigned freelancer
- `manager` - Project manager info
- `dueDate` - Project deadline
- `totalTasks` - Total task count (validated against actual tasks)

## 🔄 **Progress Calculation Logic**

### **Correct Progress Formula:**
```javascript
const approvedTasks = tasks.filter(task => task.status === 'Approved').length;
const progress = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0;
```

### **Task Status Meanings:**
- **"Ongoing"** → 0% progress (work in progress)
- **"In review"** → 0% progress (submitted but not approved)
- **"Approved"** → Counts toward progress (approved by commissioner)
- **"Rejected"** → 0% progress (needs rework)

## 🛡️ **Data Integrity Safeguards**

### **Validation Functions**
Use `src/lib/data-integrity.ts` for:
- Detecting static progress fields (deprecated)
- Validating data consistency between files
- Identifying orphaned records
- Checking field mismatches

### **Development Checks**
```javascript
import { runDataIntegrityCheck } from '@/lib/data-integrity';

// Automatically runs in development mode
const report = await runDataIntegrityCheck();
```

## 🚨 **Common Anti-Patterns to Avoid**

### **❌ Storing Calculated Values**
```javascript
// WRONG - Don't store calculated progress
{
  "projectId": 311,
  "progress": 25  // ❌ This becomes stale
}
```

### **❌ Using Static Progress**
```javascript
// WRONG - Don't use static progress from JSON
const progress = project.progress; // ❌ Unreliable
```

### **✅ Correct Dynamic Calculation**
```javascript
// CORRECT - Always calculate progress
const tasks = projectTasks?.tasks || [];
const approvedTasks = tasks.filter(task => task.status === 'Approved').length;
const progress = tasks.length > 0 ? Math.round((approvedTasks / tasks.length) * 100) : 0;
```

## 📊 **API Architecture**

### **Read-Only APIs**
- `/api/projects` - Static project metadata
- `/api/project-tasks` - Dynamic task data
- `/api/users` - User information
- `/api/organizations` - Organization data

### **No Write APIs Currently**
⚠️ **Important**: Currently no APIs exist to update projects.json or project-tasks.json
- All data changes must be manual
- No automatic synchronization
- Risk of data drift over time

## 🔧 **Recommended Improvements**

### **Short Term**
1. ✅ Remove all static `progress` fields from projects.json
2. ✅ Add data integrity validation
3. ✅ Ensure all components use calculated progress

### **Medium Term**
1. Create write APIs for task status updates
2. Implement automatic progress synchronization
3. Add data validation middleware
4. Create data migration scripts

### **Long Term**
1. Move to proper database (PostgreSQL/MongoDB)
2. Implement real-time updates
3. Add audit logging
4. Create backup/restore mechanisms

## 🧪 **Testing Data Integrity**

### **Manual Verification**
1. Check browser console for integrity warnings
2. Compare calculated vs displayed progress
3. Verify task status changes reflect in UI

### **Automated Checks**
```javascript
// Run in browser console
import { runDataIntegrityCheck } from '@/lib/data-integrity';
runDataIntegrityCheck().then(report => console.log(report));
```

## 📝 **Change Management**

### **When Adding New Projects**
1. Add to both `projects.json` and `project-tasks.json`
2. Ensure `projectId` matches in both files
3. Ensure `organizationId` matches in both files
4. Do NOT add `progress` field to projects.json

### **When Updating Task Status**
1. Only update `project-tasks.json`
2. Never manually update progress in projects.json
3. Let the application calculate progress dynamically

### **Data Validation Checklist**
- [ ] No static `progress` fields in projects.json
- [ ] `projectId` matches between files
- [ ] `organizationId` matches between files
- [ ] `totalTasks` matches actual task count
- [ ] All task statuses use approved values
- [ ] No orphaned records in either file

## 🚀 **Best Practices**

1. **Always calculate progress dynamically**
2. **Validate data integrity in development**
3. **Use TypeScript interfaces for type safety**
4. **Log data inconsistencies for debugging**
5. **Test with real data scenarios**
6. **Document any data structure changes**

---

**Remember**: Progress is a derived value, not stored data. Keep the source of truth in task status, not in static JSON fields.
