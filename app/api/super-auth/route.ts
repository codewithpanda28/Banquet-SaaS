import { NextResponse } from 'next/server';

// 🛡️ SUPER ADMIN AUTH — Server-Side Only
// This route validates the Super Admin passcode WITHOUT exposing it to the browser.
// The secret lives only in the server environment, never in NEXT_PUBLIC_ variables.

export async function POST(req: Request) {
    try {
        const { code } = await req.json();

        const secret = process.env.SUPER_ADMIN_SECRET;

        if (!secret || secret === 'CHANGE_THIS_TO_A_RANDOM_SECRET_STRING') {
            console.error('❌ [SuperAuth] SUPER_ADMIN_SECRET is not configured!');
            return NextResponse.json(
                { success: false, error: 'Server misconfiguration' },
                { status: 500 }
            );
        }

        if (!code || typeof code !== 'string') {
            return NextResponse.json({ success: false, error: 'Code required' }, { status: 400 });
        }

        if (code === secret) {
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, error: 'Invalid code' }, { status: 401 });
    } catch {
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
