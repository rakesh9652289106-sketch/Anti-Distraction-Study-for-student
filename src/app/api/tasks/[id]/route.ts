import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = readDb();
    
    const taskIndex = db.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = db.tasks[taskIndex];
    if (body.title !== undefined) task.title = body.title;
    if (body.subject !== undefined) task.subject = body.subject;
    if (body.completed !== undefined) task.completed = body.completed;
    if (body.estimatedPomodoros !== undefined) task.estimatedPomodoros = body.estimatedPomodoros;
    if (body.actualPomodoros !== undefined) task.actualPomodoros = body.actualPomodoros;

    writeDb(db);
    return NextResponse.json(task);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = readDb();
    
    const taskIndex = db.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    db.tasks.splice(taskIndex, 1);
    writeDb(db);
    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
