// ── Pensiun helpers ────────────────────────────────────────
function getFilters(type){
  if(type==='pensiun'){
    return {
      q:    document.getElementById('pensiun-q')?.value||'',
      unit: document.getElementById('pensiun-unit')?.value||'',
      status: document.getElementById('pensiun-status')?.value||''
    };
  }
  // KP / KGB — id elemen berbeda dari pensiun
  if(type==='kp') return {
    q:      document.getElementById('kp-q')?.value||'',
    unit:   document.getElementById('kp-f-unit')?.value||'',
    status: document.getElementById('kp-f-status')?.value||''
  };
  if(type==='kgb') return {
    q:      document.getElementById('kgb-q')?.value||'',
    unit:   document.getElementById('kgb-f-unit')?.value||'',
    status: document.getElementById('kgb-f-status')?.value||''
  };
  return {
    q:    document.getElementById(type+'-q')?.value||'',
    unit: document.getElementById(type+'-unit')?.value||'',
    status: document.getElementById(type+'-status')?.value||''
  };
}

function refreshTablePensiun(){
  pageNums['pensiun']=1;
  renderPensiun(getFilters('pensiun'));
}

function filterPensiunStatus(status){
  const sel = document.getElementById('pensiun-status');
  if(sel) sel.value = status;
  refreshTablePensiun();
}


function exportExcelPensiun(){
  const data = (DB.asn||[]).map(a=>{
    const p = calcPensiun(a);
    return {
      'NIP': a.nip,
      'Nama ASN': a.nama,
      'Unit Kerja': a.unit,
      'Tgl Lahir': p.tglLahir ? fmtDate(p.tglLahir) : '—',
      'Usia (th)': p.usia??'—',
      'Batas Usia': p.batasUsia+' th',
      'Tgl Pensiun': p.tglPensiun ? fmtDate(p.tglPensiun) : '—',
      'Sisa Hari': p.sisaHari??'—',
      'Status': p.status,
      'Keterangan': p.keterangan
    };
  });
  if(!data.length){ showToast('Tidak ada data','error'); return; }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Monitoring Pensiun');
  XLSX.writeFile(wb, 'monitoring_pensiun_'+new Date().getFullYear()+'.xlsx');
}

// ═══════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════
function seedData(){
  DB.asn=[];
  DB.pppk=[];
  DB.pjlp=[];
}

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
async function init(){
  DB={asn:[],pppk:[],pjlp:[],cuti:[],alokasi:{}};
  initAllFilters(); renderDashboard(); // skeleton segera

  // Load semua data paralel
  const [_,settingsRes,cutiRes,alokasiRes] = await Promise.all([
    loadFromServer(),
    supa.from('settings').select('setting_key,setting_val'),
    supa.from('cuti').select('*').order('created_at',{ascending:false}),
    supa.from('alokasi_cuti').select('*').eq('tahun',new Date().getFullYear()),
  ]);

  // Terapkan settings
  if(settingsRes.data){
    const cfg={}; settingsRes.data.forEach(r=>{ cfg[r.setting_key]=r.setting_val; });
    if(cfg.logo_path){ _logoData=cfg.logo_path; applyLogoEverywhere(cfg.logo_path); }
    if(cfg.def_alokasi_cuti)   DEF_ALOKASI=parseInt(cfg.def_alokasi_cuti)||12;
    if(cfg.carry_over_enabled) CARRY_OVER_ENABLED=cfg.carry_over_enabled==='1';
    if(cfg.carry_over_max)     CARRY_OVER_MAX=parseInt(cfg.carry_over_max)||999;
    if(cfg.fonnte_token)       FONNTE_TOKEN=cfg.fonnte_token;
    if(cfg.no_urut_cuti)       NO_URUT_CUTI=parseInt(cfg.no_urut_cuti)||1;
  }

  // Cache cuti
  if(cutiRes.data) DB.cuti=cutiRes.data;

  // Cache alokasi override
  if(alokasiRes.data){
    const yr=new Date().getFullYear();
    alokasiRes.data.forEach(r=>{
      if(!DB.alokasi[r.asn_id]) DB.alokasi[r.asn_id]={};
      DB.alokasi[r.asn_id][yr]={};
      if(r.alokasi!==null) DB.alokasi[r.asn_id][yr].alokasi=r.alokasi;
      if(r.carryover_override!==null) DB.alokasi[r.asn_id][yr].carryover_override=r.carryover_override;
    });
  }

  renderDashboard(); updateCutiBadge();
  // Jika halaman pensiun/kp/kgb sudah aktif saat data selesai load, render ulang
  if(typeof currentPage !== 'undefined'){
    if(currentPage==='pensiun') renderPensiun(getFilters('pensiun'));
    else if(currentPage==='kp')  renderKP(getFilters('kp'));
    else if(currentPage==='kgb') renderKGB(getFilters('kgb'));
  }
  // Update badge pensiun (Segera Pensiun ≤6 bln)
  const _nSegera = (DB.asn||[]).filter(a=>calcPensiun(a).status==='Segera Pensiun').length;
  const _badgePensiun = document.getElementById('pensiun-badge');
  if(_badgePensiun){ _badgePensiun.textContent=_nSegera; _badgePensiun.style.display=_nSegera?'':'none'; }
  // Load WA templates
  await loadWATemplates();

  // Load libur nasional tahun ini & tahun depan (hybrid: DB → API → fallback)
  const tahunIni = new Date().getFullYear();
  await Promise.all([
    loadLiburNasional(tahunIni),
    loadLiburNasional(tahunIni + 1),
  ]);
}
