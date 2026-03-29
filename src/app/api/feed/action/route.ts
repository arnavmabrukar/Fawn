import { NextResponse } from 'next/server';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || 'app_id',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || process.env.PUSHER_KEY || 'key',
  secret: process.env.PUSHER_SECRET || 'secret',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || process.env.PUSHER_CLUSTER || 'us2',
  useTLS: true,
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    type?: 'calendar' | 'document' | 'info' | 'checkin';
    title?: string;
    description?: string;
    childName?: string;
    checkedInAt?: string;
  } | null;

  if (!body?.type || !body.title || !body.description) {
    return NextResponse.json(
      { error: 'type, title, and description are required' },
      { status: 400 }
    );
  }

  const timestamp = new Date().toISOString();
  const action = {
    type: body.type,
    title: body.title,
    description: body.description,
    childName: body.childName,
    checkedInAt: body.checkedInAt,
    timestamp,
  };

  try {
    const hasPusherConfig =
      !!process.env.PUSHER_APP_ID &&
      !!(process.env.NEXT_PUBLIC_PUSHER_KEY || process.env.PUSHER_KEY) &&
      !!process.env.PUSHER_SECRET;

    if (hasPusherConfig) {
      await pusher.trigger('fawn-live', 'action', action);
    }
  } catch (error) {
    console.error('[Feed Action API Error]', error);
  }

  return NextResponse.json({ ok: true, timestamp, action });
}

export async function DELETE() {
  try {
    const hasPusherConfig =
      !!process.env.PUSHER_APP_ID &&
      !!(process.env.NEXT_PUBLIC_PUSHER_KEY || process.env.PUSHER_KEY) &&
      !!process.env.PUSHER_SECRET;

    if (hasPusherConfig) {
      await pusher.trigger('fawn-live', 'audit-clear', {
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('[Feed Clear API Error]', error);
  }

  return NextResponse.json({ ok: true });
}
