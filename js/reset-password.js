const supabase = window.supabaseClient;
if (!supabase) {
  console.error("Supabase client not initialized");
}

const bcryptLib =
  window.bcrypt || (window.dcodeIO && window.dcodeIO.bcrypt) || null;

document.getElementById("reset-btn").addEventListener("click", async () => {
  const msg = document.getElementById("msg");
  msg.className = "text-center mt-3";

  try {
    if (!bcryptLib) {
      msg.className += " text-danger";
      msg.textContent = "Library bcrypt tidak tersedia";
      return;
    }

    const username = document.getElementById("username").value.trim();
    const password1 = document.getElementById("password1").value;
    const password2 = document.getElementById("password2").value;

    if (!username || !password1 || !password2) {
      msg.className += " text-danger";
      msg.textContent = "Semua field harus diisi";
      return;
    }

    if (password1 !== password2) {
      msg.className += " text-danger";
      msg.textContent = "Password baru tidak sama";
      return;
    }

    // Cek username ada atau tidak
    const { data: user, error: userError } = await supabase
      .from("local_users")
      .select("id")
      .eq("username", username)
      .single();

    if (userError || !user) {
      msg.className += " text-danger";
      msg.textContent = "Username tidak ditemukan";
      return;
    }

    // Hash password baru
    const saltRounds = 10;
    const newHash = bcryptLib.hashSync(password1, saltRounds);

    // Update password
    const { error: updateError } = await supabase
      .from("local_users")
      .update({ password_hash: newHash })
      .eq("id", user.id);

    if (updateError) {
      msg.className += " text-danger";
      msg.textContent = "Gagal mengubah password";
      return;
    }

    msg.className += " text-success";
    msg.textContent = "Password berhasil diubah!";

    // Redirect ke login setelah 2 detik
    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);
  } catch (err) {
    console.error("Error:", err);
    msg.className += " text-danger";
    msg.textContent = "Terjadi kesalahan sistem";
  }
});
