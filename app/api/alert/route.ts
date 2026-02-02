import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import serviceAccountKey from '@/serviceAccountKey.json';

// 1. INITIALIZE FIREBASE
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
    const { to, type, patientName, extraData } = await request.json();

    console.log(`[API] Processing Alert: ${type} from ${patientName}`);

    if (!to || !type || !patientName) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // --- TEMPLATE LOGIC ---
    let templateName = "";
    let parameters = [];
    
    // Get time in a clean format
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    switch (type) {
      case 'SOS':
        templateName = "sos_emergency_alert";
        parameters = [
          { type: "text", text: patientName },           // {{1}} Name
          { type: "text", text: currentTime },           // {{2}} Time
          { type: "text", text: extraData || "Unknown" } // {{3}} Location/Details
        ];
        break;

      case 'FALL':
        templateName = "fall_detection";
        parameters = [
          { type: "text", text: patientName },           // {{1}} Name
          { type: "text", text: currentTime },           // {{2}} Time
          { type: "text", text: extraData || "Home" }    // {{3}} Location
        ];
        break;

      default:
        templateName = "carebridge_alert"; // Ensure this exists if used
        parameters = [{ type: "text", text: patientName }];
    }

    // --- SEND TO META ---
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
            language: { code: "en" }, // Must match Dashboard language
            components: [{ type: "body", parameters }]
          }
        }),
      }
    ).then(res => res.json());

    // --- SAVE TO FIREBASE ---
    const db = getDb();
    if (db) {
        // We do NOT wait for this to finish to speed up the API response
        db.collection('alerts').add({
            status: type,
            patient: patientName,
            details: extraData || "",
            contact: to,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            severity: 'HIGH',
            channel: 'WhatsApp'
        }).catch(err => console.error("Firebase Save Error:", err));
    }

    const metaResult = await metaPromise;

    if (metaResult.error) {
        console.error("Meta API Error:", metaResult.error);
        // Return 500 but still include the error message for debugging
        return NextResponse.json({ success: false, error: metaResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: metaResult.messages?.[0]?.id }, { status: 200 });

  } catch (error: any) {
    console.error('Server Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}