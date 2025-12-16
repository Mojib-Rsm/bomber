import { doc, getDoc } from "firebase/firestore"; 
import { db } from '../firebase';

const ENV_SMS_API_KEY = process.env.SMS_API_KEY || "";
const ENV_SMS_API_URL = process.env.SMS_API_URL || "";

export const sendSmsOtp = async (phoneNumber: string, otp: string): Promise<boolean> => {
  let apiKey = ENV_SMS_API_KEY;
  let apiUrl = ENV_SMS_API_URL;

  // 1. Try fetching from Firestore config if DB is connected
  // This allows changing keys without redeploying the app
  if (db) {
    try {
        const configSnap = await getDoc(doc(db, "system_config", "sms"));
        if (configSnap.exists()) {
            const data = configSnap.data();
            if (data.apiKey) apiKey = data.apiKey;
            if (data.apiUrl) apiUrl = data.apiUrl;
        }
    } catch (e) {
        console.warn("Failed to fetch dynamic SMS config, checking env vars...", e);
    }
  }

  // 2. Validation
  if (!apiKey || !apiUrl) {
      console.error("SMS Configuration missing. Please configure in Admin Panel or .env file.");
      return false;
  }

  try {
    const payload = {
      apiKey: apiKey,
      recipient: phoneNumber,
      message: `Your OFT Tools Verification Code is: ${otp}`
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("SMS API Response:", data);
    
    // Assuming API returns success or the status code is 200/201
    return response.ok;
  } catch (error) {
    console.error("Failed to send SMS:", error);
    return false;
  }
};

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};