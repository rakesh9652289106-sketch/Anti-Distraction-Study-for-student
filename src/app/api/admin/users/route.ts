import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

function isAuthenticated(req: NextRequest): boolean {
  const token = req.cookies.get('focusflow_admin_auth')?.value;
  return token === 'authenticated';
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const db = readDb();
    return NextResponse.json(db.users || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { userId, name, email, focusScore, focusCoins, currentStreak, status, chatMuted } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const db = readDb();
    const user = db.users.find(u => u.id === userId);

    if (!user) {
      return NextResponse.json({ error: 'Student user not found' }, { status: 404 });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (focusScore !== undefined) user.focusScore = parseInt(focusScore) || 0;
    if (focusCoins !== undefined) user.focusCoins = parseInt(focusCoins) || 0;
    if (currentStreak !== undefined) user.currentStreak = parseInt(currentStreak) || 0;
    if (status !== undefined) user.status = status;
    if (chatMuted !== undefined) user.chatMuted = chatMuted;

    writeDb(db);
    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const db = readDb();
    const idx = db.users.findIndex(u => u.id === userId);

    if (idx === -1) {
      return NextResponse.json({ error: 'Student user not found' }, { status: 404 });
    }

    db.users.splice(idx, 1);
    writeDb(db);
    return NextResponse.json({ success: true, message: 'Student user removed successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
