import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';

export async function appendLog(file: string, stage: string, payload: Record<string, any> = {}) {
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), stage, ...payload }) + '\n';
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.appendFile(file, line);
  } catch (error) {
    console.warn('Failed to append log:', error);
  }
}
