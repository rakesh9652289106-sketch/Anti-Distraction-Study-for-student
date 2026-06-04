import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('focusflow_admin_auth')?.value;
  const authenticated = token === 'authenticated';
  return NextResponse.json({ authenticated });
}
