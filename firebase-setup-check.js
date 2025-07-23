// Firebase Setup Verification Script
// Run this in browser console to check Firebase configuration

console.log('=== FIREBASE SETUP VERIFICATION ===');

// Check if Firebase is loaded
if (typeof firebase !== 'undefined') {
  console.log('✅ Firebase SDK loaded');
} else {
  console.log('❌ Firebase SDK not loaded');
}

// Check Firebase config
const config = {
  apiKey: "AIzaSyC-1sjSLO6cszCFdjjQ4_zEYSVvzTbK0U8",
  authDomain: "artish-otp.firebaseapp.com",
  projectId: "artish-otp",
  storageBucket: "artish-otp.firebasestorage.app",
  messagingSenderId: "1011533121735",
  appId: "1:1011533121735:web:3bcae0c22307f58f5596e2"
};

console.log('📋 Firebase Config:', config);

// Check current domain
console.log('🌐 Current domain:', window.location.origin);
console.log('🌐 Current hostname:', window.location.hostname);

// Instructions for Firebase Console setup
console.log(`
🔧 FIREBASE CONSOLE SETUP REQUIRED:

1. Go to: https://console.firebase.google.com/project/artish-otp

2. Enable Phone Authentication:
   - Go to Authentication > Sign-in method
   - Enable "Phone" provider
   - Click "Save"

3. Add Authorized Domains:
   - In Authentication > Settings > Authorized domains
   - Add: localhost
   - Add: ${window.location.hostname}
   - Add: ${window.location.origin}

4. Configure reCAPTCHA:
   - In Authentication > Settings
   - Scroll to "reCAPTCHA Enforcement"
   - Set to "Enforce" for production

5. Set up Billing (Required for SMS):
   - Go to Project Settings > Usage and billing
   - Set up billing account
   - SMS messages cost ~$0.05 each

6. Test Phone Numbers (Optional):
   - In Authentication > Settings
   - Add test phone numbers for development
   - Example: +1 650-555-3434 with code 654321

📱 TESTING CHECKLIST:
- ✅ Phone auth enabled
- ✅ Domain authorized  
- ✅ Billing configured
- ✅ reCAPTCHA configured
- ✅ Test numbers added (optional)
`);

// Check if we're in a secure context
if (location.protocol === 'https:' || location.hostname === 'localhost') {
  console.log('✅ Secure context (HTTPS or localhost)');
} else {
  console.log('❌ Insecure context - Firebase Auth requires HTTPS or localhost');
}
