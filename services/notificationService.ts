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

    // Check content type to safely parse JSON
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

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};