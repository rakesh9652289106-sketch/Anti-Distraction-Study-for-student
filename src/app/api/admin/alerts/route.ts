import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, AdminAlert } from '@/lib/db';

function isAuthenticated(req: NextRequest): boolean {
  const token = req.cookies.get('focusflow_admin_auth')?.value;
  return token === 'authenticated';
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = readDb();
  return NextResponse.json(db.alerts || []);
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    if (!body.title || !body.text) {
      return NextResponse.json({ error: 'Title and Text are required' }, { status: 400 });
    }

    const db = readDb();
    
    // Ensure alerts array exists defensively
    if (!db.alerts) {
      db.alerts = [];
    }

    // Format local time
    const localTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newAlert: AdminAlert = {
      id: 'alert-' + Math.random().toString(36).substring(2, 9),
      title: body.title,
      text: body.text,
      time: localTime,
      type: body.type || 'warning',
      region: body.region || 'Local Client',
      source: body.source || 'Webcam Monitor'
    };

    db.alerts.unshift(newAlert); // prepend to show newest first
    
    // Limit to last 50 alerts
    if (db.alerts.length > 50) {
      db.alerts = db.alerts.slice(0, 50);
    }

    writeDb(db);

    return NextResponse.json(newAlert, { status: 201 });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error }, { status: 500 });
  }
}

