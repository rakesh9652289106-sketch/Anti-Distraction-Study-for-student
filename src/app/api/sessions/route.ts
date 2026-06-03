import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, StudySession, AnalyticsSummary } from '@/lib/db';

export async function GET() {
  const db = readDb();
  return NextResponse.json(db.sessions);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = readDb();

    // Create session
    const newSession: StudySession = {
      id: 'session-' + Math.random().toString(36).substring(2, 9),
      startTime: new Date().toISOString(),
      durationMinutes: body.durationMinutes || 25,
      taskTitle: body.taskTitle || 'General Focus Session',
      distractionsBlocked: body.distractionsBlocked || 0,
      focusScore: body.focusScore || 90
    };

    db.sessions.push(newSession);

    // Update coins (e.g., 10 coins per session + bonus for distractions blocked)
    const coinReward = 10 + (body.distractionsBlocked || 0) * 2;
    db.settings.focusCoins += coinReward;

    // Update streak (if last session was on a different day, increment streak)
    // For simplicity, we just increment it if we complete a session (up to +1 per day)
    const todayStr = new Date().toISOString().split('T')[0];
    const hasTodayAnalytics = db.analytics.some(a => a.date === todayStr);
    
    if (!hasTodayAnalytics) {
      db.settings.currentStreak += 1;
    }

    // Aggregate into daily analytics
    const dailyLog = db.analytics.find(a => a.date === todayStr);
    if (dailyLog) {
      dailyLog.focusMinutes += newSession.durationMinutes;
      dailyLog.distractionsBlocked += newSession.distractionsBlocked;
      dailyLog.focusScore = Math.round((dailyLog.focusScore * 2 + newSession.focusScore) / 3);
    } else {
      const newDailyLog: AnalyticsSummary = {
        date: todayStr,
        focusMinutes: newSession.durationMinutes,
        distractionsBlocked: newSession.distractionsBlocked,
        focusScore: newSession.focusScore
      };
      db.analytics.push(newDailyLog);
    }

    // If a specific task is linked, increment its actualPomodoros
    if (body.taskId) {
      const task = db.tasks.find(t => t.id === body.taskId);
      if (task) {
        task.actualPomodoros += 1;
      }
    }

    writeDb(db);
    return NextResponse.json({ session: newSession, coinsEarned: coinReward, streak: db.settings.currentStreak }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
