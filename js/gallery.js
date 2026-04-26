import { db }                                from "./firebase-config.js";
import {
  collection, onSnapshot, doc,
  updateDoc, increment, orderBy, query
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ===== DOM 節點 =====
const grid          = document.getElementById("galleryGrid");
const galleryEmpty  = document.getElementById("galleryEmpty");
const lightbox      = document.getElementById("lightbox");
const overlay       = document.getElementById("lightboxOverlay");
const closeBtn      = document.getElementById("lightboxClose");
const lightboxImg   = document.getElementById("lightboxImg");
const lightboxVideo = document.getElementById("lightboxVideo");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxQuote = document.getElementById("lightboxQuote");
const lightboxConcept = document.getElementById("lightboxConcept");
const likeBtn       = document.getElementById("likeBtn");
const likeCount     = document.getElementById("likeCount");
const viewCount     = document.getElementById("viewCount");

let currentDocId  = null;
let likedSet      = JSON.parse(localStorage.getItem("ashley_liked") || "[]");

// ===== 即時載入作品 =====
const q = query(collection(db, "artworks"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
  // 移除舊卡片（保留 galleryEmpty）
  Array.from(grid.children).forEach(el => {
    if (!el.classList.contains("gallery-empty")) el.remove();
  });

  if (snapshot.empty) {
    galleryEmpty.classList.remove("hidden");
    return;
  }
  galleryEmpty.classList.add("hidden");

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const card = buildCard(docSnap.id, data);
    grid.appendChild(card);
  });
});

// ===== 建立卡片 =====
function buildCard(id, data) {
  const card = document.createElement("article");
  card.className = `gallery-card ${data.orientation || "landscape"}`;
  if (data.type === "video") card.classList.add("video-card");
  card.dataset.id = id;

  if (data.type === "video") {
    const vid = document.createElement("video");
    vid.src = data.mediaUrl;
    vid.muted = true;
    vid.loop  = true;
    vid.playsInline = true;
    card.appendChild(vid);
    card.insertAdjacentHTML("afterbegin", `<span class="video-badge">▶ 影片</span>`);

    // 懸停播放
    card.addEventListener("mouseenter", () => vid.play().catch(() => {}));
    card.addEventListener("mouseleave", () => { vid.pause(); vid.currentTime = 0; });
  } else {
    const img = document.createElement("img");
    img.src     = data.mediaUrl;
    img.alt     = data.title || "Ashley 作品";
    img.loading = "lazy";
    card.appendChild(img);
  }

  // hover overlay
  card.insertAdjacentHTML("beforeend", `
    <div class="card-overlay">
      <p class="card-title">${escHtml(data.title || "")}</p>
      <div class="card-meta-row">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="13" height="13">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <span>${data.likes || 0}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="13" height="13">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        <span>${data.views || 0}</span>
      </div>
    </div>
  `);

  card.addEventListener("click", () => openLightbox(id, data));
  return card;
}

// ===== 燈箱 =====
function openLightbox(id, data) {
  currentDocId = id;

  lightboxTitle.textContent   = data.title   || "";
  lightboxQuote.textContent   = data.quote   || "";
  lightboxConcept.textContent = data.concept || "";
  likeCount.textContent       = data.likes   || 0;
  viewCount.textContent       = (data.views  || 0) + 1;

  // 媒體
  if (data.type === "video") {
    lightboxImg.classList.add("hidden");
    lightboxVideo.classList.remove("hidden");
    lightboxVideo.src = data.mediaUrl;
    lightboxVideo.play().catch(() => {});
  } else {
    lightboxVideo.classList.add("hidden");
    lightboxVideo.pause();
    lightboxVideo.src = "";
    lightboxImg.classList.remove("hidden");
    lightboxImg.src = data.mediaUrl;
    lightboxImg.alt = data.title || "Ashley 作品";
  }

  // 按讚狀態
  const liked = likedSet.includes(id);
  likeBtn.classList.toggle("liked", liked);

  lightbox.classList.add("active");
  document.body.style.overflow = "hidden";

  // 增加瀏覽數
  updateDoc(doc(db, "artworks", id), { views: increment(1) }).catch(() => {});
}

function closeLightbox() {
  lightbox.classList.remove("active");
  document.body.style.overflow = "";
  lightboxVideo.pause();
  lightboxVideo.src = "";
  currentDocId = null;
}

// ===== 按讚 =====
likeBtn.addEventListener("click", () => {
  if (!currentDocId) return;
  const already = likedSet.includes(currentDocId);

  if (already) {
    likedSet = likedSet.filter(i => i !== currentDocId);
    likeBtn.classList.remove("liked");
    updateDoc(doc(db, "artworks", currentDocId), { likes: increment(-1) }).catch(() => {});
    likeCount.textContent = Math.max(0, parseInt(likeCount.textContent) - 1);
  } else {
    likedSet.push(currentDocId);
    likeBtn.classList.add("liked");
    updateDoc(doc(db, "artworks", currentDocId), { likes: increment(1) }).catch(() => {});
    likeCount.textContent = parseInt(likeCount.textContent) + 1;
  }

  localStorage.setItem("ashley_liked", JSON.stringify(likedSet));
});

// ===== 關閉事件 =====
closeBtn.addEventListener("click", closeLightbox);
overlay.addEventListener("click", closeLightbox);
document.addEventListener("keydown", e => { if (e.key === "Escape") closeLightbox(); });

// ===== 工具 =====
function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
