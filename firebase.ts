// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-1sjSLO6cszCFdjjQ4_zEYSVvzTbK0U8",
  authDomain: "artish-otp.firebaseapp.com",
  projectId: "artish-otp",
  storageBucket: "artish-otp.firebasestorage.app",
  messagingSenderId: "1011533121735",
  appId: "1:1011533121735:web:3bcae0c22307f58f5596e2",
  measurementId: "G-JK3XGT4TS4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize analytics only in browser environment
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { auth, RecaptchaVerifier, signInWithPhoneNumber, analytics };
export default app;