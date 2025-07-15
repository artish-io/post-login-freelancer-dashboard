/**
 * Summary script to show avatar status for all users
 */

const fs = require('fs');
const path = require('path');

// Read users data
const usersPath = path.join(__dirname, '..', 'data', 'users.json');
const avatarsDir = path.join(__dirname, '..', 'public', 'avatars');
const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));

console.log('👥 Avatar Status Summary\n');
console.log('=' .repeat(50));

let totalUsers = 0;
let usersWithAvatars = 0;
let freelancers = 0;
let commissioners = 0;

users.forEach(user => {
  totalUsers++;
  
  if (user.type === 'freelancer') {
    freelancers++;
  } else if (user.type === 'commissioner') {
    commissioners++;
  }
  
  const avatarFilename = user.avatar.replace('/avatars/', '');
  const avatarPath = path.join(avatarsDir, avatarFilename);
  const hasAvatar = fs.existsSync(avatarPath);
  
  if (hasAvatar) {
    usersWithAvatars++;
  }
  
  const status = hasAvatar ? '✅' : '❌';
  const typeIcon = user.type === 'freelancer' ? '👨‍💻' : '👔';
  
  console.log(`${status} ${typeIcon} ${user.name.padEnd(20)} | ${avatarFilename}`);
});

console.log('=' .repeat(50));
console.log(`📊 Statistics:`);
console.log(`   Total Users: ${totalUsers}`);
console.log(`   Freelancers: ${freelancers}`);
console.log(`   Commissioners: ${commissioners}`);
console.log(`   Users with Avatars: ${usersWithAvatars}/${totalUsers}`);
console.log(`   Coverage: ${((usersWithAvatars/totalUsers) * 100).toFixed(1)}%`);

if (usersWithAvatars === totalUsers) {
  console.log('\n🎉 All users have avatars! Your profile system is complete.');
} else {
  console.log(`\n⚠️  ${totalUsers - usersWithAvatars} users still need avatars.`);
}
