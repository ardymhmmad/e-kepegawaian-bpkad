// ═══════════════════════════════════════════════════
// RENDER SETTINGS PAGE
// ═══════════════════════════════════════════════════
function renderSettings(){
  if(_logoData) updateLogoSettingsPreview(_logoData);
  const sui = document.getElementById('settings-user-info');
  if(sui && session) sui.textContent = `${session.label} (${session.email})`;
  const umSection = document.getElementById('user-mgmt-section');
  if(umSection) umSection.style.display = session?.role === 'admin' ? 'block' : 'none';
  loadFonnteToken();
  loadNoUrutCuti();
  renderWATemplatesForm();
  renderUserTable();
}

// ── Fonnte Token ───────────────────────────────────────────
async function loadFonnteToken(){
  const el = document.getElementById('fonnte-token-input'); if(!el) return;
  const { data } = await supa.from('settings').select('setting_val').eq('setting_key','fonnte_token').maybeSingle();
  if(data?.setting_val){
    el.value = data.setting_val;
    FONNTE_TOKEN = data.setting_val; // update variabel global langsung
  }
}

async function saveFonnteToken(){
  const token = (document.getElementById('fonnte-token-input')?.value||'').trim();
  if(!token){ showToast('Token tidak boleh kosong','error'); return; }

  // Coba UPDATE dulu, jika tidak ada row baru INSERT
  const { data: existing } = await supa.from('settings')
    .select('id').eq('setting_key','fonnte_token').maybeSingle();

  let error;
  if(existing){
    ({ error } = await supa.from('settings')
      .update({ setting_val: token })
      .eq('setting_key','fonnte_token'));
  } else {
    ({ error } = await supa.from('settings')
      .insert({ setting_key:'fonnte_token', setting_val: token }));
  }

  if(!error){
    FONNTE_TOKEN = token;
    showToast('✅ Token Fonnte berhasil disimpan','success');
  } else {
    showToast('Gagal simpan: '+error.message,'error');
    console.error('saveFonnteToken error:', error);
  }
}

async function testFonnteToken(){
  const token = (document.getElementById('fonnte-token-input')?.value||'').trim();
  if(!token){ showToast('Isi token terlebih dahulu','error'); return; }
  const noTest = prompt('Masukkan nomor WA untuk test (cth: 08123456789):','');
  if(!noTest) return;
  let nomor = noTest.replace(/\D/g,'');
  if(nomor.startsWith('0')) nomor='62'+nomor.slice(1);
  try{
    const res = await fetch('https://api.fonnte.com/send',{
      method:'POST',
      headers:{ 'Authorization': token },
      body: new URLSearchParams({ target:nomor, message:'✅ Test notifikasi dari E-Kepegawaian BPKAD berhasil!', countryCode:'62' })
    });
    const data = await res.json();
    if(data.status===true) showToast('✅ WA terkirim! Fonnte berhasil terhubung.','success');
    else showToast('Gagal: '+(data.reason||JSON.stringify(data)),'error');
  }catch(e){ showToast('Error: '+e.message,'error'); }
}

// ── Tabel daftar user ──────────────────────────────────────
async function renderUserTable(){
  const tb = document.getElementById('user-table-body');
  if(!tb) return;
  tb.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--tx3);padding:14px">Memuat...</td></tr>`;

  // Ambil profil semua user (admin bisa baca semua via RLS policy admin)
  const { data, error } = await supa.from('profiles')
    .select('id, label, role, created_at')
    .order('created_at');

  if(error){ tb.innerHTML = `<tr><td colspan="5" style="color:var(--red-tx);padding:12px">${error.message}</td></tr>`; return; }

  USERS_CACHE = data || [];
  const rows = USERS_CACHE.map(acc => {
    const isMe    = session?.uid === acc.id;
    const isAdmin = acc.role === 'admin';
    const tgl     = acc.created_at ? acc.created_at.slice(0,10) : '—';
    return `<tr style="border-bottom:1px solid var(--bd)">
      <td style="padding:9px 12px"><div style="display:flex;align-items:center;gap:8px">
        <div class="emp-av" style="width:28px;height:28px;font-size:10px;background:${isAdmin?'var(--primary-bg)':'var(--grn-bg)'};color:${isAdmin?'var(--primary-tx)':'var(--grn-tx)'}">
          ${(acc.label||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
        <span style="font-weight:600">${acc.label||'—'}</span>
        ${isMe?'<span class="badge b-blue" style="font-size:9px">Anda</span>':''}
      </div></td>
      <td style="padding:9px 12px"><span class="badge ${isAdmin?'b-blue':'b-green'}">${isAdmin?'Admin':'User'}</span></td>
      <td style="padding:9px 12px;font-size:11px;color:var(--tx3)">${tgl}</td>
      <td style="padding:9px 12px;white-space:nowrap">
        <button class="btn btn-sm always-allow" onclick="openEditUser('${acc.id}')">Edit</button>
        ${!isMe?`<button class="btn btn-sm btn-danger always-allow" onclick="hapusUser('${acc.id}','${acc.label}')">Hapus</button>`:''}
      </td></tr>`;
  }).join('');
  tb.innerHTML = rows || `<tr><td colspan="4" style="text-align:center;color:var(--tx3);padding:16px">Tidak ada pengguna</td></tr>`;
}

// ── Tambah user baru via Supabase Auth ─────────────────────
function openTambahUser(){
  document.getElementById('modal-title').textContent = 'Undang Pengguna Baru';
  document.getElementById('modal-body').innerHTML = `
    <div style="font-size:12px;color:var(--tx2);background:var(--primary-bg);border-radius:8px;padding:10px 12px;margin-bottom:14px;line-height:1.6">
      Pengguna baru akan didaftarkan via Supabase Auth.<br>
      Pastikan <strong>Email Confirmations</strong> di Supabase Auth Settings sudah dikonfigurasi.
    </div>
    <div class="form-grid">
      <div class="fg">
        <label>Email *</label>
        <input type="email" id="u-email" placeholder="contoh: budi@bpkad.go.id" autocomplete="off">
      </div>
      <div class="fg">
        <label>Nama / Label *</label>
        <input type="text" id="u-label" placeholder="contoh: Budi Santoso">
      </div>
      <div class="fg">
        <label>Password *</label>
        <div style="position:relative">
          <input type="password" id="u-password" placeholder="Min. 8 karakter" autocomplete="new-password">
          <button type="button" onclick="togglePwVis('u-password',this)"
            style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--tx3);font-size:11px;padding:0">👁</button>
        </div>
      </div>
      <div class="fg">
        <label>Konfirmasi Password *</label>
        <div style="position:relative">
          <input type="password" id="u-password2" placeholder="Ulangi password" autocomplete="new-password">
          <button type="button" onclick="togglePwVis('u-password2',this)"
            style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--tx3);font-size:11px;padding:0">👁</button>
        </div>
      </div>
      <div class="fg full">
        <label>Role / Hak Akses *</label>
        <div style="display:flex;gap:12px;margin-top:4px">
          <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;padding:10px 16px;border:1.5px solid var(--bd2);border-radius:8px;flex:1;transition:all .15s" id="role-admin-lbl">
            <input type="radio" name="u-role" value="admin" style="accent-color:var(--primary)" onchange="highlightRoleCard()">
            <div><div style="font-weight:600">Admin</div><div style="font-size:10px;color:var(--tx3)">Akses penuh — tambah, edit, hapus data</div></div>
          </label>
          <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;padding:10px 16px;border:1.5px solid var(--bd2);border-radius:8px;flex:1;transition:all .15s" id="role-user-lbl">
            <input type="radio" name="u-role" value="user" checked style="accent-color:var(--primary)" onchange="highlightRoleCard()">
            <div><div style="font-weight:600">User</div><div style="font-size:10px;color:var(--tx3)">Hanya lihat — tidak bisa ubah data</div></div>
          </label>
        </div>
      </div>
    </div>
    <div id="u-err" style="color:var(--red-tx);font-size:12px;background:var(--red-bg);border:1px solid var(--red-bd);border-radius:6px;padding:8px 12px;display:none;margin-top:10px"></div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="simpanTambahUser()">Buat Pengguna</button>`;
  document.getElementById('modal').style.display = 'flex';
  highlightRoleCard();
}

async function simpanTambahUser(){
  const errEl   = document.getElementById('u-err');
  const showErr = msg => { errEl.textContent=msg; errEl.style.display='block'; };
  const email   = (document.getElementById('u-email')?.value||'').trim().toLowerCase();
  const label   = (document.getElementById('u-label')?.value||'').trim();
  const pw      = document.getElementById('u-password')?.value||'';
  const pw2     = document.getElementById('u-password2')?.value||'';
  const role    = document.querySelector('input[name="u-role"]:checked')?.value||'user';

  if(!email)         { showErr('Email wajib diisi'); return; }
  if(!label)         { showErr('Nama / label wajib diisi'); return; }
  if(!pw)            { showErr('Password wajib diisi'); return; }
  if(pw.length < 8)  { showErr('Password minimal 8 karakter'); return; }
  if(pw !== pw2)     { showErr('Konfirmasi password tidak cocok'); return; }

  // Simpan session admin sebelum signUp menggantikannya
  const { data: { session: adminSession } } = await supa.auth.getSession();
  if(!adminSession) { showErr('Session admin tidak ditemukan, coba refresh halaman.'); return; }
  const adminRefreshToken = adminSession.refresh_token;

  // Daftar user baru via signUp
  const { data, error } = await supa.auth.signUp({
    email,
    password: pw,
    options: { data: { label, role } }
  });

  if(error){
    // Pulihkan session admin jika signUp gagal
    await supa.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminRefreshToken });
    showErr(error.message); return;
  }
  if(!data?.user){
    await supa.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminRefreshToken });
    showErr('Gagal membuat user, coba lagi.'); return;
  }

  // Upsert profil user baru
  await supa.from('profiles').upsert({ id: data.user.id, label, role }, { onConflict: 'id' });

  // Pulihkan session admin
  await supa.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminRefreshToken });

  closeModal(); renderUserTable();
  showToast(`Pengguna "${label}" berhasil dibuat`, 'success');
}

// ── Edit user ──────────────────────────────────────────────
function openEditUser(uid){
  const acc = USERS_CACHE.find(u => u.id === uid);
  if(!acc) return;
  const isMe = session?.uid === uid;
  document.getElementById('modal-title').textContent = `Edit Pengguna — ${acc.label}`;
  document.getElementById('modal-body').innerHTML = `
    <div class="form-grid">
      <div class="fg full">
        <label>Nama / Label</label>
        <input type="text" id="eu-label" value="${acc.label||''}" placeholder="Nama tampilan">
      </div>
      <div class="fg">
        <label>Password Baru <span style="font-weight:400;color:var(--tx3)">(kosongkan jika tidak diubah)</span></label>
        <div style="position:relative">
          <input type="password" id="eu-password" placeholder="Min. 8 karakter" autocomplete="new-password">
          <button type="button" onclick="togglePwVis('eu-password',this)"
            style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--tx3);font-size:11px;padding:0">👁</button>
        </div>
      </div>
      <div class="fg">
        <label>Konfirmasi Password Baru</label>
        <div style="position:relative">
          <input type="password" id="eu-password2" placeholder="Ulangi password baru" autocomplete="new-password">
          <button type="button" onclick="togglePwVis('eu-password2',this)"
            style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--tx3);font-size:11px;padding:0">👁</button>
        </div>
      </div>
      ${!isMe ? `<div class="fg full">
        <label>Role / Hak Akses</label>
        <div style="display:flex;gap:12px;margin-top:4px">
          <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;padding:10px 16px;border:1.5px solid var(--bd2);border-radius:8px;flex:1" id="erole-admin-lbl">
            <input type="radio" name="eu-role" value="admin" ${acc.role==='admin'?'checked':''} style="accent-color:var(--primary)" onchange="highlightRoleCardEdit()">
            <div><div style="font-weight:600">Admin</div><div style="font-size:10px;color:var(--tx3)">Akses penuh</div></div>
          </label>
          <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;padding:10px 16px;border:1.5px solid var(--bd2);border-radius:8px;flex:1" id="erole-user-lbl">
            <input type="radio" name="eu-role" value="user" ${acc.role==='user'?'checked':''} style="accent-color:var(--primary)" onchange="highlightRoleCardEdit()">
            <div><div style="font-weight:600">User</div><div style="font-size:10px;color:var(--tx3)">Hanya lihat</div></div>
          </label>
        </div>
      </div>` : '<div class="fg full" style="font-size:12px;color:var(--tx3);background:var(--amb-bg);padding:10px 12px;border-radius:8px">⚠ Role akun Anda tidak bisa diubah sendiri.</div>'}
    </div>
    <div id="eu-err" style="color:var(--red-tx);font-size:12px;background:var(--red-bg);border:1px solid var(--red-bd);border-radius:6px;padding:8px 12px;display:none;margin-top:10px"></div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="simpanEditUser('${uid}')">Simpan Perubahan</button>`;
  document.getElementById('modal').style.display = 'flex';
  setTimeout(highlightRoleCardEdit, 50);
}

async function simpanEditUser(uid){
  const errEl   = document.getElementById('eu-err');
  const showErr = msg => { errEl.textContent=msg; errEl.style.display='block'; };
  const label   = (document.getElementById('eu-label')?.value||'').trim();
  const pw      = document.getElementById('eu-password')?.value||'';
  const pw2     = document.getElementById('eu-password2')?.value||'';
  const isMe    = session?.uid === uid;
  const role    = isMe ? session.role : (document.querySelector('input[name="eu-role"]:checked')?.value||'user');

  if(!label)        { showErr('Nama / label wajib diisi'); return; }
  if(pw && pw.length < 8) { showErr('Password minimal 8 karakter'); return; }
  if(pw && pw !== pw2)    { showErr('Konfirmasi password tidak cocok'); return; }

  // Update profil
  const { error: profErr } = await supa.from('profiles').update({ label, role }).eq('id', uid);
  if(profErr){ showErr(profErr.message); return; }

  // Update password — hanya bisa untuk akun sendiri via updateUser
  if(pw){
    if(isMe){
      const { error: pwErr } = await supa.auth.updateUser({ password: pw });
      if(pwErr){ showErr('Profil tersimpan, tapi password gagal diubah: ' + pwErr.message); return; }
    } else {
      // Password user lain hanya bisa diubah via Supabase Dashboard
      showToast(`Profil "${label}" diperbarui. Password user lain hanya bisa diubah via Supabase Dashboard.`, 'success');
      closeModal(); renderUserTable(); return;
    }
  }

  // Update tampilan jika akun sendiri
  if(isMe){
    session.label = label;
    document.getElementById('user-label').textContent = label;
    document.getElementById('user-av').textContent = label.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  }

  closeModal(); renderUserTable();
  showToast(`Pengguna "${label}" diperbarui`, 'success');
}

// ── Hapus user ─────────────────────────────────────────────
function hapusUser(uid, label){
  if(session?.uid === uid){ showToast('Tidak dapat menghapus akun sendiri','error'); return; }
  showConfirm('Hapus Pengguna', `Hapus pengguna <strong>${label}</strong>? Tindakan ini tidak dapat dibatalkan.`, async ()=>{
    // Hapus dari profiles — auth.users akan cascade delete via FK
    const { error } = await supa.from('profiles').delete().eq('id', uid);
    if(!error){ renderUserTable(); showToast(`Pengguna "${label}" dihapus dari sistem`,'success'); }
    else showToast(error.message, 'error');
  });
}

// ── UI helpers ─────────────────────────────────────────────
function highlightRoleCard(){
  const v  = document.querySelector('input[name="u-role"]:checked')?.value;
  const al = document.getElementById('role-admin-lbl');
  const ul = document.getElementById('role-user-lbl');
  if(al) al.style.borderColor = v==='admin' ? 'var(--primary)' : 'var(--bd2)';
  if(ul) ul.style.borderColor = v==='user'  ? 'var(--primary)' : 'var(--bd2)';
}
function highlightRoleCardEdit(){
  const v  = document.querySelector('input[name="eu-role"]:checked')?.value;
  const al = document.getElementById('erole-admin-lbl');
  const ul = document.getElementById('erole-user-lbl');
  if(al) al.style.borderColor = v==='admin' ? 'var(--primary)' : 'var(--bd2)';
  if(ul) ul.style.borderColor = v==='user'  ? 'var(--primary)' : 'var(--bd2)';
}
function togglePwVis(id, btn){
  const el = document.getElementById(id);
  if(!el) return;
  el.type = el.type === 'password' ? 'text' : 'password';
  btn.textContent = el.type === 'password' ? '👁' : '🙈';
}

// ── Nomor Urut Surat Cuti ──────────────────────────────────
async function loadNoUrutCuti(){
  const el = document.getElementById('no-urut-cuti-input'); if(!el) return;
  const { data } = await supa.from('settings').select('setting_val').eq('setting_key','no_urut_cuti').maybeSingle();
  el.value = data?.setting_val || '1';
}

async function saveNoUrutCuti(){
  const val = parseInt(document.getElementById('no-urut-cuti-input')?.value)||1;
  if(val < 1){ showToast('Nomor urut minimal 1','error'); return; }
  const { data: existing } = await supa.from('settings').select('id').eq('setting_key','no_urut_cuti').maybeSingle();
  let error;
  if(existing){
    ({ error } = await supa.from('settings').update({ setting_val: String(val) }).eq('setting_key','no_urut_cuti'));
  } else {
    ({ error } = await supa.from('settings').insert({ setting_key:'no_urut_cuti', setting_val: String(val) }));
  }
  if(!error){
    NO_URUT_CUTI = val;
    showToast('✅ Nomor urut surat cuti disimpan','success');
  } else {
    showToast('Gagal: '+error.message,'error');
  }
}

// ── Template Pesan WA ──────────────────────────────────────
const WA_TMPL_LABELS = {
  wa_tmpl_pengajuan:     '📋 Pengajuan Baru → Kepala Subbagian',
  wa_tmpl_step1:         '✅ Disetujui Kasubbag → Kepala Bidang',
  wa_tmpl_step1_pegawai: '📢 Disetujui Kasubbag → Pegawai',
  wa_tmpl_step2:         '📢 Disetujui Kabid → Pegawai',
  wa_tmpl_approved:      '🎉 Disetujui Final → Semua Pihak',
  wa_tmpl_rejected:      '❌ Ditolak → Semua Pihak',
};

async function renderWATemplatesForm(){
  const el = document.getElementById('wa-templates-form'); if(!el) return;
  el.innerHTML = '<div style="font-size:12px;color:var(--tx3);padding:8px 0">Memuat template...</div>';
  const keys = Object.keys(WA_TMPL_LABELS);
  const { data } = await supa.from('settings').select('setting_key,setting_val').in('setting_key', keys);
  const vals = {};
  if(data) data.forEach(r=>{ vals[r.setting_key]=r.setting_val; });
  el.innerHTML = keys.map(k=>`
    <div style="margin-bottom:14px">
      <label style="font-size:11px;font-weight:700;color:var(--tx2);display:block;margin-bottom:5px">${WA_TMPL_LABELS[k]}</label>
      <textarea id="tmpl-${k}" rows="7" style="width:100%;resize:vertical;font-size:12px;font-family:monospace;line-height:1.6">${vals[k]||''}</textarea>
    </div>`).join('');
}

async function saveWATemplates(){
  const keys = Object.keys(WA_TMPL_LABELS);
  const upserts = keys.map(k=>({
    setting_key: k,
    setting_val: document.getElementById('tmpl-'+k)?.value||''
  }));
  const { error } = await supa.from('settings').upsert(upserts, { onConflict:'setting_key' });
  if(!error){
    // Update cache lokal
    if(typeof WA_TEMPLATES !== 'undefined')
      upserts.forEach(u=>{ WA_TEMPLATES[u.setting_key]=u.setting_val; });
    showToast('✅ Semua template berhasil disimpan','success');
  } else {
    showToast('Gagal: '+error.message,'error');
  }
}
