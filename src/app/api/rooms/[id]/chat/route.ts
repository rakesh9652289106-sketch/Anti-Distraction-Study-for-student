import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (!body.user || !body.text) {
      return NextResponse.json({ error: 'User and Text are required' }, { status: 400 });
    }

    const db = readDb();
    const room = db.rooms.find(r => r.id === id);

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const newMessage = {
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      user: body.user,
      text: body.text,
      timestamp: new Date().toISOString()
    };

    room.messages.push(newMessage);
    
    // Limit chat history length to 50 items
    if (room.messages.length > 50) {
      room.messages.shift();
    }

    writeDb(db);
    return NextResponse.json(newMessage, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
