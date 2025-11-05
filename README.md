# Sholat Checker

Aplikasi web sederhana untuk mencatat kehadiran sholat harian, melihat rekap, statistik per pengguna, habit bulanan, serta fitur pesan/motivasi 24 jam ala “story”. berjalan sebagai situs statis (HTML/JS/CSS) dengan backend Supabase.

## Fitur Singkat
- Login/Daftar user lokal (`local_users`) dengan hash password di sisi klien.
- Absen 5 waktu sholat per hari dengan 3 mode:
  - Normal → status `true` (✓)
  - Imun → status `imun` (○)
  - Mens → status `mens` (🛡️)
  - Toggle: klik ulang untuk batal (nilai kembali `NULL`).
- Rekap harian seluruh user dan statistik:
  - Winrate global dan per-user
  - Total True, Total Imun/Mens, Total Tidak Absen
  - Habit bulanan semua user (hijau = 5/5, merah = kurang dari 5)
- Pesan/motivasi 24 jam (seperti story):
  - Halaman Pesan untuk kirim & lihat pesan 24 jam terakhir
  - Notifikasi muncul saat membuka Home jika ada pesan dari user lain (<24 jam)

## Struktur Proyek
```
sholat-app
├── index.html
├── pages/
│   ├── login.html
│   ├── register.html
│   ├── reset-password.html
│   ├── statistics.html
│   ├── messages.html
│   └── about.html
├── js/
│   ├── supabaseClient.js   # KONFIG: URL & anon key Supabase
│   ├── app.js              # Home (absen/rekap), notifikasi pesan
│   ├── statistics.js       # Statistik, habit bulanan, per-user
│   ├── auth.js             # Login
│   ├── register.js         # Registrasi
│   ├── reset-password.js   # Ganti password
│   └── messages.js         # Kirim & daftar pesan 24 jam
└── styles/
    └── main.css
```

## 1) Mengganti Konfigurasi Supabase
Edit `js/supabaseClient.js`:

```js
// js/supabaseClient.js
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";

const supabaseClient =
  window.supabase && typeof window.supabase.createClient === "function"
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

window.supabaseClient = supabaseClient;
```

Cara mendapatkan nilai:
- Buka Supabase → Project Settings → API → gunakan `Project URL` dan `anon public` key.

## 2) Skema Database (SQL)
Jalankan di SQL editor Supabase. Jika Anda sudah memiliki tabel, sesuaikan seperlunya.

### a. Tabel pengguna lokal
```sql
create table if not exists local_users (
  id bigint generated always as identity primary key,
  username text unique not null,
  fullname text,
  password_hash text not null
);
```

### b. Tabel absensi sholat (status per waktu)
Kolom status menggunakan text: NULL, 'true', 'imun', 'mens'.
```sql
create table if not exists sholat_attendance (
  id bigint generated always as identity primary key,
  user_id bigint not null,
  date date not null,
  subuh text,
  dzuhur text,
  ashar text,
  maghrib text,
  isya text
);

-- Constraint nilai valid
alter table sholat_attendance
  add constraint check_subuh_status  check (subuh  is null or subuh  in ('true','imun','mens')),
  add constraint check_dzuhur_status check (dzuhur is null or dzuhur in ('true','imun','mens')),
  add constraint check_ashar_status  check (ashar  is null or ashar  in ('true','imun','mens')),
  add constraint check_maghrib_status check (maghrib is null or maghrib in ('true','imun','mens')),
  add constraint check_isya_status   check (isya   is null or isya   in ('true','imun','mens'));

-- Unik per (user_id, date) agar mudah insert/update harian
create unique index if not exists sholat_attendance_user_date_uidx
  on sholat_attendance (user_id, date);

-- (Opsional) FK ke local_users jika tipe kolom cocok
-- alter table sholat_attendance
--   add constraint sholat_attendance_user_fk
--   foreign key (user_id) references local_users(id) on delete cascade;
```

### c. Tabel pesan 24 jam
```sql
create table if not exists messages (
  id bigint generated always as identity primary key,
  user_id bigint not null,
  content text not null check (char_length(content) <= 280),
  created_at timestamp with time zone default now()
);

create index if not exists messages_created_at_idx on messages (created_at desc);

-- (Opsional) FK
-- alter table messages
--   add constraint messages_user_fk
--   foreign key (user_id) references local_users(id) on delete cascade;
```
Langkah umum:
1. Clone/unduh repo ini.
2. Edit `js/supabaseClient.js` dengan URL & anon key Supabase Anda.
3. Jalankan SQL skema di atas pada Supabase.
4. Buka `index.html` (via Live Server) → Registrasi user → Login.


Selamat menggunakan! Jika ada masalah/ide, silakan buat issue atau kirim perbaikan.