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
    const db = readDb();

    // Admin action: Create reward shop item
    if (body.action === 'create') {
      const { title, description, cost, icon } = body;
      if (!title || cost === undefined) {
        return NextResponse.json({ error: 'Title and Cost are required' }, { status: 400 });
      }
      const newReward = {
        id: 'reward-' + Math.random().toString(36).substring(2, 9),
        title,
        description: description || '',
        cost: parseInt(cost) || 0,
        icon: icon || 'star',
        purchased: false
      };
      db.rewards.push(newReward);
      writeDb(db);
      return NextResponse.json(newReward, { status: 201 });
    }

    // Standard client action: Purchase reward
    if (!body.itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

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

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const db = readDb();
    const { action } = body;

    if (action === 'reset') {
      db.rewards.forEach(r => r.purchased = false);
      db.settings.focusCoins = 120;
      writeDb(db);
      return NextResponse.json({ success: true, message: 'All purchases reset successfully' });
    }

    if (action === 'update') {
      const { itemId, title, description, cost, icon } = body;
      const item = db.rewards.find(r => r.id === itemId);
      if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      if (title !== undefined) item.title = title;
      if (description !== undefined) item.description = description;
      if (cost !== undefined) item.cost = parseInt(cost) || 0;
      if (icon !== undefined) item.icon = icon;
      writeDb(db);
      return NextResponse.json(item);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');
    if (!itemId) return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });

    const db = readDb();
    const idx = db.rewards.findIndex(r => r.id === itemId);
    if (idx === -1) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    db.rewards.splice(idx, 1);
    writeDb(db);
    return NextResponse.json({ success: true, message: 'Item deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

