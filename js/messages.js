// pages/js/messages.js

const supabase = window.supabaseClient;
if (!supabase) {
  console.error("Supabase client not initialized");
}

function checkLogin() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  const profileEl = document.getElementById("user-profile");
  if (profileEl) profileEl.textContent = user.fullName || user.username || "";
  return user;
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s} detik lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
}

async function loadMessages() {
  const list = document.getElementById("messages-list");
  if (!list) return;
  list.innerHTML = "<div class='text-muted'>Memuat...</div>";

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("messages")
    .select("id,user_id,content,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error load messages:", error);
    list.innerHTML = `<div class='text-danger'>Gagal memuat pesan</div>`;
    return;
  }

  // Ambil nama user untuk semua user_id unik
  const userIds = Array.from(new Set((data || []).map((r) => r.user_id))).filter(Boolean);
  let idToName = new Map();
  if (userIds.length > 0) {
    const { data: users, error: usersErr } = await supabase
      .from("local_users")
      .select("id,fullname")
      .in("id", userIds);
    if (!usersErr && users) {
      users.forEach((u) => idToName.set(u.id, u.fullname || "Unknown"));
    }
  }

  list.innerHTML = "";
  if (!data || data.length === 0) {
    list.innerHTML = `<div class='text-muted'>Belum ada pesan dalam 24 jam terakhir.</div>`;
    return;
  }

  data.forEach((row) => {
    const name = idToName.get(row.user_id) || "Unknown";
    const item = document.createElement("div");
    item.className = "p-3 border rounded";
    item.innerHTML = `
      <div class=\"d-flex justify-content-between\">
        <strong>${name}</strong>
        <small class=\"text-muted\">${timeAgo(row.created_at)}</small>
      </div>
      <div class=\"mt-1\">${(row.content || "").replace(/</g, "&lt;")}</div>
    `;
    list.appendChild(item);
  });
}

async function sendMessage() {
  const user = checkLogin();
  if (!user) return;

  const input = document.getElementById("message-input");
  const statusEl = document.getElementById("msg-status");
  if (!input || !statusEl) return;

  const content = (input.value || "").trim();
  if (!content) {
    statusEl.textContent = "Pesan tidak boleh kosong";
    return;
  }
  if (content.length > 280) {
    statusEl.textContent = "Maksimal 280 karakter";
    return;
  }

  statusEl.textContent = "Mengirim...";
  const { error } = await supabase
    .from("messages")
    .insert({ user_id: user.id, content });

  if (error) {
    console.error("Kirim pesan gagal:", error);
    statusEl.textContent = "Gagal mengirim pesan";
    return;
  }
  statusEl.textContent = "Terkirim!";
  input.value = "";
  loadMessages();
}

document.addEventListener("DOMContentLoaded", () => {
  const user = checkLogin();
  if (!user) return;
  loadMessages();
  const sendBtn = document.getElementById("send-message-btn");
  if (sendBtn) sendBtn.addEventListener("click", sendMessage);
});
