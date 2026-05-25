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

  const fmtJSON = obj => obj
    ? `<pre style="font-size:11px;background:var(--bg2);padding:10px;border-radius:6px;overflow:auto;max-height:220px;margin:0">${JSON.stringify(obj,null,2)}</pre>`
    : `<div style="font-size:11px;color:var(--tx3);padding:6px 0">–</div>`;

  document.getElementById('modal-title').textContent = 'Detail Perubahan Data';
  document.getElementById('modal-body').innerHTML = `
    <div style="font-size:12px;margin-bottom:12px">
      <strong>Aksi:</strong> ${log.action} &nbsp;|&nbsp;
      <strong>Modul:</strong> ${AUDIT_ENTITY_LABEL[log.entity]||log.entity} &nbsp;|&nbsp;
      <strong>Oleh:</strong> ${log.user_label}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--tx2);margin-bottom:6px">DATA SEBELUM</div>
        ${fmtJSON(log.old_data)}
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--tx2);margin-bottom:6px">DATA SESUDAH</div>
        ${fmtJSON(log.new_data)}
      </div>
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
