import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import serviceAccountKey from '@/serviceAccountKey.json';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKey as admin.ServiceAccount),
    });
  } catch (error) {
    console.error("Firebase Init Error:", error);
  }
}

const getDb = () => { return admin.apps.length ? admin.firestore() : null; };

export async function POST(request: Request) {
  try {
    const { to, type, patientName, location } = await request.json();

    console.log(`[API] Processing Alert: ${type} from ${patientName}`);

    if (!to || !type || !patientName) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });

    // ✅ CORRECT TEMPLATE NAMES
    let templateName = "";
    
    if (type === 'SOS') {
      templateName = "sos_emergency_alert"; // ✅ Confirmed from your WhatsApp Manager
    } else if (type === 'FALL') {
      templateName = "fall_detection"; // ← Make sure this matches your Fall template name too
    }
    
    const parameters = [
      { type: "text", text: patientName },
      { type: "text", text: currentTime },
      { type: "text", text: location || "Home" }
    ];

    console.log(`[DEBUG] Using template: ${templateName}`);
    console.log(`[DEBUG] Parameters:`, JSON.stringify(parameters));

    const metaPromise = fetch(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace(/\D/g, ''),
          type: "template",
          template: {
            name: templateName,
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: parameters
              }
            ]
          }
        }),
      }
    ).then(res => res.json());

    const db = getDb();
    if (db) {
      db.collection('alerts').add({
        status: type,
        patient: patientName,
        details: location || "",
        contact: to,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        severity: 'HIGH',
        channel: 'WhatsApp'
      }).catch(err => console.error("Firebase Save Error:", err));
    }

    const metaResult = await metaPromise;

    if (metaResult.error) {
      console.error("Meta API Error:", metaResult.error);
      return NextResponse.json({ 
        success: false, 
        error: metaResult.error.message,
        debug: { templateName, parameters }
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: metaResult.messages?.[0]?.id }, { status: 200 });

  } catch (error: any) {
    console.error('Server Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}