// ═══════════════════════════════════════════════════════════════
// CUTI MODULE V2 — Pengajuan Cuti + WA Fonnte + Mandiri
// ═══════════════════════════════════════════════════════════════

const JENIS_CUTI = [
  'Cuti Tahunan',
  'Cuti Sakit',
  'Cuti Melahirkan',
  'Cuti Besar',
  'Cuti Alasan Penting',
  'Cuti Di Luar Tanggungan Negara',
];

// ── Hari libur nasional 2025–2026 ─────────────────────────────
const HARI_LIBUR = {
  '2025':['2025-01-01','2025-01-27','2025-01-28','2025-01-29','2025-03-28','2025-03-29',
          '2025-03-31','2025-04-01','2025-04-18','2025-05-01','2025-05-12','2025-05-13',
          '2025-05-29','2025-06-01','2025-06-06','2025-07-07','2025-08-17','2025-09-05',
          '2025-10-02','2025-12-25','2025-12-26'],
  '2026':['2026-01-01','2026-02-17','2026-03-20','2026-04-02','2026-04-03','2026-05-01',
          '2026-05-14','2026-05-25','2026-06-01','2026-06-22','2026-08-17','2026-10-23',
          '2026-12-25']
};

function getLiburSet(yr){ return new Set(HARI_LIBUR[String(yr)]||[]); }

function parseDateLocal(str){
  if(!str) return null;
  const [y,m,d]=str.split('-').map(Number);
  return new Date(y,m-1,d);
}
function fmtDateLocal(dt){
  return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
}

function hitungHariKerja(s,e){
  if(!s||!e) return 0;
  const parseLoc=str=>{ const [y,m,d]=str.split('-').map(Number); return new Date(y,m-1,d); };
  const start=parseLoc(s), end=parseLoc(e);
  if(end<start) return 0;
  const liburSet=new Set([...Array.from(getLiburSet(start.getFullYear())),...Array.from(getLiburSet(end.getFullYear()))]);
  let n=0; const cur=new Date(start);
  while(cur<=end){
    const dow=cur.getDay();
    const ds=cur.getFullYear()+'-'+String(cur.getMonth()+1).padStart(2,'0')+'-'+String(cur.getDate()).padStart(2,'0');
    if(dow!==0&&dow!==6&&!liburSet.has(ds)) n++;
    cur.setDate(cur.getDate()+1);
  }
  return n;
}

// ── Storage ───────────────────────────────────────────────────
let DEF_ALOKASI=12;
function saveCuti(){} function loadCuti(){ DB.cuti=[]; }
let CARRY_OVER_ENABLED=true, CARRY_OVER_MAX=999;
function saveAlokasi(){} function loadAlokasi(){ DB.alokasi={}; }

function getAlokasiTahun(asnId,tahun){ return DB.alokasi?.[asnId]?.[tahun]?.alokasi??DEF_ALOKASI; }
function getTerpakaiTahun(asnId,tahun){ return DB.cuti.filter(c=>c.asn_id===asnId&&c.status==='approved'&&c.tahun===tahun).reduce((s,c)=>s+(c.hari_kerja||0),0); }
function getSisaMurni(asnId,tahun){ return Math.max(0,getAlokasiTahun(asnId,tahun)-getTerpakaiTahun(asnId,tahun)); }
function getCarryOver(asnId,tahun){
  if(!CARRY_OVER_ENABLED) return 0;
  const ovr=DB.alokasi?.[asnId]?.[tahun]?.carryover_override;
  if(ovr!==undefined&&ovr!==null) return Math.max(0,ovr);
  return Math.min(getSisaMurni(asnId,tahun-1),CARRY_OVER_MAX);
}
function getTotalAlokasi(asnId,tahun){ return getAlokasiTahun(asnId,tahun)+getCarryOver(asnId,tahun); }
function getSisaTahun(asnId,tahun){ return Math.max(0,getTotalAlokasi(asnId,tahun)-getTerpakaiTahun(asnId,tahun)); }
function generateNoSurat(){
  const yr=new Date().getFullYear();
  const n=DB.cuti.filter(c=>c.status==='approved'&&c.tahun===yr).length+1;
  return `${String(n).padStart(3,'0')}/CUTI/BPKAD/${yr}`;
}

function updateCutiBadge(){
  const n=DB.cuti.filter(c=>c.status==='step1'||c.status==='step2').length;
  const el=document.getElementById('cuti-badge');
  if(el) el.textContent=n||0;
}

// ═══════════════════════════════════════════════════════════════
// FONNTE — Kirim WA dengan template dari database
// ═══════════════════════════════════════════════════════════════
let WA_TEMPLATES = {};

async function loadWATemplates(){
  const keys = ['wa_tmpl_pengajuan','wa_tmpl_step1','wa_tmpl_step1_pegawai',
                 'wa_tmpl_step2','wa_tmpl_approved','wa_tmpl_rejected'];
  const { data } = await supa.from('settings')
    .select('setting_key,setting_val')
    .in('setting_key', keys);
  if(data) data.forEach(r=>{ WA_TEMPLATES[r.setting_key]=r.setting_val; });
}

function renderTemplate(tmpl, data){
  if(!tmpl) return '';
  return tmpl
    .replace(/{nama}/g,         data.nama        || '—')
    .replace(/{nip}/g,          data.nip         || '—')
    .replace(/{jenis_cuti}/g,   data.jenis_cuti  || 'Cuti Tahunan')
    .replace(/{tgl_mulai}/g,    fmt(data.tgl_mulai)  || '—')
    .replace(/{tgl_selesai}/g,  fmt(data.tgl_selesai) || '—')
    .replace(/{hari_kerja}/g,   data.hari_kerja  || '—')
    .replace(/{no_surat}/g,     data.no_surat    || '—')
    .replace(/{alasan}/g,       data.alasan      || '—')
    .replace(/{disetujui_oleh}/g, data.disetujui_oleh || '—')
    .replace(/{sisa_cuti}/g,    data.sisa_cuti   || '—');
}

function getCutiData(c, extra={}){
  const asnId = c.asn_id;
  const tahun = c.tahun || new Date().getFullYear();
  const sisa  = getSisaTahun(asnId, tahun);
  return { ...c, sisa_cuti: sisa, ...extra };
}

async function kirimWA(target, pesan){
  if(!FONNTE_TOKEN){ console.warn('FONNTE_TOKEN belum diisi'); return false; }
  if(!target) return false;
  let nomor = target.replace(/\D/g,'');
  if(nomor.startsWith('0')) nomor='62'+nomor.slice(1);
  try{
    const res = await fetch('https://api.fonnte.com/send',{
      method:'POST',
      headers:{ 'Authorization': FONNTE_TOKEN },
      body: new URLSearchParams({ target: nomor, message: pesan, countryCode:'62' })
    });
    const data = await res.json();
    return data.status === true;
  } catch(e){ console.error('WA error:',e); return false; }
}

// ═══════════════════════════════════════════════════════════════
// RENDER TABLE
// ═══════════════════════════════════════════════════════════════
function renderCutiPage(){
  const unitSel=document.getElementById('cuti-f-unit');
  if(unitSel&&unitSel.options.length<=1)
    Object.keys(UNITS).forEach(u=>unitSel.add(new Option(u,u)));
  const yearSel=document.getElementById('cuti-f-year');
  if(yearSel&&yearSel.options.length<=1){
    const yrs=[...new Set(DB.cuti.map(c=>c.tahun))].sort((a,b)=>b-a);
    if(!yrs.includes(new Date().getFullYear())) yrs.unshift(new Date().getFullYear());
    yrs.forEach(y=>yearSel.add(new Option(y,y)));
  }
  renderCutiTable();
  ['cuti-search','cuti-f-unit','cuti-f-status','cuti-f-year'].forEach(id=>{
    const el=document.getElementById(id);
    if(el&&!el._cw){ el.addEventListener('input',renderCutiTable); el.addEventListener('change',renderCutiTable); el._cw=true; }
  });
}

function renderCutiTable(){
  const q=(document.getElementById('cuti-search')?.value||'').toLowerCase();
  const unit=document.getElementById('cuti-f-unit')?.value||'';
  const stat=document.getElementById('cuti-f-status')?.value||'';
  const yr=document.getElementById('cuti-f-year')?.value||'';
  const isAdmin=session?.role==='admin';

  let data=[...DB.cuti].filter(c=>{
    // User biasa hanya lihat pengajuan milik sendiri (by email)
    if(!isAdmin && c.diajukan_oleh && c.diajukan_oleh!=='admin' && c.diajukan_oleh!==session?.email) return false;
    if(q&&!c.nama.toLowerCase().includes(q)&&!c.nip.includes(q)) return false;
    if(unit&&c.unit!==unit) return false;
    if(stat&&c.status!==stat) return false;
    if(yr&&String(c.tahun)!==yr) return false;
    return true;
  }).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

  document.getElementById('cuti-count').textContent=`Pengajuan Cuti (${data.length})`;
  updateCutiBadge();

  const heads=['No Surat','Nama / NIP','Jenis','Tgl Mulai','Tgl Selesai','Hari Kerja','Status','Approval','Aksi'];
  const th=document.getElementById('cuti-thead');
  if(th) th.innerHTML='<tr>'+(isAdmin?'<th style="width:32px"><input type="checkbox" id="chk-all-cuti" onchange="toggleAllCutiCheck(this)" style="accent-color:var(--primary)"></th>':'')+heads.map(h=>`<th>${h}</th>`).join('')+'</tr>';

  const pg=pageNums['cuti']||1, pages=Math.ceil(data.length/PER_PAGE)||1, cur=Math.min(pg,pages);
  pageNums['cuti']=cur;
  const slice=data.slice((cur-1)*PER_PAGE,cur*PER_PAGE);

  const tb=document.getElementById('cuti-tbody');
  if(tb) tb.innerHTML=slice.length
    ? slice.map(c=>`<tr>
        ${isAdmin?`<td style="width:32px"><input type="checkbox" class="cuti-chk" value="${c.id}" style="accent-color:var(--primary)"></td>`:''}
        <td class="td-mono" style="font-size:10px">${c.no_surat||'—'}</td>
        <td><div style="font-weight:600;font-size:12px">${c.nama}</div><div class="emp-av-nip">${c.nip}</div></td>
        <td style="font-size:11px">${c.jenis_cuti||'Cuti Tahunan'}</td>
        <td style="font-size:11px">${fmt(c.tgl_mulai)}</td>
        <td style="font-size:11px">${fmt(c.tgl_selesai)}</td>
        <td style="text-align:center"><span class="badge b-blue">${c.hari_kerja} hari</span></td>
        <td>${cutiStatusBadge(c.status)}</td>
        <td>${cutiApprovalMini(c)}</td>
        <td style="white-space:nowrap;display:flex;gap:4px;flex-wrap:wrap">
          <button class="btn btn-sm" onclick="openCutiDetail('${c.id}')">Detail</button>
          ${c.status==='approved'?`<button class="btn btn-sm btn-success" onclick="cetakSuratCuti('${c.id}')">Cetak</button>`:''}
          ${c.status==='draft'&&(isAdmin||c.diajukan_oleh===session?.email)?`<button class="btn btn-sm" onclick="openAjukanCuti('${c.id}')">Edit</button>`:''}
          ${['draft','step1'].includes(c.status)&&isAdmin?`<button class="btn btn-sm btn-danger" onclick="batalkanCuti('${c.id}')">Batal</button>`:''}
          ${isAdmin?`<button class="btn btn-sm btn-danger" onclick="hapusCuti('${c.id}')" title="Hapus permanen">🗑</button>`:''}
        </td>
      </tr>`).join('')
    : `<tr><td colspan="${heads.length+(isAdmin?1:0)}" style="text-align:center;color:var(--tx3);padding:24px">Belum ada pengajuan cuti</td></tr>`;

  const pgEl=document.getElementById('cuti-pg');
  if(pgEl){
    let h=`<span class="pg-info">${data.length} pengajuan</span>`;
    if(cur>1) h+=`<button class="pg-btn" onclick="pageNums.cuti=${cur-1};renderCutiTable()">‹</button>`;
    for(let i=Math.max(1,cur-2);i<=Math.min(pages,cur+2);i++) h+=`<button class="pg-btn${i===cur?' active':''}" onclick="pageNums.cuti=${i};renderCutiTable()">${i}</button>`;
    if(cur<pages) h+=`<button class="pg-btn" onclick="pageNums.cuti=${cur+1};renderCutiTable()">›</button>`;
    pgEl.innerHTML=h;
  }
}

function cutiStatusBadge(s){
  const m={draft:'<span class="badge b-draft">Draft</span>',step1:'<span class="badge b-step1">Menunggu Kasubbag</span>',step2:'<span class="badge b-step2">Menunggu Kabid</span>',approved:'<span class="badge b-approved">Disetujui</span>',rejected:'<span class="badge b-rejected">Ditolak</span>',cancelled:'<span class="badge b-cancelled">Dibatalkan</span>'};
  return m[s]||`<span class="badge b-gray">${s}</span>`;
}
function cutiApprovalMini(c){
  const icon=s=>s==='done'?'✓':s==='rejected'?'✗':s==='active'?'●':'○';
  const cls=s=>s==='done'?'b-green':s==='active'?'b-blue':s==='rejected'?'b-red':'b-gray';
  const s1=c.status==='step2'||c.status==='approved'?'done':c.status==='step1'?'active':c.status==='rejected'&&c.step===1?'rejected':'pending';
  const s2=c.status==='approved'?'done':c.status==='step2'?'active':c.status==='rejected'&&c.step===2?'rejected':'pending';
  const s3=c.status==='approved'?'done':c.status==='rejected'&&c.step===3?'rejected':'pending';
  return `<div style="display:flex;gap:3px;align-items:center;font-size:10px;flex-wrap:wrap">
    <span class="badge ${cls(s1)}" style="padding:1px 5px">${icon(s1)} Kasubbag</span>
    <span style="color:var(--tx3)">›</span>
    <span class="badge ${cls(s2)}" style="padding:1px 5px">${icon(s2)} Kabid</span>
    <span style="color:var(--tx3)">›</span>
    <span class="badge ${cls(s3)}" style="padding:1px 5px">${icon(s3)} Admin</span>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// FORM PENGAJUAN
// ═══════════════════════════════════════════════════════════════
let _calState={ month:new Date().getMonth(), year:new Date().getFullYear(), start:null, end:null };

function openAjukanCuti(editId=null){
  const isAdmin = session?.role==='admin';
  const ex = editId ? DB.cuti.find(c=>c.id===editId) : null;

  // User biasa hanya bisa ajukan untuk dirinya sendiri
  let asnOpts='';
  if(isAdmin){
    asnOpts=DB.asn.map(a=>`<option value="${a.id}" data-nip="${a.nip}" data-hp="${a.no_hp||''}"${ex?.asn_id===a.id?' selected':''}>${a.nama} — ${a.nip}</option>`).join('');
  } else {
    // Cari ASN berdasarkan email session — user hanya lihat dirinya
    const asnSelf = DB.asn.find(a=>a.email===session?.email);
    if(!asnSelf){ showToast('Data ASN Anda tidak ditemukan. Hubungi admin.','error'); return; }
    asnOpts=`<option value="${asnSelf.id}" data-nip="${asnSelf.nip}" data-hp="${asnSelf.no_hp||''}" selected>${asnSelf.nama} — ${asnSelf.nip}</option>`;
  }

  document.getElementById('modal-title').textContent=editId?'Edit Pengajuan Cuti':'Ajukan Cuti Baru';
  document.getElementById('modal-box').style.maxWidth='860px';
  const initS=ex?.tgl_mulai||'', initE=ex?.tgl_selesai||'';
  const jenisSel=JENIS_CUTI.map(j=>`<option value="${j}"${(ex?.jenis_cuti||'Cuti Tahunan')===j?' selected':''}>${j}</option>`).join('');

  document.getElementById('modal-body').innerHTML=`
    <div style="display:grid;grid-template-columns:1.1fr 1fr;gap:18px">
      <div>
        <div class="fg" style="margin-bottom:11px">
          <label>Pegawai ASN *</label>
          <select id="ca-asn" style="width:100%" onchange="onCaAsnChange()" ${!isAdmin?'disabled':''}>${asnOpts}</select>
        </div>
        <div class="form-grid" style="margin-bottom:11px">
          <div class="fg">
            <label>Jenis Cuti *</label>
            <select id="ca-jenis" style="width:100%">${jenisSel}</select>
          </div>
        </div>
        <div id="ca-alokasi-info" style="font-size:11px;background:var(--bg2);border-radius:8px;padding:10px 12px;margin-bottom:11px;min-height:44px"></div>
        <div class="form-grid" style="margin-bottom:11px">
          <div class="fg">
            <label>Tanggal Mulai *</label>
            <input type="date" id="ca-mulai" value="${initS}" oninput="onCaDateChange()">
          </div>
          <div class="fg">
            <label>Tanggal Selesai *</label>
            <input type="date" id="ca-selesai" value="${initE}" oninput="onCaDateChange()">
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--primary-bg);border-radius:9px;margin-bottom:11px">
          <div>
            <div style="font-size:10px;color:var(--tx2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px">Hari Kerja</div>
            <div id="ca-hari" style="font-size:28px;font-weight:700;color:var(--primary);line-height:1">${ex?.hari_kerja||'—'}</div>
          </div>
          <div id="ca-hari-note" style="flex:1;font-size:11px;color:var(--tx2)">Pilih tanggal mulai dan selesai</div>
          <div id="ca-sisa-chip" style="font-size:11px;text-align:right"></div>
        </div>
        <div class="fg" style="margin-bottom:11px">
          <label>Keperluan / Keterangan</label>
          <textarea id="ca-keperluan" rows="3" style="width:100%;resize:none" placeholder="Uraikan keperluan cuti...">${ex?.keperluan||''}</textarea>
        </div>
        <div class="fg" style="margin-bottom:11px">
          <label>Alamat Selama Cuti</label>
          <input type="text" id="ca-alamat" value="${ex?.alamat||''}" placeholder="Alamat lengkap selama menjalani cuti">
        </div>
        <!-- Nomor WA untuk notifikasi -->
        <div style="background:var(--grn-bg);border:1px solid var(--grn-bd);border-radius:9px;padding:12px;margin-bottom:4px">
          <div style="font-size:11px;font-weight:700;color:var(--grn-tx);margin-bottom:8px">📱 Notifikasi WhatsApp (opsional)</div>
          <div class="form-grid">
            <div class="fg">
              <label>No WA Pegawai</label>
              <input type="text" id="ca-wa-pegawai" value="${ex?.wa_pegawai||''}" placeholder="cth: 08123456789">
            </div>
            <div class="fg">
              <label>No WA Kepala Subbagian</label>
              <input type="text" id="ca-wa-atasan1" value="${ex?.wa_atasan1||''}" placeholder="cth: 08123456789">
            </div>
            <div class="fg full">
              <label>No WA Kepala Bidang</label>
              <input type="text" id="ca-wa-atasan2" value="${ex?.wa_atasan2||''}" placeholder="cth: 08123456789">
            </div>
          </div>
        </div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--tx2);margin-bottom:7px;text-transform:uppercase;letter-spacing:.04em">Pilih Tanggal di Kalender</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
          <button class="btn btn-sm" onclick="moveCalendar(-1)">‹</button>
          <span id="cal-lbl" style="font-size:12px;font-weight:600;color:var(--tx1)"></span>
          <button class="btn btn-sm" onclick="moveCalendar(1)">›</button>
        </div>
        <div class="cuti-cal" id="cuti-cal-grid"></div>
        <div style="margin-top:9px;display:flex;flex-wrap:wrap;gap:6px;font-size:10px;color:var(--tx2)">
          <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--primary);margin-right:3px;vertical-align:middle"></span>Dipilih</span>
          <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--primary-bg);margin-right:3px;vertical-align:middle"></span>Rentang</span>
          <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--red-bg);margin-right:3px;vertical-align:middle"></span>Hari Libur</span>
          <span style="color:var(--red-tx);font-weight:700">S M</span><span>= Sabtu/Minggu</span>
        </div>
      </div>
    </div>`;

  document.getElementById('modal-footer').innerHTML=`
    <button class="btn" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="simpanCuti(${editId?`'${editId}'`:'null'})">
      ${editId?'Simpan Perubahan':'Ajukan Cuti'}
    </button>`;

  document.getElementById('modal').style.display='flex';
  _calState={ month:new Date().getMonth(), year:new Date().getFullYear(),
    start:initS?parseDateLocal(initS):null, end:initE?parseDateLocal(initE):null };
  renderCalendar();
  onCaAsnChange();
  if(initS&&initE) onCaDateChange();
}

function onCaAsnChange(){
  const sel=document.getElementById('ca-asn'); if(!sel?.value) return;
  const asn=DB.asn.find(a=>a.id===sel.value); if(!asn) return;
  // Auto-isi nomor WA pegawai jika ada
  const waEl=document.getElementById('ca-wa-pegawai');
  if(waEl&&!waEl.value&&asn.no_hp) waEl.value=asn.no_hp;
  const yr=new Date().getFullYear();
  const al=getAlokasiTahun(asn.id,yr), tp=getTerpakaiTahun(asn.id,yr), ss=getSisaTahun(asn.id,yr);
  const pct=Math.min(100,Math.round(tp/al*100));
  const col=ss<=3?'var(--red-tx)':ss<=7?'var(--amb-tx)':'var(--grn-tx)';
  document.getElementById('ca-alokasi-info').innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
      <span style="font-weight:600;font-size:11px">Sisa Cuti ${yr}</span>
      <span style="font-size:13px;font-weight:700;color:${col}">${ss} <span style="font-size:10px;font-weight:400;color:var(--tx3)">/ ${al} hari</span></span>
    </div>
    <div class="leave-bar-track"><div class="leave-bar-fill" style="width:${pct}%;background:${col}"></div></div>
    <div style="font-size:10px;color:var(--tx3);margin-top:3px">${tp} hari terpakai · ${al} hari alokasi</div>`;
  checkSisaWarning();
}

function onCaDateChange(){
  const s=document.getElementById('ca-mulai')?.value, e=document.getElementById('ca-selesai')?.value;
  const n=hitungHariKerja(s,e);
  const el=document.getElementById('ca-hari'); if(el) el.textContent=n||'—';
  const note=document.getElementById('ca-hari-note');
  if(note){
    if(s&&e&&n>0) note.textContent=`${n} hari kerja dari ${fmt(s)} s.d. ${fmt(e)}`;
    else if(s&&e&&n===0) note.innerHTML=`<span style="color:var(--red-tx)">Tidak ada hari kerja dalam rentang ini</span>`;
    else note.textContent='Pilih tanggal mulai dan selesai';
  }
  if(s) _calState.start=parseDateLocal(s);
  if(e) _calState.end=parseDateLocal(e);
  renderCalendar(); checkSisaWarning();
}

function checkSisaWarning(){
  const asnSel=document.getElementById('ca-asn'); if(!asnSel?.value) return;
  const hari=parseInt(document.getElementById('ca-hari')?.textContent)||0; if(!hari) return;
  const yr=new Date().getFullYear();
  const sisa=getSisaTahun(asnSel.value,yr);
  const chip=document.getElementById('ca-sisa-chip'); if(!chip) return;
  if(hari>sisa) chip.innerHTML=`<span style="color:var(--red-tx);font-weight:700">⚠ Melebihi sisa<br>${sisa} hari tersisa</span>`;
  else chip.innerHTML=`<span style="color:var(--grn-tx);font-weight:600">✓ Cukup<br>${sisa-hari} sisa</span>`;
}

function moveCalendar(dir){
  _calState.month+=dir;
  if(_calState.month>11){_calState.month=0;_calState.year++;}
  if(_calState.month<0){_calState.month=11;_calState.year--;}
  renderCalendar();
}

function renderCalendar(){
  const {month,year,start,end}=_calState;
  const libur=getLiburSet(year);
  const MNAMES=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const DAY_H=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const lbl=document.getElementById('cal-lbl'); if(lbl) lbl.textContent=`${MNAMES[month]} ${year}`;
  const grid=document.getElementById('cuti-cal-grid'); if(!grid) return;
  let h=DAY_H.map(d=>`<div class="cuti-cal-head">${d}</div>`).join('');
  const fd=new Date(year,month,1).getDay(), dim=new Date(year,month+1,0).getDate();
  for(let i=0;i<fd;i++) h+=`<div class="cuti-cal-day other-month"></div>`;
  for(let d=1;d<=dim;d++){
    const cur=new Date(year,month,d), dow=cur.getDay();
    const ds=cur.getFullYear()+'-'+String(cur.getMonth()+1).padStart(2,'0')+'-'+String(cur.getDate()).padStart(2,'0');
    const isWE=dow===0||dow===6, isHL=libur.has(ds);
    const isSt=start&&ds===fmtDateLocal(start), isEn=end&&ds===fmtDateLocal(end);
    const inRng=start&&end&&cur>start&&cur<end;
    let cls='cuti-cal-day';
    if(isWE) cls+=' weekend'; if(isHL) cls+=' holiday';
    if(isSt||isEn) cls+=' selected'; else if(inRng) cls+=' in-range';
    h+=`<div class="${cls}" onclick="pickDate('${ds}')">${d}</div>`;
  }
  grid.innerHTML=h;
}

function pickDate(ds){
  const d=parseDateLocal(ds);
  const mulai=document.getElementById('ca-mulai'), selesai=document.getElementById('ca-selesai');
  if(!_calState.start||(_calState.start&&_calState.end)){
    _calState.start=d; _calState.end=null;
    if(mulai) mulai.value=ds; if(selesai) selesai.value='';
    document.getElementById('ca-hari').textContent='—';
    document.getElementById('ca-hari-note').textContent='Pilih tanggal selesai';
  } else {
    if(d<_calState.start){_calState.end=_calState.start;_calState.start=d;}
    else _calState.end=d;
    if(mulai)   mulai.value=_calState.start.toISOString().slice(0,10);
    if(selesai) selesai.value=_calState.end.toISOString().slice(0,10);
    onCaDateChange();
  }
  renderCalendar();
}

async function simpanCuti(editId=null){
  const asnSel=document.getElementById('ca-asn');
  if(!asnSel?.value){ showToast('Pilih pegawai','error'); return; }
  const mulai=document.getElementById('ca-mulai')?.value;
  const selesai=document.getElementById('ca-selesai')?.value;
  if(!mulai||!selesai){ showToast('Isi tanggal mulai dan selesai','error'); return; }
  const hari=hitungHariKerja(mulai,selesai);
  if(hari<=0){ showToast('Tidak ada hari kerja dalam rentang ini','error'); return; }
  const asn=DB.asn.find(a=>a.id===asnSel.value);
  const keperluan=document.getElementById('ca-keperluan')?.value||'';
  const alamat=document.getElementById('ca-alamat')?.value||'';
  const jenis_cuti=document.getElementById('ca-jenis')?.value||'Cuti Tahunan';
  const wa_pegawai=document.getElementById('ca-wa-pegawai')?.value||'';
  const wa_atasan1=document.getElementById('ca-wa-atasan1')?.value||'';
  const wa_atasan2=document.getElementById('ca-wa-atasan2')?.value||'';
  const btn=document.querySelector('#modal-footer .btn-primary');
  if(btn){ btn.disabled=true; btn.textContent='Menyimpan...'; }
  try{
    let error, newId=editId;
    if(editId){
      ({error}=await supa.from('cuti').update({tgl_mulai:mulai,tgl_selesai:selesai,hari_kerja:hari,keperluan,alamat,jenis_cuti,wa_pegawai,wa_atasan1,wa_atasan2}).eq('id',editId));
    } else {
      const payload={
        asn_id:asn.id,nip:asn.nip,nama:asn.nama,unit:asn.unit,
        tgl_mulai:mulai,tgl_selesai:selesai,hari_kerja:hari,keperluan,alamat,
        jenis_cuti,wa_pegawai,wa_atasan1,wa_atasan2,
        status:'draft',step:0,tahun:new Date().getFullYear(),
        diajukan_oleh: session?.role==='admin' ? 'admin' : (session?.email||'admin')
      };
      const res=await supa.from('cuti').insert(payload).select().single();
      error=res.error; if(res.data) newId=res.data.id;
    }
    if(error) throw new Error(error.message);
    await loadCutiFromServer(); closeModal(); renderCutiTable(); updateCutiBadge();
    showToast(editId?'Pengajuan diperbarui':'Pengajuan cuti dibuat','success');
  }catch(e){ showToast('Error: '+e.message,'error'); }
  finally{ if(btn){ btn.disabled=false; btn.textContent=editId?'Simpan Perubahan':'Ajukan Cuti'; } }
}

// ═══════════════════════════════════════════════════════════════
// DETAIL & APPROVAL
// ═══════════════════════════════════════════════════════════════
function openCutiDetail(id){
  const c=DB.cuti.find(x=>x.id===id); if(!c) return;
  const asn=DB.asn.find(a=>a.id===c.asn_id);
  const yr=c.tahun||new Date().getFullYear();
  const al=getAlokasiTahun(c.asn_id,yr), tp=getTerpakaiTahun(c.asn_id,yr), ss=getSisaTahun(c.asn_id,yr);
  const pct=Math.min(100,Math.round(tp/al*100)), col=ss<=3?'var(--red-tx)':ss<=7?'var(--amb-tx)':'var(--grn-tx)';
  const isAdmin=session?.role==='admin';

  const steps=[
    {label:'Kepala Subbagian',by:c.step1_by,at:c.step1_at,note:c.step1_note},
    {label:'Kepala Bidang',   by:c.step2_by,at:c.step2_at,note:c.step2_note},
    {label:'Admin (Final)',   by:c.final_by,at:c.final_at,note:c.final_note},
  ];
  const stepState=(i)=>{
    if(c.status==='approved') return 'done';
    if(c.status==='step1'&&i===0) return 'active';
    if(c.status==='step2'&&i<=1) return i===0?'done':'active';
    if(c.status==='rejected'){
      if(i===0&&c.step===1) return 'rejected';
      if(i===1&&c.step===2) return 'rejected';
      if(i===2&&c.step===3) return 'rejected';
      if(c.step>i+1) return 'done';
    }
    return 'pending';
  };

  const actionBtns=()=>{
    if(!isAdmin) return '';
    if(c.status==='draft') return `<button class="btn btn-primary" onclick="ajukanStep1('${c.id}')">Ajukan ke Kepala Subbagian</button>`;
    if(c.status==='step1') return `
      <button class="btn btn-success" onclick="approveStep('${c.id}',1)">✓ Setujui (Kasubbag)</button>
      <button class="btn btn-danger"  onclick="rejectStep('${c.id}',1)">✗ Tolak</button>`;
    if(c.status==='step2') return `
      <button class="btn btn-success" onclick="approveStep('${c.id}',2)">✓ Setujui (Kabid)</button>
      <button class="btn btn-danger"  onclick="rejectStep('${c.id}',2)">✗ Tolak</button>
      <button class="btn btn-primary" onclick="approveStep('${c.id}',3)">✓ Final Admin</button>`;
    if(c.status==='approved') return `<button class="btn btn-success" onclick="cetakSuratCuti('${c.id}')">🖨 Cetak Surat</button>`;
    return '';
  };

  document.getElementById('cuti-detail-content').innerHTML=`
    <button class="btn btn-sm" onclick="showPage('cuti',document.querySelector('.ni.active'))" style="margin-bottom:14px">← Kembali ke Daftar</button>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="cc">
        <div class="cc-title"><span class="cc-title-dot"></span>Data Pegawai</div>
        <table style="font-size:12px;width:100%;border-collapse:collapse">
          <tr><td style="padding:4px 0;color:var(--tx3);width:120px">Nama</td><td style="font-weight:600">${c.nama}</td></tr>
          <tr><td style="padding:4px 0;color:var(--tx3)">NIP</td><td>${c.nip}</td></tr>
          <tr><td style="padding:4px 0;color:var(--tx3)">Unit</td><td>${c.unit||'—'}</td></tr>
          <tr><td style="padding:4px 0;color:var(--tx3)">Pangkat</td><td>${asn?.pangkat||'—'}</td></tr>
          <tr><td style="padding:4px 0;color:var(--tx3)">Jabatan</td><td>${asn?.jabatan||'—'}</td></tr>
        </table>
      </div>
      <div class="cc">
        <div class="cc-title"><span class="cc-title-dot" style="background:var(--grn-tx)"></span>Detail Cuti</div>
        <table style="font-size:12px;width:100%;border-collapse:collapse">
          <tr><td style="padding:4px 0;color:var(--tx3);width:120px">Jenis</td><td style="font-weight:600">${c.jenis_cuti||'Cuti Tahunan'}</td></tr>
          <tr><td style="padding:4px 0;color:var(--tx3)">Mulai</td><td>${fmt(c.tgl_mulai)}</td></tr>
          <tr><td style="padding:4px 0;color:var(--tx3)">Selesai</td><td>${fmt(c.tgl_selesai)}</td></tr>
          <tr><td style="padding:4px 0;color:var(--tx3)">Hari Kerja</td><td><span class="badge b-blue">${c.hari_kerja} hari</span></td></tr>
          <tr><td style="padding:4px 0;color:var(--tx3)">Status</td><td>${cutiStatusBadge(c.status)}</td></tr>
          <tr><td style="padding:4px 0;color:var(--tx3)">Keperluan</td><td>${c.keperluan||'—'}</td></tr>
          <tr><td style="padding:4px 0;color:var(--tx3)">Alamat</td><td>${c.alamat||'—'}</td></tr>
          ${c.no_surat?`<tr><td style="padding:4px 0;color:var(--tx3)">No. Surat</td><td style="font-weight:700;color:var(--primary)">${c.no_surat}</td></tr>`:''}
        </table>
      </div>
    </div>
    <!-- Alokasi -->
    <div class="cc" style="margin-bottom:16px">
      <div class="cc-title"><span class="cc-title-dot" style="background:var(--amb-tx)"></span>Alokasi Cuti ${yr}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:12px;color:var(--tx2)">Sisa Cuti</span>
        <span style="font-size:16px;font-weight:700;color:${col}">${ss} <span style="font-size:11px;font-weight:400;color:var(--tx3)">/ ${al} hari</span></span>
      </div>
      <div class="leave-bar-track"><div class="leave-bar-fill" style="width:${pct}%;background:${col}"></div></div>
      <div style="font-size:10px;color:var(--tx3);margin-top:3px">${tp} hari terpakai</div>
    </div>
    <!-- Timeline approval -->
    <div class="cc" style="margin-bottom:16px">
      <div class="cc-title"><span class="cc-title-dot" style="background:#8b5cf6"></span>Alur Persetujuan</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${steps.map((s,i)=>{
          const st=stepState(i);
          const bc=st==='done'?'var(--grn-bg)':st==='active'?'var(--primary-bg)':st==='rejected'?'var(--red-bg)':'var(--bg2)';
          const tc=st==='done'?'var(--grn-tx)':st==='active'?'var(--primary-tx)':st==='rejected'?'var(--red-tx)':'var(--tx3)';
          const ic=st==='done'?'✓':st==='rejected'?'✗':st==='active'?'●':'○';
          return `<div style="flex:1;min-width:140px;background:${bc};border-radius:10px;padding:10px 12px">
            <div style="font-size:11px;font-weight:700;color:${tc};margin-bottom:4px">${ic} ${s.label}</div>
            ${s.by?`<div style="font-size:10px;color:var(--tx2)">${s.by}</div>`:''}
            ${s.at?`<div style="font-size:10px;color:var(--tx3)">${new Date(s.at).toLocaleDateString('id-ID')}</div>`:''}
            ${s.note?`<div style="font-size:10px;color:var(--red-tx);margin-top:3px;font-style:italic">"${s.note}"</div>`:''}
          </div>`;
        }).join('')}
      </div>
    </div>
    <!-- Tombol aksi -->
    <div style="display:flex;gap:8px;flex-wrap:wrap">${actionBtns()}</div>`;

  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-cuti-detail').classList.add('active');
  document.getElementById('pt-title').textContent='Detail Pengajuan Cuti';
  document.getElementById('pt-sub').textContent=c.nama;
  document.getElementById('pt-actions').innerHTML='';
  currentPage='cuti-detail';
}

async function ajukanStep1(id){
  const {error}=await supa.from('cuti').update({status:'step1',step:1}).eq('id',id);
  if(error){ showToast(error.message,'error'); return; }
  await loadCutiFromServer();
  const c=DB.cuti.find(x=>x.id===id);
  if(c?.wa_atasan1){
    const pesan=renderTemplate(WA_TEMPLATES.wa_tmpl_pengajuan, getCutiData(c));
    await kirimWA(c.wa_atasan1, pesan);
  }
  openCutiDetail(id); updateCutiBadge();
  showToast('Diajukan ke Kepala Subbagian','success');
}

async function approveStep(id,step){
  const now=new Date().toISOString();
  const who=session?.label||'Admin';
  let upd={};
  if(step===1)      upd={step1_by:who,step1_at:now,status:'step2',step:2};
  else if(step===2) upd={step2_by:who,step2_at:now,status:'step2',step:2};
  else if(step===3){
    const {count}=await supa.from('cuti').select('*',{count:'exact',head:true}).eq('status','approved').eq('tahun',new Date().getFullYear());
    const no=String((count||0)+1).padStart(3,'0');
    upd={final_by:who,final_at:now,status:'approved',step:3,no_surat:`${no}/CUTI/BPKAD/${new Date().getFullYear()}`};
  }
  const {error}=await supa.from('cuti').update(upd).eq('id',id);
  if(error){ showToast(error.message,'error'); return; }
  await loadCutiFromServer();
  const c=DB.cuti.find(x=>x.id===id);

  // ── Notifikasi WA sesuai step ──────────────────────
  if(step===1){
    const d=getCutiData(c,{disetujui_oleh:who});
    if(c?.wa_atasan2) await kirimWA(c.wa_atasan2, renderTemplate(WA_TEMPLATES.wa_tmpl_step1, d));
    if(c?.wa_pegawai) await kirimWA(c.wa_pegawai, renderTemplate(WA_TEMPLATES.wa_tmpl_step1_pegawai, d));
    showToast('Disetujui Kasubbag — WA dikirim ke Kabid & pegawai','success');

  } else if(step===2){
    const d=getCutiData(c,{disetujui_oleh:who});
    if(c?.wa_pegawai) await kirimWA(c.wa_pegawai, renderTemplate(WA_TEMPLATES.wa_tmpl_step2, d));
    showToast('Disetujui Kabid — menunggu persetujuan final Admin','success');

  } else if(step===3){
    const d=getCutiData(c,{disetujui_oleh:who});
    if(c?.wa_pegawai) await kirimWA(c.wa_pegawai, renderTemplate(WA_TEMPLATES.wa_tmpl_approved, d));
    const pesanFinal=renderTemplate(WA_TEMPLATES.wa_tmpl_approved, d);
    if(c?.wa_atasan1) await kirimWA(c.wa_atasan1, pesanFinal);
    if(c?.wa_atasan2) await kirimWA(c.wa_atasan2, pesanFinal);
    showToast(`✅ Cuti disetujui! No. Surat: ${c?.no_surat||'-'} — WA terkirim ke semua pihak`,'success');
  }

  openCutiDetail(id); updateCutiBadge();
}

async function rejectStep(id,step){
  const note=prompt('Alasan penolakan (wajib):','');
  if(!note||!note.trim()){ showToast('Alasan wajib diisi','error'); return; }
  const now=new Date().toISOString(), who=session?.label||'Admin';
  let upd={status:'rejected',step};
  if(step===1) upd={...upd,step1_by:who,step1_at:now,step1_note:note.trim()};
  else         upd={...upd,step2_by:who,step2_at:now,step2_note:note.trim()};
  const {error}=await supa.from('cuti').update(upd).eq('id',id);
  if(error){ showToast(error.message,'error'); return; }
  await loadCutiFromServer();
  const c=DB.cuti.find(x=>x.id===id);
  const d=getCutiData(c,{disetujui_oleh:who, alasan:note.trim()});
  const pesanTolak=renderTemplate(WA_TEMPLATES.wa_tmpl_rejected, d);
  if(c?.wa_pegawai) await kirimWA(c.wa_pegawai, pesanTolak);
  if(c?.wa_atasan1) await kirimWA(c.wa_atasan1, pesanTolak);
  if(c?.wa_atasan2) await kirimWA(c.wa_atasan2, pesanTolak);
  openCutiDetail(id); updateCutiBadge();
  showToast('Pengajuan ditolak — WA terkirim ke semua pihak','error');
}

function batalkanCuti(id){
  showConfirm('Batalkan Cuti','Batalkan pengajuan cuti ini?',async()=>{
    const {error}=await supa.from('cuti').update({status:'cancelled'}).eq('id',id);
    if(!error){ await loadCutiFromServer(); renderCutiTable(); updateCutiBadge(); showToast('Dibatalkan','success'); }
    else showToast(error.message,'error');
  });
}

function hapusCuti(id,dariDetail=false){
  const c=DB.cuti.find(x=>x.id===id);
  const warn=c?.status==='approved'?'<br><span style="color:var(--red-tx);font-weight:700">⚠ Cuti ini sudah disetujui.</span>':'';
  showConfirm('Hapus Riwayat Cuti',`Hapus permanen riwayat ini?${warn}`,async()=>{
    const {error}=await supa.from('cuti').delete().eq('id',id);
    if(!error){
      await loadCutiFromServer();
      if(dariDetail) showPage('cuti',document.querySelector('.ni.active'));
      else renderCutiTable();
      updateCutiBadge(); showToast('Riwayat dihapus','success');
    } else showToast(error.message,'error');
  });
}

function hapusCutiTerpilih(){
  const ids=[...document.querySelectorAll('.cuti-chk:checked')].map(el=>el.value);
  if(!ids.length){ showToast('Pilih riwayat terlebih dahulu','error'); return; }
  showConfirm('Hapus Riwayat Terpilih',`Hapus permanen <strong>${ids.length} riwayat</strong>?`,async()=>{
    const {error}=await supa.from('cuti').delete().in('id',ids);
    if(!error){ await loadCutiFromServer(); renderCutiTable(); updateCutiBadge(); showToast(`${ids.length} riwayat dihapus`,'success'); }
    else showToast(error.message,'error');
  });
}

function toggleAllCutiCheck(el){
  document.querySelectorAll('.cuti-chk').forEach(chk=>chk.checked=el.checked);
}

// ═══════════════════════════════════════════════════════════════
// CETAK SURAT CUTI — Format Resmi Kantor BPKAD
// ═══════════════════════════════════════════════════════════════
function cetakSuratCuti(id){
  const c=DB.cuti.find(x=>x.id===id);
  if(!c||c.status!=='approved'){ showToast('Surat hanya dapat dicetak setelah disetujui','error'); return; }
  const asn=DB.asn.find(a=>a.id===c.asn_id);
  const tahun=c.tahun||new Date().getFullYear();
  const sisa=getSisaTahun(c.asn_id, tahun);
  
  const tglLong=d=>{
    if(!d) return '_______________';
    const dt=new Date(d);
    return `${dt.getDate()} ${['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const nomorUrut = c.no_surat ? c.no_surat.split('/')[0].trim() : '___';
  const nomorSurat = `800.1.11.4/${nomorUrut}/BPKAD/${tahun}`;
  const jenisCuti  = c.jenis_cuti || 'Cuti Tahunan';
  const jenisPeg   = 'Pegawai Negeri Sipil';

  const logoHtml = _logoData
    ? `<img src="${_logoData}" style="width:105px;height:105px;object-fit:contain">`
    : `<div style="width:68px;height:68px;border:1px solid #000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;text-align:center">LOGO</div>`;

  document.getElementById('print-surat').innerHTML=`
  <div class="surat-print" style="font-family:'Times New Roman',serif;font-size:12pt;color:#000">
    <!-- KOP SURAT -->
    <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:4px">
      <tr style="border:none">
        <td style="width:130px;text-align:center;vertical-align:middle;border:none">${logoHtml}</td>
        <td style="text-align:center;vertical-align:middle;padding:0 8px;border:none">
          <div style="font-size:14pt;font-weight:700;color:#000">PEMERINTAH PROVINSI KALIMANTAN SELATAN</div>
          <div style="font-size:18pt;font-weight:700;color:#000">BADAN PENGELOLAAN KEUANGAN</div>
          <div style="font-size:18pt;font-weight:700;color:#000">DAN ASET DAERAH</div>
          <div style="font-size:10pt;color:#000">Jl. Raya Dharma Praja, Banjarbaru Kalimantan Selatan</div>
          <div style="font-size:10pt;color:#000">(Kawasan Perkantoran Pemerintah Provinsi Kalsel)</div>
          <div style="font-size:10pt;color:#000">Laman : https://bpkad.kalselprov.go.id,&nbsp; Pos-el : bpkad@kalselprov.go.id</div>
        </td>
      </tr>
    </table>
    <hr style="border:none;border-top:3px solid #000;margin:2px 0">
    <hr style="border:none;border-top:1px solid #000;margin:2px 0 10px">

    <!-- JUDUL -->
    <div style="text-align:center;margin-bottom:6px;color:#000">
      <div style="font-size:14pt;font-weight:700;text-decoration:underline;color:#000">SURAT IZIN ${jenisCuti.toUpperCase()}</div>
      <div style="font-size:12pt;color:#000">Nomor : ${nomorSurat}</div>
    </div>

    <!-- ISI SURAT -->
    <div style="font-size:12pt;color:#000;margin-top:12px;line-height:1">
      <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:6px">
        <tr style="border:none">
          <td style="padding:2px 0;width:30px;vertical-align:top;border:none;font-size:12pt;color:#000">1.</td>
          <td style="padding:2px 0;vertical-align:top;border:none;font-size:12pt;color:#000">Diberikan ${jenisCuti} ${tahun} kepada ${jenisPeg} :</td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;border:none;margin-left:24px;margin-bottom:8px">
        <tr style="border:none"><td style="width:175px;padding:2px 0;border:none;font-size:12pt;color:#000;vertical-align:top">Nama</td><td style="width:10px;border:none;font-size:12pt;color:#000;vertical-align:top">:</td><td style="padding:2px 0;border:none;font-size:12pt;color:#000;vertical-align:top"><strong>${c.nama}</strong></td></tr>
        <tr style="border:none"><td style="padding:2px 0;border:none;font-size:12pt;color:#000;vertical-align:top">NIP</td><td style="border:none;font-size:12pt;color:#000;vertical-align:top">:</td><td style="padding:2px 0;border:none;font-size:12pt;color:#000;vertical-align:top">${c.nip}</td></tr>
        <tr style="border:none"><td style="padding:2px 0;border:none;font-size:12pt;color:#000;vertical-align:top">Pangkat/Gol. Ruang</td><td style="border:none;font-size:12pt;color:#000;vertical-align:top">:</td><td style="padding:2px 0;border:none;font-size:12pt;color:#000;vertical-align:top">${asn?.pangkat||'_______________'}</td></tr>
        <tr style="border:none"><td style="padding:2px 0;border:none;font-size:12pt;color:#000;vertical-align:top">Jabatan</td><td style="border:none;font-size:12pt;color:#000;vertical-align:top">:</td><td style="padding:2px 0;border:none;font-size:12pt;color:#000;vertical-align:top">${asn?.jabatan||'_______________'}</td></tr>
        <tr style="border:none"><td style="padding:2px 0;border:none;font-size:12pt;color:#000;vertical-align:top">Unit Kerja</td><td style="border:none;font-size:12pt;color:#000;vertical-align:top">:</td><td style="padding:2px 0;border:none;font-size:12pt;color:#000;vertical-align:top">Badan Pengelolaan Keuangan dan Aset Daerah Prov. Kalsel</td></tr>
      </table>

      <p style="margin:8px 0;text-align:justify;font-size:12pt;color:#000;line-height:1.6">
        Selama <strong>${c.hari_kerja} (${terbilang(c.hari_kerja)})</strong> Hari Kerja, terhitung mulai tanggal
        <strong>${tglLong(c.tgl_mulai)}</strong> sampai dengan <strong>${tglLong(c.tgl_selesai)}</strong>,
        Adapun sisa Cuti selama <strong>${sisa} hari kerja</strong> akan diambil tahun berjalan ${tahun}
        dengan ketentuan sebagai berikut :
      </p>

      <table style="width:100%;border-collapse:collapse;border:none;margin-left:24px;margin-bottom:8px">
        <tr style="border:none">
          <td style="width:20px;vertical-align:top;padding:2px 0;border:none;font-size:12pt;color:#000">a.</td>
          <td style="padding:2px 0;text-align:justify;border:none;font-size:12pt;color:#000;line-height:1.6">Sebelum menjalankan ${jenisCuti} ${tahun} wajib menyerahkan pekerjaannya kepada Atasan Langsung atau pejabat yang ditentukan.</td>
        </tr>
        <tr style="border:none">
          <td style="width:20px;vertical-align:top;padding:2px 0;border:none;font-size:12pt;color:#000">b.</td>
          <td style="padding:2px 0;text-align:justify;border:none;font-size:12pt;color:#000;line-height:1.6">Setelah selesai menjalankan ${jenisCuti} ${tahun} wajib melaporkan diri kepada Atasan Langsungnya dan bekerja kembali sebagaimana mestinya.</td>
        </tr>
        <tr style="border:none">
          <td style="width:20px;vertical-align:top;padding:2px 0;border:none;font-size:12pt;color:#000">c.</td>
          <td style="padding:2px 0;border:none;font-size:12pt;color:#000">Alamat Cuti : ${c.alamat||'_______________________________________________'}</td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:16px">
        <tr style="border:none">
          <td style="padding:2px 0;width:30px;vertical-align:top;border:none;font-size:12pt;color:#000">2.</td>
          <td style="padding:2px 0;text-align:justify;border:none;font-size:12pt;color:#000">Demikian Surat Izin ${jenisCuti} ini diterbitkan untuk dapat dipergunakan sebagaimana mestinya.</td>
        </tr>
      </table>

     <!-- TANDA TANGAN -->
<table style="width:100%;border-collapse:collapse;border:none;margin-bottom:20px">
  <tr style="border:none">
    <td style="width:47%;border:none"></td>
    
    <td style="
      text-align:left;
      font-family:'Arial',serif;
      font-size:11pt;
      line-height:1.4;
      border:none;
      vertical-align:top
    ">
      
      <div style="margin-left:40px">
        Banjarbaru, ${tglLong(new Date().toISOString())}
      </div>

      <div style="display:flex;gap:0">
        <span style="min-width:40px">a.n.</span>
        
        <span>
          KEPALA BADAN PENGELOLAAN<br>
          KEUANGAN DAN ASET DAERAH<br>
          PROVINSI KALIMANTAN SELATAN,<br>
          SEKRETARIS,
        </span>
      </div>

      <div style="height:80px"></div>
    </td>
  </tr>
</table>
      <!-- TEMBUSAN -->
      <div style="font-size:9pt;color:#000;line-height:1.7">
        <div>Tembusan :</div>
        <div style="margin-left:4px">1. Kepala Badan Pengelolaan Keuangan dan Aset Daerah</div>
        <div style="margin-left:4px">2. Yang bersangkutan</div>
        <div style="margin-left:4px">3. Arsip</div>
      </div>
    </div>
  </div>`;

  document.getElementById('print-surat').style.display='block';
  window.print();
  setTimeout(()=>{ document.getElementById('print-surat').style.display='none'; },1500);
}

function terbilang(n){
  if(!n||n<=0) return 'nol';
  const s=['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh',
           'sebelas','dua belas','tiga belas','empat belas','lima belas','enam belas',
           'tujuh belas','delapan belas','sembilan belas','dua puluh'];
  if(n<=20) return s[n];
  if(n<30) return 'dua puluh '+s[n-20];
  if(n<40) return 'tiga puluh'+(n%10?' '+s[n%10]:'');
  if(n<50) return 'empat puluh'+(n%10?' '+s[n%10]:'');
  return String(n);
}
