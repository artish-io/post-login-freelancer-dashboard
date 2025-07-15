/**
 * Script to generate missing avatar files for users
 * Uses DiceBear API to generate consistent avatars based on user names
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Read users data
const usersPath = path.join(__dirname, '..', 'data', 'users.json');
const avatarsDir = path.join(__dirname, '..', 'public', 'avatars');
const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));

// Ensure avatars directory exists
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Function to download avatar from DiceBear API
function downloadAvatar(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Generated avatar: ${path.basename(filename)}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filename, () => {}); // Delete the file on error
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Function to generate avatar filename from avatar path
function getAvatarFilename(avatarPath) {
  return avatarPath.replace('/avatars/', '');
}

// Function to check if avatar file exists
function avatarExists(avatarPath) {
  const filename = getAvatarFilename(avatarPath);
  const fullPath = path.join(avatarsDir, filename);
  return fs.existsSync(fullPath);
}

// Function to generate seed from name (for consistent avatars)
function generateSeed(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

// Main function to generate missing avatars
async function generateMissingAvatars() {
  console.log('🔍 Checking for missing avatars...\n');
  
  const missingAvatars = [];
  
  // Check which avatars are missing
  users.forEach(user => {
    if (!avatarExists(user.avatar)) {
      missingAvatars.push(user);
    }
  });
  
  if (missingAvatars.length === 0) {
    console.log('✅ All avatars are present!');
    return;
  }
  
  console.log(`📋 Found ${missingAvatars.length} missing avatars:`);
  missingAvatars.forEach(user => {
    console.log(`   - ${user.name} (${getAvatarFilename(user.avatar)})`);
  });
  console.log('');
  
  // Generate missing avatars
  console.log('🎨 Generating missing avatars...\n');
  
  for (const user of missingAvatars) {
    try {
      const seed = generateSeed(user.name);
      const filename = getAvatarFilename(user.avatar);
      const fullPath = path.join(avatarsDir, filename);
      
      // Use DiceBear API with different styles for variety
      const styles = ['avataaars', 'big-smile', 'bottts', 'identicon', 'initials', 'personas'];
      const randomStyle = styles[Math.floor(Math.random() * styles.length)];
      
      // Generate avatar URL
      const avatarUrl = `https://api.dicebear.com/7.x/${randomStyle}/png?seed=${seed}&size=200`;
      
      console.log(`🎭 Generating ${filename} for ${user.name}...`);
      await downloadAvatar(avatarUrl, fullPath);
      
      // Small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Failed to generate avatar for ${user.name}:`, error.message);
    }
  }
  
  console.log('\n🎉 Avatar generation complete!');
}

// Alternative function to create simple colored avatars with initials
function createInitialsAvatar(name, filename) {
  const initials = name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  
  const colorIndex = name.length % colors.length;
  const backgroundColor = colors[colorIndex];
  
  // Create SVG avatar
  const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="${backgroundColor}"/>
      <text x="100" y="120" font-family="Arial, sans-serif" font-size="80" font-weight="bold" 
            text-anchor="middle" fill="white">${initials}</text>
    </svg>
  `;
  
  // Save as SVG (you can convert to PNG later if needed)
  const svgPath = filename.replace('.png', '.svg');
  fs.writeFileSync(svgPath, svg);
  console.log(`✅ Generated initials avatar: ${path.basename(svgPath)}`);
}

// Run the script
if (require.main === module) {
  generateMissingAvatars().catch(console.error);
}

module.exports = { generateMissingAvatars, createInitialsAvatar };
