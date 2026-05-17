// ═══════════════════════════════════════════════════════════════
// CUTI MODULE — Pengajuan Cuti (tanpa tipe, alokasi hari saja)
// ═══════════════════════════════════════════════════════════════

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

// Parse string 'YYYY-MM-DD' ke Date lokal (bukan UTC) — mencegah pergeseran timezone
function parseDateLocal(str){
  if(!str) return null;
  const [y,m,d]=str.split('-').map(Number);
  return new Date(y,m-1,d);
}
// Format Date lokal ke string 'YYYY-MM-DD'
function fmtDateLocal(dt){
  return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
}

function hitungHariKerja(s, e){
  if(!s||!e) return 0;
  // Parse tanggal sebagai lokal (bukan UTC) agar tidak ada pergeseran zona waktu
  const parseLoc = str => {
    const [y,m,d] = str.split('-').map(Number);
    return new Date(y, m-1, d); // lokal, bukan UTC
  };
  const start = parseLoc(s);
  const end   = parseLoc(e);
  if(end < start) return 0;

  // Gunakan tahun mulai untuk set hari libur;
  // jika rentang melewati tahun, gabungkan keduanya
  const liburSet = new Set([
    ...Array.from(getLiburSet(start.getFullYear())),
    ...Array.from(getLiburSet(end.getFullYear()))
  ]);

  let n = 0;
  const cur = new Date(start);
  while(cur <= end){
    const dow = cur.getDay();                        // 0=Min, 6=Sab
    // Format tanggal lokal manual (hindari toISOString yang UTC-based)
    const ds  = cur.getFullYear()+'-'+
                String(cur.getMonth()+1).padStart(2,'0')+'-'+
                String(cur.getDate()).padStart(2,'0');
    // Hari kerja: bukan Sabtu (6), bukan Minggu (0), bukan hari libur
    if(dow !== 0 && dow !== 6 && !liburSet.has(ds)) n++;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}

// ── Storage ───────────────────────────────────────────────────
let DEF_ALOKASI = 12;          // default hari per tahun (global)
// DB.alokasi = { asn_id: { [tahun]: { alokasi:N } } }
// DB.cuti    = [ {...} ]

function saveCuti(){}
function loadCuti(){ DB.cuti=[]; }
// CARRY_OVER: true = sisa tahun lalu otomatis terbawa
// DB.alokasi[asnId][tahun] = { alokasi:N, carryover_override:N|null }
// carryover_override null = pakai hitungan otomatis, angka = manual admin
let CARRY_OVER_ENABLED = true;   // kebijakan global on/off
let CARRY_OVER_MAX     = 999;    // maks hari carry over (999 = tidak terbatas)

function saveAlokasi(){}
function loadAlokasi(){ DB.alokasi={}; }

// ── Alokasi helpers (with carry over) ─────────────────────────
function getAlokasiTahun(asnId, tahun){
  return DB.alokasi?.[asnId]?.[tahun]?.alokasi ?? DEF_ALOKASI;
}
function getTerpakaiTahun(asnId, tahun){
  return DB.cuti.filter(c=>c.asn_id===asnId&&c.status==='approved'&&c.tahun===tahun)
                .reduce((s,c)=>s+(c.hari_kerja||0),0);
}
// Sisa murni tahun tsb (tanpa carry over)
function getSisaMurni(asnId, tahun){
  return Math.max(0, getAlokasiTahun(asnId,tahun)-getTerpakaiTahun(asnId,tahun));
}
// Carry over dari tahun sebelumnya:
//   - Jika admin sudah set override manual → pakai itu
//   - Jika belum → hitung otomatis dari sisa tahun lalu (jika CARRY_OVER_ENABLED)
//   - Dibatasi CARRY_OVER_MAX
function getCarryOver(asnId, tahun){
  if(!CARRY_OVER_ENABLED) return 0;
  const thnLalu = tahun - 1;
  const ovr = DB.alokasi?.[asnId]?.[tahun]?.carryover_override;
  if(ovr !== undefined && ovr !== null) return Math.max(0, ovr);
  // Hitung otomatis
  const sisa = getSisaMurni(asnId, thnLalu);
  return Math.min(sisa, CARRY_OVER_MAX);
}
// Total alokasi efektif tahun ini = alokasi tahun ini + carry over
function getTotalAlokasi(asnId, tahun){
  return getAlokasiTahun(asnId, tahun) + getCarryOver(asnId, tahun);
}
// Sisa total (termasuk carry over)
function getSisaTahun(asnId, tahun){
  return Math.max(0, getTotalAlokasi(asnId, tahun) - getTerpakaiTahun(asnId, tahun));
}
function generateNoSurat(){
  const yr=new Date().getFullYear();
  const n=DB.cuti.filter(c=>c.status==='approved'&&c.tahun===yr).length+1;
  return `${String(n).padStart(3,'0')}/CUTI/BPKAD/${yr}`;
}

// ── Badge ─────────────────────────────────────────────────────
function updateCutiBadge(){
  const n=DB.cuti.filter(c=>c.status==='step1'||c.status==='step2').length;
  const el=document.getElementById('cuti-badge');
  if(el) el.textContent=n||0;
}

// ═══════════════════════════════════════════════════════════════
// RENDER PENGAJUAN CUTI TABLE
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
  const q   =(document.getElementById('cuti-search')?.value||'').toLowerCase();
  const unit=document.getElementById('cuti-f-unit')?.value||'';
  const stat=document.getElementById('cuti-f-status')?.value||'';
  const yr  =document.getElementById('cuti-f-year')?.value||'';

  const data=[...DB.cuti].filter(c=>{
    if(q&&!c.nama.toLowerCase().includes(q)&&!c.nip.includes(q)) return false;
    if(unit&&c.unit!==unit) return false;
    if(stat&&c.status!==stat) return false;
    if(yr&&String(c.tahun)!==yr) return false;
    return true;
  }).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

  document.getElementById('cuti-count').textContent=`Pengajuan Cuti (${data.length})`;
  updateCutiBadge();

  const isAdmin=session?.role==='admin';
  const heads=['No Surat','Nama / NIP','Tgl Mulai','Tgl Selesai','Hari Kerja','Keperluan','Status','Approval','Aksi'];
  const th=document.getElementById('cuti-thead');
  if(th) th.innerHTML='<tr>'+(isAdmin?'<th style="width:32px"><input type="checkbox" id="chk-all-cuti" onchange="toggleAllCutiCheck(this)" style="accent-color:var(--primary)"></th>':'')+heads.map(h=>`<th>${h}</th>`).join('')+'</tr>';

  const pg=pageNums['cuti']||1;
  const pages=Math.ceil(data.length/PER_PAGE)||1;
  const cur=Math.min(pg,pages);
  pageNums['cuti']=cur;
  const slice=data.slice((cur-1)*PER_PAGE,cur*PER_PAGE);

  const tb=document.getElementById('cuti-tbody');
  if(tb) tb.innerHTML=slice.length
    ? slice.map(c=>`<tr>
        ${isAdmin?`<td style="width:32px"><input type="checkbox" class="cuti-chk" value="${c.id}" style="accent-color:var(--primary)"></td>`:''}
        <td class="td-mono" style="font-size:10px">${c.no_surat||'—'}</td>
        <td><div style="font-weight:600;font-size:12px">${c.nama}</div><div class="emp-av-nip">${c.nip}</div></td>
        <td style="font-size:11px">${fmt(c.tgl_mulai)}</td>
        <td style="font-size:11px">${fmt(c.tgl_selesai)}</td>
        <td style="text-align:center"><span class="badge b-blue">${c.hari_kerja} hari</span></td>
        <td style="font-size:11px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${c.keperluan||''}">${c.keperluan||'—'}</td>
        <td>${cutiStatusBadge(c.status)}</td>
        <td>${cutiApprovalMini(c)}</td>
        <td style="white-space:nowrap;display:flex;gap:4px;flex-wrap:wrap">
          <button class="btn btn-sm" onclick="openCutiDetail('${c.id}')">Detail</button>
          ${c.status==='approved'?`<button class="btn btn-sm btn-success" onclick="cetakSuratCuti('${c.id}')">Cetak</button>`:''}
          ${c.status==='draft'&&session?.role==='admin'?`<button class="btn btn-sm" onclick="openAjukanCuti('${c.id}')">Edit</button>`:''}
          ${['draft','step1'].includes(c.status)&&session?.role==='admin'?`<button class="btn btn-sm btn-danger" onclick="batalkanCuti('${c.id}')">Batal</button>`:''}
          ${session?.role==='admin'?`<button class="btn btn-sm btn-danger" onclick="hapusCuti('${c.id}')" title="Hapus riwayat permanen">🗑</button>`:''}
        </td>
      </tr>`).join('')
    : `<tr><td colspan="${heads.length}" style="text-align:center;color:var(--tx3);padding:24px">Belum ada pengajuan cuti</td></tr>`;

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
  const cls =s=>s==='done'?'b-green':s==='active'?'b-blue':s==='rejected'?'b-red':'b-gray';
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
// FORM PENGAJUAN — kalender interaktif, tanpa tipe cuti
// ═══════════════════════════════════════════════════════════════
let _calState={ month:new Date().getMonth(), year:new Date().getFullYear(), start:null, end:null };

function openAjukanCuti(editId=null){
  if(session?.role==='user'){ showToast('Hanya Admin yang dapat mengajukan cuti','error'); return; }
  const ex=editId?DB.cuti.find(c=>c.id===editId):null;
  document.getElementById('modal-title').textContent=editId?'Edit Pengajuan Cuti':'Ajukan Cuti Baru';
  document.getElementById('modal-box').style.maxWidth='800px';

  const asnOpts=DB.asn.map(a=>`<option value="${a.id}" data-nip="${a.nip}"${ex?.asn_id===a.id?' selected':''}>${a.nama} — ${a.nip}</option>`).join('');
  const initS=ex?.tgl_mulai||'', initE=ex?.tgl_selesai||'';

  document.getElementById('modal-body').innerHTML=`
    <div style="display:grid;grid-template-columns:1.1fr 1fr;gap:18px">
      <div>
        <div class="fg" style="margin-bottom:11px">
          <label>Pegawai ASN *</label>
          <select id="ca-asn" style="width:100%" onchange="onCaAsnChange()">${asnOpts}</select>
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
        <div class="fg">
          <label>Alamat Selama Cuti</label>
          <input type="text" id="ca-alamat" value="${ex?.alamat||''}" placeholder="Alamat lengkap selama menjalani cuti">
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
    start: initS?parseDateLocal(initS):null,
    end:   initE?parseDateLocal(initE):null };
  renderCalendar();
  onCaAsnChange();
  if(initS&&initE) onCaDateChange();
}

function onCaAsnChange(){
  const sel=document.getElementById('ca-asn'); if(!sel?.value) return;
  const asn=DB.asn.find(a=>a.id===sel.value); if(!asn) return;
  const yr=new Date().getFullYear();
  const al=getAlokasiTahun(asn.id,yr);
  const tp=getTerpakaiTahun(asn.id,yr);
  const ss=getSisaTahun(asn.id,yr);
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
  const s=document.getElementById('ca-mulai')?.value;
  const e=document.getElementById('ca-selesai')?.value;
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
  renderCalendar();
  checkSisaWarning();
}

function checkSisaWarning(){
  const asnSel=document.getElementById('ca-asn');
  if(!asnSel?.value) return;
  const hari=parseInt(document.getElementById('ca-hari')?.textContent)||0;
  if(!hari) return;
  const yr=new Date().getFullYear();
  const sisa=getSisaTahun(asnSel.value,yr);
  const chip=document.getElementById('ca-sisa-chip');
  if(!chip) return;
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
  const fd=new Date(year,month,1).getDay();
  const dim=new Date(year,month+1,0).getDate();
  for(let i=0;i<fd;i++) h+=`<div class="cuti-cal-day other-month"></div>`;
  for(let d=1;d<=dim;d++){
    const cur=new Date(year,month,d);
    const dow=cur.getDay();
    const ds=cur.toISOString().slice(0,10);
    const isWE=dow===0||dow===6;
    const isHL=libur.has(ds);
    const isSt=start&&ds===fmtDateLocal(start);
    const isEn=end&&ds===fmtDateLocal(end);
    const inRng=start&&end&&cur>start&&cur<end;
    let cls='cuti-cal-day';
    if(isWE) cls+=' weekend';
    if(isHL) cls+=' holiday';
    if(isSt||isEn) cls+=' selected';
    else if(inRng) cls+=' in-range';
    h+=`<div class="${cls}" onclick="pickDate('${ds}')">${d}</div>`;
  }
  grid.innerHTML=h;
}

function pickDate(ds){
  const d=parseDateLocal(ds);
  const mulai=document.getElementById('ca-mulai');
  const selesai=document.getElementById('ca-selesai');
  if(!_calState.start||(_calState.start&&_calState.end)){
    _calState.start=d; _calState.end=null;
    if(mulai) mulai.value=ds;
    if(selesai) selesai.value='';
    document.getElementById('ca-hari').textContent='—';
    document.getElementById('ca-hari-note').textContent='Pilih tanggal selesai';
  } else {
    if(d<_calState.start){_calState.end=_calState.start;_calState.start=d;}
    else _calState.end=d;
    if(mulai)   mulai.value  =_calState.start.toISOString().slice(0,10);
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
  const btn=document.querySelector('#modal-footer .btn-primary');
  if(btn){ btn.disabled=true; btn.textContent='Menyimpan...'; }
  try{
    let error;
    if(editId){
      ({error}=await supa.from('cuti').update({tgl_mulai:mulai,tgl_selesai:selesai,hari_kerja:hari,keperluan,alamat}).eq('id',editId));
    } else {
      ({error}=await supa.from('cuti').insert({
        asn_id:asn.id,nip:asn.nip,nama:asn.nama,unit:asn.unit,
        tgl_mulai:mulai,tgl_selesai:selesai,hari_kerja:hari,keperluan,alamat,
        status:'draft',step:0,tahun:new Date().getFullYear()
      }));
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
  const al=getAlokasiTahun(c.asn_id,yr);
  const tp=getTerpakaiTahun(c.asn_id,yr);
  const ss=getSisaTahun(c.asn_id,yr);
  const pct=Math.min(100,Math.round(tp/al*100));
  const col=ss<=3?'var(--red-tx)':ss<=7?'var(--amb-tx)':'var(--grn-tx)';

  const steps=[
    {label:'Kepala Subbagian',by:c.step1_by,at:c.step1_at,note:c.step1_note},
    {label:'Kepala Bidang',   by:c.step2_by,at:c.step2_at,note:c.step2_note},
    {label:'Admin (Final)',   by:c.final_by, at:c.final_at, note:c.final_note},
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

  document.getElementById('cuti-detail-content').innerHTML=`
    <button class="btn btn-sm" onclick="showPage('cuti',document.querySelector('.ni.active'))" style="margin-bottom:14px">← Kembali ke Daftar</button>

    <div class="cc" style="margin-bottom:12px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px">
        <div>
          <div style="font-size:16px;font-weight:700">${c.nama}</div>
          <div style="font-size:12px;color:var(--tx2);margin-top:2px">${c.nip} · ${c.unit}</div>
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
            ${cutiStatusBadge(c.status)}
            ${c.no_surat?`<span class="badge b-gray">${c.no_surat}</span>`:''}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${c.status==='approved'?`<button class="btn btn-success btn-sm" onclick="cetakSuratCuti('${c.id}')">🖨 Cetak Surat</button>`:''}
          ${c.status==='draft'&&session?.role==='admin'?`<button class="btn btn-sm btn-primary" onclick="ajukanStep1('${c.id}')">Ajukan ke Kasubbag →</button>`:''}
          ${c.status==='draft'&&session?.role==='admin'?`<button class="btn btn-sm" onclick="openAjukanCuti('${c.id}')">Edit</button>`:''}
          ${c.status==='step1'&&session?.role==='admin'?`<button class="btn btn-sm btn-success" onclick="approveStep('${c.id}',1)">✓ Kasubbag Setuju</button><button class="btn btn-sm btn-danger" onclick="rejectStep('${c.id}',1)">✗ Tolak</button>`:''}
          ${c.status==='step2'&&session?.role==='admin'?`<button class="btn btn-sm btn-success" onclick="approveStep('${c.id}',2)">✓ Kabid Setuju</button><button class="btn btn-sm btn-danger" onclick="rejectStep('${c.id}',2)">✗ Tolak</button>`:''}
          ${c.status==='step2'&&session?.role==='admin'?`<button class="btn btn-sm btn-primary" onclick="approveStep('${c.id}',3)">✓ Admin Setuju — Selesai</button>`:''}
          ${['draft','step1'].includes(c.status)&&session?.role==='admin'?`<button class="btn btn-sm btn-danger" onclick="batalkanCuti('${c.id}')">Batalkan</button>`:''}
          ${session?.role==='admin'?`<button class="btn btn-sm btn-danger" onclick="hapusCuti('${c.id}',true)" title="Hapus riwayat permanen">Hapus Riwayat</button>`:''}
        </div>
      </div>

      <div class="detail-grid" style="margin-bottom:16px">
        <div class="dc">
          <div class="dc-title">Rincian Cuti</div>
          ${dr('Tanggal Mulai',fmt(c.tgl_mulai))}
          ${dr('Tanggal Selesai',fmt(c.tgl_selesai))}
          ${dr('Hari Kerja','<span class="badge b-blue">'+c.hari_kerja+' hari</span>')}
          ${dr('Keperluan',c.keperluan||'—')}
          ${dr('Alamat Selama Cuti',c.alamat||'—')}
          ${dr('Tanggal Pengajuan',fmt(c.created_at?.slice(0,10)))}
        </div>
        <div class="dc">
          <div class="dc-title">Sisa Alokasi Cuti ${yr}</div>
          ${dr('Alokasi Tahun '+yr, al+' hari')}
          ${dr('Carry Over (thn '+(yr-1)+')', getCarryOver(c.asn_id,yr)>0
            ? '<span class="badge b-green">+'+getCarryOver(c.asn_id,yr)+' hari</span>'
            : '<span style="color:var(--tx3)">—</span>')}
          ${dr('Total Efektif','<strong style="color:var(--primary)">'+getTotalAlokasi(c.asn_id,yr)+' hari</strong>')}
          ${dr('Sudah Terpakai',tp+' hari')}
          ${dr('Sisa','<strong style="color:'+col+'">'+ss+' hari</strong>')}
          <div style="margin-top:8px">
            <div class="leave-bar-track" style="height:8px"><div class="leave-bar-fill" style="width:${pct}%;background:${col}"></div></div>
            <div style="font-size:10px;color:var(--tx3);margin-top:3px">${pct}% dari total ${getTotalAlokasi(c.asn_id,yr)} hari</div>
          </div>
          ${asn?dr('Pangkat / Gol','<span class="badge '+golBadge(asn.pangkat)+'">'+asn.pangkat+'</span>'):'' }
          ${asn?dr('Jabatan',asn.jabatan||'—'):''}
        </div>
      </div>

      <!-- Approval timeline -->
      <div class="dc-title" style="margin-bottom:10px">Alur Persetujuan</div>
      <div class="approval-timeline">
        ${steps.map((s,i)=>{
          const st=stepState(i);
          const dotCls=st==='done'?'done':st==='active'?'active':st==='rejected'?'rejected':'pending';
          return `<div class="atstep">
            <div class="atstep-dot ${dotCls}">${st==='done'?'✓':st==='rejected'?'✗':(i+1)}</div>
            <div class="atstep-label">${s.label}</div>
            ${s.by?`<div class="atstep-sub">${s.by}</div>`:'' }
            ${s.at?`<div class="atstep-sub">${s.at.slice(0,10)}</div>`:''}
            ${s.note?`<div class="atstep-sub" style="color:var(--red-tx)">"${s.note}"</div>`:''}
          </div>`;
        }).join('<div style="flex:1;height:2px;background:var(--bg3);margin-top:16px"></div>')}
      </div>
    </div>`;

  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-cuti-detail').classList.add('active');
  document.getElementById('pt-title').textContent='Detail Pengajuan Cuti';
  document.getElementById('pt-sub').textContent=c.nama;
  document.getElementById('pt-actions').innerHTML='';
  currentPage='cuti-detail';
}

async function ajukanStep1(id){
  const {error}=await supa.from('cuti').update({status:'step1',step:1}).eq('id',id);
  if(!error){ await loadCutiFromServer(); openCutiDetail(id); updateCutiBadge(); showToast('Diajukan ke Kepala Subbagian','success'); }
  else showToast(error.message,'error');
}

async function approveStep(id,step){
  const now=new Date().toISOString();
  const who=session?.label||session?.username||'Admin';
  let upd={};
  if(step===1) upd={step1_by:who,step1_at:now,status:'step2',step:2};
  else if(step===2) upd={step2_by:who,step2_at:now,status:'step2',step:2};
  else if(step===3){
    const yr=new Date().getFullYear();
    const {count}=await supa.from('cuti').select('*',{count:'exact',head:true}).eq('status','approved').eq('tahun',yr);
    const no=String((count||0)+1).padStart(3,'0');
    upd={final_by:who,final_at:now,status:'approved',step:3,no_surat:`${no}/CUTI/BPKAD/${yr}`};
  }
  const {error}=await supa.from('cuti').update(upd).eq('id',id);
  if(!error){
    await loadCutiFromServer(); openCutiDetail(id); updateCutiBadge();
    const c=DB.cuti.find(x=>x.id===id);
    showToast(step===3?`Cuti disetujui! No. Surat: ${c?.no_surat||'-'}`:'Disetujui','success');
  } else showToast(error.message,'error');
}

async function rejectStep(id,step){
  const note=prompt('Alasan penolakan (wajib):','');
  if(!note||!note.trim()){ showToast('Alasan wajib diisi','error'); return; }
  const now=new Date().toISOString();
  const who=session?.label||'Admin';
  let upd={status:'rejected',step};
  if(step===1) upd={...upd,step1_by:who,step1_at:now,step1_note:note.trim()};
  else upd={...upd,step2_by:who,step2_at:now,step2_note:note.trim()};
  const {error}=await supa.from('cuti').update(upd).eq('id',id);
  if(!error){ await loadCutiFromServer(); openCutiDetail(id); updateCutiBadge(); showToast('Pengajuan ditolak','error'); }
  else showToast(error.message,'error');
}

function batalkanCuti(id){
  showConfirm('Batalkan Cuti','Batalkan pengajuan cuti ini?',async()=>{
    const {error}=await supa.from('cuti').update({status:'cancelled'}).eq('id',id);
    if(!error){ await loadCutiFromServer(); renderCutiTable(); updateCutiBadge(); showToast('Dibatalkan','success'); }
    else showToast(error.message,'error');
  });
}

// Hapus satu riwayat permanen
function hapusCuti(id, dariDetail=false){
  const c=DB.cuti.find(x=>x.id===id);
  const warn=c?.status==='approved'?'<br><span style="color:var(--red-tx);font-weight:700">⚠ Cuti ini sudah disetujui.</span>':'';
  showConfirm('Hapus Riwayat Cuti',`Hapus permanen riwayat ini?<br>Data tidak dapat dikembalikan.${warn}`,async()=>{
    const {error}=await supa.from('cuti').delete().eq('id',id);
    if(!error){
      await loadCutiFromServer();
      if(dariDetail) showPage('cuti',document.querySelector('.ni.active'));
      else renderCutiTable();
      updateCutiBadge(); showToast('Riwayat dihapus','success');
    } else showToast(error.message,'error');
  });
}

// Hapus riwayat terpilih
function hapusCutiTerpilih(){
  const ids=[...document.querySelectorAll('.cuti-chk:checked')].map(el=>el.value);
  if(!ids.length){ showToast('Pilih riwayat terlebih dahulu','error'); return; }
  showConfirm('Hapus Riwayat Terpilih',`Hapus permanen <strong>${ids.length} riwayat</strong>?`,async()=>{
    const {error}=await supa.from('cuti').delete().in('id',ids);
    if(!error){ await loadCutiFromServer(); renderCutiTable(); updateCutiBadge(); showToast(`${ids.length} riwayat dihapus`,'success'); }
    else showToast(error.message,'error');
  });
}

// Toggle semua checkbox
function toggleAllCutiCheck(el){
  document.querySelectorAll('.cuti-chk').forEach(chk=>chk.checked=el.checked);
}

// ═══════════════════════════════════════════════════════════════
// CETAK SURAT CUTI
// ═══════════════════════════════════════════════════════════════
function cetakSuratCuti(id){
  const c=DB.cuti.find(x=>x.id===id);
  if(!c||c.status!=='approved'){ showToast('Surat hanya dapat dicetak setelah disetujui','error'); return; }
  const asn=DB.asn.find(a=>a.id===c.asn_id);
  const tglLong=d=>{ if(!d) return '—'; const dt=new Date(d); return `${dt.getDate()} ${['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][dt.getMonth()]} ${dt.getFullYear()}`; };
  const tglHari=(d)=>{ if(!d) return '—'; return d.slice(0,10); };

  // Nomor surat format resmi: 800.1.11.4 / NNN / BPKAD / YYYY
  const tahunSurat = c.tahun || new Date().getFullYear();
  const nomorUrut  = c.no_surat ? c.no_surat.split('/')[0].trim() : '___';
  const nomorResmi = `800.1.11.4 / ${nomorUrut} / BPKAD / ${tahunSurat}`;
  const logoHtml   = _logoData
    ? `<img src="${_logoData}" style="width:70px;height:70px;object-fit:contain">`
    : `<div style="width:68px;height:68px;border:1.5px solid #000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;text-align:center;line-height:1.2">LOGO<br>INSTANSI</div>`;

  document.getElementById('print-surat').innerHTML=`
    <div class="surat-print">

      <!-- KOP SURAT -->
      <div class="surat-kop">
        <div class="surat-kop-logo">${logoHtml}</div>
        <div class="surat-kop-text">
          <div class="instansi1">Pemerintah Provinsi Kalimantan Selatan</div>
          <div class="instansi2">Badan Pengelolaan Keuangan</div>
          <div class="instansi2">Dan Aset Daerah</div>
          <div class="alamat">Jl. Raya Dharma Praja, Banjarbaru Kalimantan Selatan</div>
          <div class="alamat">(Kawasan Perkantoran Pemerintah Provinsi Kalsel)</div>
          <div class="website">Laman : https://bpkad.kalselprov.go.id/ &nbsp; Pos-el : bpkad@kalselprov.go.id</div>
        </div>
      </div>
      <hr class="surat-garis-kop">
      <hr class="surat-garis-kop2">

      <!-- JUDUL -->
      <div class="surat-title">Surat Izin Cuti Tahunan</div>
      <div class="surat-nomor">Nomor : ${nomorResmi}</div>

      <!-- BUTIR 1 -->
      <div class="surat-butir">
        <span class="surat-butir-num">1.</span>
        <span>Diberikan Cuti Tahunan ${tahunSurat} Kepada Pegawai Negeri Sipil :</span>
      </div>

      <!-- TABEL DATA PEGAWAI -->
      <table class="surat-tabel">
        <tr>
          <td>Nama</td><td>:</td>
          <td><strong>${c.nama}</strong></td>
        </tr>
        <tr>
          <td>NIP</td><td>:</td>
          <td>${c.nip}</td>
        </tr>
        <tr>
          <td>Pangkat / Gol. Ruang</td><td>:</td>
          <td>${asn?.pangkat||'—'}</td>
        </tr>
        <tr>
          <td>Jabatan</td><td>:</td>
          <td>${asn?.jabatan||'—'}</td>
        </tr>
        <tr>
          <td>Satuan Organisasi</td><td>:</td>
          <td>Badan Pengelolaan Keuangan dan Aset Daerah<br>Provinsi Kalimantan Selatan</td>
        </tr>
        <tr>
          <td>Selama ${c.hari_kerja} (${terbilang(c.hari_kerja)}) hari kalender, terhitung mulai tanggal ${tglLong(c.tgl_mulai)} s/d ${tglLong(c.tgl_selesai)} dengan ketentuan sebagai berikut :</td>
          <td></td><td></td>
        </tr>
      </table>

      <!-- KETENTUAN a, b, c -->
      <table class="surat-ketentuan">
        <tr>
          <td>a.</td>
          <td>Sebelum menjalankan cuti tahunan wajib menyerahkan pekerjaannya kepada atasan langsung atau pejabat yang ditentukan.</td>
        </tr>
        <tr>
          <td>b.</td>
          <td>Setelah selesai menjalankan cuti tahunan wajib melaporkan diri kepada atasan langsungnya dan bekerja kembali sebagaimana mestinya.</td>
        </tr>
        <tr>
          <td>c.</td>
          <td>Alamat Selama Cuti : ${c.alamat||'____________________'}</td>
        </tr>
      </table>

      <!-- BUTIR 2 -->
      <div class="surat-butir" style="margin-top:4px">
        <span class="surat-butir-num">2.</span>
        <span>Demikian Surat Izin Cuti Tahunan ini diterbitkan untuk dapat dipergunakan sebagaimana mestinya.</span>
      </div>

      <!-- TANDA TANGAN -->
      <div class="surat-ttd-wrap">
        <div class="surat-ttd-box">
          <div>Banjarbaru, ${tglLong(new Date().toISOString())}</div>
          <div style="display:flex;gap:4px;justify-content:center;margin-top:2px">
            <span>an.</span>
            <span>Kepala Badan Pengelolaan Keuangan dan Aset Daerah</span>
          </div>
          <div>Provinsi Kalimantan Selatan,</div>
          <div style="margin-top:4px">Sekretaris,</div>
          <div class="surat-ttd-space"></div>
          <div class="surat-ttd-nama">.....................................................</div>
          <div style="font-size:10pt">NIP. .................................................</div>
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

