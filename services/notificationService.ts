import { doc, getDoc } from "firebase/firestore"; 
import { db } from '../firebase';

export const sendSmsOtp = async (phoneNumber: string, otp: string): Promise<boolean> => {
  if (!db) {
      console.error("DB Connection Error");
      return false;
  }

  try {
    // 1. Fetch Configuration from Database
    const smsConfigSnap = await getDoc(doc(db, "system_config", "sms"));
    const settingsSnap = await getDoc(doc(db, "system_config", "settings"));
    
    if (!smsConfigSnap.exists()) {
        console.error("SMS Config Missing");
        return false;
    }

    const smsData = smsConfigSnap.data();
    const settingsData = settingsSnap.exists() ? settingsSnap.data() : {};
    
    // Dynamic Proxy: Load from DB. If empty, we use DIRECT connection.
    const proxyUrl = settingsData.proxyUrl || "";
    
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
    // If proxyUrl is present, we encode the target. If not, we go direct.
    let finalUrl = apiUrl;
    if (proxyUrl) {
        finalUrl = `${proxyUrl}${encodeURIComponent(apiUrl)}`;
    }

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
    const proxyUrl = settingsData.proxyUrl || "";

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

    let finalUrl = config.apiUrl;
    if (proxyUrl) {
        finalUrl = `${proxyUrl}${encodeURIComponent(config.apiUrl)}`;
    }

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