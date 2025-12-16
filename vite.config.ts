import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cast process to any to avoid TypeScript errors during build
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
      
      // Firebase
      'process.env.FIREBASE_API_KEY': JSON.stringify(env.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY),
      'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(env.FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN),
      'process.env.FIREBASE_PROJECT_ID': JSON.stringify(env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID),
      'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(env.FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET),
      'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID),
      'process.env.FIREBASE_APP_ID': JSON.stringify(env.FIREBASE_APP_ID || process.env.FIREBASE_APP_ID),

      // SMS & Notification Services
      'process.env.SMS_API_KEY': JSON.stringify(env.SMS_API_KEY || process.env.SMS_API_KEY),
      'process.env.SMS_API_URL': JSON.stringify(env.SMS_API_URL || process.env.SMS_API_URL),
      'process.env.SMTP_USER': JSON.stringify(env.SMTP_USER || process.env.SMTP_USER),
      'process.env.SMTP_PASS': JSON.stringify(env.SMTP_PASS || process.env.SMTP_PASS),
      'process.env.SMTP_HOST': JSON.stringify(env.SMTP_HOST || process.env.SMTP_HOST),
      'process.env.SMTP_PORT': JSON.stringify(env.SMTP_PORT || process.env.SMTP_PORT)
    }
  };
});