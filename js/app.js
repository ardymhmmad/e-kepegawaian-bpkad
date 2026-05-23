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
  // Load WA templates
  await loadWATemplates();
}
