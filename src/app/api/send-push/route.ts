import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// 1. Configure the Web Push Engine
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:test@test.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// 2. Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { userId, broadcast, targetClass, title, body, url } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Build the query to find who we are sending this to
    let query = supabase.from('students').select('push_subscription').not('push_subscription', 'is', null);

    if (userId) {
      query = query.eq('id', userId); // Single student
    } else if (targetClass) {
      query = query.eq('class', targetClass); // Specific Class
    } else if (!broadcast) {
      return NextResponse.json({ error: 'No target specified' }, { status: 400 });
    }

    const { data: students, error } = await query;

    if (error || !students || students.length === 0) {
      return NextResponse.json({ error: 'No subscribed users found' }, { status: 404 });
    }

    const payload = JSON.stringify({ 
      title: title, 
      body: body, 
      url: url || '/' 
    });

    // 4. Blast the notification to everyone!
    // We use Promise.all so they all send at the same time. The .catch ensures that if one student's phone is dead, it doesn't break the whole broadcast.
    const pushPromises = students.map((student) => {
      return webpush.sendNotification(student.push_subscription, payload).catch(err => {
        console.error('Failed to send to a user (they may have cleared their browser data)', err);
      });
    });

    await Promise.all(pushPromises);

    return NextResponse.json({ success: true, message: `Push sent to ${students.length} users!` });

  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
