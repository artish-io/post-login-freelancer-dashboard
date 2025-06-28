// src/app/api/user/commissioners/route.ts
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const USERS_PATH = path.join(process.cwd(), 'data', 'users.json');
const ORGS_PATH = path.join(process.cwd(), 'data', 'organizations.json');

export async function GET() {
  try {
    const [usersRaw, orgsRaw] = await Promise.all([
      readFile(USERS_PATH, 'utf-8'),
      readFile(ORGS_PATH, 'utf-8'),
    ]);

    const users = JSON.parse(usersRaw);
    const organizations = JSON.parse(orgsRaw);

    const commissioners = users
      .filter((user: any) => user.type === 'commissioner')
      .map((user: any) => {
        const org = organizations.find((o: any) => o.id === user.organizationId);

        return {
          ...user,
          organization: org
            ? {
                name: org.name,
                logo: org.logo,
                address: org.address,
              }
            : null,
        };
      });

    return NextResponse.json(commissioners);
  } catch (error) {
    console.error('Error fetching enriched commissioners:', error);
    return NextResponse.json({ error: 'Failed to load commissioners' }, { status: 500 });
  }
}