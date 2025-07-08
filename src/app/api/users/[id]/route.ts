import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data', 'users.json');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = fs.readFileSync(filePath, 'utf-8');
    const users = JSON.parse(data);
    const user = users.find((u: any) => String(u.id) === id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
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

    const data = fs.readFileSync(filePath, 'utf-8');
    const users = JSON.parse(data);

    const index = users.findIndex((u: any) => String(u.id) === id);
    if (index === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    users[index] = { ...users[index], ...updates };

    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

    return NextResponse.json({ message: 'User updated successfully', user: users[index] });
  } catch (error) {
    console.error('Error updating user data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}