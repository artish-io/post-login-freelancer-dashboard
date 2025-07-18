/**
 * Script to fix embedded user data in JSON files
 * Replaces embedded user objects with userId references
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing embedded user data in JSON files...\n');

// Fix notifications file
const notificationsPath = path.join(__dirname, '..', 'data', 'notifications', 'commissioners.json');
const notifications = JSON.parse(fs.readFileSync(notificationsPath, 'utf-8'));

let fixedCount = 0;

notifications.forEach(commissionerNotifications => {
  commissionerNotifications.notifications.forEach(notification => {
    if (notification.user && typeof notification.user === 'object') {
      // Replace embedded user object with userId
      notification.userId = notification.user.id;
      delete notification.user;
      fixedCount++;
    }
  });
});

// Write back the fixed notifications
fs.writeFileSync(notificationsPath, JSON.stringify(notifications, null, 2));
console.log(`✅ Fixed ${fixedCount} embedded user objects in commissioners notifications`);

console.log('\n🎯 All embedded user data has been normalized!');
