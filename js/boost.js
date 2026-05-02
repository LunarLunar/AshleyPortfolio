import { db, auth }                              from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut,
         onAuthStateChanged }                    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, onSnapshot, doc, updateDoc,
         increment, orderBy, query }             from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const loginScreen   = document.getElementById("loginScreen");
const adminScreen   = document.getElementById("adminScreen");
const loginForm     = document.getElementById("loginForm");
const loginEmail    = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError    = document.getElementById("loginError");
const logoutBtn     = document.getElementById("logoutBtn");
const boostList     = document.getElementById("boostList");

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

loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  loginError.classList.add("hidden");
  try {
    await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPassword.value);
  } catch {
    loginError.classList.remove("hidden");
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

function loadArtworks() {
  const q = query(collection(db, "artworks"), orderBy("createdAt", "desc"));
  onSnapshot(q, snap => {
    boostList.innerHTML = "";
    if (snap.empty) {
      boostList.innerHTML = `<p class="manage-empty">尚無作品</p>`;
      return;
    }
    snap.forEach(docSnap => {
      const d  = docSnap.data();
      const id = docSnap.id;
      const item = document.createElement("div");
      item.className = "boost-item";
      item.innerHTML = `
        <img class="boost-thumb" src="${escHtml(d.mediaUrl)}" alt="${escHtml(d.title || "")}">
        <div class="boost-info">
          <p class="boost-name">${escHtml(d.title || "（無標題）")}</p>
          <p class="boost-stats" id="stats-${id}">♡ ${d.likes || 0} &nbsp;·&nbsp; 👁 ${d.views || 0}</p>
        </div>
        <div class="boost-btns">
          <button class="btn-like" data-id="${id}">♡ +1</button>
          <button class="btn-view" data-id="${id}">👁 +1</button>
        </div>
      `;
      item.querySelector(".btn-like").addEventListener("click", async e => {
        const btn = e.currentTarget;
        btn.disabled = true;
        await updateDoc(doc(db, "artworks", id), { likes: increment(1), views: increment(1) });
        btn.disabled = false;
      });
      item.querySelector(".btn-view").addEventListener("click", async e => {
        const btn = e.currentTarget;
        btn.disabled = true;
        await updateDoc(doc(db, "artworks", id), { views: increment(1) });
        btn.disabled = false;
      });
      boostList.appendChild(item);
    });
  });
}

function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
