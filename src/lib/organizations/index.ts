

import path from 'path';
import fs from 'fs';

const ORGS_PATH = path.join(process.cwd(), 'data', 'organizations.json');

export function getAllOrganizations() {
  const raw = fs.readFileSync(ORGS_PATH, 'utf-8');
  return JSON.parse(raw);
}

export function getOrganizationById(id: number) {
  const all = getAllOrganizations();
  return all.find((org: any) => org.id === id);
}

export function getOrganizationByName(name: string) {
  const all = getAllOrganizations();
  return all.find((org: any) => org.name?.toLowerCase() === name.toLowerCase());
}