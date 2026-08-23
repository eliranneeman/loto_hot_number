/** Shared Firebase config for LottoGun */
export const firebaseConfig = {
  apiKey: "AIzaSyDewHgup8jkCbRJOKfcE8qJn96lO5ZPo_I",
  authDomain: "loto-hot.firebaseapp.com",
  databaseURL: "https://loto-hot-default-rtdb.firebaseio.com",
  projectId: "loto-hot",
  storageBucket: "loto-hot.firebasestorage.app",
  messagingSenderId: "1078323335501",
  appId: "1:1078323335501:web:77f214ff257f14d17d2704",
  measurementId: "G-FR83RCV8Z8",
};

export const FIREBASE_ADS_URL = firebaseConfig.databaseURL + "/ads.json";
