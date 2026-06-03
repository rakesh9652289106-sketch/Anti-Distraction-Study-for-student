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
    const ticket = db.tickets.find(t => t.id === id);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const newReply = {
      user: body.user,
      text: body.text,
      timestamp: new Date().toISOString()
    };

    ticket.replies.push(newReply);
    
    // Auto-resolve or change status on admin reply
    if (body.user === 'Support Agent') {
      ticket.status = 'Answered';
    }

    writeDb(db);
    return NextResponse.json(newReply, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
