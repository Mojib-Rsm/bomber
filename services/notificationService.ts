import { doc, getDoc } from "firebase/firestore"; 
import { db } from '../firebase';

// PROXY GATEWAY
// We use this to bypass CORS. 
// Note: To completely hide the destination URL from the Network tab, a backend server (Cloud Function) is required.
// However, by loading from DB, we ensure the API URL is NOT present in the client-side JavaScript bundle.
const PROXY_GATEWAY = "https://corsproxy.io/?";

export const sendSmsOtp = async (phoneNumber: string, otp: string): Promise<boolean> => {
  // Strict check: Database must be connected
  if (!db) {
      console.error("Database connection required for secure SMS dispatch.");
      return false;
  }

  try {
    // 1. Fetch Secure Config from Database (system_config/sms)
    // This ensures the API URL and Key are never hardcoded in the source files.
    const configSnap = await getDoc(doc(db, "system_config", "sms"));
    
    if (!configSnap.exists()) {
        console.error("Secure SMS Configuration missing in database.");
        return false;
    }

    const data = configSnap.data();
    const apiKey = data.apiKey;
    const apiUrl = data.apiUrl;

    if (!apiKey || !apiUrl) {
        console.error("Incomplete SMS configuration in database.");
        return false;
    }

    const payload = {
      apiKey: apiKey,
      recipient: phoneNumber,
      message: `Your OFT Tools Verification Code is: ${otp}`
    };

    // 2. Construct Proxied Request
    const targetUrl = encodeURIComponent(apiUrl);
    const finalUrl = `${PROXY_GATEWAY}${targetUrl}`;

    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error("Secure SMS Dispatch Error:", error);
    return false;
  }
};

export const sendEmailOtp = async (email: string, otp: string): Promise<boolean> => {
  if (!db) return false;

  try {
    const configSnap = await getDoc(doc(db, "system_config", "email"));
    if (!configSnap.exists()) {
        console.error("Secure Email Config missing.");
        return false;
    }

    const config = configSnap.data();
    if (!config.apiUrl || !config.smtpHost || !config.smtpUser || !config.smtpPass) {
        console.error("Incomplete Email configuration.");
        return false;
    }

    const payload = {
       host: config.smtpHost,
       port: config.smtpPort || 587,
       secure: config.secure || false,
       user: config.smtpUser,
       pass: config.smtpPass,
       from: config.fromEmail || config.smtpUser,
       to: email,
       subject: "Your OFT Tools Verification Code",
       text: `Your password reset code is: ${otp}`,
       html: `<div style="font-family: sans-serif; padding: 20px;">
                <h2>Verification Code</h2>
                <p>Use the code below to reset your password:</p>
                <h1 style="color: #ef4444; letter-spacing: 5px;">${otp}</h1>
                <p>If you didn't request this, please ignore this email.</p>
              </div>`
    };

    // Proxy the Email API request
    const targetUrl = encodeURIComponent(config.apiUrl);
    const finalUrl = `${PROXY_GATEWAY}${targetUrl}`;

    const response = await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    return response.ok;

  } catch (error) {
    console.error("Email Dispatch Error:", error);
    return false;
  }
};

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};