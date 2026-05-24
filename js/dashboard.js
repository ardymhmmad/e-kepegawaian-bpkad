// ═══════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════
function renderDashboard(){
  // Show skeleton first for perceived speed
  const statsEl=document.getElementById('db-stats');
  if(statsEl&&statsEl.innerHTML===''){
    statsEl.innerHTML=Array(4).fill(0).map(()=>`<div class="sc sc-skel"><div class="skeleton sc-lbl" style="height:10px;width:70px;margin-bottom:8px"></div><div class="skeleton sc-val" style="height:28px;width:55px"></div></div>`).join('');
  }
  const asnN=DB.asn.length, pppkN=DB.pppk.length, pjlpN=DB.pjlp.length;
  const totalN=asnN+pppkN+pjlpN;
  const kpAlert=DB.asn.filter(a=>{ const k=calcKP(a); return k.status==='Mengingatkan'||k.status==='Memenuhi Syarat'; }).length;
  const kgbAlert=DB.asn.filter(a=>{ const k=calcKGB(a); return k.daysToKGB<=30&&k.daysToKGB>=0; }).length;
  const expPJLP=DB.pjlp.filter(j=>daysUntil(j.akhir_kontrak)<=30&&daysUntil(j.akhir_kontrak)>=0).length;
  const statCards=[
    {color:'#1649c8',bg:'#eef2ff',icon:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',lbl:'Total Pegawai',val:totalN,note:'ASN + PPPK PW + PJLP',noteClass:'up',delay:'fade-up-1'},
    {color:'#1649c8',bg:'#eef2ff',icon:'<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>',lbl:'Aparatur Sipil Negara',val:asnN,note:'Total Aparatur Sipil Negara',noteClass:'up',delay:'fade-up-2'},
    {color:'#065f46',bg:'#ecfdf5',icon:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',lbl:'PPPK Paruh Waktu',val:pppkN,note:'Total PPPK Paruh Waktu',noteClass:'up',delay:'fade-up-3'},
    {color:'#92400e',bg:'#fffbeb',icon:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',lbl:'PJLP',val:pjlpN,note:expPJLP?`${expPJLP} kontrak segera berakhir`:'Total PJLP',noteClass:expPJLP?'warn':'up',delay:'fade-up-4'},
  ];
  document.getElementById('db-stats').innerHTML=statCards.map(s=>`
    <div class="sc fade-up ${s.delay}" style="--sc-color:${s.color}">
      <div class="sc-icon" style="background:${s.bg}">
        <svg viewBox="0 0 24 24" fill="none" stroke="${s.color}" stroke-width="2" stroke-linecap="round">${s.icon}</svg>
      </div>
      <div class="sc-lbl">${s.lbl}</div>
      <div class="sc-val">${s.val}</div>
      <div class="sc-note ${s.noteClass}">
        <span class="pulse-dot" style="background:${s.noteClass==='up'?'#065f46':s.noteClass==='warn'?'#92400e':'#991b1b'}"></span>
        ${s.note}
      </div>
    </div>`).join('');

  // Alert
  const alerts=[];
  if(kpAlert) alerts.push(`${kpAlert} ASN mendekati/sudah memenuhi syarat Kenaikan Pangkat`);
  if(kgbAlert) alerts.push(`${kgbAlert} KGB jatuh tempo dalam 30 hari`);
  const pjlpExp=DB.pjlp.filter(j=>daysUntil(j.akhir_kontrak)<=30&&daysUntil(j.akhir_kontrak)>=0).length;
  if(pjlpExp) alerts.push(`${pjlpExp} kontrak PJLP berakhir dalam 30 hari`);
  const aw=document.getElementById('db-alert-wrap');
  aw.innerHTML=alerts.length?`<div class="alert-banner"><div class="alert-dot"></div><span><strong>Perhatian:</strong> ${alerts.join(' · ')}</span></div>`:'';

  // Gender per type
  const gd=[
    {l:'ASN',L:DB.asn.filter(a=>a.jk==='Laki-laki').length,P:DB.asn.filter(a=>a.jk==='Perempuan').length},
    {l:'PPPK PW',L:DB.pppk.filter(a=>a.jk==='Laki-laki').length,P:DB.pppk.filter(a=>a.jk==='Perempuan').length},
    {l:'PJLP',L:DB.pjlp.filter(a=>a.jk==='Laki-laki').length,P:DB.pjlp.filter(a=>a.jk==='Perempuan').length}
  ];
  let gHtml=gd.map(g=>{const t=g.L+g.P||1;return`<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--tx2);margin-bottom:4px"><span>${g.l}</span><span>L:${g.L} P:${g.P}</span></div><div style="height:7px;border-radius:4px;overflow:hidden;background:var(--bg3);display:flex"><div style="width:${Math.round(g.L/t*100)}%;background:#1a56db"></div><div style="width:${Math.round(g.P/t*100)}%;background:#d4537e"></div></div></div>`;}).join('');
  gHtml+=`<div style="display:flex;gap:14px;margin-top:8px;font-size:11px;color:var(--tx2)"><span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#1a56db;margin-right:4px"></span>L</span><span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#d4537e;margin-right:4px"></span>P</span></div>`;

  // KGB soon list
  const kgbSoon=[...DB.asn].map(a=>({...a,...calcKGB(a)})).sort((a,b)=>a.daysToKGB-b.daysToKGB).slice(0,5);
  const kgbHtml=kgbSoon.length?kgbSoon.map(k=>`<div class="kgb-item"><div class="kgb-av">${initials(k.nama)}</div><div><div class="kgb-name">${shortName(k.nama)}</div><div class="kgb-unit">${k.unit||''}</div></div><div class="kgb-due ${k.daysToKGB<=14?'soon':'ok'}">${k.daysToKGB<0?'Lewat':k.daysToKGB+' hari'}</div></div>`).join(''):'<div style="font-size:12px;color:var(--tx3)">Tidak ada data</div>';

  // KP — Mengingatkan & Memenuhi Syarat
  const kpSoon=[...DB.asn].map(a=>({...a,...calcKP(a)})).filter(a=>a.status==='Memenuhi Syarat'||a.status==='Mengingatkan').sort((a,b)=>a.daysToKP-b.daysToKP).slice(0,5);
  const kpHtml=kpSoon.length?kpSoon.map(k=>{
    const isMS=k.status==='Memenuhi Syarat';
    const label=isMS?'Memenuhi Syarat':k.daysToKP+' hari';
    const cls=isMS?'soon':k.daysToKP<=30?'soon':'ok';
    return `<div class="kgb-item"><div class="kgb-av" style="background:#eef2ff;color:#1649c8">${initials(k.nama)}</div><div style="flex:1;min-width:0"><div class="kgb-name">${shortName(k.nama)}</div><div class="kgb-unit">${shortUnit(k.unit)||''}</div></div><div style="text-align:right;flex-shrink:0"><div class="kgb-due ${cls}">${label}</div><div style="font-size:9px;color:var(--tx3);margin-top:2px">${k.pangkat} → ${k.nextPangkat}</div></div></div>`;
  }).join(''):'<div style="font-size:12px;color:var(--tx3)">Tidak ada data</div>';

  document.getElementById('db-charts1').innerHTML=`
    <div class="cc fade-up">
      <div class="cc-title"><span class="cc-title-dot" style="background:#1649c8"></span>Rekap Jenis Kelamin Seluruh Pegawai </div>
      ${gHtml}
    </div>
    <div class="cc fade-up fade-up-1">
      <div class="cc-title"><span class="cc-title-dot" style="background:#92400e"></span>KGB Jatuh Tempo — Paling Dekat</div>
      ${kgbHtml}
    </div>
    <div class="cc fade-up fade-up-2">
      <div class="cc-title"><span class="cc-title-dot" style="background:#1649c8"></span>Kenaikan Pangkat — Segera & Memenuhi Syarat</div>
      ${kpHtml}
    </div>`;

  // Edu, Rank, PJLP jobs
  const eduMap={};DB.asn.forEach(a=>{eduMap[a.pendidikan]=(eduMap[a.pendidikan]||0)+1;});
  const rankMap={};DB.asn.forEach(a=>{rankMap[a.pangkat]=(rankMap[a.pangkat]||0)+1;});
  const jpMap={};DB.pjlp.forEach(j=>{jpMap[j.jenis_pekerjaan]=(jpMap[j.jenis_pekerjaan]||0)+1;});
  const maxE=Math.max(...Object.values(eduMap),1);
  const maxR=Math.max(...Object.values(rankMap),1);
  const maxJ=Math.max(...Object.values(jpMap),1);
  const eduHtml=EDU_LIST.filter(e=>eduMap[e]).map(e=>`<div class="bar-row"><div class="bar-lbl">${e}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(eduMap[e]/maxE*100)}%;background:#065f46"></div></div><div class="bar-val">${eduMap[e]}</div></div>`).join('');
  const rankHtml=GOL_LIST.filter(r=>rankMap[r]).map(r=>`<div class="bar-row"><div class="bar-lbl">${r}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(rankMap[r]/maxR*100)}%;background:#1a56db"></div></div><div class="bar-val">${rankMap[r]}</div></div>`).join('');
  const jpHtml=Object.entries(jpMap).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="bar-row"><div class="bar-lbl">${k}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(v/maxJ*100)}%;background:#92400e"></div></div><div class="bar-val">${v}</div></div>`).join('');
  document.getElementById('db-charts2').innerHTML=`
    <div class="cc fade-up"><div class="cc-title"><span class="cc-title-dot" style="background:#065f46"></span>Rekap Pendidikan ASN</div>${eduHtml||noData()}</div>
    <div class="cc fade-up fade-up-1"><div class="cc-title"><span class="cc-title-dot" style="background:#1649c8"></span>Pangkat / Golongan ASN</div>${rankHtml||noData()}</div>
    <div class="cc fade-up fade-up-2"><div class="cc-title"><span class="cc-title-dot" style="background:#92400e"></span>Jenis Pekerjaan PJLP</div>${jpHtml||noData()}</div>`;

  // KP status from calcKP
  const kpMS=DB.asn.filter(a=>calcKP(a).status==='Memenuhi Syarat').length;
  const kpIng=DB.asn.filter(a=>calcKP(a).status==='Mengingatkan').length;
  const kpBMS=DB.asn.filter(a=>calcKP(a).status==='Belum Memenuhi Syarat').length;
  // Cuti pending summary on dashboard
  const cutiPending=DB.cuti.filter(c=>c.status==='step1'||c.status==='step2').length;
  const cutiApproved=DB.cuti.filter(c=>c.status==='approved'&&c.tahun===new Date().getFullYear()).length;

  document.getElementById('db-kp-box').innerHTML=`<div class="cc-title">Kenaikan Pangkat — Rekap Status</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:6px">
      <div style="text-align:center;padding:12px;background:var(--grn-bg);border-radius:8px"><div style="font-size:20px;font-weight:700;color:var(--grn-tx)">${kpMS}</div><div style="font-size:10px;color:var(--grn-tx);margin-top:3px">Memenuhi Syarat</div></div>
      <div style="text-align:center;padding:12px;background:var(--amb-bg);border-radius:8px"><div style="font-size:20px;font-weight:700;color:var(--amb-tx)">${kpIng}</div><div style="font-size:10px;color:var(--amb-tx);margin-top:3px">Mengingatkan (≤4 bln)</div></div>
      <div style="text-align:center;padding:12px;background:var(--bg2);border-radius:8px"><div style="font-size:20px;font-weight:700;color:var(--tx2)">${kpBMS}</div><div style="font-size:10px;color:var(--tx2);margin-top:3px">Belum Memenuhi Syarat</div></div>
      <div style="text-align:center;padding:12px;background:var(--pur-bg);border-radius:8px"><div style="font-size:20px;font-weight:700;color:var(--pur-tx)">${DB.asn.filter(a=>calcKP(a).status==='Batas Pendidikan').length}</div><div style="font-size:10px;color:var(--pur-tx);margin-top:3px">Batas Pendidikan</div></div>
    </div>`;

  document.getElementById('kp-badge').textContent=kpIng; // hanya Mengingatkan
  const _nSegera=(DB.asn||[]).filter(a=>calcPensiun(a).status==='Segera Pensiun').length;
  const _kgbN=(DB.asn||[]).filter(a=>calcKGB(a).status==='Segera').length;
  const _pbEl=document.getElementById('pensiun-badge'); if(_pbEl) _pbEl.textContent=_nSegera;
  document.getElementById('kgb-badge').textContent=_kgbN;
  document.getElementById('kgb-badge').textContent=kgbAlert;
  updateCutiBadge();
}
function noData(){ return '<div style="font-size:12px;color:var(--tx3);padding:8px 0">Tidak ada data</div>'; }
