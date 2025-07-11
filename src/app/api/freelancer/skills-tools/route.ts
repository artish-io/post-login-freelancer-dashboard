import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const freelancersPath = path.join(process.cwd(), 'data', 'freelancers.json');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, type, value } = body;

    // Validate required fields
    if (!userId || !type || !value) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type, value' },
        { status: 400 }
      );
    }

    if (!['skill', 'tool'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either "skill" or "tool"' },
        { status: 400 }
      );
    }

    // Read existing freelancers data
    let freelancers = [];
    try {
      const data = fs.readFileSync(freelancersPath, 'utf-8');
      freelancers = JSON.parse(data);
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to read freelancers data' },
        { status: 500 }
      );
    }

    // Find the freelancer
    const freelancerIndex = freelancers.findIndex((f: any) => f.userId === parseInt(userId));
    if (freelancerIndex === -1) {
      return NextResponse.json(
        { error: 'Freelancer not found' },
        { status: 404 }
      );
    }

    const freelancer = freelancers[freelancerIndex];

    // Add skill or tool
    if (type === 'skill') {
      // Add to skillCategories array
      if (!freelancer.skillCategories) {
        freelancer.skillCategories = [];
      }
      if (!freelancer.skillCategories.includes(value)) {
        freelancer.skillCategories.push(value);
      }
    } else if (type === 'tool') {
      // Add to tools array
      if (!freelancer.tools) {
        freelancer.tools = [];
      }
      if (!freelancer.tools.includes(value)) {
        freelancer.tools.push(value);
      }
    }

    // Update the freelancer in the array
    freelancers[freelancerIndex] = freelancer;

    // Write back to file
    fs.writeFileSync(freelancersPath, JSON.stringify(freelancers, null, 2));

    return NextResponse.json({ 
      success: true, 
      freelancer: freelancer 
    });

  } catch (error) {
    console.error('Error adding skill/tool:', error);
    return NextResponse.json(
      { error: 'Failed to add skill/tool' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { userId, type, value } = body;

    // Validate required fields
    if (!userId || !type || !value) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type, value' },
        { status: 400 }
      );
    }

    // Read existing freelancers data
    let freelancers = [];
    try {
      const data = fs.readFileSync(freelancersPath, 'utf-8');
      freelancers = JSON.parse(data);
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to read freelancers data' },
        { status: 500 }
      );
    }

    // Find the freelancer
    const freelancerIndex = freelancers.findIndex((f: any) => f.userId === parseInt(userId));
    if (freelancerIndex === -1) {
      return NextResponse.json(
        { error: 'Freelancer not found' },
        { status: 404 }
      );
    }

    const freelancer = freelancers[freelancerIndex];

    // Remove skill or tool
    if (type === 'skill' && freelancer.skillCategories) {
      freelancer.skillCategories = freelancer.skillCategories.filter((skill: string) => skill !== value);
    } else if (type === 'tool' && freelancer.tools) {
      freelancer.tools = freelancer.tools.filter((tool: string) => tool !== value);
    }

    // Update the freelancer in the array
    freelancers[freelancerIndex] = freelancer;

    // Write back to file
    fs.writeFileSync(freelancersPath, JSON.stringify(freelancers, null, 2));

    return NextResponse.json({ 
      success: true, 
      freelancer: freelancer 
    });

  } catch (error) {
    console.error('Error removing skill/tool:', error);
    return NextResponse.json(
      { error: 'Failed to remove skill/tool' },
      { status: 500 }
    );
  }
}
