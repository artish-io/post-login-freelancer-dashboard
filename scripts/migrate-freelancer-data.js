/**
 * Migration script to convert hardcoded skills/tools to reference-based structure
 * This script helps migrate from the old structure to the new normalized structure
 */

const fs = require('fs');
const path = require('path');

// Read the data files
const freelancersPath = path.join(__dirname, '..', 'data', 'freelancers.json');
const categoriesPath = path.join(__dirname, '..', 'data', 'gigs', 'gig-categories.json');
const toolsPath = path.join(__dirname, '..', 'data', 'gigs', 'gig-tools.json');

const freelancers = JSON.parse(fs.readFileSync(freelancersPath, 'utf-8'));
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf-8'));

// Create lookup maps
const allSubcategories = categories.flatMap(cat => cat.subcategories);
const allTools = tools.flatMap(cat => cat.tools.map(tool => tool.name));

console.log('Available subcategories:', allSubcategories);
console.log('Available tools:', allTools);

// Function to migrate a single freelancer
function migrateFreelancer(freelancer) {
  if (!freelancer.skills) return freelancer;

  const skillCategories = [];
  const toolsList = [];

  freelancer.skills.forEach(skill => {
    // Check if it's a tool
    const matchingTool = allTools.find(tool => 
      tool.toLowerCase() === skill.toLowerCase()
    );
    
    if (matchingTool) {
      toolsList.push(matchingTool);
    } else {
      // Check if it's a subcategory
      const matchingSubcategory = allSubcategories.find(subcat => 
        subcat.toLowerCase() === skill.toLowerCase() ||
        subcat.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(subcat.toLowerCase())
      );
      
      if (matchingSubcategory) {
        skillCategories.push(matchingSubcategory);
      } else {
        // If no match found, try to map to closest subcategory
        console.log(`No direct match for skill: "${skill}" in freelancer ${freelancer.id}`);
        
        // Add some manual mappings for common cases
        const manualMappings = {
          'Programming': 'Web Development',
          'JavaScript': 'Frontend',
          'HTML5': 'Frontend',
          'TypeScript': 'Frontend',
          'Ruby': 'Backend',
          'Wireframes': 'UI/UX Design',
          'Prototyping': 'UI/UX Design',
          'Iconography': 'Graphic Design',
          'Information Architecture': 'UI/UX Design',
          'Effective communication': 'User Research'
        };
        
        if (manualMappings[skill]) {
          skillCategories.push(manualMappings[skill]);
        } else {
          // Default to a general category
          skillCategories.push('UI/UX Design');
        }
      }
    }
  });

  return {
    ...freelancer,
    skillCategories: [...new Set(skillCategories)], // Remove duplicates
    tools: [...new Set(toolsList)], // Remove duplicates
    // Keep the old skills field for backward compatibility during transition
    skills: freelancer.skills
  };
}

// Example usage for a specific freelancer
const freelancerId = 1; // Change this to migrate specific freelancer
const freelancer = freelancers.find(f => f.id === freelancerId);

if (freelancer) {
  const migrated = migrateFreelancer(freelancer);
  console.log('\nOriginal freelancer:');
  console.log(JSON.stringify(freelancer, null, 2));
  console.log('\nMigrated freelancer:');
  console.log(JSON.stringify(migrated, null, 2));
}

module.exports = { migrateFreelancer, allSubcategories, allTools };
