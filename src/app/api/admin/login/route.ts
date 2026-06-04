import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    if (password === 'admin123') {
      const response = NextResponse.json({ success: true, message: 'Logged in successfully' });
      response.cookies.set('focusflow_admin_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 86400 // 1 day
      });
      return response;
    }

    return NextResponse.json({ error: 'Incorrect admin password' }, { status: 401 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
