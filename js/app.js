// Ganti isi file: js/app.js

// Use shared supabase client
const supabase = window.supabaseClient;
if (!supabase) {
  console.error(
    "Supabase client not initialized. Ensure js/supabaseClient.js is loaded."
  );
  window.location.href = "pages/login.html";
}

// ----- Mode helpers -----
const MODE_KEY = "sholat_mode";
function getMode() {
  return localStorage.getItem(MODE_KEY) || "normal";
}
function setMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
  const badge = document.getElementById("mode-badge");
  if (badge) {
    badge.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
  }
  // refresh UI
  loadUserData();
}
function initModeUI() {
  const select = document.getElementById("mode-select");
  if (select) {
    select.value = getMode();
    select.addEventListener("change", (e) => setMode(e.target.value));
  }
  const badge = document.getElementById("mode-badge");
  if (badge) badge.textContent = getMode().charAt(0).toUpperCase() + getMode().slice(1);
}

// Simple check: require localStorage user to access main page
function checkLogin() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.href = "pages/login.html";
    return null;
  }
  const profileEl = document.getElementById("user-profile");
  if (profileEl) profileEl.textContent = user.fullName || user.username || "";
  return user;
}

// Helper untuk mendapatkan icon berdasarkan status
function getStatusIcon(status) {
  if (!status || status === 'false') return '';
  if (status === 'true') return '✓';
  if (status === 'imun') return '○';
  if (status === 'mens') return '🛡️';
  return '';
}

// Update prayer buttons styling/text by userAttendance + mode
function updatePrayerButtons(userAttendance) {
  const btns = document.querySelectorAll("#prayer-buttons button");
  const mode = getMode();

  btns.forEach((btn) => {
    const prayer = btn.getAttribute("data-prayer").toLowerCase();
    const status = userAttendance ? userAttendance[prayer] : null;

    // reset base state
    btn.classList.remove("btn-success", "done", "imun", "mens");
    btn.classList.add("btn-outline-success");
    btn.disabled = false;

    if (status === 'true' || status === true) {
      btn.classList.add("done");
      btn.classList.remove("btn-outline-success");
      btn.textContent = `${prayer.charAt(0).toUpperCase() + prayer.slice(1)} ✓`;
    } else if (status === 'imun') {
      btn.classList.add("done", "imun");
      btn.classList.remove("btn-outline-success");
      btn.textContent = `${prayer.charAt(0).toUpperCase() + prayer.slice(1)} ○`;
    } else if (status === 'mens') {
      btn.classList.add("done", "mens");
      btn.classList.remove("btn-outline-success");
      btn.textContent = `${prayer.charAt(0).toUpperCase() + prayer.slice(1)} 🛡️`;
    } else {
      btn.textContent = prayer.charAt(0).toUpperCase() + prayer.slice(1);
    }
  });
}

// Auto-fill for mens mode (all mens for today once/day)
const MENS_LAST_AUTO_KEY = "mens_last_auto_date";
async function ensureMensAutoFill(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const last = localStorage.getItem(MENS_LAST_AUTO_KEY);
  if (last === today) return; // already auto filled today

  // Check if row exists
  const { data: existing } = await supabase
    .from("sholat_attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  const payload = {
    user_id: userId,
    date: today,
    subuh: 'mens',
    dzuhur: 'mens',
    ashar: 'mens',
    maghrib: 'mens',
    isya: 'mens',
  };

  if (existing) {
    // Update existing
    await supabase
      .from("sholat_attendance")
      .update(payload)
      .eq("user_id", userId)
      .eq("date", today);
  } else {
    // Insert new
    await supabase
      .from("sholat_attendance")
      .insert(payload);
  }

  localStorage.setItem(MENS_LAST_AUTO_KEY, today);
}

// Pastikan user.id sinkron dengan tabel local_users (hindari FK error)
async function ensureValidUserId() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return null;

  // Cek apakah id ada di local_users
  const { data: byId } = await supabase
    .from("local_users")
    .select("id,username,fullname")
    .eq("id", user.id)
    .maybeSingle();

  if (byId) return user; // valid

  // Coba sinkronisasi berdasarkan username
  if (user.username) {
    const { data: byUsername } = await supabase
      .from("local_users")
      .select("id,username,fullname")
      .eq("username", user.username)
      .maybeSingle();
    if (byUsername) {
      const repaired = {
        id: byUsername.id,
        username: byUsername.username,
        fullName: byUsername.fullname || byUsername.username,
      };
      localStorage.setItem("user", JSON.stringify(repaired));
      return repaired;
    }
  }

  // Jika tidak ditemukan sama sekali, paksa login ulang
  localStorage.removeItem("user");
  window.location.href = "pages/login.html";
  return null;
}

// Load attendance and bind buttons (user.id is local_users.id)
async function loadUserData() {
  let user = checkLogin();
  if (!user) return;
  user = await ensureValidUserId();
  if (!user) return;

  // handle mens auto-fill
  if (getMode() === "mens") {
    await ensureMensAutoFill(user.id);
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("sholat_attendance")
    .select("*, local_users (fullname)")
    .eq("date", today);

  if (error) {
    console.error("Error loading attendance data:", error);
  } else {
    // --- Bagian Rekap Tabel ---
    const tbody = document.getElementById("rekap-table");
    if (tbody) {
      tbody.innerHTML = "";
      data.forEach((row) => {
        const tr = document.createElement("tr");
        const name = row.local_users?.fullname ?? "Unknown";
        tr.innerHTML = `
          <td>${name}</td>
          <td>${getStatusIcon(row.subuh)}</td>
          <td>${getStatusIcon(row.dzuhur)}</td>
          <td>${getStatusIcon(row.ashar)}</td>
          <td>${getStatusIcon(row.maghrib)}</td>
          <td>${getStatusIcon(row.isya)}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    // data absensi user yang login
    const currentUserAttendance = data.find((row) => row.user_id === user.id);
    updatePrayerButtons(currentUserAttendance);
  }

  // --- Event Listener Tombol (toggle on click) ---
  const btns = document.querySelectorAll("#prayer-buttons button");
  btns.forEach((btn) => {
    btn.replaceWith(btn.cloneNode(true));
  });

  document.querySelectorAll("#prayer-buttons button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      let user = checkLogin();
      if (!user) return;
      user = await ensureValidUserId();
      if (!user) return;

      const prayer = btn.getAttribute("data-prayer").toLowerCase();
      const mapping = { subuh: "subuh", dzuhur: "dzuhur", ashar: "ashar", maghrib: "maghrib", isya: "isya" };
      const col = mapping[prayer];
      if (!col) return;

      // fetch current state of today for this user to toggle
      const todayDate = new Date().toISOString().slice(0, 10);
      const { data: rowData } = await supabase
        .from("sholat_attendance")
        .select("*")
        .eq("date", todayDate)
        .eq("user_id", user.id)
        .maybeSingle();

      const currentStatus = rowData ? rowData[col] : null;
      const mode = getMode();
      
      // Toggle logic: null -> mode value -> null
      let newVal;
      if (!currentStatus || currentStatus === 'false' || currentStatus === false) {
        // Jika kosong, set sesuai mode
        if (mode === 'normal') newVal = 'true';
        else if (mode === 'imun') newVal = 'imun';
        else if (mode === 'mens') newVal = 'mens';
        else newVal = 'true';
      } else {
        // Jika sudah ada, set ke null (cancel)
        newVal = null;
      }

      // UI feedback
      btn.disabled = true;
      btn.textContent = "Loading...";

      let error = null;

      if (rowData) {
        // Update existing row
        const updatePayload = {};
        
        if (newVal === null) {
          // Cek apakah setelah perubahan semua kolom akan null
          const others = {
            subuh: rowData.subuh,
            dzuhur: rowData.dzuhur,
            ashar: rowData.ashar,
            maghrib: rowData.maghrib,
            isya: rowData.isya,
          };
          others[col] = null;
          const wouldBeAllNull = !others.subuh && !others.dzuhur && !others.ashar && !others.maghrib && !others.isya;

          if (wouldBeAllNull) {
            const { error: deleteError } = await supabase
              .from("sholat_attendance")
              .delete()
              .eq("user_id", user.id)
              .eq("date", todayDate);
            error = deleteError;
          } else {
            // Update kolom yang diklik menjadi null
            updatePayload[col] = null;
            const { error: updateError } = await supabase
              .from("sholat_attendance")
              .update(updatePayload)
              .eq("user_id", user.id)
              .eq("date", todayDate);
            error = updateError;
          }
        } else {
          // Update dengan nilai baru
          updatePayload[col] = newVal;
          const { error: updateError } = await supabase
            .from("sholat_attendance")
            .update(updatePayload)
            .eq("user_id", user.id)
            .eq("date", todayDate);
          error = updateError;
        }
      } else {
        // Insert new row (hanya jika newVal bukan null)
        if (newVal !== null) {
          // Set semua kolom ke null untuk menghindari default 'false' dari DB
          const insertPayload = {
            user_id: user.id,
            date: todayDate,
            subuh: null,
            dzuhur: null,
            ashar: null,
            maghrib: null,
            isya: null,
          };
          insertPayload[col] = newVal;
          
          const { error: insertError } = await supabase
            .from("sholat_attendance")
            .insert(insertPayload);
          
          error = insertError;
        }
      }

      if (error) {
        console.error("Gagal absen:", error);
        const msgEl = document.getElementById("message");
        if (msgEl) {
          const errorMsg = error.message || JSON.stringify(error);
          msgEl.textContent = "Gagal absen: " + errorMsg;
        }
        btn.disabled = false;
        btn.textContent = prayer.charAt(0).toUpperCase() + prayer.slice(1);
        return;
      }
      loadUserData();
    });
  });
}

// Handler: Centang Semua (Sesuai Mode)
const checkAllBtn = document.getElementById("check-all-btn");
if (checkAllBtn) {
  checkAllBtn.addEventListener("click", async () => {
    let user = checkLogin();
    if (!user) return;
    user = await ensureValidUserId();
    if (!user) return;

    const todayDate = new Date().toISOString().slice(0, 10);
    const mode = getMode();

    const val = mode === 'imun' ? 'imun' : mode === 'mens' ? 'mens' : 'true';

    const { data: rowData } = await supabase
      .from("sholat_attendance")
      .select("*")
      .eq("date", todayDate)
      .eq("user_id", user.id)
      .maybeSingle();

    const payload = {
      user_id: user.id,
      date: todayDate,
      subuh: val,
      dzuhur: val,
      ashar: val,
      maghrib: val,
      isya: val,
    };

    checkAllBtn.disabled = true;
    checkAllBtn.textContent = "Memproses...";

    let error = null;
    if (rowData) {
      const { error: updateError } = await supabase
        .from("sholat_attendance")
        .update(payload)
        .eq("user_id", user.id)
        .eq("date", todayDate);
      error = updateError;
    } else {
      // pastikan kolom lain null jika bukan val
      const { error: insertError } = await supabase
        .from("sholat_attendance")
        .insert(payload);
      error = insertError;
    }

    if (error) {
      console.error("Gagal set semua:", error);
      const msgEl = document.getElementById("message");
      if (msgEl) msgEl.textContent = "Gagal set semua: " + (error.message || JSON.stringify(error));
      checkAllBtn.disabled = false;
      checkAllBtn.textContent = "Centang Semua (Sesuai Mode)";
      return;
    }

    checkAllBtn.disabled = false;
    checkAllBtn.textContent = "Centang Semua (Sesuai Mode)";
    loadUserData();
  });
}

// Logout
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    localStorage.removeItem("user");
    window.location.href = "pages/login.html";
  });
}

// Format Date
function formatDate(dateStr) {
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  return new Date(dateStr).toLocaleDateString("id-ID", options);
}

// Update Current Date
function updateCurrentDate() {
  const dateEl = document.getElementById("current-date");
  if (dateEl) {
    dateEl.textContent = formatDate(new Date());
  }
}

// Notifikasi pesan (24 jam, hanya dari user lain)
async function checkMessagesNotification() {
  try {
    const user = checkLogin();
    if (!user) return;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("messages")
      .select("id,user_id,content,created_at")
      .gte("created_at", since)
      .neq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) return;

    // Ambil nama-nama pengirim
    const ids = Array.from(new Set(data.map((r) => r.user_id)));
    let idToName = new Map();
    if (ids.length > 0) {
      const { data: users } = await supabase
        .from("local_users")
        .select("id,fullname")
        .in("id", ids);
      (users || []).forEach((u) => idToName.set(u.id, u.fullname || "Unknown"));
    }

    const body = document.getElementById("message-toast-body");
    const names = Array.from(new Set(data.map((r) => idToName.get(r.user_id) || "Unknown"))).slice(0, 3);
    const preview = (data[0].content || "").slice(0, 80);
    if (body) {
      body.innerHTML = `Ada pesan baru dari <strong>${names.join(", ")}</strong>.` + (preview ? `\n"${preview}"` : "");
    }
    const toastEl = document.getElementById("message-toast");
    if (toastEl && window.bootstrap?.Toast) {
      const t = new window.bootstrap.Toast(toastEl, { delay: 6000 });
      t.show();
    }
  } catch (e) {
    // ignore
  }
}

checkLogin();
initModeUI();
loadUserData();
updateCurrentDate();
checkMessagesNotification();
