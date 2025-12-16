import { doc, getDoc } from "firebase/firestore"; 
import { db } from '../firebase';

// Defaults provided by user
const DEFAULT_SMS_API_URL = "https://sms.anbuinfosec.dev/api/v1/sms/send";
const DEFAULT_SMS_API_KEY = "anbu_sms_mgq589nm_9mgblyt069h";

const ENV_SMS_API_KEY = process.env.SMS_API_KEY;
const ENV_SMS_API_URL = process.env.SMS_API_URL;

export const sendSmsOtp = async (phoneNumber: string, otp: string): Promise<boolean> => {
  let apiKey = ENV_SMS_API_KEY || DEFAULT_SMS_API_KEY;
  let apiUrl = ENV_SMS_API_URL || DEFAULT_SMS_API_URL;

  // 1. Try fetching from Firestore config if DB is connected
  if (db) {
    try {
        const configSnap = await getDoc(doc(db, "system_config", "sms"));
        if (configSnap.exists()) {
            const data = configSnap.data();
            if (data.apiKey) apiKey = data.apiKey;
            if (data.apiUrl) apiUrl = data.apiUrl;
        }
    } catch (e) {
        console.warn("Failed to fetch dynamic SMS config, checking env/defaults...", e);
    }
  }

  // 2. Validation
  if (!apiKey || !apiUrl) {
      console.error("SMS Configuration missing.");
      return false;
  }

  try {
    const payload = {
      apiKey: apiKey,
      recipient: phoneNumber,
      message: `Your OFT Tools Verification Code is: ${otp}`
    };

    console.log("Sending SMS to:", phoneNumber, "via", apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const contentType = response.headers.get("content-type");
    let data;
    if (contentType && contentType.indexOf("application/json") !== -1) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    console.log("SMS API Response:", data);
    return response.ok;
  } catch (error) {
    console.error("Failed to send SMS:", error);
    return false;
  }
};

export const sendEmailOtp = async (email: string, otp: string): Promise<boolean> => {
  if (!db) {
    console.error("Database not connected, cannot fetch SMTP config.");
    return false;
  }

  try {
    // 1. Fetch SMTP Config from Database
    const configSnap = await getDoc(doc(db, "system_config", "email"));
    if (!configSnap.exists()) {
       console.error("SMTP Configuration missing in database (system_config/email).");
       return false;
    }

    const config = configSnap.data();
    // Validate required fields
    if (!config.apiUrl || !config.smtpHost || !config.smtpUser || !config.smtpPass) {
        console.error("Incomplete SMTP Configuration.");
        return false;
    }

    console.log(`Sending Email to ${email} using SMTP Host: ${config.smtpHost}`);

    // 2. Construct Payload for the Email API
    // Note: Sending SMTP credentials in the body requires a secure (HTTPS) API endpoint.
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

    // 3. Send Request
    const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("Email API Error:", errText);
        return false;
    }

    console.log("Email sent successfully.");
    return true;

  } catch (error) {
    console.error("Failed to send Email:", error);
    return false;
  }
};

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};