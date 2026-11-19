// capacitor.config.ts - APK banane ke liye - FRONTEND folder me rakho
// Ye file batati hai ki APK me kaunsi website khulegi
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bilal.pdfstudio',
  appName: 'PDF Studio',
  webDir: '.',
  // Local test ke liye neeche wali line comment me rakho
  // Deploy ke baad apna Vercel link yahan daal do:
  server: {
    url: 'https://pdf-studio.vercel.app',
    cleartext: true
  }
};

export default config;
