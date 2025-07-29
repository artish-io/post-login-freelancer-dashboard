// src/app/api/ai-intake/client/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Enhanced AI-powered fuzzy matching utility function
function fuzzyMatch(query: string, target: string, threshold: number = 0.15): boolean {
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();

  // Direct substring match (highest confidence)
  if (targetLower.includes(queryLower) || queryLower.includes(targetLower)) {
    return true;
  }

  // Word-based matching with intelligent scoring
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
  const targetWords = targetLower.split(/\s+/).filter(word => word.length > 2);

  if (queryWords.length === 0) return false;

  let totalScore = 0;
  for (const queryWord of queryWords) {
    let bestScore = 0;

    for (const targetWord of targetWords) {
      // Exact match (full score)
      if (queryWord === targetWord) {
        bestScore = 1;
        break;
      }

      // Starts with match (high score)
      if (targetWord.startsWith(queryWord) || queryWord.startsWith(targetWord)) {
        bestScore = Math.max(bestScore, 0.9);
        continue;
      }

      // Contains match (medium score)
      if (targetWord.includes(queryWord) || queryWord.includes(targetWord)) {
        bestScore = Math.max(bestScore, 0.8);
        continue;
      }

      // Normalized match for hyphenated/underscore words
      const normalizedQuery = queryWord.replace(/[-_]/g, '');
      const normalizedTarget = targetWord.replace(/[-_]/g, '');
      if (normalizedTarget.includes(normalizedQuery) || normalizedQuery.includes(normalizedTarget)) {
        bestScore = Math.max(bestScore, 0.7);
        continue;
      }

      // Partial similarity for longer words
      if (queryWord.length > 3 && targetWord.length > 3) {
        const commonChars = getCommonCharacters(queryWord, targetWord);
        const similarity = commonChars / Math.max(queryWord.length, targetWord.length);
        if (similarity > 0.6) {
          bestScore = Math.max(bestScore, similarity * 0.6);
        }
      }
    }

    totalScore += bestScore;
  }

  return (totalScore / queryWords.length) >= threshold;
}

// Helper function to calculate character overlap
function getCommonCharacters(str1: string, str2: string): number {
  const chars1 = str1.split('');
  const chars2 = str2.split('');
  let common = 0;

  for (const char of chars1) {
    const index = chars2.indexOf(char);
    if (index !== -1) {
      common++;
      chars2.splice(index, 1); // Remove to avoid double counting
    }
  }

  return common;
}

// Enhanced skill matching function with synonym mapping
function matchSkillsToQuery(query: string, freelancer: any, categories: any[], tools: any[]): number {
  const queryLower = query.toLowerCase();
  let score = 0;

  // Enhanced AI-powered keyword mapping for comprehensive matching
  const synonyms: Record<string, string[]> = {
    // Web Development
    'landing page': ['web development', 'frontend', 'ui/ux design', 'web design', 'html', 'css', 'javascript'],
    'website': ['web development', 'frontend', 'ui/ux design', 'web design', 'wordpress', 'shopify'],
    'web app': ['web development', 'frontend', 'backend', 'full stack', 'react', 'angular', 'vue'],
    'ecommerce': ['web development', 'shopify', 'woocommerce', 'magento', 'online store'],
    'portfolio': ['web development', 'web design', 'ui/ux design', 'frontend'],

    // Mobile Development
    'mobile app': ['app development', 'mobile development', 'react native', 'flutter', 'ios', 'android'],
    'ios app': ['app development', 'mobile development', 'swift', 'objective-c', 'xcode'],
    'android app': ['app development', 'mobile development', 'kotlin', 'java', 'android studio'],

    // Backend & Technical
    'backend': ['backend development', 'api development', 'server development', 'database', 'node.js'],
    'api': ['backend development', 'api development', 'rest api', 'graphql', 'microservices'],
    'database': ['backend development', 'database design', 'sql', 'mongodb', 'postgresql'],

    // Design & Creative
    'logo': ['graphic design', 'brand design', 'logo design', 'brand identity', 'visual identity'],
    'branding': ['brand design', 'graphic design', 'logo design', 'brand identity', 'marketing'],
    'ui design': ['ui/ux design', 'web design', 'app design', 'interface design', 'figma'],
    'ux design': ['ui/ux design', 'user experience', 'user research', 'wireframing', 'prototyping'],
    'graphic design': ['graphic design', 'visual design', 'print design', 'digital design', 'adobe'],
    'illustration': ['graphic design', 'digital art', 'vector art', 'character design', 'concept art'],

    // Marketing & Content
    'marketing': ['digital marketing', 'content marketing', 'social media marketing', 'seo', 'advertising'],
    'campaign': ['marketing', 'advertising', 'brand design', 'content creation', 'social media'],
    'social media': ['social media marketing', 'content creation', 'community management', 'influencer marketing'],
    'seo': ['seo', 'digital marketing', 'content marketing', 'search optimization', 'google ads'],
    'content': ['content creation', 'copywriting', 'blog writing', 'content marketing', 'storytelling'],
    'copywriting': ['copywriting', 'content creation', 'marketing copy', 'sales copy', 'email marketing'],

    // Events & Entertainment
    'concert': ['event planning', 'event management', 'live events', 'entertainment', 'music events', 'venue coordination'],
    'festival': ['event planning', 'event management', 'live events', 'entertainment', 'outdoor events', 'logistics'],
    'conference': ['event planning', 'event management', 'corporate events', 'business events', 'venue management'],
    'event': ['event planning', 'event management', 'event coordination', 'logistics', 'venue management'],
    'fair': ['event planning', 'event management', 'trade shows', 'exhibitions', 'booth design'],
    'wedding': ['event planning', 'wedding planning', 'event coordination', 'venue decoration', 'catering coordination'],
    'party': ['event planning', 'event management', 'entertainment', 'party planning', 'celebration planning'],
    'show': ['event planning', 'event management', 'live events', 'entertainment', 'production management'],
    'exhibition': ['event planning', 'trade shows', 'booth design', 'display design', 'event coordination'],

    // Business & Consulting
    'business plan': ['business consulting', 'strategy consulting', 'market research', 'financial planning'],
    'strategy': ['business consulting', 'strategy consulting', 'market analysis', 'competitive analysis'],
    'consulting': ['business consulting', 'strategy consulting', 'management consulting', 'advisory services'],

    // Video & Audio
    'video': ['video editing', 'video production', 'motion graphics', 'animation', 'cinematography'],
    'animation': ['animation', 'motion graphics', 'video editing', '2d animation', '3d animation'],
    'podcast': ['audio editing', 'podcast production', 'voice over', 'sound design', 'audio production'],
    'music': ['music production', 'audio editing', 'sound design', 'mixing', 'mastering'],

    // Data & Analytics
    'data analysis': ['data science', 'data analytics', 'business intelligence', 'excel', 'python'],
    'dashboard': ['data visualization', 'business intelligence', 'analytics', 'reporting', 'tableau'],
    'research': ['market research', 'data analysis', 'user research', 'competitive analysis', 'surveys'],

    // Writing & Translation
    'writing': ['copywriting', 'content creation', 'blog writing', 'technical writing', 'creative writing'],
    'translation': ['translation services', 'localization', 'multilingual content', 'language services'],
    'editing': ['content editing', 'proofreading', 'copy editing', 'manuscript editing'],

    // Photography
    'photography': ['photography', 'photo editing', 'product photography', 'portrait photography', 'commercial photography'],
    'photo editing': ['photo editing', 'image editing', 'retouching', 'color correction', 'photoshop'],

    // Team & Collaboration Terms
    'team': ['collaboration', 'project management', 'agile', 'scrum', 'teamwork'],
    'small team': ['startup', 'agile team', 'lean development', 'mvp development'],
    'dev team': ['development team', 'software development', 'programming', 'coding'],
    'mobile team': ['mobile development', 'app development', 'react native', 'flutter', 'ios', 'android'],
    'web team': ['web development', 'frontend', 'backend', 'full stack', 'javascript'],

    // Robotics & Hardware
    'robot': ['robotics', 'automation', 'hardware engineering', 'embedded systems', 'iot'],
    'robotics': ['robotics', 'automation', 'hardware engineering', 'embedded systems', 'mechanical engineering'],
    'automation': ['robotics', 'automation', 'process automation', 'workflow automation', 'scripting'],
    'hardware': ['hardware engineering', 'embedded systems', 'electronics', 'circuit design', 'pcb design'],
    'embedded': ['embedded systems', 'microcontrollers', 'arduino', 'raspberry pi', 'iot'],
    'iot': ['iot', 'internet of things', 'embedded systems', 'sensors', 'connectivity'],

    // Advanced Technologies
    'ai': ['artificial intelligence', 'machine learning', 'deep learning', 'neural networks', 'data science'],
    'machine learning': ['machine learning', 'artificial intelligence', 'data science', 'python', 'tensorflow'],
    'blockchain': ['blockchain', 'cryptocurrency', 'smart contracts', 'web3', 'solidity'],
    'ar': ['augmented reality', 'ar development', 'unity', '3d development', 'mobile ar'],
    'vr': ['virtual reality', 'vr development', 'unity', '3d development', 'immersive experiences'],

    // Startup & Business Terms
    'startup': ['mvp development', 'lean startup', 'agile development', 'rapid prototyping'],
    'mvp': ['mvp development', 'minimum viable product', 'prototype', 'rapid development'],
    'prototype': ['prototyping', 'mvp development', 'proof of concept', 'rapid development'],
    'scale': ['scalability', 'performance optimization', 'cloud architecture', 'devops'],

    // Industry-Specific
    'fintech': ['financial technology', 'banking software', 'payment systems', 'blockchain'],
    'healthtech': ['healthcare technology', 'medical software', 'telemedicine', 'health apps'],
    'edtech': ['educational technology', 'e-learning', 'online education', 'learning platforms'],
    'saas': ['software as a service', 'cloud software', 'web applications', 'subscription software']
  };

  // AI-powered semantic expansion with better matching
  let expandedQuery = queryLower;
  const queryWords = queryLower.split(' ');

  // Direct synonym matching
  for (const [term, relatedTerms] of Object.entries(synonyms)) {
    if (queryLower.includes(term)) {
      expandedQuery += ' ' + relatedTerms.join(' ');
    }
  }

  // Partial word matching for compound terms
  for (const word of queryWords) {
    if (word.length > 3) {
      for (const [term, relatedTerms] of Object.entries(synonyms)) {
        if (term.includes(word) || word.includes(term)) {
          expandedQuery += ' ' + relatedTerms.join(' ');
        }
      }
    }
  }

  // AI-powered contextual matching for team-based and specialized queries
  if (queryLower.includes('team') || queryLower.includes('small') || queryLower.includes('group')) {
    // Mobile development team queries
    if (queryLower.includes('mobile') || queryLower.includes('app')) {
      expandedQuery += ' mobile development app development react native flutter ios android kotlin swift javascript typescript ui/ux design';
    }
    // Robotics team queries
    if (queryLower.includes('robot') || queryLower.includes('automation') || queryLower.includes('hardware')) {
      expandedQuery += ' robotics automation hardware engineering embedded systems arduino raspberry pi python c++ mechanical engineering electrical engineering';
    }
    // Web development team queries
    if (queryLower.includes('web') || queryLower.includes('website') || queryLower.includes('frontend') || queryLower.includes('backend')) {
      expandedQuery += ' web development frontend backend full stack react vue angular node.js javascript typescript html css';
    }
    // Data science team queries
    if (queryLower.includes('data') || queryLower.includes('analytics') || queryLower.includes('ai') || queryLower.includes('machine learning')) {
      expandedQuery += ' data science machine learning artificial intelligence python r sql analytics data visualization';
    }
    // Design team queries
    if (queryLower.includes('design') || queryLower.includes('creative') || queryLower.includes('ui') || queryLower.includes('ux')) {
      expandedQuery += ' ui/ux design graphic design web design app design figma adobe photoshop illustrator';
    }
  }

  // Event-specific matching
  if (queryLower.includes('size') && (queryLower.includes('concert') || queryLower.includes('event'))) {
    expandedQuery += ' event planning event management logistics venue coordination production management live events entertainment';
  }

  // Technology stack inference
  if (queryLower.includes('startup') || queryLower.includes('mvp') || queryLower.includes('prototype')) {
    expandedQuery += ' web development mobile development ui/ux design full stack react node.js';
  }

  // Check skill categories (highest priority - 15 points)
  if (freelancer.skillCategories) {
    for (const skillCategory of freelancer.skillCategories) {
      if (fuzzyMatch(expandedQuery, skillCategory)) {
        score += 15;
        // Exact match bonus
        if (expandedQuery.includes(skillCategory.toLowerCase())) {
          score += 5;
        }
      }
    }
  }

  // Check tools (high priority - 12 points)
  if (freelancer.tools) {
    for (const tool of freelancer.tools) {
      if (fuzzyMatch(expandedQuery, tool)) {
        score += 12;
        if (expandedQuery.includes(tool.toLowerCase())) {
          score += 3;
        }
      }
    }
  }

  // Check skills array (high priority - 15 points)
  if (freelancer.skills) {
    for (const skill of freelancer.skills) {
      if (fuzzyMatch(expandedQuery, skill)) {
        score += 15;
        if (expandedQuery.includes(skill.toLowerCase())) {
          score += 5;
        }
      }
    }
  }

  // Check category match (medium priority - 10 points)
  if (freelancer.category && fuzzyMatch(expandedQuery, freelancer.category)) {
    score += 10;
    if (expandedQuery.includes(freelancer.category.toLowerCase())) {
      score += 5;
    }
  }

  // Check title/specialization (medium priority - 8 points)
  if (freelancer.title && fuzzyMatch(expandedQuery, freelancer.title)) {
    score += 8;
  }

  // Bonus scoring for multi-skill combinations
  let skillCombinationBonus = 0;

  // Team-based queries get bonus for having multiple relevant skills
  if (queryWords.includes('team') || queryWords.includes('small') || queryWords.includes('group')) {
    const relevantSkills = [];

    if (freelancer.skillCategories) {
      relevantSkills.push(...freelancer.skillCategories);
    }
    if (freelancer.skills) {
      relevantSkills.push(...freelancer.skills);
    }
    if (freelancer.tools) {
      relevantSkills.push(...freelancer.tools);
    }

    // Count how many different skill areas they cover
    const skillAreas = new Set();
    relevantSkills.forEach(skill => {
      const skillLower = skill.toLowerCase();
      if (skillLower.includes('mobile') || skillLower.includes('app') || skillLower.includes('ios') || skillLower.includes('android')) {
        skillAreas.add('mobile');
      }
      if (skillLower.includes('web') || skillLower.includes('frontend') || skillLower.includes('backend') || skillLower.includes('javascript')) {
        skillAreas.add('web');
      }
      if (skillLower.includes('design') || skillLower.includes('ui') || skillLower.includes('ux')) {
        skillAreas.add('design');
      }
      if (skillLower.includes('robot') || skillLower.includes('hardware') || skillLower.includes('embedded')) {
        skillAreas.add('robotics');
      }
      if (skillLower.includes('data') || skillLower.includes('analytics') || skillLower.includes('machine learning')) {
        skillAreas.add('data');
      }
    });

    // Bonus for versatile freelancers who can handle multiple aspects
    skillCombinationBonus = skillAreas.size * 5;
  }

  score += skillCombinationBonus;

  // Check against gig categories and subcategories
  for (const cat of categories) {
    if (fuzzyMatch(expandedQuery, cat.label)) {
      score += 2;
    }
    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        const subName = typeof sub === 'string' ? sub : sub.name;
        if (fuzzyMatch(expandedQuery, subName)) {
          score += 2;
        }
        // Check keywords if available
        if (sub.keywords) {
          for (const keyword of sub.keywords) {
            if (fuzzyMatch(expandedQuery, keyword)) {
              score += 1;
            }
          }
        }
      }
    }
  }

  // Check against tools data
  for (const toolCat of tools) {
    for (const tool of toolCat.tools) {
      const toolName = typeof tool === 'string' ? tool : tool.name;
      if (fuzzyMatch(expandedQuery, toolName)) {
        score += 1;
      }
      // Check keywords if available
      if (tool.keywords) {
        for (const keyword of tool.keywords) {
          if (fuzzyMatch(expandedQuery, keyword)) {
            score += 1;
          }
        }
      }
    }
  }

  return score;
}

// Calculate recommended budget based on freelancer's hourly rate
function calculateRecommendedBudget(freelancerId: number, freelancers: any[], userBudget: number): number {
  const freelancer = freelancers.find(f => f.id === freelancerId);
  if (!freelancer) return userBudget;

  const hourlyRate = freelancer.minRate || freelancer.hourlyRate || 75;
  const estimatedHours = Math.ceil(userBudget / 75); // Use user's budget to estimate hours
  const recommendedBudget = hourlyRate * estimatedHours;

  // If recommended budget is significantly higher than user budget, suggest the higher amount
  return recommendedBudget > userBudget * 1.5 ? recommendedBudget : userBudget;
}

// AI helper functions for project requirements generation
function generateProjectTitle(prompt: string, categories: any[]): string {
  const words = prompt.split(' ');
  const mainCategory = categories[0]?.name || 'Custom';

  // Extract key nouns and create a professional title
  const keyWords = words.filter(word =>
    word.length > 3 &&
    !['want', 'need', 'build', 'create', 'make', 'develop'].includes(word.toLowerCase())
  ).slice(0, 3);

  return `${mainCategory} - ${keyWords.join(' ')}`.replace(/\b\w/g, l => l.toUpperCase());
}

function enhanceProjectDescription(prompt: string): string {
  // Clean up and enhance the user's prompt to be at least two sentences
  let enhanced = prompt.charAt(0).toUpperCase() + prompt.slice(1);

  if (!enhanced.endsWith('.')) {
    enhanced += '.';
  }

  // If it's only one sentence, add a second sentence with more context
  const sentences = enhanced.split('.').filter(s => s.trim().length > 0);
  if (sentences.length < 2) {
    const promptLower = prompt.toLowerCase();
    let additionalContext = '';

    if (promptLower.includes('website') || promptLower.includes('web')) {
      additionalContext = ' The website should be modern, responsive, and user-friendly with clean design and smooth functionality.';
    } else if (promptLower.includes('app') || promptLower.includes('mobile')) {
      additionalContext = ' The application should have an intuitive interface, smooth performance, and be compatible with modern devices.';
    } else if (promptLower.includes('design') || promptLower.includes('logo')) {
      additionalContext = ' The design should be professional, memorable, and align with the brand identity and target audience.';
    } else if (promptLower.includes('marketing') || promptLower.includes('campaign')) {
      additionalContext = ' The campaign should be engaging, targeted, and designed to achieve measurable results and ROI.';
    } else {
      additionalContext = ' The project should be delivered with high quality, attention to detail, and meet all specified requirements.';
    }

    enhanced += additionalContext;
  }

  return enhanced;
}

function generateDeliverables(prompt: string, categories: any[]): string[] {
  const promptLower = prompt.toLowerCase();
  const deliverables: string[] = [];

  // Common deliverables based on project type
  if (promptLower.includes('website') || promptLower.includes('web')) {
    deliverables.push('Fully functional website', 'Responsive design for all devices', 'Source code and documentation');
  } else if (promptLower.includes('app') || promptLower.includes('mobile')) {
    deliverables.push('Mobile application', 'App store deployment', 'User documentation');
  } else if (promptLower.includes('design') || promptLower.includes('logo')) {
    deliverables.push('Final design files', 'Multiple format exports', 'Brand guidelines');
  } else if (promptLower.includes('marketing') || promptLower.includes('campaign')) {
    deliverables.push('Marketing strategy document', 'Creative assets', 'Performance report');
  } else {
    // Generic deliverables
    deliverables.push('Project deliverables as specified', 'Regular progress updates', 'Final project documentation');
  }

  return deliverables;
}

function estimateTimeline(prompt: string, budget?: number): string {
  const promptLower = prompt.toLowerCase();

  // Estimate based on project complexity keywords
  if (promptLower.includes('simple') || promptLower.includes('basic') || promptLower.includes('landing page')) {
    return '1-2 weeks';
  } else if (promptLower.includes('complex') || promptLower.includes('advanced') || promptLower.includes('platform')) {
    return '6-8 weeks';
  } else if (promptLower.includes('app') || promptLower.includes('system')) {
    return '4-6 weeks';
  } else {
    return '2-4 weeks';
  }
}

function generateMilestones(prompt: string, categories: any[], budget?: number): any[] {
  const promptLower = prompt.toLowerCase();

  // Generate context-aware milestones
  if (promptLower.includes('website') || promptLower.includes('web')) {
    return [
      { title: 'Design & Planning', description: 'Wireframes, mockups, and project planning', percentage: 30 },
      { title: 'Development', description: 'Frontend and backend development', percentage: 50 },
      { title: 'Testing & Launch', description: 'Testing, refinements, and deployment', percentage: 20 }
    ];
  } else if (promptLower.includes('app')) {
    return [
      { title: 'UI/UX Design', description: 'App design and user experience planning', percentage: 25 },
      { title: 'Core Development', description: 'App functionality development', percentage: 50 },
      { title: 'Testing & Deployment', description: 'Testing and app store submission', percentage: 25 }
    ];
  } else if (promptLower.includes('marketing') || promptLower.includes('campaign')) {
    return [
      { title: 'Strategy Development', description: 'Marketing strategy and planning', percentage: 40 },
      { title: 'Content Creation', description: 'Creating marketing materials and content', percentage: 40 },
      { title: 'Campaign Launch', description: 'Campaign execution and monitoring', percentage: 20 }
    ];
  } else {
    return [
      { title: 'Planning & Setup', description: 'Project planning and initial setup', percentage: 30 },
      { title: 'Implementation', description: 'Core project implementation', percentage: 50 },
      { title: 'Finalization', description: 'Final touches and delivery', percentage: 20 }
    ];
  }
}

export async function POST(req: Request) {
  try {
    const { prompt, budget, step, selectedFreelancerId, editedRequirements, confirmed } = await req.json();


    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // Read data files
    const freelancersPath = path.join(process.cwd(), 'data', 'freelancers.json');
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    const categoriesPath = path.join(process.cwd(), 'data', 'gigs', 'gig-categories.json');
    const toolsPath = path.join(process.cwd(), 'data', 'gigs', 'gig-tools.json');
    const gigsPath = path.join(process.cwd(), 'data', 'gigs', 'gigs.json');

    const freelancers = JSON.parse(fs.readFileSync(freelancersPath, 'utf-8'));
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
    const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf-8'));

    // Step 1: Initial prompt - show matching freelancers directly
    if (step === 'initial') {
      // Find matching categories for context
      const allCategories: any[] = [];
      categories.forEach((cat: any) => {
        if (cat.subcategories) {
          cat.subcategories.forEach((sub: any) => {
            allCategories.push({ ...sub, parentId: cat.id, parentLabel: cat.label });
          });
        }
      });

      const matchingCategories = allCategories.filter((cat: any) =>
        fuzzyMatch(prompt, cat.name) ||
        (cat.description && fuzzyMatch(prompt, cat.description)) ||
        cat.keywords?.some((keyword: string) => fuzzyMatch(prompt, keyword))
      );

      // Score and rank freelancers with hard filters for availability and skill matching
      const scoredFreelancers = freelancers.map((freelancer: any) => {
        const skillScore = matchSkillsToQuery(prompt, freelancer, categories, tools);

        // Hard filter: Check availability (must be available)
        const isAvailable = freelancer.availability === 'Available' ||
                           freelancer.availability === 'available' ||
                           !freelancer.availability; // Default to available if not specified

        // Hard filter: Must have skill category match (score > 0 means some skill match)
        const hasSkillMatch = skillScore > 0;

        // Rating boost for ranking (secondary priority)
        const ratingBoost = (freelancer.rating || 4.0) * 2;

        return {
          ...freelancer,
          skillScore,
          finalScore: skillScore + ratingBoost,
          isAvailable,
          hasSkillMatch
        };
      });

      // Apply hard filters: must be available AND have skill match
      const matchingFreelancers = scoredFreelancers
        .filter((freelancer: any) =>
          freelancer.isAvailable &&
          freelancer.hasSkillMatch
        )
        .sort((a: any, b: any) => b.finalScore - a.finalScore) // Sort by final score
        .slice(0, 8); // Show top 8 matches

      const response = {
        step: 'freelancer_selection',
        message: `Great! I found ${matchingFreelancers.length} freelancers who can help with "${prompt}".`,
        freelancers: matchingFreelancers.map((f: any) => {
          const userInfo = users.find((user: any) => user.id === f.userId);
          return {
            id: f.id,
            userId: f.userId,
            name: userInfo?.name || 'Unknown User',
            title: userInfo?.title || f.category || 'Freelancer',
            skills: f.skillCategories || f.tools?.slice(0, 4) || [],
            hourlyRate: f.minRate || f.hourlyRate || 50,
            rating: f.rating || 4.5,
            avatar: userInfo?.avatar || '/avatar.png',
            completedProjects: f.completedProjects || Math.floor(Math.random() * 20) + 5,
            location: f.location || userInfo?.address || 'Remote',
            availability: f.availability || 'Available',
            skillScore: f.skillScore,
            finalScore: f.finalScore
          };
        }),
        categories: matchingCategories.map(c => c.name).slice(0, 5),
        showPostGigButton: true, // Show post gig option
        nextStep: 'action_selection'
      };

      return NextResponse.json({ result: JSON.stringify(response, null, 2) });
    }

    // Step 2: Freelancer selected or Post Gig clicked - generate AI requirements
    if (step === 'generate_requirements') {

      const promptLower = prompt.toLowerCase();

      // Find matching categories and tools for requirements
      const allCategories: any[] = [];
      categories.forEach((cat: any) => {
        if (cat.subcategories) {
          cat.subcategories.forEach((sub: any) => {
            allCategories.push({ ...sub, parentId: cat.id, parentLabel: cat.label });
          });
        }
      });

      const matchingCategories = allCategories.filter((cat: any) =>
        cat.name && cat.description && (
          promptLower.includes(cat.name.toLowerCase()) ||
          promptLower.includes(cat.description.toLowerCase()) ||
          cat.keywords?.some((keyword: string) => promptLower.includes(keyword.toLowerCase()))
        )
      );

      const matchingTools = tools.filter((tool: any) =>
        tool.name && (
          promptLower.includes(tool.name.toLowerCase()) ||
          tool.keywords?.some((keyword: string) => promptLower.includes(keyword.toLowerCase()))
        )
      );

      // Generate intelligent project requirements based on prompt analysis
      const budgetNum = budget ? parseInt(budget.toString().replace(/[^0-9]/g, '')) : 5000;

      const projectRequirements = {
        title: generateProjectTitle(prompt, matchingCategories),
        category: matchingCategories[0]?.parentLabel || 'General',
        subcategory: matchingCategories[0]?.name || 'Custom',
        description: enhanceProjectDescription(prompt),
        deliverables: generateDeliverables(prompt, matchingCategories || []),
        timeline: estimateTimeline(prompt, budgetNum),
        skillsRequired: matchingCategories?.slice(0, 5).map((c: any) => c.name) || [],
        toolsRequired: matchingTools?.slice(0, 3).map((t: any) => t.name) || [],
        milestones: generateMilestones(prompt, matchingCategories || [], budgetNum),
        startType: 'Immediately',
        budget: budgetNum,
        estimatedHours: Math.ceil(budgetNum / 75), // Assuming $75/hour average
        recommendedBudget: selectedFreelancerId ? calculateRecommendedBudget(selectedFreelancerId, freelancers, budgetNum) : budgetNum,
        paymentSchedule: 'completion', // Default, will be editable
        isPrivateGig: selectedFreelancerId !== null && selectedFreelancerId !== undefined,
        targetFreelancerId: selectedFreelancerId
      };

      const response = {
        step: 'requirements_confirmation',
        message: selectedFreelancerId
          ? `I've generated project requirements for your gig request:`
          : `I've generated project requirements for your public gig posting:`,
        projectRequirements,
        isPrivateGig: selectedFreelancerId !== null && selectedFreelancerId !== undefined,
        targetFreelancerId: selectedFreelancerId,
        nextStep: 'budget_and_confirm'
      };

      return NextResponse.json({ result: JSON.stringify(response, null, 2) });
    }

    // Legacy step handling (to be removed)
    if (!confirmed) {
      const promptLower = prompt.toLowerCase();

      // Find matching categories (flatten subcategories)
      const allCategories: any[] = [];
      categories.forEach((cat: any) => {
        if (cat.subcategories) {
          cat.subcategories.forEach((sub: any) => {
            allCategories.push({ ...sub, parentId: cat.id, parentLabel: cat.label });
          });
        }
      });

      const matchingCategories = allCategories.filter((cat: any) =>
        promptLower.includes(cat.name.toLowerCase()) ||
        promptLower.includes(cat.description.toLowerCase()) ||
        cat.keywords?.some((keyword: string) => promptLower.includes(keyword.toLowerCase()))
      );

      // Find matching tools
      const matchingTools = tools.filter((tool: any) =>
        tool.name && (
          promptLower.includes(tool.name.toLowerCase()) ||
          tool.keywords?.some((keyword: string) => promptLower.includes(keyword.toLowerCase()))
        )
      );

      // Find matching freelancers based on skills and budget
      const budgetNum = parseInt(budget.replace(/[^0-9]/g, '')) || 5000;

      // Score and rank freelancers
      const scoredFreelancers = freelancers.map((freelancer: any) => {
        const score = matchSkillsToQuery(prompt, freelancer, categories, tools);
        const hourlyRate = freelancer.minRate || freelancer.hourlyRate || 50;

        // Check if freelancer's rate fits budget (assuming 40 hours for project)
        const estimatedCost = hourlyRate * 40;
        const withinBudget = estimatedCost <= budgetNum * 1.2; // 20% buffer

        // Check availability
        const isAvailable = freelancer.availability === 'Available' ||
                           freelancer.availability === 'available' ||
                           !freelancer.availability; // Default to available if not specified

        return {
          ...freelancer,
          score,
          withinBudget,
          isAvailable,
          estimatedCost
        };
      });

      // Filter by score, budget, and availability, then sort by score
      const matchingFreelancers = scoredFreelancers
        .filter((freelancer: any) =>
          freelancer.score > 0 &&
          freelancer.withinBudget &&
          freelancer.isAvailable
        )
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 8); // Show top 8 matches

      const response = {
        step: 'freelancer_results',
        message: `Perfect! Based on your budget of ${budget}, here are the best freelancers for "${prompt}":`,
        freelancers: matchingFreelancers.map((f: any) => {
          // Find user data for this freelancer
          const userInfo = users.find((user: any) => user.id === f.userId);

          return {
            id: f.id,
            userId: f.userId,
            name: userInfo?.name || 'Unknown User',
            title: userInfo?.title || f.category || 'Freelancer',
            skills: f.skillCategories || f.tools?.slice(0, 4) || [],
            hourlyRate: f.minRate || f.hourlyRate || 50,
            rating: f.rating || 4.5,
            avatar: userInfo?.avatar || '/avatar.png',
            completedProjects: f.completedProjects || Math.floor(Math.random() * 20) + 5,
            estimatedCost: f.estimatedCost || (f.minRate || f.hourlyRate || 50) * 40,
            location: f.location || userInfo?.address || 'Remote',
            score: f.score
          };
        }),
        categories: matchingCategories.map((c: any) => c.name).slice(0, 5),
        tools: matchingTools.map((t: any) => t.name).slice(0, 5),
        showPostGigButton: true,
        projectDetails: {
          description: prompt,
          budget: budget,
          categories: matchingCategories.map((c: any) => c.name).slice(0, 3)
        }
      };

      return NextResponse.json({ result: JSON.stringify(response, null, 2) });
    }

    // Step 3: Generate project requirements for confirmation
    if (!confirmed && !editedRequirements) {
      const promptLower = prompt.toLowerCase();
      const budgetNum = parseInt(budget.replace(/[^0-9]/g, '')) || 5000;

      // Find matching categories and tools for requirements
      const allCategories: any[] = [];
      categories.forEach((cat: any) => {
        if (cat.subcategories) {
          cat.subcategories.forEach((sub: any) => {
            allCategories.push({ ...sub, parentId: cat.id, parentLabel: cat.label });
          });
        }
      });

      const matchingCategories = allCategories.filter((cat: any) =>
        promptLower.includes(cat.name.toLowerCase()) ||
        promptLower.includes(cat.description.toLowerCase()) ||
        cat.keywords?.some((keyword: string) => promptLower.includes(keyword.toLowerCase()))
      );

      const matchingTools = tools.filter((tool: any) =>
        promptLower.includes(tool.name.toLowerCase()) ||
        tool.keywords?.some((keyword: string) => promptLower.includes(keyword.toLowerCase()))
      );

      // Generate project requirements based on AI analysis
      const projectRequirements = {
        title: `${matchingCategories[0]?.name || 'Custom'} Project - ${prompt.split(' ').slice(0, 4).join(' ')}`,
        category: matchingCategories[0]?.parentLabel || 'General',
        subcategory: matchingCategories[0]?.name || 'Custom',
        description: prompt,
        lowerBudget: Math.floor(budgetNum * 0.8),
        upperBudget: budgetNum,
        estimatedHours: Math.ceil(budgetNum / 75), // Assuming $75/hour average
        deliveryTimeWeeks: Math.ceil(budgetNum / 75 / 40) || 1, // Assuming 40 hours/week
        startType: 'Immediately',
        executionMethod: budgetNum > 3000 ? 'milestone' : 'completion',
        toolsRequired: matchingTools.slice(0, 3).map((t: any) => t.name),
        skills: matchingCategories.slice(0, 3).map((c: any) => c.name),
        milestones: budgetNum > 3000 ? [
          {
            title: 'Project Setup & Planning',
            description: 'Initial project setup, requirements gathering, and planning phase',
            percentage: 25
          },
          {
            title: 'Development & Implementation',
            description: 'Core development and implementation of project requirements',
            percentage: 50
          },
          {
            title: 'Testing & Refinement',
            description: 'Testing, bug fixes, and refinements based on feedback',
            percentage: 25
          }
        ] : []
      };

      const response = {
        step: 'requirements_confirmation',
        message: `Based on your project "${prompt}" with a budget of ${budget}, I've generated these project requirements:`,
        projectRequirements: projectRequirements,
        selectedFreelancerId: selectedFreelancerId,
        isPrivateGig: !!selectedFreelancerId,
        confirmationNeeded: true
      };

      return NextResponse.json({ result: JSON.stringify(response, null, 2) });
    }

    // Step 4: Handle confirmation or create gig
    if (confirmed || editedRequirements) {
      // Get the project requirements from edited requirements or budget parameter
      let finalRequirements;
      if (editedRequirements) {
        finalRequirements = editedRequirements;
      } else {
        // When confirmed=true, the budget parameter should contain the project requirements
        // This is passed from the frontend when handleConfirmRequirements is called
        finalRequirements = budget;
      }

      if (!finalRequirements) {
        return NextResponse.json({ error: 'Missing project requirements' }, { status: 400 });
      }

      // Read existing gigs
      const gigsPath = path.join(process.cwd(), 'data', 'gigs', 'gigs.json');
      const gigsRaw = fs.readFileSync(gigsPath, 'utf-8');
      const gigs = JSON.parse(gigsRaw);

      // Generate new gig ID
      const newGigId = Math.max(...gigs.map((gig: any) => gig.id), 0) + 1;

      // Calculate timeline and budget
      const budgetNum = finalRequirements.budget || 5000;
      const estimatedHours = finalRequirements.estimatedHours || Math.ceil(budgetNum / 75);
      const deliveryTimeWeeks = Math.ceil(estimatedHours / 40) || 4;

      // Create new gig entry
      const newGig = {
        id: newGigId,
        title: finalRequirements.title || 'AI Generated Project',
        organizationId: 1, // Default organization - should be from session
        commissionerId: 32, // Should be from session - hardcoded for now
        category: finalRequirements.category || 'General',
        subcategory: finalRequirements.subcategory || 'Custom',
        tags: finalRequirements.skillsRequired || [],
        hourlyRateMin: Math.floor(budgetNum / estimatedHours),
        hourlyRateMax: Math.ceil(budgetNum / estimatedHours),
        description: finalRequirements.description || 'AI generated project description',
        deliveryTimeWeeks: deliveryTimeWeeks,
        estimatedHours: estimatedHours,
        status: selectedFreelancerId ? 'Private' : 'Available',
        toolsRequired: finalRequirements.toolsRequired || [],
        executionMethod: finalRequirements.paymentSchedule === 'milestone' ? 'Milestone-based' : 'Pay on completion',
        milestones: finalRequirements.milestones?.map((m: any, index: number) => ({
          id: `${newGigId}-${index}`,
          title: m.title,
          description: m.description,
          percentage: m.percentage || 0,
          startDate: null,
          endDate: null
        })) || [],
        startType: finalRequirements.startType || 'Immediately',
        endDate: new Date(Date.now() + deliveryTimeWeeks * 7 * 24 * 60 * 60 * 1000).toISOString(),
        lowerBudget: budgetNum,
        upperBudget: budgetNum,
        postedDate: new Date().toISOString().split('T')[0],
        notes: `AI Generated Project - Budget: $${budgetNum.toLocaleString()}`,
        // Add targeted request fields
        isPublic: selectedFreelancerId ? false : true,
        targetFreelancerId: selectedFreelancerId || null,
        isTargetedRequest: selectedFreelancerId ? true : false
      };

      // Add new gig to the beginning of the array (most recent first)
      gigs.unshift(newGig);

      // Write updated gigs back to file
      fs.writeFileSync(gigsPath, JSON.stringify(gigs, null, 2));

      const response = {
        step: 'gig_created',
        message: selectedFreelancerId
          ? `Private gig request sent successfully! The freelancer will see this in their gig requests.`
          : `Gig posted successfully! Freelancers can now see and apply to your project.`,
        gigData: newGig,
        gigId: newGigId,
        redirectTo: selectedFreelancerId
          ? '/commissioner-dashboard/projects-and-invoices'
          : '/freelancer-dashboard/gigs/explore-gigs',
        success: true
      };

      return NextResponse.json({ result: JSON.stringify(response, null, 2) });
    }
  } catch (err) {
    console.error('[AI_CLIENT_PROMPT_ERROR]', err);
    console.error('Error details:', err instanceof Error ? err.message : err);
    console.error('Stack trace:', err instanceof Error ? err.stack : 'No stack trace');
    return NextResponse.json({ error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}