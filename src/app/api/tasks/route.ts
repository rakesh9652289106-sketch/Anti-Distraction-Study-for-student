import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, Task } from '@/lib/db';

export async function GET() {
  const db = readDb();
  return NextResponse.json(db.tasks);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || !body.subject) {
      return NextResponse.json({ error: 'Title and Subject are required' }, { status: 400 });
    }

    const db = readDb();
    const newTask: Task = {
      id: Math.random().toString(36).substring(2, 9),
      title: body.title,
      completed: false,
      subject: body.subject,
      estimatedPomodoros: body.estimatedPomodoros || 1,
      actualPomodoros: 0
    };

    db.tasks.push(newTask);
    writeDb(db);

    return NextResponse.json(newTask, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
