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

    // Format time to match template preview (HH:MM in 24-hour format)
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    let templateName = "";
    let components = [];
    
    if (type === 'SOS') {
      templateName = "sos_emergency_alert";
      
      // Parameters must be in the EXACT order they appear in the template
      // {{patient_name}} → parameter index 0
      // {{time}} → parameter index 1  
      // {{location}} → parameter index 2
      components = [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: patientName
            },
            {
              type: "text",
              text: currentTime
            },
            {
              type: "text",
              text: location || "Home"
            }
          ]
        }
      ];
    } else if (type === 'FALL') {
      templateName = "fall_detection";
      components = [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: patientName
            },
            {
              type: "text",
              text: currentTime
            },
            {
              type: "text",
              text: location || "Home"
            }
          ]
        }
      ];
    }

    const messagePayload = {
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ''), // Remove non-digits from phone number
      type: "template",
      template: {
        name: templateName,
        language: {
          code: "en"
        },
        components: components
      }
    };

    console.log('[DEBUG] Sending to Meta:', JSON.stringify(messagePayload, null, 2));

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

    // Save to Firebase asynchronously
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

    if (metaResult.error) {
      console.error("Meta API Error:", metaResult.error);
      return NextResponse.json({ 
        success: false, 
        error: metaResult.error.message || 'WhatsApp API Error',
        errorDetails: metaResult.error
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      messageId: metaResult.messages?.[0]?.id 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Server Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}