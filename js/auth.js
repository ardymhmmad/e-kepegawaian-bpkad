// ═══════════════════════════════════════════════════
// AUTH — Supabase Auth (email/password + JWT)
// ═══════════════════════════════════════════════════

// Mobile sidebar toggle
function toggleSidebar(){
  const sb=document.getElementById('sidebar');
  const ov=document.getElementById('sidebar-overlay');
  const open=sb.classList.toggle('open');
  ov.classList.toggle('show',open);
}

// Close sidebar on nav item click (mobile)
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.ni').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(window.innerWidth<=768){
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('show');
      }
    });
  });
});

// ── Session state ──────────────────────────────────────────
let _sessionInitialized = false;

// ── Listener perubahan session (JWT auto-refresh) ──────────
supa.auth.onAuthStateChange(async (event, supaSession) => {
  if(event === 'INITIAL_SESSION'){
    // Saat halaman pertama kali dimuat — restore session jika ada
    if(supaSession && !_sessionInitialized){
      _sessionInitialized = true;
      await applySupaSession(supaSession);
      if(typeof init === 'function') init();
    } else if(!supaSession){
      // Tidak ada session — tampilkan login
      clearAppSession();
    }
  } else if(event === 'SIGNED_IN' && supaSession){
    _sessionInitialized = true;
    await applySupaSession(supaSession);
    if(typeof init === 'function') init();
  } else if(event === 'SIGNED_OUT'){
    _sessionInitialized = false;
    clearAppSession();
  } else if(event === 'TOKEN_REFRESHED' && supaSession){
    session = await buildSession(supaSession);
  }
});

// ── Helper: ambil profil dari tabel profiles ───────────────
async function buildSession(supaSession){
  const uid = supaSession.user.id;
  const { data } = await supa.from('profiles').select('label,role').eq('id', uid).single();
  return {
    uid,
    email: supaSession.user.email,
    label: data?.label || supaSession.user.email,
    role:  data?.role  || 'user'
  };
}

// ── Terapkan session ke UI ─────────────────────────────────
async function applySupaSession(supaSession){
  session = await buildSession(supaSession);
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').classList.add('visible');
  const av = document.getElementById('user-av');
  av.textContent = session.label.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('user-label').textContent = session.label;
  document.getElementById('user-role-badge').textContent = session.role === 'admin' ? 'Administrator' : 'Pengguna';
  if(session.role !== 'admin') document.body.classList.add('readonly');
  else document.body.classList.remove('readonly');
}

function clearAppSession(){
  session = null;
  _sessionInitialized = false;
  DB = { asn:[], pppk:[], pjlp:[], cuti:[], alokasi:{} };
  document.body.classList.remove('readonly');
  document.getElementById('app').classList.remove('visible');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('l-pass').value = '';
  document.getElementById('l-err').style.display = 'none';
  // Reset tombol login agar tidak stuck
  const btn = document.querySelector('.login-btn');
  if(btn){ btn.disabled = false; btn.textContent = 'Masuk ke Sistem'; }
}

// ── Login ──────────────────────────────────────────────────
document.getElementById('l-pass').addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });

async function doLogin(){
  const email = document.getElementById('l-user').value.trim();
  const pw    = document.getElementById('l-pass').value;
  const errEl = document.getElementById('l-err');
  const btn   = document.querySelector('.login-btn');

  if(!email || !pw){
    errEl.textContent = 'Email dan password wajib diisi';
    errEl.style.display = 'block'; return;
  }

  btn.disabled = true; btn.textContent = 'Memverifikasi...';
  errEl.style.display = 'none';

  // Safety net — reset tombol jika tidak ada respon dalam 10 detik
  const timeout = setTimeout(()=>{
    btn.disabled = false; btn.textContent = 'Masuk ke Sistem';
    errEl.textContent = 'Koneksi lambat, coba lagi.';
    errEl.style.display = 'block';
  }, 10000);

  try {
    const { error } = await supa.auth.signInWithPassword({ email, password: pw });
    if(error) throw error;
    // onAuthStateChange akan menangani sisanya
  } catch(e) {
    const msg = e.message || '';
    if(msg.includes('Invalid login')) errEl.textContent = 'Email atau password salah.';
    else if(msg.includes('Email not confirmed')) errEl.textContent = 'Email belum dikonfirmasi.';
    else errEl.textContent = 'Gagal login: ' + msg;
    errEl.style.display = 'block';
  } finally {
    clearTimeout(timeout);
    btn.disabled = false; btn.textContent = 'Masuk ke Sistem';
  }
}

// ── Logout ─────────────────────────────────────────────────
async function doLogout(){
  await supa.auth.signOut();
  // clearAppSession dipanggil otomatis via onAuthStateChange
}
