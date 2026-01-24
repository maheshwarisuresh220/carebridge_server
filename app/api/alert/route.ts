import { NextResponse } from 'next/server';
import twilio from 'twilio';
import * as admin from 'firebase-admin';
import serviceAccount from '@/serviceAccountKey.json'; 

// 1. INIT FIREBASE
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}
const db = admin.firestore();

// 2. INIT TWILIO (Added '!' here)
const client = twilio(process.env.TWILIO_SID!, process.env.TWILIO_AUTH!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, status } = body;

    console.log(`[API] Received Alert: ${status}`);

    const taskTwilio = client.messages.create({
        body: `🚨 CAREBRIDGE: ${status}\nDevice: ${deviceId}`,
        // FIXED: Added '!' to enforce string type
        from: process.env.TWILIO_FROM!,
        to: process.env.TWILIO_TO!,
    }).catch(e => console.error("Twilio Error:", e));

    const taskFirebase = db.collection('alerts').add({
        status: status,
        device: deviceId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        severity: 'HIGH',
    }).catch(e => console.error("Firebase Error:", e));

    await Promise.all([taskTwilio, taskFirebase]);

    return NextResponse.json({ success: true, mode: 'Server-Relay' }, { status: 200 });

  } catch (error: any) {
    console.error('Server Error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}