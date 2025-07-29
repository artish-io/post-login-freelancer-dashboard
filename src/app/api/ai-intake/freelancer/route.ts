// src/app/api/ai-intake/freelancer/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { intent, preferences, step } = await req.json();

    if (!intent) {
      return NextResponse.json({ error: 'Missing intent' }, { status: 400 });
    }

    // Read data files
    const gigsPath = path.join(process.cwd(), 'data', 'gigs', 'gigs.json');
    const categoriesPath = path.join(process.cwd(), 'data', 'gigs', 'gig-categories.json');
    const toolsPath = path.join(process.cwd(), 'data', 'gigs', 'gig-tools.json');
    const organizationsPath = path.join(process.cwd(), 'data', 'organizations.json');

    const gigs = JSON.parse(fs.readFileSync(gigsPath, 'utf-8'));
    const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
    const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf-8'));
    const organizations = JSON.parse(fs.readFileSync(organizationsPath, 'utf-8'));

    // Direct gig matching based on intent using fuzzy keywords
    const intentLower = intent.toLowerCase();

    // Find matching categories for broader matching
    const allCategories: any[] = [];
    categories.forEach((cat: any) => {
      if (cat.subcategories) {
        cat.subcategories.forEach((sub: any) => {
          allCategories.push({ ...sub, parentId: cat.id, parentLabel: cat.label });
        });
      }
    });

    // Find matching gigs with hierarchical ranking
    const gigsWithScores = gigs.map((gig: any) => {
      const gigTitle = gig.title.toLowerCase();
      const gigDescription = (gig.description || '').toLowerCase();
      const gigCategory = (gig.category || '').toLowerCase();
      const gigSubcategory = (gig.subcategory || '').toLowerCase();
      const gigTags = gig.tags || [];
      const gigSkills = gig.skillsRequired || [];

      let score = 0;
      let matchType = '';

      // 1. Category matches (highest priority - score 100)
      if (gigCategory.includes(intentLower) || intentLower.includes(gigCategory)) {
        score += 100;
        matchType = 'category';
      }

      // 2. Subcategory matches (medium-high priority - score 80)
      if (gigSubcategory.includes(intentLower) || intentLower.includes(gigSubcategory)) {
        score += 80;
        if (!matchType) matchType = 'subcategory';
      }

      // 3. Tag matches (medium priority - score 60)
      const tagMatch = gigTags.some((tag: string) => {
        const tagLower = tag.toLowerCase();
        return tagLower.includes(intentLower) || intentLower.includes(tagLower);
      });
      if (tagMatch) {
        score += 60;
        if (!matchType) matchType = 'tag';
      }

      // 4. Title matches (medium priority - score 50)
      if (gigTitle.includes(intentLower)) {
        score += 50;
        if (!matchType) matchType = 'title';
      }

      // 5. Skill matches (lower priority - score 40)
      const skillMatch = gigSkills.some((skill: string) => {
        const skillLower = skill.toLowerCase();
        return skillLower.includes(intentLower) || intentLower.includes(skillLower);
      });
      if (skillMatch) {
        score += 40;
        if (!matchType) matchType = 'skill';
      }

      // 6. Description matches (lowest priority - score 20)
      if (gigDescription.includes(intentLower)) {
        score += 20;
        if (!matchType) matchType = 'description';
      }

      // Only include available gigs with some match
      const isAvailable = gig.status === 'active' || gig.status === 'Available';

      return {
        ...gig,
        matchScore: score,
        matchType: matchType,
        isMatch: score > 0 && isAvailable
      };
    });

    // Filter and sort by score (highest first)
    const matchingGigs = gigsWithScores
      .filter((gig: any) => gig.isMatch)
      .sort((a: any, b: any) => b.matchScore - a.matchScore)
      .slice(0, 8); // Show top 8 matches

    // Get organizations for the matching gigs
    const matchingOrganizations = organizations.filter((org: any) =>
      matchingGigs.some((gig: any) => gig.organizationId === org.id)
    );

    // Create organization-gig pairs with match information
    const opportunities = matchingGigs.map((gig: any) => {
      const org = organizations.find((o: any) => o.id === gig.organizationId);

      // Calculate budget based on hourly rate and delivery time
      let budgetDisplay = 'Budget TBD';
      if (gig.hourlyRateMin && gig.hourlyRateMax && gig.deliveryTimeWeeks) {
        const avgRate = (gig.hourlyRateMin + gig.hourlyRateMax) / 2;
        const totalHours = gig.deliveryTimeWeeks * 40; // 40 hours per week
        const totalBudget = Math.round(avgRate * totalHours);
        budgetDisplay = `$${totalBudget.toLocaleString()}`;
      } else if (gig.estimatedHours && gig.hourlyRateMin && gig.hourlyRateMax) {
        const avgRate = (gig.hourlyRateMin + gig.hourlyRateMax) / 2;
        const totalBudget = Math.round(avgRate * gig.estimatedHours);
        budgetDisplay = `$${totalBudget.toLocaleString()}`;
      }

      return {
        gigId: gig.id,
        projectName: gig.title,
        budget: budgetDisplay,
        organization: {
          id: org?.id,
          name: org?.name || 'Unknown Organization',
          description: org?.description || '',
          logo: org?.logo
        },
        skillsRequired: gig.skillsRequired || [],
        description: gig.description || '',
        postedDate: gig.createdAt || new Date().toISOString(),
        deadline: gig.deadline,
        category: gig.category,
        subcategory: gig.subcategory,
        tags: gig.tags || [],
        matchScore: gig.matchScore,
        matchType: gig.matchType,
        hourlyRateMin: gig.hourlyRateMin,
        hourlyRateMax: gig.hourlyRateMax,
        estimatedHours: gig.estimatedHours
      };
    });

    // Create match summary for better user feedback
    const matchSummary = matchingGigs.reduce((acc: any, gig: any) => {
      acc[gig.matchType] = (acc[gig.matchType] || 0) + 1;
      return acc;
    }, {});

    const matchDescription = Object.entries(matchSummary)
      .map(([type, count]) => `${count} ${type} match${count !== 1 ? 'es' : ''}`)
      .join(', ');

    const response = {
      step: 'opportunities_results',
      message: matchingGigs.length > 0
        ? `Found ${matchingGigs.length} opportunities for "${intent}" (${matchDescription}):`
        : `No current opportunities found for "${intent}". Try broader terms like "design", "development", or "marketing".`,
      opportunities: opportunities,
      totalOpportunities: opportunities.length,
      categories: Array.from(new Set(matchingGigs.flatMap((g: any) => g.tags || []))).slice(0, 5),
      organizations: matchingOrganizations.map((org: any) => ({
        id: org.id,
        name: org.name,
        description: org.description,
        activeGigs: matchingGigs.filter((g: any) => g.organizationId === org.id).length
      })).slice(0, 5),
      searchTerm: intent,
      showGigsList: true,
      matchSummary: matchSummary,
      rankingInfo: {
        category: 100,
        subcategory: 80,
        tag: 60,
        title: 50,
        skill: 40,
        description: 20
      }
    };

    return NextResponse.json({ result: JSON.stringify(response, null, 2) });
  } catch (err) {
    console.error('[AI_FREELANCER_PROMPT_ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}