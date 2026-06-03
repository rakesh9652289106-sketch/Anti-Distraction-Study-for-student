import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export async function GET() {
  const db = readDb();
  return NextResponse.json(db.settings);
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const db = readDb();

    if (body.studyMode !== undefined) db.settings.studyMode = body.studyMode;
    if (body.distractionShield !== undefined) db.settings.distractionShield = body.distractionShield;
    if (body.blockedWebsites !== undefined) db.settings.blockedWebsites = body.blockedWebsites;
    if (body.focusScore !== undefined) db.settings.focusScore = body.focusScore;
    if (body.pomodoroWorkTime !== undefined) db.settings.pomodoroWorkTime = body.pomodoroWorkTime;
    if (body.pomodoroBreakTime !== undefined) db.settings.pomodoroBreakTime = body.pomodoroBreakTime;
    if (body.currentStreak !== undefined) db.settings.currentStreak = body.currentStreak;
    if (body.focusCoins !== undefined) db.settings.focusCoins = body.focusCoins;

    writeDb(db);
    return NextResponse.json(db.settings);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
