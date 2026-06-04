import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, StudyRoom } from '@/lib/db';

export async function GET() {
  const db = readDb();
  return NextResponse.json(db.rooms);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = readDb();

    if (body.action === 'join') {
      const room = db.rooms.find(r => r.id === body.roomId);
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      room.activeUsers += 1;
      writeDb(db);
      return NextResponse.json(room);
    }

    if (body.action === 'leave') {
      const room = db.rooms.find(r => r.id === body.roomId);
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      if (room.activeUsers > 0) room.activeUsers -= 1;
      writeDb(db);
      return NextResponse.json(room);
    }

    // Otherwise, create a room
    if (!body.name) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }

    const newRoom: StudyRoom = {
      id: 'room-' + Math.random().toString(36).substring(2, 9),
      name: body.name,
      activeUsers: 1,
      tags: body.tags || ['Study'],
      ambientSound: body.ambientSound || 'Silence',
      messages: []
    };

    db.rooms.push(newRoom);
    writeDb(db);
    return NextResponse.json(newRoom, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const db = readDb();
    const index = db.rooms.findIndex(r => r.id === roomId);
    if (index === -1) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    db.rooms.splice(index, 1);
    writeDb(db);
    return NextResponse.json({ success: true, message: 'Room deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

