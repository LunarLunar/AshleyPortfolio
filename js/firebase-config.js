// =====================================================================
// firebase-config.js
// !! 這個檔案需要填入你自己的 Firebase 專案設定 !!
// 設定方式請看 README.md 第二步
// =====================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage }     from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ↓↓↓ 把下面這段換成你在 Firebase Console 拿到的設定 ↓↓↓
const firebaseConfig = {
  apiKey:            "AIzaSyBc42qW08Dlg6gK6aOW-IttW_M5uOT44Zk",
  authDomain:        "ashleyportfolio-4b978.firebaseapp.com",
  projectId:         "ashleyportfolio-4b978",
  storageBucket:     "ashleyportfolio-4b978.firebasestorage.app",
  messagingSenderId: "11964813265",
  appId:             "1:11964813265:web:40f6d29fb97baed2d7daf0",
  measurementId:     "G-E08GVTJJ48"
};
// ↑↑↑ 換到這裡結束 ↑↑↑

const app     = initializeApp(firebaseConfig);
const db      = getFirestore(app);
const storage = getStorage(app);
const auth    = getAuth(app);

export { db, storage, auth };
