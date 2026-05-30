// ═══════════════════════════════════════════════════
// AUDIT TRAIL
// Mencatat setiap aksi penting ke tabel activity_log
// di Supabase. Tabel harus dibuat dulu:
//
// CREATE TABLE activity_log (
//   id          bigserial PRIMARY KEY,
//   created_at  timestamptz DEFAULT now(),
//   user_email  text,
//   user_label  text,
//   action      text,        -- 'TAMBAH' | 'EDIT' | 'HAPUS' | 'APPROVE' | 'REJECT' | 'CANCEL' | 'LOGIN' | 'LOGOUT'
//   entity      text,        -- 'asn' | 'pppk' | 'pjlp' | 'cuti' | 'alokasi' | 'settings'
//   entity_id   text,
//   description text,
//   old_data    jsonb,
//   new_data    jsonb
// );
// ═══════════════════════════════════════════════════

// Label aksi
const AUDIT_ACTION = {
  TAMBAH  : 'TAMBAH',
  EDIT    : 'EDIT',
  HAPUS   : 'HAPUS',
  APPROVE : 'APPROVE',
  REJECT  : 'REJECT',
  CANCEL  : 'CANCEL',
  LOGIN   : 'LOGIN',
  LOGOUT  : 'LOGOUT',
  SETTING : 'SETTING',
};

// Label entitas (untuk tampilan)
const AUDIT_ENTITY_LABEL = {
  asn       : 'ASN',
  pppk      : 'PPPK',
  pjlp      : 'PJLP',
  cuti      : 'Cuti',
  alokasi   : 'Alokasi Cuti',
  settings  : 'Pengaturan',
  user      : 'Pengguna',
  kgb       : 'KGB',
};

// Warna badge per aksi
const AUDIT_BADGE = {
  TAMBAH  : { bg:'#dcfce7', tx:'#15803d' },
  EDIT    : { bg:'#dbeafe', tx:'#1d4ed8' },
  HAPUS   : { bg:'#fee2e2', tx:'#dc2626' },
  APPROVE : { bg:'#d1fae5', tx:'#059669' },
  REJECT  : { bg:'#fef3c7', tx:'#b45309' },
  CANCEL  : { bg:'#f3f4f6', tx:'#6b7280' },
  LOGIN   : { bg:'#ede9fe', tx:'#7c3aed' },
  LOGOUT  : { bg:'#f3f4f6', tx:'#6b7280' },
  SETTING : { bg:'#e0f2fe', tx:'#0369a1' },
};

/**
 * Catat satu entri audit ke Supabase.
 * @param {string} action   - dari AUDIT_ACTION
 * @param {string} entity   - nama tabel / modul
 * @param {string} entityId - id record (boleh null)
 * @param {string} description - kalimat singkat
 * @param {object} oldData  - data sebelum diubah (untuk EDIT/HAPUS)
 * @param {object} newData  - data sesudah diubah (untuk TAMBAH/EDIT)
 */

// Cek tabel activity_log — tampilkan SQL panduan jika belum ada
async function checkAuditTable(){
  try {
    const { error } = await supa.from('activity_log').select('id').limit(1);
    if(error && (error.code==='42P01'||error.message.includes('does not exist'))){
      console.error(`
╔══════════════════════════════════════════════════════════════╗
║  ⚠️  TABEL activity_log BELUM DIBUAT DI SUPABASE!            ║
║  Jalankan SQL berikut di Supabase → SQL Editor:             ║
╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS activity_log (
  id          bigserial PRIMARY KEY,
  created_at  timestamptz DEFAULT now(),
  user_email  text,
  user_label  text,
  action      text,
  entity      text,
  entity_id   text,
  description text,
  old_data    jsonb,
  new_data    jsonb
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_insert" ON activity_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "allow_select" ON activity_log FOR SELECT TO authenticated USING (true);
      `);
      showToast('⚠️ Tabel activity_log belum dibuat — cek console untuk SQL panduan','warning');
      return false;
    }
    return true;
  } catch(e){ console.warn('checkAuditTable:', e.message); return false; }
}

async function logAudit(action, entity, entityId, description, oldData=null, newData=null){
  try {
    if(!session) { console.warn('logAudit: session belum ada, log dilewati'); return; }
    const { error } = await supa.from('activity_log').insert({
      user_email  : session.email  || '–',
      user_label  : session.label  || session.email || '–',
      action,
      entity,
      entity_id   : entityId ? String(entityId) : null,
      description,
      old_data    : oldData  ? oldData  : null,
      new_data    : newData  ? newData  : null,
    });
    if(error){
      // Tampilkan error jelas — kemungkinan tabel belum dibuat
      console.error(`logAudit GAGAL [${action}/${entity}]:`, error.message);
      if(error.message.includes('does not exist') || error.code === '42P01'){
        console.error('⚠️ Tabel activity_log belum dibuat di Supabase! Jalankan SQL di README.');
      }
    }
  } catch(e){
    console.warn('logAudit error:', e.message);
  }
}

// ═══════════════════════════════════════════════════
// RENDER HALAMAN AUDIT TRAIL
// ═══════════════════════════════════════════════════

let _auditPage    = 1;
const _AUDIT_PER_PAGE = 50;
let _auditFilter  = { action:'', entity:'', user:'', search:'' };

async function renderAuditTrail(){
  const container = document.getElementById('audit-container');
  if(!container) return;

  // Hanya admin
  if(session?.role !== 'admin'){
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--tx3)">⛔ Hanya administrator yang dapat melihat Audit Trail.</div>`;
    return;
  }

  container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--tx3)">Memuat log aktivitas...</div>`;

  try {
    let query = supa.from('activity_log')
      .select('*', { count:'exact' })
      .order('created_at', { ascending:false })
      .range((_auditPage-1)*_AUDIT_PER_PAGE, _auditPage*_AUDIT_PER_PAGE - 1);

    if(_auditFilter.action) query = query.eq('action', _auditFilter.action);
    if(_auditFilter.entity) query = query.eq('entity', _auditFilter.entity);
    if(_auditFilter.user)   query = query.ilike('user_label', `%${_auditFilter.user}%`);
    if(_auditFilter.search) query = query.ilike('description', `%${_auditFilter.search}%`);

    const { data, error, count } = await query;
    if(error) throw new Error(error.message);

    const totalPages = Math.ceil((count||0) / _AUDIT_PER_PAGE);

    const rows = (data||[]).map(log => {
      const badge = AUDIT_BADGE[log.action] || { bg:'#f3f4f6', tx:'#6b7280' };
      const entityLabel = AUDIT_ENTITY_LABEL[log.entity] || log.entity || '–';
      const tgl = log.created_at ? new Date(log.created_at).toLocaleString('id-ID',{
        day:'2-digit', month:'short', year:'numeric',
        hour:'2-digit', minute:'2-digit', second:'2-digit'
      }) : '–';

      // Tombol detail hanya jika ada old/new data
      const hasDetail = log.old_data || log.new_data;
      const detailBtn = hasDetail
        ? `<button class="btn btn-sm" style="font-size:10px;padding:2px 8px"
             onclick="showAuditDetail(${log.id})">Detail</button>`
        : '';

      return `<tr>
        <td style="padding:8px 10px;font-size:11px;color:var(--tx3);white-space:nowrap">${tgl}</td>
        <td style="padding:8px 10px;font-size:12px;font-weight:600">${log.user_label||'–'}</td>
        <td style="padding:8px 10px">
          <span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;
            background:${badge.bg};color:${badge.tx}">${log.action}</span>
        </td>
        <td style="padding:8px 10px;font-size:11px;color:var(--tx2)">${entityLabel}</td>
        <td style="padding:8px 10px;font-size:12px">${log.description||'–'}</td>
        <td style="padding:8px 10px;text-align:center">${detailBtn}</td>
      </tr>`;
    }).join('');

    const emptyRow = !rows
      ? `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--tx3)">Tidak ada log aktivitas ditemukan.</td></tr>`
      : '';

    // Pagination info
    const from = (((_auditPage-1)*_AUDIT_PER_PAGE)+1);
    const to   = Math.min(_auditPage*_AUDIT_PER_PAGE, count||0);
    const paginasiInfo = count > 0
      ? `<span style="font-size:11px;color:var(--tx3)">Menampilkan ${from}–${to} dari ${count} log</span>`
      : `<span style="font-size:11px;color:var(--tx3)">0 log ditemukan</span>`;

    container.innerHTML = `
      <!-- Filter bar -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
        <input type="text" placeholder="Cari deskripsi..." id="audit-s-desc" value="${_auditFilter.search}"
          style="flex:1;min-width:160px;font-size:12px;padding:6px 10px"
          oninput="auditSetFilter('search',this.value)">
        <select id="audit-s-action" style="font-size:12px;padding:6px 10px" onchange="auditSetFilter('action',this.value)">
          <option value="">Semua Aksi</option>
          ${Object.keys(AUDIT_ACTION).map(a=>`<option value="${a}" ${_auditFilter.action===a?'selected':''}>${a}</option>`).join('')}
        </select>
        <select id="audit-s-entity" style="font-size:12px;padding:6px 10px" onchange="auditSetFilter('entity',this.value)">
          <option value="">Semua Modul</option>
          ${Object.entries(AUDIT_ENTITY_LABEL).map(([k,v])=>`<option value="${k}" ${_auditFilter.entity===k?'selected':''}>${v}</option>`).join('')}
        </select>
        <input type="text" placeholder="Filter pengguna..." id="audit-s-user" value="${_auditFilter.user}"
          style="width:140px;font-size:12px;padding:6px 10px"
          oninput="auditSetFilter('user',this.value)">
        <button class="btn" style="font-size:11px" onclick="exportAuditExcel()">⬇ Export Excel</button>
      </div>

      <!-- Tabel -->
      <div style="overflow-x:auto;border:1px solid var(--bd);border-radius:8px">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:var(--bg2)">
              <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--tx2);text-transform:uppercase;letter-spacing:.04em;white-space:nowrap">Waktu</th>
              <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--tx2);text-transform:uppercase;letter-spacing:.04em">Pengguna</th>
              <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--tx2);text-transform:uppercase;letter-spacing:.04em">Aksi</th>
              <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--tx2);text-transform:uppercase;letter-spacing:.04em">Modul</th>
              <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--tx2);text-transform:uppercase;letter-spacing:.04em">Keterangan</th>
              <th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:var(--tx2);text-transform:uppercase;letter-spacing:.04em"></th>
            </tr>
          </thead>
          <tbody>${rows||emptyRow}</tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;flex-wrap:wrap;gap:8px">
        ${paginasiInfo}
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" ${_auditPage<=1?'disabled':''} onclick="auditGoPage(${_auditPage-1})">‹ Prev</button>
          <span style="font-size:11px;padding:4px 8px;background:var(--bg2);border-radius:6px">
            Hal ${_auditPage} / ${totalPages||1}
          </span>
          <button class="btn btn-sm" ${_auditPage>=totalPages?'disabled':''} onclick="auditGoPage(${_auditPage+1})">Next ›</button>
        </div>
      </div>`;

    // Simpan data ke cache untuk export
    window._auditData = data || [];

  } catch(e){
    container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--red-tx)">
      Gagal memuat log: ${e.message}<br>
      <small style="color:var(--tx3)">Pastikan tabel <code>activity_log</code> sudah dibuat di Supabase.</small>
    </div>`;
  }
}

// Debounce filter agar tidak spam query
let _auditFilterTimer = null;
function auditSetFilter(key, val){
  _auditFilter[key] = val;
  _auditPage = 1;
  clearTimeout(_auditFilterTimer);
  _auditFilterTimer = setTimeout(renderAuditTrail, 400);
}

function auditGoPage(p){
  _auditPage = p;
  renderAuditTrail();
}

// Modal detail perubahan data
function showAuditDetail(logId){
  const log = (window._auditData||[]).find(l=>l.id===logId);
  if(!log) return;

  const badge  = AUDIT_BADGE[log.action] || { bg:'#f3f4f6', tx:'#6b7280' };
  const entity = AUDIT_ENTITY_LABEL[log.entity] || log.entity || '–';
  const tgl    = log.created_at ? new Date(log.created_at).toLocaleString('id-ID',{
    weekday:'long', day:'2-digit', month:'long', year:'numeric',
    hour:'2-digit', minute:'2-digit', second:'2-digit'
  }) : '–';

  // Inisial pengguna
  const inisial = (log.user_label||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  // Render baris detail (pakai style .dr seperti detail pegawai)
  const dr = (l,v) => `
    <div class="dr">
      <span class="dr-l">${l}</span>
      <span class="dr-v">${v||'—'}</span>
    </div>`;

  // Render JSON sebagai tabel baris per field (lebih rapi dari pre)
  const renderDataTable = (obj) => {
    if(!obj || typeof obj !== 'object') return `<div style="font-size:11px;color:var(--tx3);padding:6px 0">Tidak ada data</div>`;
    const entries = Object.entries(obj).filter(([,v]) => v !== null && v !== undefined && v !== '');
    if(!entries.length) return `<div style="font-size:11px;color:var(--tx3);padding:6px 0">—</div>`;
    return entries.map(([k,v]) => {
      const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
      const display = val.length > 60 ? `<span title="${val}">${val.slice(0,60)}…</span>` : val;
      return `<div class="dr">
        <span class="dr-l" style="color:var(--tx3);font-size:11px">${k}</span>
        <span class="dr-v" style="font-size:11px;max-width:65%;word-break:break-word">${display}</span>
      </div>`;
    }).join('');
  };

  // Tentukan apakah ada perubahan untuk ditampilkan diff
  const hasOld = log.old_data && Object.keys(log.old_data).length > 0;
  const hasNew = log.new_data && Object.keys(log.new_data).length > 0;

  // Highlight field yang berubah antara old dan new
  const renderDiff = (oldObj, newObj) => {
    if(!oldObj || !newObj) return null;
    const allKeys = [...new Set([...Object.keys(oldObj), ...Object.keys(newObj)])];
    const changed = allKeys.filter(k => JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k]));
    if(!changed.length) return null;
    return `
      <div class="dc" style="margin-top:12px">
        <div class="dc-title">🔄 Field yang Berubah</div>
        ${changed.map(k => {
          const ov = oldObj[k]!=null ? String(oldObj[k]) : '—';
          const nv = newObj[k]!=null ? String(newObj[k]) : '—';
          return `<div class="dr">
            <span class="dr-l">${k}</span>
            <span class="dr-v" style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">
              <span style="font-size:10px;color:var(--red-tx);text-decoration:line-through">${ov.length>40?ov.slice(0,40)+'…':ov}</span>
              <span style="font-size:11px;color:var(--grn-tx)">${nv.length>40?nv.slice(0,40)+'…':nv}</span>
            </span>
          </div>`;
        }).join('')}
      </div>`;
  };

  const diffHtml = renderDiff(log.old_data, log.new_data) || '';

  document.getElementById('modal-title').textContent = 'Detail Aktivitas';
  document.getElementById('modal-body').innerHTML = `
    <!-- Header seperti detail pegawai -->
    <div class="detail-hdr" style="margin-bottom:12px">
      <div class="av-lg" style="background:linear-gradient(135deg,${badge.bg},${badge.bg});color:${badge.tx};border:2px solid ${badge.tx}30;font-size:13px">
        ${inisial}
      </div>
      <div style="flex:1">
        <div style="font-size:15px;font-weight:700;color:var(--tx1)">${log.user_label||'–'}</div>
        <div style="font-size:11px;color:var(--tx3);margin-top:2px">${log.user_email||'–'}</div>
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;
            background:${badge.bg};color:${badge.tx}">${log.action}</span>
          <span class="badge b-gray">${entity}</span>
          ${log.entity_id ? `<span style="font-size:10px;color:var(--tx3)">ID: ${log.entity_id}</span>` : ''}
        </div>
      </div>
    </div>

    <!-- Info waktu & deskripsi -->
    <div class="dc" style="margin-bottom:12px">
      <div class="dc-title">Informasi Aktivitas</div>
      ${dr('Waktu', tgl)}
      ${dr('Modul', entity)}
      ${dr('Aksi', `<span style="padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;background:${badge.bg};color:${badge.tx}">${log.action}</span>`)}
      ${dr('Keterangan', `<span style="text-align:right;line-height:1.5">${log.description||'–'}</span>`)}
    </div>

    <!-- Diff field berubah (jika EDIT) -->
    ${diffHtml}

    <!-- Data sebelum & sesudah -->
    <div class="detail-grid" style="margin-top:0">
      ${hasOld ? `
      <div class="dc">
        <div class="dc-title" style="color:var(--red-tx)">📋 Data Sebelum</div>
        ${renderDataTable(log.old_data)}
      </div>` : ''}
      ${hasNew ? `
      <div class="dc" style="${!hasOld?'grid-column:1/-1':''}">
        <div class="dc-title" style="color:var(--grn-tx)">✅ Data Sesudah</div>
        ${renderDataTable(log.new_data)}
      </div>` : ''}
      ${!hasOld && !hasNew ? `
      <div class="dc" style="grid-column:1/-1">
        <div class="dc-title">Data</div>
        <div style="font-size:12px;color:var(--tx3);padding:8px 0">Tidak ada detail data yang dicatat untuk aktivitas ini.</div>
      </div>` : ''}
    </div>`;

  document.getElementById('modal-footer').innerHTML = `<button class="btn" onclick="closeModal()">Tutup</button>`;
  document.getElementById('modal').style.display = 'flex';
}

// Export audit log ke Excel
async function exportAuditExcel(){
  try {
    showToast('Memuat semua log untuk export...','info');
    let query = supa.from('activity_log')
      .select('*')
      .order('created_at', { ascending:false })
      .limit(5000);

    if(_auditFilter.action) query = query.eq('action', _auditFilter.action);
    if(_auditFilter.entity) query = query.eq('entity', _auditFilter.entity);
    if(_auditFilter.user)   query = query.ilike('user_label', `%${_auditFilter.user}%`);
    if(_auditFilter.search) query = query.ilike('description', `%${_auditFilter.search}%`);

    const { data, error } = await query;
    if(error) throw new Error(error.message);

    const rows = (data||[]).map(l=>({
      'Waktu'      : l.created_at ? new Date(l.created_at).toLocaleString('id-ID') : '–',
      'Pengguna'   : l.user_label || '–',
      'Email'      : l.user_email || '–',
      'Aksi'       : l.action || '–',
      'Modul'      : AUDIT_ENTITY_LABEL[l.entity] || l.entity || '–',
      'ID Record'  : l.entity_id || '–',
      'Keterangan' : l.description || '–',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Trail');
    XLSX.writeFile(wb, `audit_trail_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast(`✅ Export ${rows.length} log berhasil`,'success');
  } catch(e){
    showToast('Gagal export: '+e.message,'error');
  }
}
