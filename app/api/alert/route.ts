import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import serviceAccountKey from '@/serviceAccountKey.json';

// --- 1. INITIALIZE FIREBASE ADMIN (Server-Side) ---
if (!admin.apps.length) {
  try {
    // Ensure 'serviceAccountKey.json' is in your root folder (same level as 'app' or 'src')
    // or use environment variables for better security.
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKey as admin.ServiceAccount),
    });
  } catch (error) {
    console.error("⚠️ Firebase Admin Init Error: Check if serviceAccountKey.json exists.", error);
  }
}

// Helper to get Firestore instance safely
const getDb = () => {
    return admin.apps.length ? admin.firestore() : null;
};

export async function POST(request: Request) {
  try {
    // 1. Parse Data from Frontend (or IoT Device)
    const { to, type, patientName, extraData } = await request.json();

    console.log(`[API] Processing Alert: ${type} for ${patientName}`);

    // 2. Validate Inputs
    if (!to || !type || !patientName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, type, or patientName' }, 
        { status: 400 }
      );
    }

    // 3. Select the Correct WhatsApp Template
    // The order of 'parameters' MUST match your Meta Dashboard template variables {{1}}, {{2}}, etc.
    let templateName = "";
    let parameters = [];
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    switch (type) {
      case 'FALL':
        templateName = "fall_detected_alert";
        parameters = [
          { type: "text", text: patientName },           // {{patient_name}}
          { type: "text", text: currentTime },           // {{time}}
          { type: "text", text: extraData || "Home" }    // {{location}}
        ];
        break;

      case 'SOS':
        templateName = "sos_emergency_alert";
        parameters = [
          { type: "text", text: patientName },           
          { type: "text", text: currentTime },           
          { type: "text", text: extraData || "Unknown Location" } 
        ];
        break;

      case 'MEDS':
        templateName = "medication_reminder";
        parameters = [
          { type: "text", text: patientName },           
          { type: "text", text: extraData }              // Medicine Details
        ];
        break;

     default:
        // Fallback for custom reminders
        templateName = "carebridge_alert"; 
        parameters = [
          { type: "text", text: patientName },
          { type: "text", text: extraData || "Please check the app." }
        ];
    }

    // 4. PREPARE: Send WhatsApp via Meta Cloud API
    const metaPromise = fetch(
      `https://graph.facebook.com/v22.0/${process.env.META_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.META_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace(/\D/g, ''), // Formatting: Remove '+' and spaces
          type: "template",
          template: {
            name: templateName,
            language: { code: "en_US" },
            components: [{ type: "body", parameters }]
          }
        }),
      }
    ).then(res => res.json());

    // 5. PREPARE: Save Log to Firebase
    const db = getDb();
    let firebasePromise: Promise<any> = Promise.resolve();

    if (db) {
        firebasePromise = db.collection('alerts').add({
            status: type,               // e.g., 'FALL', 'SOS'
            patient: patientName,
            details: extraData || "",
            contact: to,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            severity: (type === 'FALL' || type === 'SOS') ? 'HIGH' : 'LOW',
            channel: 'WhatsApp'
        });
    }

    // 6. EXECUTE BOTH (Parallel Execution for Speed)
    const [metaResult] = await Promise.all([metaPromise, firebasePromise]);

    // 7. Check Meta Response for Errors
    if (metaResult.error) {
        console.error("Meta API Error:", metaResult.error);
        return NextResponse.json({ success: false, error: metaResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: metaResult.messages?.[0]?.id }, { status: 200 });

  } catch (error: unknown) {
    console.error('Server Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}