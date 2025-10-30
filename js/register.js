// Use shared client
const supabase = window.supabaseClient;
if (!supabase) {
  console.error(
    "Supabase client not initialized. Ensure js/supabaseClient.js is loaded first."
  );
}

const usernameInput = document.getElementById("username");
const fullnameInput = document.getElementById("fullname");
const passwordInput = document.getElementById("password");
const msg = document.getElementById("msg");

// detect bcrypt lib
const bcryptLib =
  window.bcrypt || (window.dcodeIO && window.dcodeIO.bcrypt) || null;

document.getElementById("register-btn").addEventListener("click", async () => {
  try {
    if (!bcryptLib) {
      msg.textContent =
        "Library bcrypt tidak tersedia. Pastikan bcrypt.min.js dimuat sebelum register.js";
      console.error("bcrypt library not found on window");
      return;
    }

    const username = usernameInput.value.trim();
    const fullname = fullnameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !fullname || !password) {
      msg.textContent = "Semua field harus diisi";
      return;
    }

    // hash password using detected lib
    const saltRounds = 10;
    const hash = bcryptLib.hashSync(password, saltRounds);

    const { data, error } = await supabase
      .from("local_users")
      .insert([
        {
          username,
          fullname,
          password_hash: hash,
        },
      ])
      .select("id");

    if (error) {
      console.error("Register error:", error);
      if (error.code === "23505" || /unique/.test(error.message || "")) {
        msg.textContent = "Username sudah digunakan";
      } else {
        msg.textContent = "Gagal daftar: " + error.message;
      }
      return;
    }

    msg.textContent = "Daftar berhasil! Silakan login.";
    window.location.href = "login.html";
  } catch (err) {
    console.error("Error:", err);
    msg.textContent = "Terjadi kesalahan sistem";
  }
});
