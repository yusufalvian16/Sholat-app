// Ganti isi file: js/statistics.js

const supabase = window.supabaseClient;
if (!supabase) {
  console.error("Supabase client not initialized");
  window.location.href = "login.html";
}

// ---- Mode helpers (sinkron dengan app.js) ----
const MODE_KEY = "sholat_mode";
function getMode() {
  return localStorage.getItem(MODE_KEY) || "normal";
}
function setMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
  const badge = document.getElementById("mode-badge");
  if (badge) badge.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
}
function initModeUI() {
  const select = document.getElementById("mode-select");
  if (select) {
    select.value = getMode();
    select.addEventListener("change", (e) => {
      setMode(e.target.value);
    });
  }
  const badge = document.getElementById("mode-badge");
  if (badge) badge.textContent = getMode().charAt(0).toUpperCase() + getMode().slice(1);
}

// Check login
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

// Format date to Indonesia locale
function formatDate(dateStr) {
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  return new Date(dateStr).toLocaleDateString("id-ID", options);
}

// Show current date in navbar
function updateCurrentDate() {
  const dateEl = document.getElementById("current-date");
  if (dateEl) {
    dateEl.textContent = formatDate(new Date());
  }
}

// Helper untuk mendapatkan icon berdasarkan status
function getStatusIcon(status) {
  if (!status || status === 'false' || status === false) return '❌';
  if (status === 'true' || status === true) return '✓';
  if (status === 'imun') return '○';
  if (status === 'mens') return '🛡️';
  return '❌';
}

// Hitung dan tampilkan statistik per user
function calculateAndDisplayUserStats(data) {
  const prayers = ["subuh", "dzuhur", "ashar", "maghrib", "isya"];
  
  // Group data by user_id
  const userStatsMap = new Map();
  
  data.forEach((row) => {
    const userId = row.user_id;
    const userName = row.local_users?.fullname || "Unknown";
    
    if (!userStatsMap.has(userId)) {
      userStatsMap.set(userId, {
        userId,
        userName,
        totalTrue: 0,
        totalImun: 0,
        totalMens: 0,
        totalFalse: 0,
        totalDays: 0,
        totalPossible: 0,
      });
    }
    
    const stats = userStatsMap.get(userId);
    stats.totalDays++;
    
    prayers.forEach((p) => {
      const status = row[p];
      stats.totalPossible++;
      
      if (!status || status === 'false' || status === false) {
        stats.totalFalse++;
      } else if (status === 'true' || status === true) {
        stats.totalTrue++;
      } else if (status === 'imun') {
        stats.totalImun++;
      } else if (status === 'mens') {
        stats.totalMens++;
      }
    });
  });
  
  // Convert to array and calculate winrate
  const userStatsArray = Array.from(userStatsMap.values()).map((stats) => {
    const totalRecorded = stats.totalTrue + stats.totalImun + stats.totalMens;
    const winrate = stats.totalPossible > 0 
      ? (totalRecorded / stats.totalPossible) * 100 
      : 0;
    
    return {
      ...stats,
      winrate,
      totalRecorded,
      totalImunMens: stats.totalImun + stats.totalMens,
    };
  });
  
  // Sort by winrate descending
  userStatsArray.sort((a, b) => b.winrate - a.winrate);
  
  // Display in table
  const tbody = document.getElementById("user-stats-table");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  if (userStatsArray.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6" class="text-center text-muted">Tidak ada data</td>`;
    tbody.appendChild(tr);
    return;
  }
  
  userStatsArray.forEach((stats) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${stats.userName}</strong></td>
      <td>${stats.winrate.toFixed(1)}%</td>
      <td>${stats.totalTrue.toLocaleString("id-ID")}</td>
      <td>${stats.totalImunMens.toLocaleString("id-ID")}</td>
      <td>${stats.totalFalse.toLocaleString("id-ID")}</td>
      <td>${stats.totalDays.toLocaleString("id-ID")}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Hitung ringkasan global + user
function calculateAndDisplaySummaryStats(data, currentUserId) {
  const prayers = ["subuh", "dzuhur", "ashar", "maghrib", "isya"];

  if (!data || data.length === 0) {
    document.getElementById("stats-total-prayers").textContent = "0";
    document.getElementById("stats-overall-winrate").textContent = "0%";
    document.getElementById("stats-active-users").textContent = "0";
    document.getElementById("stats-user-winrate").textContent = "0%";
    document.getElementById("stats-total-imun").textContent = "0";
    document.getElementById("stats-total-true").textContent = "0";
    document.getElementById("stats-total-false").textContent = "0";
    return;
  }

  const totalRecords = data.length; // row count
  const activeUsers = new Set(data.map((row) => row.user_id)).size;

  // counts
  let totalTrue = 0;
  let totalFalse = 0;
  let totalImun = 0;
  let totalMens = 0;

  let globalPossible = totalRecords * 5;
  let userTrue = 0;
  let userPossible = 0;

  data.forEach((row) => {
    prayers.forEach((p) => {
      const status = row[p];
      if (!status || status === 'false' || status === false) {
        totalFalse++;
      } else if (status === 'true' || status === true) {
        totalTrue++;
      } else if (status === 'imun') {
        totalImun++;
      } else if (status === 'mens') {
        totalMens++;
      }
    });

    if (row.user_id === currentUserId) {
      prayers.forEach((p) => {
        const status = row[p];
        if (status && status !== 'false' && status !== false) {
          userTrue++;
        }
        userPossible++;
      });
    }
  });

  const overallWinrate = globalPossible > 0 ? ((totalTrue + totalImun + totalMens) / globalPossible) * 100 : 0;
  const userWinrate = userPossible > 0 ? (userTrue / userPossible) * 100 : 0;

  const totalRecorded = totalTrue + totalImun + totalMens;

  document.getElementById("stats-total-prayers").textContent = totalRecorded.toLocaleString("id-ID");
  document.getElementById("stats-overall-winrate").textContent = `${overallWinrate.toFixed(1)}%`;
  document.getElementById("stats-active-users").textContent = activeUsers.toLocaleString("id-ID");
  document.getElementById("stats-user-winrate").textContent = `${userWinrate.toFixed(1)}%`;

  document.getElementById("stats-total-imun").textContent = (totalImun + totalMens).toLocaleString("id-ID");
  document.getElementById("stats-total-true").textContent = totalTrue.toLocaleString("id-ID");
  document.getElementById("stats-total-false").textContent = totalFalse.toLocaleString("id-ID");
}

// Habit tracker (30 hari, user saat ini)
function renderHabitGrid(container, data, currentUserId) {
  const prayers = ["subuh", "dzuhur", "ashar", "maghrib", "isya"];
  const map = new Map(); // date -> row
  data
    .filter((r) => r.user_id === currentUserId)
    .forEach((r) => {
      map.set(r.date, r);
    });

  // Last 30 days array
  const days = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    days.push(ds);
  }

  container.innerHTML = "";
  days.forEach((ds) => {
    const cell = document.createElement("div");
    cell.className = "habit-cell";

    const row = map.get(ds);
    if (!row) {
      cell.classList.add("habit-false");
    } else {
      // summarize row - cek status dari kolom absen langsung
      let hasMens = false;
      let hasImun = false;
      let hasTrue = false;
      
      prayers.forEach((p) => {
        const status = row[p];
        if (status === 'mens') hasMens = true;
        else if (status === 'imun') hasImun = true;
        else if (status === 'true' || status === true) hasTrue = true;
      });

      if (hasMens) cell.classList.add("habit-mens");
      else if (hasImun) cell.classList.add("habit-imun");
      else if (hasTrue) cell.classList.add("habit-true");
      else cell.classList.add("habit-false");
    }

    container.appendChild(cell);
  });
}

// Tambahan: render habit matrix semua user (berdasarkan bulan dari endDate)
function renderHabitMatrix(container, data, monthRefDateStr) {
  const prayers = ["subuh", "dzuhur", "ashar", "maghrib", "isya"];

  // Map user_id -> { name, byDate }
  const users = new Map();
  data.forEach((row) => {
    const userId = row.user_id;
    const name = row.local_users?.fullname || "Unknown";
    if (!users.has(userId)) users.set(userId, { name, byDate: new Map() });
    users.get(userId).byDate.set(row.date, row);
  });

  // Tentukan bulan target dari monthRefDateStr (YYYY-MM-DD) atau gunakan hari ini
  const refDate = monthRefDateStr ? new Date(monthRefDateStr) : new Date();
  const year = refDate.getFullYear();
  const month = refDate.getMonth(); // 0-11
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Kumpulkan semua tanggal (YYYY-MM-DD) di bulan tsb
  const days = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    days.push(d.toISOString().slice(0, 10));
  }

  container.innerHTML = "";

  // Sort users by name asc
  const sorted = Array.from(users.entries()).sort((a, b) => {
    return (a[1].name || "").localeCompare(b[1].name || "");
  });

  // Helper format tanggal popup
  function formatFullDate(ds) {
    const d = new Date(ds);
    return d.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }

  sorted.forEach(([userId, info]) => {
    const rowEl = document.createElement("div");
    rowEl.className = "habit-row d-flex align-items-center mb-2";

    const nameEl = document.createElement("div");
    nameEl.className = "habit-name me-3 text-truncate";
    nameEl.textContent = info.name;
    rowEl.appendChild(nameEl);

    const gridEl = document.createElement("div");
    gridEl.className = "habit-grid";

    days.forEach((ds) => {
      const cell = document.createElement("div");
      cell.className = "habit-cell";

      const row = info.byDate.get(ds);
      let count = 0;
      if (row) {
        prayers.forEach((p) => {
          const status = row[p];
          if (status && status !== 'false' && status !== false) count++;
        });
      }

      if (count === 5) cell.classList.add("habit-true");
      else cell.classList.add("habit-false");

      cell.title = `${info.name} — ${formatFullDate(ds)}: ${count}/5`;
      cell.style.cursor = "pointer";
      cell.addEventListener("click", () => {
        alert(`${info.name}\n${formatFullDate(ds)}\nTotal absen: ${count}/5`);
      });

      gridEl.appendChild(cell);
    });

    rowEl.appendChild(gridEl);
    container.appendChild(rowEl);
  });
}

// Helper: update judul habit sesuai bulan
function setHabitTitleFromMonth(monthStr) {
  const title = document.getElementById("habit-title");
  if (!title) return;
  if (!monthStr) {
    title.textContent = "Habit Bulan";
    return;
  }
  // monthStr: YYYY-MM
  const [y, m] = monthStr.split("-");
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  title.textContent = `Habit Bulan ${label}`;
}

// Load prayer history with filters
async function loadStatistics(startDate, endDate) {
  try {
    const currentUser = checkLogin();
    if (!currentUser) return;

    document.getElementById("stats-overall-winrate").textContent = "Loading...";

    let query = supabase
      .from("sholat_attendance")
      .select("*, local_users(fullname)")
      .order("date", { ascending: false });

    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const { data, error } = await query;

    if (error) {
      console.error("Error loading statistics:", error);
      return;
    }

    // Ringkasan
    calculateAndDisplaySummaryStats(data, currentUser.id);

    // Statistik per user
    calculateAndDisplayUserStats(data);

    // Habit matrix (semua user)
    const matrix = document.getElementById("habit-matrix");
    if (matrix) renderHabitMatrix(matrix, data, endDate);

    // Tabel
    const tbody = document.getElementById("stats-table");
    if (!tbody) return;
    tbody.innerHTML = "";
    data.forEach((row) => {
      const tr = document.createElement("tr");
      const name = row.local_users?.fullname ?? "Unknown";
      tr.innerHTML = `
        <td>${formatDate(row.date)}</td>
        <td>${name}</td>
        <td>${getStatusIcon(row.subuh)}</td>
        <td>${getStatusIcon(row.dzuhur)}</td>
        <td>${getStatusIcon(row.ashar)}</td>
        <td>${getStatusIcon(row.maghrib)}</td>
        <td>${getStatusIcon(row.isya)}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

// Setup event listeners
document.addEventListener("DOMContentLoaded", () => {
  initModeUI();
  updateCurrentDate();
  const user = checkLogin();
  if (!user) return;

  // Default date range: awal-akhir bulan berjalan
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const startInput = document.getElementById("start-date");
  const endInput = document.getElementById("end-date");
  if (startInput) startInput.value = startDate.toISOString().split("T")[0];
  if (endInput) endInput.value = endDate.toISOString().split("T")[0];

  // Inisialisasi month picker
  const monthInput = document.getElementById("month-picker");
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (monthInput) monthInput.value = monthStr;
  setHabitTitleFromMonth(monthStr);

  loadStatistics(
    startDate.toISOString().split("T")[0],
    endDate.toISOString().split("T")[0]
  );

  // Event: month picker change
  if (monthInput) {
    monthInput.addEventListener("change", () => {
      const val = monthInput.value; // YYYY-MM
      setHabitTitleFromMonth(val);
      // Render ulang matriks menggunakan data terakhir yang dimuat dan bulan baru
      const matrix = document.getElementById("habit-matrix");
      // gunakan end of selected month sebagai referensi format
      if (val) {
        const [yy, mm] = val.split('-');
        const ref = new Date(parseInt(yy, 10), parseInt(mm, 10), 0).toISOString().slice(0,10);
        // Ambil data terakhir dari cache? Sederhana: panggil ulang loadStatistics untuk bulan itu
        const start = `${yy}-${mm}-01`;
        const end = `${yy}-${mm}-${String(new Date(parseInt(yy,10), parseInt(mm,10), 0).getDate()).padStart(2, '0')}`;
        if (startInput) startInput.value = start;
        if (endInput) endInput.value = end;
        loadStatistics(start, end);
      }
    });
  }

  const filterBtn = document.getElementById("filter-btn");
  if (filterBtn) {
    filterBtn.addEventListener("click", () => {
      const start = startInput.value;
      const end = endInput.value;
      if (start && end && start > end) {
        alert("Tanggal mulai tidak boleh lebih besar dari tanggal akhir.");
        return;
      }
      loadStatistics(start, end);
    });
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("user");
      window.location.href = "login.html";
    });
  }
});
