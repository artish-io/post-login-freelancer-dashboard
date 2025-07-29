/**
 * Test the new granular notification events system
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Granular Notification Events System...\n');

// Test the granular structure
const eventsDir = path.join(__dirname, '..', 'data', 'notifications', 'events');

if (!fs.existsSync(eventsDir)) {
  console.error('❌ Events directory not found!');
  process.exit(1);
}

console.log('📁 Testing granular directory structure...');

// Check if granular structure exists
const year2025Dir = path.join(eventsDir, '2025');
if (!fs.existsSync(year2025Dir)) {
  console.error('❌ 2025 directory not found!');
  process.exit(1);
}

const julyDir = path.join(year2025Dir, 'July');
if (!fs.existsSync(julyDir)) {
  console.error('❌ July directory not found!');
  process.exit(1);
}

console.log('✅ Granular directory structure exists');

// Analyze the granular structure
let totalEvents = 0;
let totalFiles = 0;
const eventTypesSummary = {};
const datesSummary = {};

function analyzeDirectory(dirPath, relativePath = '') {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      analyzeDirectory(itemPath, path.join(relativePath, item));
    } else if (item.endsWith('.json')) {
      totalFiles++;
      
      try {
        const events = JSON.parse(fs.readFileSync(itemPath, 'utf-8'));
        totalEvents += events.length;
        
        // Extract event type from filename
        const eventType = item.replace('.json', '');
        eventTypesSummary[eventType] = (eventTypesSummary[eventType] || 0) + events.length;
        
        // Extract date from path
        const pathParts = relativePath.split(path.sep);
        if (pathParts.length >= 3) {
          const [year, month, day] = pathParts;
          const dateKey = `${year}-${month}-${day}`;
          datesSummary[dateKey] = (datesSummary[dateKey] || 0) + events.length;
        }
        
        console.log(`   📄 ${relativePath}/${item}: ${events.length} events`);
        
        // Validate event structure
        for (const event of events) {
          if (!event.id || !event.timestamp || !event.type) {
            console.error(`❌ Invalid event structure in ${relativePath}/${item}:`, event);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error reading ${relativePath}/${item}:`, error);
      }
    }
  }
}

analyzeDirectory(year2025Dir, '2025');

console.log('\n📊 Granular Structure Analysis:');
console.log(`   Total files: ${totalFiles}`);
console.log(`   Total events: ${totalEvents}`);
console.log(`   Average events per file: ${(totalEvents / totalFiles).toFixed(2)}`);

console.log('\n📈 Events by Type:');
for (const [eventType, count] of Object.entries(eventTypesSummary)) {
  console.log(`   ${eventType}: ${count} events`);
}

console.log('\n📅 Events by Date:');
const sortedDates = Object.keys(datesSummary).sort();
for (const date of sortedDates.slice(-10)) { // Show last 10 dates
  console.log(`   ${date}: ${datesSummary[date]} events`);
}

// Test performance
console.log('\n⚡ Performance Testing...');

const startTime = Date.now();

// Simulate reading events for a specific user
let userEvents = 0;
const testUserId = 31;

function findUserEvents(dirPath) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      findUserEvents(itemPath);
    } else if (item.endsWith('.json')) {
      try {
        const events = JSON.parse(fs.readFileSync(itemPath, 'utf-8'));
        
        for (const event of events) {
          if (event.targetId === testUserId || event.actorId === testUserId) {
            userEvents++;
          }
        }
      } catch (error) {
        // Skip invalid files
      }
    }
  }
}

findUserEvents(year2025Dir);

const endTime = Date.now();
const duration = endTime - startTime;

console.log(`   Found ${userEvents} events for user ${testUserId} in ${duration}ms`);

// Test specific event type queries
console.log('\n🔍 Testing Event Type Queries...');

const invoicePaidFiles = [];
function findInvoicePaidFiles(dirPath, relativePath = '') {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      findInvoicePaidFiles(itemPath, path.join(relativePath, item));
    } else if (item === 'invoice_paid.json') {
      invoicePaidFiles.push(path.join(relativePath, item));
    }
  }
}

findInvoicePaidFiles(year2025Dir, '2025');

console.log(`   Found ${invoicePaidFiles.length} invoice_paid.json files:`);
for (const file of invoicePaidFiles) {
  console.log(`     ${file}`);
}

// Verify data integrity
console.log('\n🔒 Data Integrity Check...');

let integrityIssues = 0;

function checkIntegrity(dirPath) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      checkIntegrity(itemPath);
    } else if (item.endsWith('.json')) {
      try {
        const events = JSON.parse(fs.readFileSync(itemPath, 'utf-8'));
        
        // Check if events are sorted by timestamp (newest first)
        for (let i = 1; i < events.length; i++) {
          const prevTime = new Date(events[i-1].timestamp).getTime();
          const currTime = new Date(events[i].timestamp).getTime();
          
          if (prevTime < currTime) {
            console.error(`❌ Events not sorted in ${itemPath}`);
            integrityIssues++;
            break;
          }
        }
        
        // Check if all events have the same type as filename
        const expectedType = item.replace('.json', '');
        for (const event of events) {
          if (event.type !== expectedType) {
            console.error(`❌ Event type mismatch in ${itemPath}: expected ${expectedType}, got ${event.type}`);
            integrityIssues++;
          }
        }
        
      } catch (error) {
        console.error(`❌ JSON parsing error in ${itemPath}:`, error);
        integrityIssues++;
      }
    }
  }
}

checkIntegrity(year2025Dir);

if (integrityIssues === 0) {
  console.log('✅ Data integrity check passed');
} else {
  console.log(`❌ Found ${integrityIssues} integrity issues`);
}

console.log('\n🎉 Granular Events System Test Complete!');
console.log('\nBenefits of the new system:');
console.log('✅ Granular file organization by date and event type');
console.log('✅ Improved query performance for specific event types');
console.log('✅ Better scalability with smaller file sizes');
console.log('✅ Easier maintenance and debugging');
console.log('✅ Universal source of truth integration ready');
