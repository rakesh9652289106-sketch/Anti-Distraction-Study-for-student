import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, SupportTicket } from '@/lib/db';

export async function GET() {
  const db = readDb();
  return NextResponse.json(db.tickets);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.subject || !body.message) {
      return NextResponse.json({ error: 'Subject and Message are required' }, { status: 400 });
    }

    const db = readDb();
    
    const newTicket: SupportTicket = {
      id: 'ticket-' + Math.random().toString(36).substring(2, 9),
      subject: body.subject,
      message: body.message,
      status: 'Open',
      timestamp: new Date().toISOString(),
      replies: [
        {
          user: 'Support Bot',
          text: `Thank you for your report. Our AI agent is analyzing the issue: "${body.subject}". We will get back to you shortly.`,
          timestamp: new Date().toISOString()
        }
      ]
    };

    db.tickets.push(newTicket);
    writeDb(db);
    return NextResponse.json(newTicket, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
