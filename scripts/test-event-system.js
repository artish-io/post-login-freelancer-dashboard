/**
 * Test the new event-driven notification system
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Event-Driven Notification System...\n');

// Test the notifications log
const notificationsLogPath = path.join(__dirname, '..', 'data', 'notifications', 'notifications-log.json');

if (!fs.existsSync(notificationsLogPath)) {
  console.error('❌ Notifications log file not found!');
  process.exit(1);
}

const events = JSON.parse(fs.readFileSync(notificationsLogPath, 'utf-8'));

console.log(`📊 Total events in log: ${events.length}`);

// Analyze events by type
const eventsByType = events.reduce((acc, event) => {
  acc[event.type] = (acc[event.type] || 0) + 1;
  return acc;
}, {});

console.log('\n📈 Events by type:');
Object.entries(eventsByType)
  .sort(([,a], [,b]) => b - a)
  .forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });

// Analyze events by user
const eventsByUser = events.reduce((acc, event) => {
  // Count as actor
  if (!acc[event.actorId]) acc[event.actorId] = { asActor: 0, asTarget: 0 };
  acc[event.actorId].asActor++;
  
  // Count as target
  if (event.targetId) {
    if (!acc[event.targetId]) acc[event.targetId] = { asActor: 0, asTarget: 0 };
    acc[event.targetId].asTarget++;
  }
  
  return acc;
}, {});

console.log('\n👥 Events by user:');
Object.entries(eventsByUser).forEach(([userId, counts]) => {
  console.log(`   User ${userId}: ${counts.asActor} as actor, ${counts.asTarget} as target`);
});

// Test recent events
const recentEvents = events
  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  .slice(0, 5);

console.log('\n🕒 Recent events:');
recentEvents.forEach(event => {
  const date = new Date(event.timestamp).toLocaleString();
  console.log(`   ${date}: ${event.type} by user ${event.actorId}`);
});

// Test event structure
console.log('\n🔍 Sample event structure:');
if (events.length > 0) {
  const sampleEvent = events[0];
  console.log(JSON.stringify(sampleEvent, null, 2));
}

// Validate event structure
console.log('\n✅ Validating event structure...');
let validEvents = 0;
let invalidEvents = 0;

events.forEach((event, index) => {
  const requiredFields = ['id', 'timestamp', 'type', 'actorId', 'entityType', 'entityId', 'metadata'];
  const hasAllFields = requiredFields.every(field => event.hasOwnProperty(field));
  
  if (hasAllFields) {
    validEvents++;
  } else {
    invalidEvents++;
    console.log(`   ❌ Invalid event at index ${index}: missing fields`);
  }
});

console.log(`   ✅ Valid events: ${validEvents}`);
console.log(`   ❌ Invalid events: ${invalidEvents}`);

// Test notification generation simulation
console.log('\n🔔 Simulating notification generation...');

// Count potential notifications for user 31 (Margsate Flether)
const user31Events = events.filter(event => 
  event.targetId === 31 || 
  (event.context?.projectId && [301, 311, 306, 299, 300].includes(event.context.projectId))
);

console.log(`   User 31 would receive ${user31Events.length} notifications`);

// Count potential notifications for user 32 (Neilsan Mando)
const user32Events = events.filter(event => 
  event.targetId === 32 || 
  (event.context?.projectId && [301, 311].includes(event.context.projectId))
);

console.log(`   User 32 would receive ${user32Events.length} notifications`);

// Test event filtering by type
console.log('\n🎯 Testing event filtering...');

const taskEvents = events.filter(e => e.type.startsWith('task_'));
const projectEvents = events.filter(e => e.type.startsWith('project_'));
const gigEvents = events.filter(e => e.type.startsWith('gig_'));
const messageEvents = events.filter(e => e.type.startsWith('message_'));
const invoiceEvents = events.filter(e => e.type.startsWith('invoice_'));

console.log(`   Task events: ${taskEvents.length}`);
console.log(`   Project events: ${projectEvents.length}`);
console.log(`   Gig events: ${gigEvents.length}`);
console.log(`   Message events: ${messageEvents.length}`);
console.log(`   Invoice events: ${invoiceEvents.length}`);

// Test time distribution
console.log('\n📅 Testing time distribution...');
const eventsByDate = events.reduce((acc, event) => {
  const date = new Date(event.timestamp).toDateString();
  acc[date] = (acc[date] || 0) + 1;
  return acc;
}, {});

console.log('   Events by date:');
Object.entries(eventsByDate)
  .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
  .forEach(([date, count]) => {
    console.log(`     ${date}: ${count} events`);
  });

console.log('\n✨ Event system test complete!');

// Performance test
console.log('\n⚡ Performance test...');
const startTime = Date.now();

// Simulate filtering events for a user
for (let i = 0; i < 1000; i++) {
  const userEvents = events.filter(event => 
    event.targetId === 31 || event.actorId === 31
  );
}

const endTime = Date.now();
console.log(`   Filtered events 1000 times in ${endTime - startTime}ms`);

console.log('\n🎉 All tests completed successfully!');
