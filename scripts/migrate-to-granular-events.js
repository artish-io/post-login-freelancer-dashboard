/**
 * Migrate existing notification events to granular structure
 * 
 * This script migrates events from the current monthly structure:
 * - data/notifications/events/2025-07.json
 * 
 * To the new granular structure:
 * - data/notifications/events/2025/July/01/invoice_paid.json
 * - data/notifications/events/2025/July/01/task_submitted.json
 * - etc.
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Migrating notification events to granular structure...\n');

const eventsDir = path.join(__dirname, '..', 'data', 'notifications', 'events');
const newEventsDir = eventsDir; // Same base directory, new structure

// Ensure the events directory exists
if (!fs.existsSync(eventsDir)) {
  console.error('❌ Events directory not found!');
  process.exit(1);
}

// Get all existing monthly event files
const monthlyFiles = fs.readdirSync(eventsDir)
  .filter(file => file.match(/^\d{4}-\d{2}\.json$/))
  .sort();

console.log(`📁 Found ${monthlyFiles.length} monthly event files to migrate:`);
monthlyFiles.forEach(file => console.log(`   - ${file}`));
console.log();

let totalEventsMigrated = 0;
const migrationSummary = {};

// Process each monthly file
for (const monthlyFile of monthlyFiles) {
  const monthlyFilePath = path.join(eventsDir, monthlyFile);
  console.log(`📄 Processing ${monthlyFile}...`);
  
  try {
    const events = JSON.parse(fs.readFileSync(monthlyFilePath, 'utf-8'));
    console.log(`   Found ${events.length} events`);
    
    // Group events by date and type
    const eventsByDateAndType = {};
    
    for (const event of events) {
      const eventDate = new Date(event.timestamp);
      const year = eventDate.getFullYear().toString();
      const month = eventDate.toLocaleDateString('en-US', { month: 'long' });
      const day = eventDate.getDate().toString().padStart(2, '0');
      const eventType = event.type;
      
      const dateKey = `${year}/${month}/${day}`;
      const typeKey = `${dateKey}/${eventType}`;
      
      if (!eventsByDateAndType[typeKey]) {
        eventsByDateAndType[typeKey] = [];
      }
      
      eventsByDateAndType[typeKey].push(event);
    }
    
    // Create granular files
    for (const [typeKey, typeEvents] of Object.entries(eventsByDateAndType)) {
      const [year, month, day, eventType] = typeKey.split('/');
      
      // Create directory structure
      const granularDir = path.join(newEventsDir, year, month, day);
      if (!fs.existsSync(granularDir)) {
        fs.mkdirSync(granularDir, { recursive: true });
      }
      
      // Create granular file
      const granularFilePath = path.join(granularDir, `${eventType}.json`);
      
      // Sort events by timestamp (newest first)
      typeEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Write granular file
      fs.writeFileSync(granularFilePath, JSON.stringify(typeEvents, null, 2));
      
      console.log(`   ✅ Created ${typeKey}.json with ${typeEvents.length} events`);
      
      // Update summary
      if (!migrationSummary[eventType]) {
        migrationSummary[eventType] = 0;
      }
      migrationSummary[eventType] += typeEvents.length;
      totalEventsMigrated += typeEvents.length;
    }
    
    // Backup and remove the monthly file
    const backupPath = monthlyFilePath + '.backup';
    fs.copyFileSync(monthlyFilePath, backupPath);
    fs.unlinkSync(monthlyFilePath);
    console.log(`   📦 Backed up and removed ${monthlyFile}`);
    
  } catch (error) {
    console.error(`❌ Error processing ${monthlyFile}:`, error);
  }
  
  console.log();
}

// Create migration report
console.log('📊 Migration Summary:');
console.log(`   Total events migrated: ${totalEventsMigrated}`);
console.log('   Events by type:');
for (const [eventType, count] of Object.entries(migrationSummary)) {
  console.log(`     ${eventType}: ${count} events`);
}

const migrationReport = {
  migrationDate: new Date().toISOString(),
  totalEventsMigrated,
  eventsByType: migrationSummary,
  structure: {
    old: 'data/notifications/events/YYYY-MM.json',
    new: 'data/notifications/events/YYYY/Month/DD/event_type.json'
  },
  benefits: [
    'Granular file organization by date and event type',
    'Improved query performance for specific event types',
    'Better scalability with smaller file sizes',
    'Easier maintenance and debugging',
    'Universal source of truth integration'
  ]
};

const reportPath = path.join(eventsDir, '..', 'granular-migration-report.json');
fs.writeFileSync(reportPath, JSON.stringify(migrationReport, null, 2));
console.log(`\n📋 Migration report saved to ${reportPath}`);

console.log('\n🎉 Granular migration complete!');
console.log('\nNext steps:');
console.log('1. Update NotificationStorage class to use granular structure');
console.log('2. Update event logger to write to granular files');
console.log('3. Test the new system with existing APIs');
console.log('4. Verify data integrity and performance');
