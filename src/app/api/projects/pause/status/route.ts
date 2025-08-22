import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { NotificationStorage } from '@/lib/notifications/notification-storage';
import fs from 'fs/promises';
import path from 'path';

async function appendToProjectTrackerLog(userId: number, entry: any) {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');

  const logDir = path.join(process.cwd(), 'project-tracker-log', year.toString(), month, day, userId.toString());
  const logFile = path.join(logDir, 'log.json');

  try {
    await fs.mkdir(logDir, { recursive: true });

    let logData: any[] = [];
    try {
      const fileContents = await fs.readFile(logFile, 'utf-8');
      logData = JSON.parse(fileContents);
    } catch {
      // File does not exist or is invalid, start with empty array
      logData = [];
    }

    const exists = logData.some(e => e.id === entry.id);
    if (!exists) {
      logData.push(entry);
      await fs.writeFile(logFile, JSON.stringify(logData, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Error writing to project tracker log:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (typeof projectId !== 'string' || projectId.trim() === '') {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Get all events to find pending pause requests for this project
    const allEvents = NotificationStorage.getAllEvents();
    
    // Find the most recent pause request for this project
    const pauseRequests = allEvents
      .filter(event =>
        event.type === 'project_pause_requested' &&
        event.context?.projectId?.toString() === projectId
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (pauseRequests.length === 0) {
      return NextResponse.json({ pauseRequest: null });
    }

    const latestRequest = pauseRequests[0];
    
    // Check if this request has been actioned by any commissioner
    const isActioned = NotificationStorage.isActioned(latestRequest.id, latestRequest.targetId || 0);
    
    if (isActioned) {
      const status = isActioned === 'approve' ? 'approved' : 'refused';

      // Write to project-tracker-log if not already logged
      if (typeof latestRequest.actorId !== 'number') {
        return NextResponse.json({ error: 'Invalid actorId in pause request' }, { status: 400 });
      }

      await appendToProjectTrackerLog(latestRequest.actorId, {
        id: latestRequest.id,
        status,
        timestamp: latestRequest.timestamp,
        metadata: latestRequest.metadata
      });

      return NextResponse.json({ 
        pauseRequest: {
          id: latestRequest.id,
          freelancerId: latestRequest.actorId,
          freelancerName: latestRequest.metadata.freelancerName || 'Freelancer',
          reason: latestRequest.metadata.pauseReason || 'Freelancer requested project pause',
          timestamp: latestRequest.timestamp,
          status
        }
      });
    }

    // Return the pending request
    return NextResponse.json({
      pauseRequest: {
        id: latestRequest.id,
        freelancerId: latestRequest.actorId,
        freelancerName: latestRequest.metadata.freelancerName || 'Freelancer',
        reason: latestRequest.metadata.pauseReason || 'Freelancer requested project pause',
        timestamp: latestRequest.timestamp,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Error fetching pause request status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
