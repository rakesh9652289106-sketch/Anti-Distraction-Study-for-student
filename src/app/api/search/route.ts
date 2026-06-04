import { NextRequest, NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim().toLowerCase() || '';

    const db = readDb();

    if (!query) {
      return NextResponse.json({
        tasks: db.tasks || [],
        rooms: db.rooms || [],
        sessions: db.sessions || [],
        tickets: db.tickets || []
      });
    }

    // Filter tasks
    const filteredTasks = (db.tasks || []).filter(
      task =>
        task.title.toLowerCase().includes(query) ||
        task.subject.toLowerCase().includes(query)
    );

    // Filter rooms
    const filteredRooms = (db.rooms || []).filter(
      room =>
        room.name.toLowerCase().includes(query) ||
        room.tags.some(tag => tag.toLowerCase().includes(query))
    );

    // Filter sessions
    const filteredSessions = (db.sessions || []).filter(
      session =>
        session.taskTitle.toLowerCase().includes(query)
    );

    // Filter tickets
    const filteredTickets = (db.tickets || []).filter(
      ticket =>
        ticket.subject.toLowerCase().includes(query) ||
        ticket.message.toLowerCase().includes(query)
    );

    return NextResponse.json({
      tasks: filteredTasks,
      rooms: filteredRooms,
      sessions: filteredSessions,
      tickets: filteredTickets
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
