import { doc, getDoc } from "firebase/firestore"; 
import { db } from '../firebase';

export const sendSmsOtp = async (phoneNumber: string, otp: string): Promise<boolean> => {
  if (!db) {
      console.error("DB Connection Error");
      return false;
  }

  try {
    // 1. Fetch Configuration from Database
    // We fetch both SMS config and Global Settings (for Proxy)
    const smsConfigSnap = await getDoc(doc(db, "system_config", "sms"));
    const settingsSnap = await getDoc(doc(db, "system_config", "settings"));
    
    if (!smsConfigSnap.exists()) {
        console.error("SMS Config Missing");
        return false;
    }

    const smsData = smsConfigSnap.data();
    const settingsData = settingsSnap.exists() ? settingsSnap.data() : {};
    
    // Dynamic Proxy: Load from DB or fall back to default
    const proxyUrl = settingsData.proxyUrl || "https://corsproxy.io/?";
    
    const apiKey = smsData?.apiKey;
    const apiUrl = smsData?.apiUrl;

    if (!apiKey || !apiUrl) {
        console.error("Invalid SMS Config Structure");
        return false;
    }

    const payload = {
      apiKey: apiKey,
      recipient: phoneNumber,
      message: `Your secure login code is: ${otp}`
    };

    // 2. Construct Request
    // The target API URL is encoded and appended to the Proxy URL loaded from DB.
    const targetUrl = encodeURIComponent(apiUrl);
    const finalUrl = `${proxyUrl}${targetUrl}`;

    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error("SMS Dispatch Failed");
    return false;
  }
};

export const sendEmailOtp = async (email: string, otp: string): Promise<boolean> => {
  if (!db) return false;

  try {
    const configSnap = await getDoc(doc(db, "system_config", "email"));
    const settingsSnap = await getDoc(doc(db, "system_config", "settings"));

    if (!configSnap.exists()) return false;

    const config = configSnap.data();
    const settingsData = settingsSnap.exists() ? settingsSnap.data() : {};
    const proxyUrl = settingsData.proxyUrl || "https://corsproxy.io/?";

    if (!config?.apiUrl || !config?.smtpHost) return false;

    const payload = {
       host: config.smtpHost,
       port: config.smtpPort || 587,
       secure: config.secure || false,
       user: config.smtpUser,
       pass: config.smtpPass,
       from: config.fromEmail || config.smtpUser,
       to: email,
       subject: "Verification Code",
       text: `Your password reset code is: ${otp}`,
       html: `<div style="font-family: sans-serif; padding: 20px;">
                <h2>Verification Code</h2>
                <p>Use the code below to reset your password:</p>
                <h1 style="color: #ef4444; letter-spacing: 5px;">${otp}</h1>
                <p>If you didn't request this, please ignore this email.</p>
              </div>`
    };

    const targetUrl = encodeURIComponent(config.apiUrl);
    const finalUrl = `${proxyUrl}${targetUrl}`;

    const response = await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    return response.ok;

  } catch (error) {
    console.error("Email Dispatch Failed");
    return false;
  }
};

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};