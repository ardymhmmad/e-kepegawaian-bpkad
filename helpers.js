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

  // Load logo di halaman login tanpa perlu login dulu
  loadLoginLogo();
});

// ── Load logo untuk halaman login ─────────────────────────
async function loadLoginLogo(){
  try{
    const { data } = await supa.from('settings')
      .select('setting_val').eq('setting_key','logo_path').maybeSingle();
    if(data?.setting_val){
      _logoData = data.setting_val;
      applyLogoEverywhere(data.setting_val);
    }
  } catch(e){ console.warn('Logo load:', e.message); }
}

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
  // Terapkan logo jika sudah ada di cache
  if(_logoData) applyLogoEverywhere(_logoData);
}

function clearAppSession(){
  session = null;
  DB = { asn:[], pppk:[], pjlp:[], cuti:[], alokasi:{} };
  document.body.classList.remove('readonly');
  document.getElementById('app').classList.remove('visible');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('l-pass').value = '';
  document.getElementById('l-err').style.display = 'none';
  const btn = document.querySelector('.login-btn');
  if(btn){ btn.disabled = false; btn.textContent = 'Masuk ke Sistem'; }
}

// ── Cek session saat halaman dimuat ───────────────────────
(async ()=>{
  try{
    const { data:{ session: existing } } = await supa.auth.getSession();
    if(existing){
      await applySupaSession(existing);
      await init();
    }
  } catch(e){ console.error('Session restore error:', e); }
})();

// ── Token refresh otomatis ─────────────────────────────────
supa.auth.onAuthStateChange((event, supaSession) => {
  if(event === 'TOKEN_REFRESHED' && supaSession){
    buildSession(supaSession).then(s=>{ session = s; });
  } else if(event === 'SIGNED_OUT'){
    clearAppSession();
  }
});

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

  try{
    const { data, error } = await supa.auth.signInWithPassword({ email, password: pw });
    if(error) throw error;
    await applySupaSession(data.session);
    await init();
    await logAudit(AUDIT_ACTION.LOGIN, 'user', null, `Login berhasil — ${session?.label||email}`);
  } catch(e){
    const msg = e.message || '';
    if(msg.includes('Invalid login')) errEl.textContent = 'Email atau password salah.';
    else if(msg.includes('Email not confirmed')) errEl.textContent = 'Email belum dikonfirmasi.';
    else errEl.textContent = 'Gagal login: ' + msg;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Masuk ke Sistem';
  }
}

// ── Logout ─────────────────────────────────────────────────
async function doLogout(){
  await logAudit(AUDIT_ACTION.LOGOUT, 'user', null, `Logout — ${session?.label||session?.email||'–'}`);
  await supa.auth.signOut();
  clearAppSession();
}
