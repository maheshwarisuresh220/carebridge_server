import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import serviceAccountKey from '@/serviceAccountKey.json';

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKey as admin.ServiceAccount),
    });
  } catch (error) {
    console.error("Firebase Init Error:", error);
  }
}

const getDb = () => {
  return admin.apps.length ? admin.firestore() : null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, type, patientName, location } = body;

    console.log(`[API] Processing Alert: ${type} from ${patientName}`);

    // Validate required fields
    if (!to || !type || !patientName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Format time
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    // Determine template name
    let templateName = "";
    
    if (type === 'SOS') {
      templateName = "sos_emergency_alert";
    } else if (type === 'FALL') {
      templateName = "fall_detection";
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid alert type' },
        { status: 400 }
      );
    }

    // Build WhatsApp message payload with NAMED parameters
    const messagePayload = {
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ''),
      type: "template",
      template: {
        name: templateName,
        language: {
          code: "en"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: patientName,
                name: "patient_name"  // ✅ Added parameter name
              },
              {
                type: "text",
                text: currentTime,
                name: "time"  // ✅ Added parameter name
              },
              {
                type: "text",
                text: location || "Home",
                name: "location"  // ✅ Added parameter name
              }
            ]
          }
        ]
      }
    };

    console.log('[DEBUG] Sending to Meta:', JSON.stringify(messagePayload, null, 2));

    // Send to WhatsApp
    const metaResponse = await fetch(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const metaResult = await metaResponse.json();
    console.log('[DEBUG] Meta response:', JSON.stringify(metaResult, null, 2));

    // Save to Firebase (don't wait for it)
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

    // Check for Meta API errors
    if (metaResult.error) {
      console.error("Meta API Error:", metaResult.error);
      return NextResponse.json(
        {
          success: false,
          error: metaResult.error.message || 'WhatsApp API Error',
          errorDetails: metaResult.error
        },
        { status: 500 }
      );
    }

    // Success
    return NextResponse.json(
      {
        success: true,
        messageId: metaResult.messages?.[0]?.id
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Server Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}