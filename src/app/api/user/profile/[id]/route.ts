import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const id = context.params.id; // ✅ Safe access to `params`

  try {
    const filePath = path.join(process.cwd(), 'data', 'freelancers.json');
    const data = await readFile(filePath, 'utf-8');
    const freelancers = JSON.parse(data);

    const user = freelancers.find((f: any) => String(f.id) === id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { name, avatar, availability, role, email } = user;

    return NextResponse.json({
      id,
      name,
      avatar,
      availability,
      role,
      email,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Failed to load user profile' }, { status: 500 });
  }
}