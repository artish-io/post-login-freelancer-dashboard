

import path from 'path';
import fs from 'fs';

const USERS_PATH = path.join(process.cwd(), 'data', 'users.json');

export function getAllUsers() {
  const file = fs.readFileSync(USERS_PATH, 'utf-8');
  return JSON.parse(file);
}

export function getUserById(id: number) {
  const users = getAllUsers();
  return users.find((user: any) => user.id === id);
}

export function getUserByEmail(email: string) {
  const users = getAllUsers();
  return users.find((user: any) => user.email?.toLowerCase() === email.toLowerCase());
}