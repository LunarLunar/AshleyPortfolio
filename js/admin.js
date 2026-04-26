import { db, storage, auth }                          from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut,
         onAuthStateChanged }                           from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, addDoc, onSnapshot, deleteDoc,
         doc, updateDoc, increment, orderBy, query,
         serverTimestamp }                              from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL,
         deleteObject }                                 from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ===== DOM =====
const loginScreen   = document.getElementById("loginScreen");
const adminScreen   = document.getElementById("adminScreen");
const loginForm     = document.getElementById("loginForm");
const loginEmail    = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError    = document.getElementById("loginError");
const logoutBtn     = document.getElementById("logoutBtn");

const uploadForm    = document.getElementById("uploadForm");
const artTitle      = document.getElementById("artTitle");
const artQuote      = document.getElementById("artQuote");
const artConcept    = document.getElementById("artConcept");
const artFile       = document.getElementById("artFile");
const dropZone      = document.getElementById("dropZone");
const filePreviewWrap  = document.getElementById("filePreviewWrap");
const filePreviewImg   = document.getElementById("filePreviewImg");
const filePreviewVideo = document.getElementById("filePreviewVideo");
const filePreviewName  = document.getElementById("filePreviewName");
const clearFileBtn  = document.getElementById("clearFileBtn");
const uploadProgress = document.getElementById("uploadProgress");
const progressFill  = document.getElementById("progressFill");
const progressText  = document.getElementById("progressText");
const submitBtn     = document.getElementById("submitBtn");
const uploadMsg     = document.getElementById("uploadMsg");
const manageList    = document.getElementById("manageList");

let selectedFile = null;

// 圖片前端壓縮：超過 1920px 寬則縮小，輸出 JPEG quality 0.85
// 影片不壓縮（Canvas 無法處理影片）
function compressImage(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) { resolve(file); return; }

    const MAX_PX  = 1920;
    const QUALITY = 0.85;
    const img     = new Image();
    const url     = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width <= MAX_PX && height <= MAX_PX && file.size < 2 * 1024 * 1024) {
        resolve(file);
        return;
      }

      if (width > height && width > MAX_PX) {
        height = Math.round(height * MAX_PX / width);
        width  = MAX_PX;
      } else if (height >= width && height > MAX_PX) {
        width  = Math.round(width * MAX_PX / height);
        height = MAX_PX;
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      canvas.toBlob(blob => {
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
      }, "image/jpeg", QUALITY);
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ===== 認證狀態監聽 =====
onAuthStateChanged(auth, user => {
  if (user) {
    loginScreen.classList.add("hidden");
    adminScreen.classList.remove("hidden");
    loadArtworks();
  } else {
    loginScreen.classList.remove("hidden");
    adminScreen.classList.add("hidden");
  }
});

// ===== 登入 =====
loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  loginError.classList.add("hidden");
  try {
    await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPassword.value);
  } catch {
    loginError.classList.remove("hidden");
  }
});

// ===== 登出 =====
logoutBtn.addEventListener("click", () => signOut(auth));

// ===== 檔案選取 / 拖曳 =====
artFile.addEventListener("change", () => {
  if (artFile.files[0]) handleFile(artFile.files[0]);
});

dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("drag-over"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
  selectedFile = file;
  filePreviewName.textContent = file.name;

  if (file.type.startsWith("image/")) {
    filePreviewImg.src = URL.createObjectURL(file);
    filePreviewImg.classList.remove("hidden");
    filePreviewVideo.classList.add("hidden");
  } else if (file.type.startsWith("video/")) {
    filePreviewVideo.src = URL.createObjectURL(file);
    filePreviewVideo.classList.remove("hidden");
    filePreviewImg.classList.add("hidden");
  }
  filePreviewWrap.classList.remove("hidden");
}

clearFileBtn.addEventListener("click", () => {
  selectedFile = null;
  artFile.value = "";
  filePreviewWrap.classList.add("hidden");
  filePreviewImg.classList.add("hidden");
  filePreviewVideo.classList.add("hidden");
});

// ===== 上傳表單 =====
uploadForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (!selectedFile) { showMsg("請選擇一個檔案", "error"); return; }

  const title       = artTitle.value.trim();
  const quote       = artQuote.value.trim();
  const concept     = artConcept.value.trim();
  const artType     = document.querySelector('input[name="artType"]:checked').value;
  const orientation = document.querySelector('input[name="artOrientation"]:checked').value;

  if (!title || !quote) { showMsg("作品名稱與 Ashley 的話不可空白", "error"); return; }

  submitBtn.disabled = true;
  uploadProgress.classList.remove("hidden");
  uploadMsg.classList.add("hidden");
  progressText.textContent = "前端壓縮中…";

  try {
    const fileToUpload = await compressImage(selectedFile);
    const ext      = fileToUpload.name.split(".").pop();
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const storageRef = ref(storage, `artworks/${filename}`);
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

    uploadTask.on("state_changed",
      snap => {
        const pct = Math.round(snap.bytesTransferred / snap.totalBytes * 100);
        progressFill.style.width = pct + "%";
        progressText.textContent = `上傳中… ${pct}%`;
      },
      () => {
        showMsg("上傳失敗，請重試", "error");
        submitBtn.disabled = false;
        uploadProgress.classList.add("hidden");
      },
      async () => {
        const mediaUrl = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, "artworks"), {
          title, quote, concept, mediaUrl,
          type: artType,
          orientation: artType === "video" ? "landscape" : orientation,
          likes: 0,
          views: 0,
          createdAt: serverTimestamp()
        });
        showMsg("作品上傳成功！", "success");
        uploadForm.reset();
        clearFileBtn.click();
        uploadProgress.classList.add("hidden");
        progressFill.style.width = "0%";
        submitBtn.disabled = false;
      }
    );
  } catch (err) {
    showMsg("發生錯誤：" + err.message, "error");
    submitBtn.disabled = false;
    uploadProgress.classList.add("hidden");
  }
});

// ===== 作品管理列表 =====
function loadArtworks() {
  const q = query(collection(db, "artworks"), orderBy("createdAt", "desc"));
  onSnapshot(q, snap => {
    manageList.innerHTML = "";
    if (snap.empty) {
      manageList.innerHTML = `<p class="manage-empty">尚無作品</p>`;
      return;
    }
    snap.forEach(docSnap => {
      const d   = docSnap.data();
      const id  = docSnap.id;
      const item = document.createElement("div");
      item.className = "manage-item";

      item.innerHTML = `
        <img class="manage-thumb" src="${escHtml(d.mediaUrl)}" alt="${escHtml(d.title || "")}">
        <div class="manage-info">
          <p class="manage-name">${escHtml(d.title || "（無標題）")}</p>
          <p class="manage-stats">♡ ${d.likes || 0} &nbsp;·&nbsp; 👁 ${d.views || 0}</p>
        </div>
        <button class="btn-boost" data-id="${id}" title="增加 50 讚 + 100 瀏覽（鼓勵 Ashley）">＋鼓勵</button>
        <button class="btn-delete" data-id="${id}" data-url="${escHtml(d.mediaUrl)}">刪除</button>
      `;

      item.querySelector(".btn-boost").addEventListener("click", () => boostArtwork(id));
      item.querySelector(".btn-delete").addEventListener("click", () => deleteArtwork(id, d.mediaUrl));
      manageList.appendChild(item);
    });
  });
}

// ===== 鼓勵 Ashley：後台手動增加讚/瀏覽 =====
async function boostArtwork(id) {
  await updateDoc(doc(db, "artworks", id), {
    likes: increment(50),
    views: increment(100)
  });
}

// ===== 刪除作品 =====
async function deleteArtwork(id, mediaUrl) {
  if (!confirm("確定要刪除這個作品嗎？此動作無法復原。")) return;
  try {
    // 刪 Firestore 資料
    await deleteDoc(doc(db, "artworks", id));
    // 刪 Storage 檔案
    const fileRef = ref(storage, mediaUrl);
    await deleteObject(fileRef).catch(() => {});
  } catch (err) {
    alert("刪除失敗：" + err.message);
  }
}

// ===== 工具 =====
function showMsg(text, type) {
  uploadMsg.textContent = text;
  uploadMsg.className   = `upload-msg ${type}`;
  uploadMsg.classList.remove("hidden");
  setTimeout(() => uploadMsg.classList.add("hidden"), 4000);
}

function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
