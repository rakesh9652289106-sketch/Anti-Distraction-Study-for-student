import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export async function GET() {
  const db = readDb();
  return NextResponse.json({
    items: db.rewards,
    focusCoins: db.settings.focusCoins
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const db = readDb();
    const item = db.rewards.find(r => r.id === body.itemId);

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (item.purchased) {
      return NextResponse.json({ error: 'Item already purchased' }, { status: 400 });
    }

    if (db.settings.focusCoins < item.cost) {
      return NextResponse.json({ error: 'Insufficient Focus Coins' }, { status: 400 });
    }

    // Deduct coins and mark as purchased
    db.settings.focusCoins -= item.cost;
    item.purchased = true;

    writeDb(db);
    return NextResponse.json({ message: 'Purchase successful', item, focusCoins: db.settings.focusCoins });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
