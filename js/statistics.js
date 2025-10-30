const supabase = window.supabaseClient;
if (!supabase) {
  console.error("Supabase client not initialized");
  window.location.href = "login.html";
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
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return new Date(dateStr).toLocaleDateString("id-ID", options);
}

// Show current date in navbar
function updateCurrentDate() {
  const dateEl = document.getElementById("current-date");
  if (dateEl) {
    dateEl.textContent = formatDate(new Date());
  }
}

// Load prayer history
async function loadStatistics(startDate, endDate) {
  try {
    let query = supabase
      .from("sholat_attendance")
      .select("*, local_users(fullname)")
      .order("date", { ascending: false });

    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading statistics:", error);
      return;
    }

    const tbody = document.getElementById("stats-table");
    if (!tbody) return;

    tbody.innerHTML = "";
    data.forEach((row) => {
      const tr = document.createElement("tr");
      const name = row.local_users?.fullname ?? "Unknown";
      tr.innerHTML = `
        <td>${formatDate(row.date)}</td>
        <td>${name}</td>
        <td>${row.subuh ? "✓" : "❌"}</td>
        <td>${row.dzuhur ? "✓" : "❌"}</td>
        <td>${row.ashar ? "✓" : "❌"}</td>
        <td>${row.maghrib ? "✓" : "❌"}</td>
        <td>${row.isya ? "✓" : "❌"}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

// Setup event listeners
document.addEventListener("DOMContentLoaded", () => {
  updateCurrentDate();
  checkLogin();

  // Set default date range (last 7 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const startInput = document.getElementById("start-date");
  const endInput = document.getElementById("end-date");
  if (startInput) startInput.value = startDate.toISOString().split("T")[0];
  if (endInput) endInput.value = endDate.toISOString().split("T")[0];

  // Load initial data
  loadStatistics(
    startDate.toISOString().split("T")[0],
    endDate.toISOString().split("T")[0]
  );

  // Filter button handler
  const filterBtn = document.getElementById("filter-btn");
  if (filterBtn) {
    filterBtn.addEventListener("click", () => {
      const start = startInput.value;
      const end = endInput.value;
      loadStatistics(start, end);
    });
  }

  // Logout handler
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("user");
      window.location.href = "login.html";
    });
  }
});
