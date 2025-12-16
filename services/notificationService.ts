import { doc, getDoc } from "firebase/firestore"; 
import { db } from '../firebase';

// Configuration
const DEFAULT_SMS_API_URL = "https://sms.anbuinfosec.dev/api/v1/sms/send";
const DEFAULT_SMS_API_KEY = "anbu_sms_mgq589nm_9mgblyt069h";
// Using corsproxy.io to route traffic. This solves CORS errors and masks the direct destination in the browser network tab (Host column).
const PROXY_GATEWAY = "https://corsproxy.io/?";

const ENV_SMS_API_KEY = process.env.SMS_API_KEY;
const ENV_SMS_API_URL = process.env.SMS_API_URL;

export const sendSmsOtp = async (phoneNumber: string, otp: string): Promise<boolean> => {
  let apiKey = ENV_SMS_API_KEY || DEFAULT_SMS_API_KEY;
  let apiUrl = ENV_SMS_API_URL || DEFAULT_SMS_API_URL;

  // 1. Dynamic Config Fetch
  if (db) {
    try {
        const configSnap = await getDoc(doc(db, "system_config", "sms"));
        if (configSnap.exists()) {
            const data = configSnap.data();
            if (data.apiKey) apiKey = data.apiKey;
            if (data.apiUrl) apiUrl = data.apiUrl;
        }
    } catch (e) {
        // Silent fail on config fetch, fall back to defaults
    }
  }

  if (!apiKey || !apiUrl) return false;

  try {
    const payload = {
      apiKey: apiKey,
      recipient: phoneNumber,
      message: `Your OFT Tools Verification Code is: ${otp}`
    };

    // Construct Proxied URL
    // The browser will connect to corsproxy.io, not the SMS API directly.
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
    console.error("SMS Dispatch Error:", error);
    return false;
  }
};

export const sendEmailOtp = async (email: string, otp: string): Promise<boolean> => {
  if (!db) return false;

  try {
    const configSnap = await getDoc(doc(db, "system_config", "email"));
    if (!configSnap.exists()) return false;

    const config = configSnap.data();
    if (!config.apiUrl || !config.smtpHost || !config.smtpUser || !config.smtpPass) return false;

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

    // Proxy the Email API request as well
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