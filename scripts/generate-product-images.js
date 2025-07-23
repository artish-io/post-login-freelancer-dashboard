const fs = require('fs');
const path = require('path');

// Simple SVG generator for product images
function generateProductImage(title, filename, color = '#eb1966', icon = '📚') {
  const svg = `
<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FCD5E3;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#grad)"/>
  <rect x="20" y="20" width="360" height="360" fill="none" stroke="white" stroke-width="2" opacity="0.3"/>
  
  <!-- Icon area -->
  <circle cx="200" cy="150" r="40" fill="white" opacity="0.9"/>
  <text x="200" y="160" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${color}">${icon}</text>
  
  <!-- Title -->
  <foreignObject x="40" y="220" width="320" height="120">
    <div xmlns="http://www.w3.org/1999/xhtml" style="
      font-family: 'Arial', sans-serif;
      font-size: 18px;
      font-weight: bold;
      color: white;
      text-align: center;
      line-height: 1.3;
      padding: 10px;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3);
    ">
      ${title}
    </div>
  </foreignObject>
  
  <!-- Bottom decoration -->
  <rect x="0" y="350" width="400" height="50" fill="white" opacity="0.1"/>
  <text x="200" y="375" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white" opacity="0.8">ARTISH DIGITAL</text>
</svg>`;

  const outputPath = path.join(__dirname, '..', 'public', 'images', 'products', filename);
  fs.writeFileSync(outputPath, svg);
  console.log(`Generated: ${filename}`);
}

// Product data with proper icons
const products = [
  { title: 'Digital Marketing\nPlaybook', filename: 'marketing-playbook.webp', color: '#eb1966', icon: '📈' },
  { title: 'Content Design\n101', filename: 'content-design-101.webp', color: '#2563eb', icon: '🎨' },
  { title: 'UX Writing For\nBeginners', filename: 'ux-writing.webp', color: '#059669', icon: '✍️' },
  { title: 'Python For\nDummies', filename: 'python-dummies.webp', color: '#dc2626', icon: '🐍' },
  { title: 'Project Management\nTemplates', filename: 'pm-templates.webp', color: '#7c3aed', icon: '📋' },
  { title: 'Freelancer\nOnboarding Guide', filename: 'onboarding-guide.webp', color: '#ea580c', icon: '👥' }
];

// Generate all product images
console.log('Generating product images...');
products.forEach(product => {
  generateProductImage(product.title, product.filename, product.color, product.icon);
});

console.log('All product images generated successfully!');
