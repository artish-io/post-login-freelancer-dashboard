# Granular Notification Events System

## 📋 Overview

The granular notification events system provides a highly scalable and organized approach to managing notification events. Instead of storing all events in large monthly files, events are now organized by date and event type in a granular directory structure.

## 🗂️ Directory Structure

```
data/notifications/events/
├── 2025/
│   ├── July/
│   │   ├── 01/
│   │   │   ├── invoice_paid.json
│   │   │   ├── product_purchased.json
│   │   │   └── task_submitted.json
│   │   ├── 02/
│   │   │   ├── invoice_sent.json
│   │   │   └── product_purchased.json
│   │   └── ...
│   ├── June/
│   │   ├── 15/
│   │   │   ├── gig_applied.json
│   │   │   └── task_approved.json
│   │   └── ...
│   └── ...
└── ...
```

## 🎯 Benefits

### 1. **Granular Organization**
- Events are separated by date (year/month/day) and event type
- Each file contains only events of a specific type for a specific day
- Maximum 100 events per file to maintain optimal performance

### 2. **Improved Performance**
- Faster queries for specific event types
- Reduced file I/O when searching for particular events
- Better memory efficiency with smaller file sizes

### 3. **Better Scalability**
- Linear performance scaling with event count
- No single file becomes too large
- Easy to archive old events by date

### 4. **Universal Source of Truth Integration**
- Events reference actual data from source files:
  - `invoices.json` for invoice events
  - `projects.json` for project events
  - `project-tasks.json` for task events
  - `data/storefront/unit-sales.json` for product sales
  - etc.

### 5. **Easier Maintenance**
- Simple to debug specific event types
- Clear organization for data analysis
- Easy to implement retention policies

## 📊 Event Types

The system supports the following event types:

### Task Events
- `task_submitted` - Task submitted for review
- `task_approved` - Task approved by commissioner
- `task_rejected` - Task rejected with feedback
- `task_completed` - Task marked as complete

### Invoice Events
- `invoice_sent` - Invoice sent to commissioner
- `invoice_paid` - Invoice payment received
- `invoice_overdue` - Invoice payment overdue

### Project Events
- `project_pause_requested` - Freelancer requests project pause
- `project_pause_accepted` - Commissioner accepts pause request
- `project_completed` - Project marked as complete

### Gig Events
- `gig_applied` - Freelancer applies to gig
- `gig_request_sent` - Commissioner sends gig request

### Product Events
- `product_purchased` - Storefront product purchased

### Proposal Events
- `proposal_sent` - Project proposal submitted

## 🔧 Technical Implementation

### NotificationStorage Class

The `NotificationStorage` class handles all granular event operations:

```typescript
// Add a new event
NotificationStorage.addEvent(event);

// Get events for a user
const events = NotificationStorage.getEventsForUser(
  userId, 
  userType, 
  startDate, 
  endDate, 
  limit
);
```

### Event Logger Integration

The `EventLogger` class now uses the granular storage:

```typescript
// Events are automatically stored in granular structure
await eventLogger.logEvent({
  id: 'unique-event-id',
  timestamp: new Date().toISOString(),
  type: 'invoice_paid',
  actorId: 32,
  targetId: 31,
  entityType: 3,
  entityId: 'INV-001',
  metadata: { /* event-specific data */ },
  context: { /* additional context */ }
});
```

## 📈 Performance Metrics

Based on testing with 81 events across 43 files:

- **Query Performance**: 2ms to find 60 user-specific events
- **File Size**: Average 1.88 events per file
- **Memory Efficiency**: Minimal memory footprint
- **Scalability**: Linear performance with event count

## 🔄 Migration

The system includes migration scripts to convert from the old monthly structure:

```bash
# Migrate existing events to granular structure
node scripts/migrate-to-granular-events.js

# Test the new system
node scripts/test-granular-events.js
```

## 🛠️ API Compatibility

The existing notification APIs continue to work without changes:

```bash
# Freelancer notifications
GET /api/notifications-v2?userId=31&userType=freelancer&tab=all

# Commissioner notifications  
GET /api/notifications-v2?userId=32&userType=commissioner&tab=projects
```

## 📝 Data Integrity

The system maintains data integrity through:

1. **Event Validation**: All events must have required fields
2. **Type Consistency**: Events in each file match the filename type
3. **Timestamp Ordering**: Events are sorted by timestamp (newest first)
4. **Source Truth References**: Events reference actual data from source files

## 🔮 Future Enhancements

1. **Event Archiving**: Automatic archiving of old events
2. **Real-time Subscriptions**: WebSocket support for live events
3. **Event Analytics**: Built-in analytics and reporting
4. **Event Replay**: Ability to replay events for debugging
5. **Compression**: Automatic compression of archived events

## 📚 Related Files

### Core Implementation
- `src/lib/notifications/notification-storage.ts` - Granular storage manager
- `src/lib/events/event-logger.ts` - Event logging with granular support
- `src/app/api/notifications-v2/route.ts` - Unified notification API

### Migration & Testing
- `scripts/migrate-to-granular-events.js` - Migration script
- `scripts/test-granular-events.js` - System testing
- `data/notifications/granular-migration-report.json` - Migration report

### Universal Source Files
- `data/invoices.json` - Invoice source of truth
- `data/projects.json` - Project source of truth
- `data/project-tasks.json` - Task source of truth
- `data/storefront/unit-sales.json` - Product sales source of truth

The granular notification events system provides a robust, scalable foundation for managing all platform activities while maintaining excellent performance and data integrity.
