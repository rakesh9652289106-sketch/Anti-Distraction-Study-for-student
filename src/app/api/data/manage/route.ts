import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readDb, writeDb } from '@/lib/db';

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

export async function GET() {
  try {
    const db = readDb();
    
    // Set headers to trigger file download in browser
    return new NextResponse(JSON.stringify(db, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="focusflow_db_backup.json"'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'reset') {
      // Re-initialize database by removing db.json file and calling readDb()
      if (fs.existsSync(DB_FILE)) {
        fs.unlinkSync(DB_FILE);
      }
      const defaultDb = readDb();
      return NextResponse.json({ success: true, message: 'Database reset to default values successfully', data: defaultDb });
    }

    if (action === 'import') {
      const { data } = body;
      if (!data || typeof data !== 'object') {
        return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
      }

      // Check required schema fields
      if (!data.tasks || !data.settings || !data.rooms) {
        return NextResponse.json({ error: 'Imported file is missing required FocusFlow schemas (tasks, settings, rooms)' }, { status: 400 });
      }

      writeDb(data);
      return NextResponse.json({ success: true, message: 'Database imported successfully', data });
    }

    if (action === 'clear_sessions') {
      const db = readDb();
      db.sessions = [];
      db.analytics = [];
      db.settings.focusCoins = 120; // reset coins to default
      db.settings.currentStreak = 0; // reset streak
      db.settings.focusScore = 100;
      writeDb(db);
      return NextResponse.json({ success: true, message: 'Session history and analytics wiped successfully', data: db });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
