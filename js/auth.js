// Minimal auth helper for login/signup navigation and session storage
// Use shared client
const supabase = window.supabaseClient;
if (!supabase) {
  console.error(
    "Supabase client not initialized. Ensure js/supabaseClient.js is loaded first."
  );
}

function saveUserToLocal(profile) {
  // profile: { id, username, fullname, email }
  localStorage.setItem("user", JSON.stringify(profile));
}

// detect bcrypt lib
const bcryptLib =
  window.bcrypt || (window.dcodeIO && window.dcodeIO.bcrypt) || null;

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("login-btn");
  const signupBtn = document.getElementById("signup-btn");
  const msgEl = document.getElementById("msg");

  if (signupBtn) {
    signupBtn.addEventListener("click", () => {
      // Navigate to register page (same folder)
      window.location.href = "register.html";
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      if (!bcryptLib) {
        if (msgEl)
          msgEl.textContent =
            "Library bcrypt tidak tersedia. Pastikan bcrypt.min.js dimuat sebelum auth.js";
        console.error("bcrypt library not found on window");
        return;
      }

      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value;
      if (!username || !password) {
        if (msgEl) msgEl.textContent = "Username dan password harus diisi";
        return;
      }

      const { data, error } = await supabase
        .from("local_users")
        .select("id,username,fullname,password_hash")
        .eq("username", username)
        .single();

      if (error || !data) {
        if (msgEl) msgEl.textContent = "Username tidak ditemukan";
        return;
      }

      const pwHash = data.password_hash;
      const ok = bcryptLib.compareSync(password, pwHash);
      if (!ok) {
        if (msgEl) msgEl.textContent = "Password salah";
        return;
      }

      const stored = {
        id: data.id,
        username: data.username,
        fullName: data.fullname || data.username,
      };
      saveUserToLocal(stored);

      // Redirect to root index (index.html is at project root)
      window.location.href = "../index.html";
    });
  }
});
