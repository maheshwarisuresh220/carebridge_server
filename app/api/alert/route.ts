import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import serviceAccountKey from '@/serviceAccountKey.json';

// Initialize Firebase
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
    const body = await request.json();
    // ⚠️ SAFTEY: Extract both 'location' AND 'extraData' to be safe
    const { to, type, patientName, location, extraData } = body;

    console.log(`[API] Processing Alert: ${type} from ${patientName}`);

    // Validate inputs
    if (!to || !type) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Determine the safe values (Never send Null/Undefined to Meta)
    const safeName = String(patientName || "Patient");
    const safeLocation = String(location || extraData || "Home"); // Checks both!
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    // --- TEMPLATE LOGIC ---
    let templateName = "";
    let parameters = [];
    
    switch (type) {
      case 'SOS':
        templateName = "sos_emergency_alert";
        parameters = [
          { type: "text", text: safeName },      // {{1}}
          { type: "text", text: currentTime },   // {{2}}
          { type: "text", text: safeLocation }   // {{3}}
        ];
        break;

      case 'FALL':
        templateName = "fall_detection";
        parameters = [
          { type: "text", text: safeName },      // {{1}}
          { type: "text", text: currentTime },   // {{2}}
          { type: "text", text: safeLocation }   // {{3}}
        ];
        break;
        
      default:
        // Fallback for testing
        templateName = "sos_emergency_alert";
        parameters = [
          { type: "text", text: safeName },
          { type: "text", text: currentTime },
          { type: "text", text: safeLocation }
        ];
    }

    // --- SEND TO META ---
    const metaResponse = await fetch(
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
            language: { code: "en" }, // Matches your English template
            components: [
              {
                type: "body",
                parameters: parameters
              }
            ]
          }
        }),
      }
    );

    const metaResult = await metaResponse.json();

    // --- LOG TO FIREBASE ---
    const db = getDb();
    if (db) {
        db.collection('alerts').add({
            status: type,
            patient: safeName,
            details: safeLocation,
            contact: to,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            severity: 'HIGH',
            channel: 'WhatsApp'
        });
    }

    if (metaResult.error) {
        console.error("Meta API Error:", JSON.stringify(metaResult.error));
        return NextResponse.json({ success: false, error: metaResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: metaResult.messages?.[0]?.id }, { status: 200 });

  } catch (error: any) {
    console.error('Server Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}