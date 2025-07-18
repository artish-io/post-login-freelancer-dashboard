import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const usersFilePath = path.join(process.cwd(), 'data', 'users.json');
const organizationsFilePath = path.join(process.cwd(), 'data', 'organizations.json');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const usersData = fs.readFileSync(usersFilePath, 'utf-8');
    const organizationsData = fs.readFileSync(organizationsFilePath, 'utf-8');

    const users = JSON.parse(usersData);
    const organizations = JSON.parse(organizationsData);

    // Find user by ID (support both string and number comparison)
    const user = users.find((u: any) => String(u.id) === id || u.id === parseInt(id));

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user has an organizationId, get organization details
    let organizationInfo = null;
    if (user.organizationId) {
      const organization = organizations.find((org: any) => org.id === user.organizationId);
      if (organization) {
        organizationInfo = {
          organization: organization.name,
          organizationLogo: organization.logo,
          address: organization.address
        };
      }
    }

    // Return user with organization info
    const response = {
      ...user,
      ...organizationInfo
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error reading user data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();

    const data = fs.readFileSync(usersFilePath, 'utf-8');
    const users = JSON.parse(data);

    const index = users.findIndex((u: any) => String(u.id) === id || u.id === parseInt(id));
    if (index === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    users[index] = { ...users[index], ...updates };

    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));

    return NextResponse.json({ message: 'User updated successfully', user: users[index] });
  } catch (error) {
    console.error('Error updating user data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}