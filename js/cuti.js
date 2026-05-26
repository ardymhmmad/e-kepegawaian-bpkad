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

// ── Konfigurasi jenis cuti ─────────────────────────────────
// kurangiTahunan : apakah mengurangi sisa cuti tahunan
// bolehLebih     : apakah boleh melebihi jatah (tidak diblokir)
// hariKalender   : hitung hari kalender bukan hari kerja
const JENIS_CUTI_CONFIG = {
  'Cuti Tahunan'                      : { kurangiTahunan:true,  bolehLebih:false, hariKalender:false },
  'Cuti Sakit'                        : { kurangiTahunan:false, bolehLebih:true,  hariKalender:false },
  'Cuti Melahirkan'                   : { kurangiTahunan:false, bolehLebih:true,  hariKalender:true  },
  'Cuti Besar'                        : { kurangiTahunan:true,  bolehLebih:true,  hariKalender:false },
  'Cuti Alasan Penting'               : { kurangiTahunan:true,  bolehLebih:true,  hariKalender:false },
  'Cuti Di Luar Tanggungan Negara'    : { kurangiTahunan:false, bolehLebih:true,  hariKalender:false },
};
function getCutiConfig(jenis){ return JENIS_CUTI_CONFIG[jenis] || JENIS_CUTI_CONFIG['Cuti Tahunan']; }

// Hitung hari kalender (inklusif)
function hitungHariKalender(s, e){
  if(!s||!e) return 0;
  const parse = str => { const [y,m,d]=str.split('-').map(Number); return new Date(y,m-1,d,0,0,0); };
  const start=parse(s), end=parse(e);
  if(end<start) return 0;
  return Math.round((end-start)/(1000*60*60*24))+1;
}



// ── Hari libur nasional — hybrid (API + manual override DB) ───
// Data fallback bawaan (dipakai jika DB kosong & API gagal)
const HARI_LIBUR_FALLBACK = {
  '2025':['2025-01-01','2025-01-27','2025-01-28','2025-01-29','2025-03-28','2025-03-29',
          '2025-03-31','2025-04-01','2025-04-18','2025-05-01','2025-05-12','2025-05-13',
          '2025-05-29','2025-06-01','2025-06-06','2025-07-07','2025-08-17','2025-09-05',
          '2025-10-02','2025-12-25','2025-12-26'],
  '2026':['2026-01-01','2026-02-17','2026-03-20','2026-04-02','2026-04-03','2026-05-01',
          '2026-05-14','2026-05-25','2026-06-01','2026-06-22','2026-08-17','2026-10-23',
          '2026-12-25']
};

// Cache libur dari DB / API — diisi saat init
let HARI_LIBUR = { ...HARI_LIBUR_FALLBACK };

// Ambil libur dari API publik (bypasscors via api.harilibur.net)
async function fetchLiburFromAPI(tahun){
  try {
    const res = await fetch(`https://api.harilibur.net/api?month=all&year=${tahun}`);
    if(!res.ok) return null;
    const json = await res.json();
    // Format: [{holiday_date:"2026-01-01", holiday_name:"...", is_national_holiday:true}]
    const tanggal = json
      .filter(h => h.is_national_holiday)
      .map(h => h.holiday_date);
    return tanggal.length ? tanggal : null;
  } catch(e){
    console.warn('API libur gagal:', e);
    return null;
  }
}

// Load libur dari DB (settings key: libur_TAHUN), fallback ke API, fallback ke hardcode
async function loadLiburNasional(tahun){
  const yr = String(tahun);
  // 1. Cek DB dulu
  try {
    const { data } = await supa.from('settings')
      .select('setting_val').eq('setting_key', `libur_${yr}`).maybeSingle();
    if(data?.setting_val){
      HARI_LIBUR[yr] = JSON.parse(data.setting_val);
      console.log(`✅ Libur ${yr} dari DB (${HARI_LIBUR[yr].length} hari)`);
      return;
    }
  } catch(e){ console.warn('DB libur error:', e); }

  // 2. Coba API
  const fromAPI = await fetchLiburFromAPI(tahun);
  if(fromAPI){
    HARI_LIBUR[yr] = fromAPI;
    // Simpan ke DB supaya tersedia offline
    try {
      const { data: ex } = await supa.from('settings').select('id').eq('setting_key',`libur_${yr}`).maybeSingle();
      if(ex){
        await supa.from('settings').update({ setting_val: JSON.stringify(fromAPI) }).eq('setting_key',`libur_${yr}`);
      } else {
        await supa.from('settings').insert({ setting_key:`libur_${yr}`, setting_val: JSON.stringify(fromAPI) });
      }
    } catch(e){ console.warn('Gagal simpan libur ke DB:', e); }
    console.log(`✅ Libur ${yr} dari API (${fromAPI.length} hari)`);
    return;
  }

  // 3. Fallback hardcode
  if(HARI_LIBUR_FALLBACK[yr]){
    HARI_LIBUR[yr] = HARI_LIBUR_FALLBACK[yr];
    console.log(`⚠️ Libur ${yr} dari fallback hardcode`);
  }
}

function getLiburSet(yr){ return new Set(HARI_LIBUR[String(yr)]||[]); }

// Tambah / hapus libur manual dan simpan ke DB
async function simpanLiburManual(tahun, listTanggal){
  const yr = String(tahun);
  HARI_LIBUR[yr] = [...new Set(listTanggal)].sort();
  const val = JSON.stringify(HARI_LIBUR[yr]);
  const { data: ex } = await supa.from('settings').select('id').eq('setting_key',`libur_${yr}`).maybeSingle();
  if(ex){
    await supa.from('settings').update({ setting_val: val }).eq('setting_key',`libur_${yr}`);
  } else {
    await supa.from('settings').insert({ setting_key:`libur_${yr}`, setting_val: val });
  }
  showToast(`✅ Libur nasional ${yr} disimpan (${HARI_LIBUR[yr].length} hari)`,'success');
}

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
  // Parse lokal — hindari UTC shift
  const parseLoc = str => {
    const [y,m,d] = str.split('-').map(Number);
    return new Date(y, m-1, d, 0, 0, 0);
  };
  const toDS = dt =>
    dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');

  const start = parseLoc(s), end = parseLoc(e);
  if(end < start) return 0;

  // Gabung libur semua tahun yang dicakup rentang
  const liburSet = new Set();
  for(let yr = start.getFullYear(); yr <= end.getFullYear(); yr++){
    getLiburSet(yr).forEach(d => liburSet.add(d));
  }

  let n = 0;
  const cur = new Date(start);
  while(cur <= end){
    const dow = cur.getDay(); // 0=Minggu, 6=Sabtu
    const ds  = toDS(cur);
    // Hanya Senin(1)–Jumat(5) dan bukan libur nasional
    if(dow >= 1 && dow <= 5 && !liburSet.has(ds)) n++;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}

// ── Storage ───────────────────────────────────────────────────
let DEF_ALOKASI=12;
function saveCuti(){} function loadCuti(){ DB.cuti=[]; }
let CARRY_OVER_ENABLED=true, CARRY_OVER_MAX=999;
function saveAlokasi(){} function loadAlokasi(){ DB.alokasi={}; }

function getAlokasiTahun(asnId,tahun){ return DB.alokasi?.[asnId]?.[tahun]?.alokasi??DEF_ALOKASI; }
function getTerpakaiTahun(asnId,tahun){ return DB.cuti.filter(c=>c.asn_id===asnId&&c.status==='approved'&&c.tahun===tahun&&getCutiConfig(c.jenis_cuti||'Cuti Tahunan').kurangiTahunan).reduce((s,c)=>s+(c.hari_kerja||0),0); }
function getSisaMurni(asnId,tahun){ return Math.max(0,getAlokasiTahun(asnId,tahun)-getTerpakaiTahun(asnId,tahun)); }
function getCarryOver(asnId,tahun){
  if(!CARRY_OVER_ENABLED) return 0;
  const ovr=DB.alokasi?.[asnId]?.[tahun]?.carryover_override;
  if(ovr!==undefined&&ovr!==null) return Math.max(0,ovr);
  return Math.min(getSisaMurni(asnId,tahun-1),CARRY_OVER_MAX);
}
function getTotalAlokasi(asnId,tahun){ return getAlokasiTahun(asnId,tahun)+getCarryOver(asnId,tahun); }
function getSisaTahun(asnId,tahun){ return Math.max(0,getTotalAlokasi(asnId,tahun)-getTerpakaiTahun(asnId,tahun)); }
// Nomor urut surat cuti — diload dari settings saat init
let NO_URUT_CUTI = 1;

function generateNoSurat(tahun){
  const yr = tahun || new Date().getFullYear();
  // Hitung jumlah surat approved tahun ini untuk dapat urutan berikutnya
  const sudahAda = DB.cuti.filter(c => c.status === 'approved' && c.tahun === yr && c.no_surat).length;
  const urut = Math.max(NO_URUT_CUTI + sudahAda - 1, sudahAda) || 1;
  return `${String(urut).padStart(3,'0')}/CUTI/BPKAD/${yr}`;
}

function updateCutiBadge(){
  // Hanya cuti yang belum final admin (step1 = menunggu Kasubbag, step2 = menunggu Kabid)
  const n=DB.cuti.filter(c=>c.status==='step1'||c.status==='step2').length;
  const el=document.getElementById('cuti-badge');
  if(el) el.textContent=n;
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
            <select id="ca-jenis" style="width:100%" onchange="onCaJenisChange()">${jenisSel}</select>
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
  const jenis=document.getElementById('ca-jenis')?.value||'Cuti Tahunan';
  const cfg=getCutiConfig(jenis);
  const n = cfg.hariKalender ? hitungHariKalender(s,e) : hitungHariKerja(s,e);
  const el=document.getElementById('ca-hari'); if(el) el.textContent=n||'—';
  const note=document.getElementById('ca-hari-note');
  const satuanLabel = cfg.hariKalender ? 'hari kalender' : 'hari kerja';
  if(note){
    if(s&&e&&n>0) note.textContent=`${n} ${satuanLabel} dari ${fmt(s)} s.d. ${fmt(e)}`;
    else if(s&&e&&n===0) note.innerHTML=`<span style="color:var(--red-tx)">Tidak ada hari dalam rentang ini</span>`;
    else note.textContent='Pilih tanggal mulai dan selesai';
  }
  if(s) _calState.start=parseDateLocal(s);
  if(e) _calState.end=parseDateLocal(e);
  renderCalendar(); checkSisaWarning();
}

function checkSisaWarning(){
  const asnSel=document.getElementById('ca-asn'); if(!asnSel?.value) return;
  const hari=parseInt(document.getElementById('ca-hari')?.textContent)||0; if(!hari) return;
  const jenis=document.getElementById('ca-jenis')?.value||'Cuti Tahunan';
  const cfg=getCutiConfig(jenis);
  const yr=new Date().getFullYear();
  const chip=document.getElementById('ca-sisa-chip'); if(!chip) return;

  if(!cfg.kurangiTahunan){
    // Jenis ini tidak mengurangi cuti tahunan — tidak perlu warning sisa
    chip.innerHTML=`<span style="color:var(--tx2);font-size:11px">ℹ Tidak mengurangi cuti tahunan</span>`;
    return;
  }
  const sisa=getSisaTahun(asnSel.value,yr);
  if(hari>sisa){
    if(cfg.bolehLebih){
      chip.innerHTML=`<span style="color:var(--amb-tx);font-weight:700">⚠ Melebihi sisa (${sisa} hari)<br><span style="font-size:10px;font-weight:400">Diperbolehkan untuk ${jenis}</span></span>`;
    } else {
      chip.innerHTML=`<span style="color:var(--red-tx);font-weight:700">⚠ Melebihi sisa<br>${sisa} hari tersisa</span>`;
    }
  } else {
    chip.innerHTML=`<span style="color:var(--grn-tx);font-weight:600">✓ Cukup<br>${sisa-hari} sisa</span>`;
  }
}

function onCaJenisChange(){
  const jenis=document.getElementById('ca-jenis')?.value||'Cuti Tahunan';
  const cfg=getCutiConfig(jenis);
  // Update label satuan hari
  const lblHari=document.getElementById('ca-hari-label');
  if(lblHari) lblHari.textContent = cfg.hariKalender ? 'Hari Kalender' : 'Hari Kerja';
  // Jika Cuti Melahirkan, otomatis isi 3 bulan dari tgl mulai
  if(jenis==='Cuti Melahirkan'){
    const mulaiEl=document.getElementById('ca-mulai');
    if(mulaiEl?.value){
      const s=mulaiEl.value;
      const [y,m,d]=s.split('-').map(Number);
      // +3 bulan: bulan ke-(m+3), hari sama, lalu mundur 1 hari
      // Contoh: 21 Apr → 21 Jul - 1 hari = 20 Jul? Tidak.
      // Aturan: mulai 21 Apr → selesai 20 Jul (tepat 3 bulan kalender = 90/91 hari)
      // Atau: mulai 21 Apr → selesai 21 Jul - 1 = 20 Jul
      // Sesuai permintaan: mulai 21 Apr → selesai 21 Jul (tanggal sama bulan+3)
      const end=new Date(y, m-1+3, d); // bulan JS 0-based, jadi m-1+3
      const endStr=end.getFullYear()+'-'+String(end.getMonth()+1).padStart(2,'0')+'-'+String(end.getDate()).padStart(2,'0');
      const selesaiEl=document.getElementById('ca-selesai');
      if(selesaiEl){ selesaiEl.value=endStr; }
    }
  }
  onCaDateChange();
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
  const jenis_cuti_tmp=document.getElementById('ca-jenis')?.value||'Cuti Tahunan';
  const cfg_tmp=getCutiConfig(jenis_cuti_tmp);
  const hari = cfg_tmp.hariKalender ? hitungHariKalender(mulai,selesai) : hitungHariKerja(mulai,selesai);
  if(hari<=0){ showToast('Tidak ada hari dalam rentang ini','error'); return; }
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
    await logAudit(
      editId ? AUDIT_ACTION.EDIT : AUDIT_ACTION.TAMBAH,
      'cuti', newId,
      editId
        ? `Edit pengajuan cuti — ${asn?.nama||''} (${jenis_cuti})`
        : `Ajukan cuti baru — ${asn?.nama||''} (${jenis_cuti}, ${hari} hari)`,
      null,
      {asn_id:asn?.id,nama:asn?.nama,jenis_cuti,tgl_mulai:mulai,tgl_selesai:selesai,hari_kerja:hari}
    );
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
  const _cfgCuti=getCutiConfig(c.jenis_cuti||'Cuti Tahunan');
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
  await logAudit(AUDIT_ACTION.APPROVE, 'cuti', id,
    `Ajukan ke Kepala Subbagian — ${c?.nama||id} (${c?.jenis_cuti||''})`, null, {status:'step1',step:1});
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
  await logAudit(AUDIT_ACTION.APPROVE, 'cuti', id,
    `Approve cuti step ${step} — ${c?.nama||id} (${c?.jenis_cuti||''})`, null, upd);

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
  await logAudit(AUDIT_ACTION.REJECT, 'cuti', id,
    `Tolak cuti step ${step} — ${c?.nama||id} (${c?.jenis_cuti||''}) — Alasan: ${note.trim()}`, null, upd);
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
    const oldRec = DB.cuti.find(x=>x.id===id);
    const {error}=await supa.from('cuti').update({status:'cancelled'}).eq('id',id);
    if(!error){
      await logAudit(AUDIT_ACTION.CANCEL, 'cuti', id,
        `Batalkan cuti — ${oldRec?.nama||id} (${oldRec?.jenis_cuti||''})`, oldRec, null);
      await loadCutiFromServer(); renderCutiTable(); updateCutiBadge(); showToast('Dibatalkan','success');
    }
    else showToast(error.message,'error');
  });
}

function hapusCuti(id,dariDetail=false){
  const c=DB.cuti.find(x=>x.id===id);
  const warn=c?.status==='approved'?'<br><span style="color:var(--red-tx);font-weight:700">⚠ Cuti ini sudah disetujui.</span>':'';
  showConfirm('Hapus Riwayat Cuti',`Hapus permanen riwayat ini?${warn}`,async()=>{
    const {error}=await supa.from('cuti').delete().eq('id',id);
    if(!error){
      await logAudit(AUDIT_ACTION.HAPUS, 'cuti', id,
        `Hapus riwayat cuti — ${c?.nama||id} (${c?.jenis_cuti||''})`, c, null);
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
    // Simpan data sebelum dihapus untuk audit
    const oldRecs = ids.map(id => DB.cuti.find(x=>x.id===id||x.id===parseInt(id))).filter(Boolean);
    const {error}=await supa.from('cuti').delete().in('id',ids);
    if(!error){
      // Log satu per satu agar setiap riwayat tercatat
      for(const rec of oldRecs){
        await logAudit(AUDIT_ACTION.HAPUS, 'cuti', rec.id,
          `Hapus riwayat cuti — ${rec.nama||rec.id} (${rec.jenis_cuti||''})`, rec, null);
      }
      // Jika ada id yang tidak ketemu di cache, log generic
      if(oldRecs.length < ids.length){
        const loggedIds = oldRecs.map(r=>String(r.id));
        for(const id of ids){
          if(!loggedIds.includes(String(id))){
            await logAudit(AUDIT_ACTION.HAPUS, 'cuti', id, `Hapus riwayat cuti — id: ${id}`, null, null);
          }
        }
      }
      await loadCutiFromServer(); renderCutiTable(); updateCutiBadge();
      showToast(`${ids.length} riwayat dihapus`,'success');
    }
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

  // Hitung nomor surat default — pakai NO_URUT_CUTI dari Pengaturan
  const tahunCuti = c.tahun || new Date().getFullYear();
  const nomorUrut = c.no_surat
    ? c.no_surat.split('/')[0].trim()
    : String(NO_URUT_CUTI).padStart(3,'0');
  const nomorDefault = `800.1.11.4/${nomorUrut}/BPKAD/${tahunCuti}`;

  // Popup konfirmasi nomor surat
  document.getElementById('modal-title').textContent = '🖨 Konfirmasi Nomor Surat';
  document.getElementById('modal-box').style.maxWidth = '480px';
  document.getElementById('modal-body').innerHTML = `
    <div style="margin-bottom:14px;font-size:13px;color:var(--tx2);line-height:1.6">
      Periksa dan sesuaikan nomor surat sebelum dicetak.<br>
      <span style="font-size:11px;color:var(--tx3)">Format: 800.1.11.4/<strong>NOMOR-URUT</strong>/BPKAD/${tahunCuti}</span>
    </div>
    <div class="fg" style="margin-bottom:10px">
      <label style="font-weight:700">Nomor Surat *</label>
      <input type="text" id="input-no-surat" value="${nomorDefault}"
        style="font-family:monospace;font-size:13px;font-weight:600;letter-spacing:.02em">
      <div style="font-size:10px;color:var(--tx3);margin-top:4px">Edit bagian nomor urut jika perlu</div>
    </div>
    <div style="background:var(--primary-bg);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--tx2)">
      <div><strong>Pegawai:</strong> ${c.nama} — ${c.nip}</div>
      <div><strong>Jenis Cuti:</strong> ${c.jenis_cuti||'Cuti Tahunan'}</div>
      <div><strong>Tanggal:</strong> ${fmt(c.tgl_mulai)} s.d. ${fmt(c.tgl_selesai)} (${c.hari_kerja} hari kerja)</div>
    </div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="eksekusiCetakSurat('${id}','ttd')">🖨 TTD Biasa (Cetak)</button>
    <button class="btn btn-success" onclick="eksekusiCetakSurat('${id}','tte')" title="Kirim ke Admin TTE via WhatsApp">📲 TTE (Kirim WA)</button>`;
  document.getElementById('modal').style.display = 'flex';
  setTimeout(()=>{ document.getElementById('input-no-surat')?.focus(); }, 100);
}

async function eksekusiCetakSurat(id, mode='ttd'){
  const nomorSuratInput = (document.getElementById('input-no-surat')?.value||'').trim();
  if(!nomorSuratInput){ showToast('Nomor surat tidak boleh kosong','error'); return; }

  // Validasi TTE sebelum tutup modal
  if(mode==='tte'){
    if(!FONNTE_TOKEN){ showToast('Token Fonnte belum diisi di Pengaturan','error'); return; }
    if(!WA_ADMIN_TTE){ showToast('Nomor WA Admin TTE belum diisi di Pengaturan','error'); return; }
  }

  // Simpan nomor surat ke database
  await supa.from('cuti').update({ no_surat: nomorSuratInput.split('/')[1]?.trim() || nomorSuratInput }).eq('id', id);
  const idx = DB.cuti.findIndex(x=>x.id===id);
  if(idx>=0) DB.cuti[idx].no_surat = nomorSuratInput.split('/')[1]?.trim() || nomorSuratInput;

  closeModal();

  if(mode==='tte'){
    // ── Mode TTE: kirim WA ke Admin TTE ──
    const c = DB.cuti.find(x=>x.id===id);
    let nomor = WA_ADMIN_TTE.replace(/\D/g,'');
    if(nomor.startsWith('0')) nomor = '62'+nomor.slice(1);

    const tglMulai  = c?.tgl_mulai  ? new Date(c.tgl_mulai).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'}) : '–';
    const tglSelesai= c?.tgl_selesai? new Date(c.tgl_selesai).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'}) : '–';

    const pesan =
`📋 *PERMOHONAN TTE — SURAT CUTI*

Kepada Yth. Admin TTE
Mohon dilakukan Tanda Tangan Elektronik untuk Surat Cuti berikut:

👤 *Nama       :* ${c?.nama||'–'}
🪪 *NIP        :* ${c?.nip||'–'}
🏢 *Unit       :* ${c?.unit||'–'}
📄 *Nomor Surat:* ${nomorSuratInput}
📝 *Jenis Cuti :* ${c?.jenis_cuti||'Cuti Tahunan'}
📅 *Tgl Mulai  :* ${tglMulai}
📅 *Tgl Selesai:* ${tglSelesai}
⏱ *Hari Kerja :* ${c?.hari_kerja||'–'} hari

Harap segera diproses. Terima kasih.
— E-Kepegawaian BPKAD`;

    await kirimWA(nomor, pesan);
    showToast('✅ Permohonan TTE berhasil dikirim ke Admin via WhatsApp','success');
    await logAudit(AUDIT_ACTION.SETTING, 'cuti', id,
      `Kirim Surat Cuti ke Admin TTE — ${c?.nama||id} (${nomorSuratInput})`, null, null);
  } else {
    // ── Mode TTD Biasa: cetak langsung ──
    _doCetakSurat(id, nomorSuratInput);
  }
}

function _doCetakSurat(id, nomorSuratOverride){
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

  const nomorSurat = nomorSuratOverride || `800.1.11.4/${c.no_surat||'___'}/BPKAD/${tahun}`;
  const jenisCuti  = c.jenis_cuti || 'Cuti Tahunan';
  const jenisCutiLabel = jenisCuti === 'Cuti Tahunan' ? `${jenisCuti} ${tahun}` : jenisCuti;
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
    <div style="font-size:12pt;color:#000;margin-top:12px;line-height:1.4">

  <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:6px">
    <tr style="border:none">
      <td style="
        width:30px;
        padding:2px 0;
        vertical-align:top;
        border:none;
        font-size:12pt;
        color:#000;
      ">
        1.
      </td>

      <td style="
        padding:2px 0;
        vertical-align:top;
        border:none;
        font-size:12pt;
        color:#000;
      ">
        Diberikan ${jenisCutiLabel} kepada ${jenisPeg} :
      </td>
    </tr>
  </table>

  <table style="
    width:100%;
    border-collapse:collapse;
    border:none;
    margin-left:24px;
    margin-bottom:8px;
    table-layout:fixed;
  ">

    <tr style="border:none">
      <td style="
        width:175px;
        padding:2px 0;
        vertical-align:top;
        border:none;
        font-size:12pt;
        color:#000;
      ">
        Nama
      </td>

      <td style="
        width:15px;
        padding:2px 0;
        vertical-align:top;
        border:none;
        font-size:12pt;
        color:#000;
      ">
        :
      </td>

      <td style="
        padding:2px 0;
        vertical-align:top;
        border:none;
        font-size:12pt;
        color:#000;
      ">
        <span style="font-weight:normal">
  ${c.nama}
</span>
      </td>
    </tr>

    <tr style="border:none">
      <td style="
        width:175px;
        padding:2px 0;
        vertical-align:top;
        border:none;
        font-size:12pt;
        color:#000;
      ">
        NIP
      </td>

      <td style="
        width:15px;
        padding:2px 0;
        vertical-align:top;
        border:none;
        font-size:12pt;
        color:#000;
      ">
        :
      </td>

      <td style="
        padding:2px 0;
        vertical-align:top;
        border:none;
        font-size:12pt;
        color:#000;
      ">
        ${c.nip}
      </td>
    </tr>

    <tr style="border:none">
      <td style="
        width:175px;
        padding:2px 0;
        vertical-align:top;
        border:none;
        font-size:12pt;
        color:#000;
      ">
        Pangkat/Gol. Ruang
      </td>

      <td style="
        width:15px;
        padding:2px 0;
        vertical-align:top;
        border:none;
        font-size:12pt;
        color:#000;
      ">
        :
      </td>

      <td style="
        padding:2px 0;
        vertical-align:top;
        border:none;
        font-size:12pt;
        color:#000;
      ">
        ${asn?.pangkat || '_______________'}
      </td>
    </tr>

    <tr style="border:none">
      <td style="
        width:175px;
        padding:2px 0;
        vertical-align:top;
        border:none;
        font-size:12pt;
        color:#000;
      ">
        Jabatan
      </td>

      <td style="
        width:15px;
        padding:2px 0;
        vertical-align:top;
        border:none;
        font-size:12pt;
        color:#000;
      ">
        :
      </td>

      <td style="
        padding:2px 0;
        vertical-align:top;
        border:none;
        font-size:12pt;
        color:#000;
      ">
        ${asn?.jabatan || '_______________'}
      </td>
    </tr>

    <tr style="border:none">
      <td style="
        width:175px;
        padding:2px 0;
        vertical-align:top;
        border:none;
        font-size:12pt;
        color:#000;
      ">
        Unit Kerja
      </td>

      <td style="
        width:15px;
        padding:2px 0;
        vertical-align:top;
        border:none;
        font-size:12pt;
        color:#000;
      ">
        :
      </td>

      <td style="
        padding:2px 0;
        vertical-align:top;
        border:none;
        font-size:12pt;
        color:#000;
      ">
        Badan Pengelolaan Keuangan dan Aset Daerah Prov. Kalsel
      </td>
    </tr>

  </table>

      <p style="margin:8px 0;text-align:justify;font-size:12pt;color:#000;line-height:1.6">
        Selama <strong>${c.hari_kerja} (${terbilang(c.hari_kerja)})</strong> ${getCutiConfig(c.jenis_cuti||'Cuti Tahunan').hariKalender?'Hari Kalender':'Hari Kerja'}, terhitung mulai tanggal
        <strong>${tglLong(c.tgl_mulai)}</strong> sampai dengan <strong>${tglLong(c.tgl_selesai)}</strong>,
        Adapun sisa Cuti selama <strong>${sisa} hari kerja</strong> akan diambil tahun berjalan ${tahun}
        dengan ketentuan sebagai berikut :
      </p>

      <div style="margin-left:24px">

  <div style="display:flex;margin-bottom:6px">
    <div style="width:20px">a.</div>
    <div style="flex:1;text-align:justify;line-height:1.6">
      Sebelum menjalankan ${jenisCutiLabel} wajib menyerahkan pekerjaannya kepada Atasan Langsung atau pejabat yang ditentukan.
    </div>
  </div>

  <div style="display:flex;margin-bottom:6px">
    <div style="width:20px">b.</div>
    <div style="flex:1;text-align:justify;line-height:1.6">
      Setelah selesai menjalankan ${jenisCutiLabel} wajib melaporkan diri kepada Atasan Langsungnya dan bekerja kembali sebagaimana mestinya.
    </div>
  </div>

  <div style="display:flex;margin-bottom:6px">
    <div style="width:20px">c.</div>
    <div style="flex:1">
      Alamat Cuti : ${c.alamat||'_______________________________________________'}
    </div>
  </div>

</div>

      <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:8px">
        <tr style="border:none">
          <td style="padding:2px 0;width:30px;vertical-align:top;border:none;font-size:12pt;color:#000">2.</td>
          <td style="padding:2px 0;text-align:justify;border:none;font-size:12pt;color:#000">Demikian Surat Izin ${jenisCuti} ini diterbitkan untuk dapat dipergunakan sebagaimana mestinya.</td>
        </tr>
      </table>

     <!-- TANDA TANGAN -->
<table style="width:100%;border-collapse:collapse;border:none;margin-bottom:15px">
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
          <div style="height:80px"></div>

          H. Fatkhan, S.E., M.M<br>
          Pembina Tingkat I (IV/b)<br>
          NIP. 197505182010011001
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
  const sat=['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan'];
  const bls=['','sepuluh','dua puluh','tiga puluh','empat puluh','lima puluh',
             'enam puluh','tujuh puluh','delapan puluh','sembilan puluh'];
  const bls11=['sebelas','dua belas','tiga belas','empat belas','lima belas',
               'enam belas','tujuh belas','delapan belas','sembilan belas'];
  if(n<=9)   return sat[n];
  if(n===10) return 'sepuluh';
  if(n<=19)  return bls11[n-11];
  if(n<100){
    const p=Math.floor(n/10), s=n%10;
    return bls[p]+(s?' '+sat[s]:'');
  }
  if(n<200){
    const s=n%100;
    return 'seratus'+(s?' '+terbilang(s):'');
  }
  if(n<1000){
    const p=Math.floor(n/100), s=n%100;
    return sat[p]+' ratus'+(s?' '+terbilang(s):'');
  }
  return String(n);
}
