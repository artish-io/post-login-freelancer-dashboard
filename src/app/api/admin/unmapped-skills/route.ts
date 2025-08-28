import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const UNMAPPED_SKILLS_FILE = path.join(process.cwd(), 'data/admin/unmapped-skills.json');

interface UnmappedSkill {
  id: string;
  skill: string;
  context: string;
  submittedAt: string;
  frequency: number;
  status: 'pending' | 'mapped' | 'ignored';
  mappedTo?: string;
  mappedCategory?: string;
}

// Ensure directory exists
function ensureDirectoryExists() {
  const dir = path.dirname(UNMAPPED_SKILLS_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Read unmapped skills
function readUnmappedSkills(): UnmappedSkill[] {
  ensureDirectoryExists();
  if (!existsSync(UNMAPPED_SKILLS_FILE)) {
    writeFileSync(UNMAPPED_SKILLS_FILE, '[]');
    return [];
  }
  
  try {
    const data = readFileSync(UNMAPPED_SKILLS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading unmapped skills:', error);
    return [];
  }
}

// Write unmapped skills
function writeUnmappedSkills(skills: UnmappedSkill[]) {
  ensureDirectoryExists();
  try {
    writeFileSync(UNMAPPED_SKILLS_FILE, JSON.stringify(skills, null, 2));
  } catch (error) {
    console.error('Error writing unmapped skills:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const skills = readUnmappedSkills();
    return NextResponse.json({ success: true, skills });
  } catch (error) {
    console.error('Error fetching unmapped skills:', error);
    return NextResponse.json({ error: 'Failed to fetch unmapped skills' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { skill, context } = await request.json();
    
    if (!skill || !context) {
      return NextResponse.json({ error: 'Skill and context are required' }, { status: 400 });
    }

    const skills = readUnmappedSkills();
    const normalizedSkill = skill.toLowerCase().trim();
    
    // Check if skill already exists
    const existingSkill = skills.find(s => s.skill.toLowerCase() === normalizedSkill);
    
    if (existingSkill) {
      // Increment frequency
      existingSkill.frequency += 1;
    } else {
      // Add new skill
      const newSkill: UnmappedSkill = {
        id: Date.now().toString(),
        skill: skill.trim(),
        context,
        submittedAt: new Date().toISOString(),
        frequency: 1,
        status: 'pending'
      };
      skills.push(newSkill);
    }
    
    writeUnmappedSkills(skills);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding unmapped skill:', error);
    return NextResponse.json({ error: 'Failed to add unmapped skill' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, status, mappedTo, mappedCategory } = await request.json();
    
    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status are required' }, { status: 400 });
    }

    const skills = readUnmappedSkills();
    const skillIndex = skills.findIndex(s => s.id === id);
    
    if (skillIndex === -1) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }
    
    skills[skillIndex].status = status;
    if (mappedTo) skills[skillIndex].mappedTo = mappedTo;
    if (mappedCategory) skills[skillIndex].mappedCategory = mappedCategory;
    
    writeUnmappedSkills(skills);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating unmapped skill:', error);
    return NextResponse.json({ error: 'Failed to update unmapped skill' }, { status: 500 });
  }
}
