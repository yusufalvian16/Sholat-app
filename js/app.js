// Use shared supabase client
const supabase = window.supabaseClient;
if (!supabase) {
  console.error(
    "Supabase client not initialized. Ensure js/supabaseClient.js is loaded."
  );
  window.location.href = "pages/login.html";
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

// Load attendance and bind buttons (user.id is local_users.id)
async function loadUserData() {
  const user = checkLogin();
  if (!user) return;

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("sholat_attendance")
    .select("*, local_users (fullname)")
    .eq("date", today);

  if (error) {
    console.error("Error loading attendance data:", error);
  } else {
    const tbody = document.getElementById("rekap-table");
    if (!tbody) return;
    tbody.innerHTML = "";
    data.forEach((row) => {
      const tr = document.createElement("tr");
      const name = row.local_users?.fullname ?? "Unknown";
      tr.innerHTML = `
        <td>${name}</td>
        <td>${row.subuh ? "✓" : ""}</td>
        <td>${row.dzuhur ? "✓" : ""}</td>
        <td>${row.ashar ? "✓" : ""}</td>
        <td>${row.maghrib ? "✓" : ""}</td>
        <td>${row.isya ? "✓" : ""}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  const btns = document.querySelectorAll("#prayer-buttons button");
  btns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const prayer = btn.getAttribute("data-prayer").toLowerCase();
      const mapping = {
        subuh: "subuh",
        dzuhur: "dzuhur",
        ashar: "ashar",
        maghrib: "maghrib",
        isya: "isya",
      };
      const col = mapping[prayer];
      if (!col) return;
      const todayDate = new Date().toISOString().slice(0, 10);

      const payload = {
        user_id: user.id,
        date: todayDate,
        [col]: true,
      };

      const { error: upsertError } = await supabase
        .from("sholat_attendance")
        .upsert(payload, { onConflict: ["user_id", "date"] });

      if (upsertError) {
        console.error("Gagal absen:", upsertError);
        const msgEl = document.getElementById("message");
        if (msgEl) msgEl.textContent = "Gagal absen: " + upsertError.message;
        return;
      }

      loadUserData();
    });
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

checkLogin();
loadUserData();
