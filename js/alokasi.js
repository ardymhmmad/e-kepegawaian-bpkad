// ═══════════════════════════════════════════════════════════════
// ALOKASI CUTI — tanpa tipe, hanya jumlah hari per tahun per orang
// ═══════════════════════════════════════════════════════════════
function renderAlokasiPage(){
  const defEl=document.getElementById('def-al-global');
  if(defEl) defEl.value=DEF_ALOKASI;
  // Carry over fields
  const coChk=document.getElementById('co-enabled');
  const coMax=document.getElementById('co-max');
  const coWrap=document.getElementById('co-max-wrap');
  if(coChk){ coChk.checked=CARRY_OVER_ENABLED; coChk.onchange=()=>{ if(coMax&&coWrap) coWrap.style.opacity=coChk.checked?'1':'.4'; }; }
  if(coMax) coMax.value=CARRY_OVER_MAX;
  if(coWrap) coWrap.style.opacity=CARRY_OVER_ENABLED?'1':'.4';

  // Populate year filter
  const yrSel=document.getElementById('alokasi-f-year');
  if(yrSel&&yrSel.options.length<=1){
    const yr=new Date().getFullYear();
    [yr,yr-1,yr+1].forEach(y=>yrSel.add(new Option(y,y,y===yr)));
  }
  // Populate unit filter
  const unitSel=document.getElementById('alokasi-f-unit');
  if(unitSel&&unitSel.options.length<=1)
    Object.keys(UNITS).forEach(u=>unitSel.add(new Option(u,u)));

  renderAlokasiTable();
  ['alokasi-search','alokasi-f-unit','alokasi-f-year'].forEach(id=>{
    const el=document.getElementById(id);
    if(el&&!el._aw){ el.addEventListener('input',renderAlokasiTable); el.addEventListener('change',renderAlokasiTable); el._aw=true; }
  });
}

async function saveDefaultAlokasi(){
  const v=parseInt(document.getElementById('def-al-global')?.value);
  if(isNaN(v)||v<0){ showToast('Masukkan jumlah hari yang valid','error'); return; }
  const coChk=document.getElementById('co-enabled');
  const coMax=parseInt(document.getElementById('co-max')?.value);
  DEF_ALOKASI=v; CARRY_OVER_ENABLED=coChk?.checked??true; CARRY_OVER_MAX=isNaN(coMax)||coMax<0?999:coMax;
  await Promise.all([
    supa.from('settings').upsert({setting_key:'def_alokasi_cuti',   setting_val:String(v)},           {onConflict:'setting_key'}),
    supa.from('settings').upsert({setting_key:'carry_over_enabled', setting_val:CARRY_OVER_ENABLED?'1':'0'},{onConflict:'setting_key'}),
    supa.from('settings').upsert({setting_key:'carry_over_max',     setting_val:String(CARRY_OVER_MAX)},{onConflict:'setting_key'}),
  ]);
  renderAlokasiTable();
  const msg=document.getElementById('alokasi-save-msg');
  if(msg){ msg.textContent='✓ Disimpan'; setTimeout(()=>{ if(msg) msg.textContent=''; },2500); }
  showToast(`Default ${v} hari, carry over ${CARRY_OVER_ENABLED?'aktif':'nonaktif'}`,'success');
}

function renderAlokasiTable(){
  const q   =(document.getElementById('alokasi-search')?.value||'').toLowerCase();
  const unit=document.getElementById('alokasi-f-unit')?.value||'';
  const yr  =parseInt(document.getElementById('alokasi-f-year')?.value)||new Date().getFullYear();
  const data=DB.asn.filter(a=>
    (!q||(a.nama.toLowerCase().includes(q)||a.nip.includes(q)))&&
    (!unit||a.unit===unit)
  );

  const isAdmin=session?.role==='admin';
  const heads=['','Nama / NIP','Unit Kerja','Alokasi Thn Ini','Sisa Thn Lalu','Total Efektif','Terpakai','Sisa',...(isAdmin?['Aksi']:[])];
  const th=document.getElementById('alokasi-thead');
  if(th) th.innerHTML='<tr>'+heads.map(h=>`<th>${h}</th>`).join('')+'</tr>';

  const pg=pageNums['alokasi']||1;
  const pages=Math.ceil(data.length/PER_PAGE)||1;
  const cur=Math.min(pg,pages);
  pageNums['alokasi']=cur;
  const slice=data.slice((cur-1)*PER_PAGE,cur*PER_PAGE);

  const tb=document.getElementById('alokasi-tbody');
  if(tb) tb.innerHTML=slice.length
    ? slice.map(a=>{
        const al  = getAlokasiTahun(a.id,yr);
        const co  = getCarryOver(a.id,yr);
        const tot = getTotalAlokasi(a.id,yr);
        const tp  = getTerpakaiTahun(a.id,yr);
        const ss  = getSisaTahun(a.id,yr);
        const pct = Math.min(100,Math.round(tp/tot*100));
        const col = ss<=3?'var(--red-tx)':ss<=7?'var(--amb-tx)':'var(--grn-tx)';
        const isAlOvr = DB.alokasi?.[a.id]?.[yr]?.alokasi!==undefined;
        const isCoOvr = DB.alokasi?.[a.id]?.[yr]?.carryover_override!==undefined && DB.alokasi?.[a.id]?.[yr]?.carryover_override!==null;
        const coLabel = isCoOvr
          ? `<span class="badge b-blue" style="font-size:9px">${co} hari (manual)</span>`
          : co>0
            ? `<span class="badge b-green" style="font-size:9px">${co} hari (otomatis)</span>`
            : CARRY_OVER_ENABLED
              ? `<span class="badge b-gray" style="font-size:9px">0</span>`
              : `<span style="font-size:10px;color:var(--tx3)">—</span>`;
        return `<tr>
          <td style="width:32px"><div class="emp-av" style="width:28px;height:28px;font-size:10px">${initials(a.nama)}</div></td>
          <td><div style="font-weight:600;font-size:12px">${a.nama}</div><div class="emp-av-nip">${a.nip}</div></td>
          <td style="font-size:11px">${shortUnit(a.unit)}</td>
          <td style="text-align:center">
            <span style="font-weight:700;font-size:13px">${al}</span>
            ${isAlOvr?'<span class="badge b-blue" style="font-size:8px;margin-left:3px;display:block;margin-top:2px">override</span>':'<span class="badge b-gray" style="font-size:8px;margin-left:3px;display:block;margin-top:2px">default</span>'}
          </td>
          <td style="text-align:center">${coLabel}</td>
          <td style="text-align:center">
            <span style="font-weight:700;font-size:13px;color:var(--primary)">${tot}</span>
            <div style="font-size:9px;color:var(--tx3)">${al}+${co}</div>
          </td>
          <td style="text-align:center;font-size:12px">${tp}</td>
          <td style="text-align:center">
            <span style="font-weight:700;color:${col};font-size:13px">${ss}</span>
            <div style="min-width:70px;margin-top:2px">
              <div class="leave-bar-track" style="height:5px"><div class="leave-bar-fill" style="width:${pct}%;background:${col}"></div></div>
              <div style="font-size:9px;color:var(--tx3)">${pct}%</div>
            </div>
          </td>
          ${isAdmin?`<td style="white-space:nowrap"><button class="btn btn-sm" onclick="openEditAlokasi('${a.id}',${yr})">Atur</button></td>`:''}
        </tr>`;
      }).join('')
    : `<tr><td colspan="${heads.length}" style="text-align:center;color:var(--tx3);padding:24px">Tidak ada data ASN</td></tr>`;

  const pgEl=document.getElementById('alokasi-pg');
  if(pgEl){
    let h=`<span class="pg-info">${data.length} ASN</span>`;
    if(cur>1) h+=`<button class="pg-btn" onclick="pageNums.alokasi=${cur-1};renderAlokasiTable()">‹</button>`;
    for(let i=Math.max(1,cur-2);i<=Math.min(pages,cur+2);i++) h+=`<button class="pg-btn${i===cur?' active':''}" onclick="pageNums.alokasi=${i};renderAlokasiTable()">${i}</button>`;
    if(cur<pages) h+=`<button class="pg-btn" onclick="pageNums.alokasi=${cur+1};renderAlokasiTable()">›</button>`;
    pgEl.innerHTML=h;
  }
}

function openEditAlokasi(asnId, yr){
  const asn=DB.asn.find(a=>a.id===asnId); if(!asn) return;
  const curAl    = getAlokasiTahun(asnId,yr);
  const tp       = getTerpakaiTahun(asnId,yr);
  const coAuto   = getCarryOver(asnId,yr);    // nilai otomatis saat ini
  const coOvr    = DB.alokasi?.[asnId]?.[yr]?.carryover_override;
  const coIsManual = coOvr!==undefined && coOvr!==null;
  const sisaLalu = getSisaMurni(asnId, yr-1);
  const tot      = getTotalAlokasi(asnId,yr);

  document.getElementById('modal-title').textContent=`Atur Alokasi Cuti — ${asn.nama}`;
  document.getElementById('modal-box').style.maxWidth='600px';
  document.getElementById('modal-body').innerHTML=`
    <!-- Identitas -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding:12px;background:var(--bg2);border-radius:9px">
      <div class="emp-av" style="width:40px;height:40px;font-size:14px;flex-shrink:0">${initials(asn.nama)}</div>
      <div>
        <div style="font-weight:700;font-size:13px">${asn.nama}</div>
        <div style="font-size:11px;color:var(--tx2)">${asn.nip} · ${asn.jabatan||'—'}</div>
        <div style="font-size:11px;color:var(--tx3)">${asn.unit}</div>
      </div>
      <div style="margin-left:auto;text-align:right">
        <div style="font-size:10px;color:var(--tx3);text-transform:uppercase">Total Efektif ${yr}</div>
        <div style="font-size:22px;font-weight:700;color:var(--primary)">${tot} <span style="font-size:12px;font-weight:400">hari</span></div>
        <div style="font-size:10px;color:var(--tx3)">${tp} terpakai · ${getSisaTahun(asnId,yr)} sisa</div>
      </div>
    </div>

    <!-- Alokasi tahun ini -->
    <div style="border:1px solid var(--bd);border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;color:var(--tx2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px">
        Alokasi Cuti Tahun ${yr}
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <input type="number" id="ovr-val" value="${curAl}" min="0" max="999"
          style="width:90px;font-size:20px;font-weight:700;text-align:center">
        <span style="font-size:12px;color:var(--tx2)">hari</span>
        <button class="btn btn-sm" onclick="document.getElementById('ovr-val').value=${DEF_ALOKASI}">
          Reset ke Default (${DEF_ALOKASI})
        </button>
      </div>
    </div>

    <!-- Carry over dari tahun lalu -->
    <div style="border:1px solid var(--bd);border-radius:10px;padding:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:11px;font-weight:700;color:var(--tx2);text-transform:uppercase;letter-spacing:.04em">
          Sisa Cuti Tahun ${yr-1} (Carry Over)
        </div>
        <span class="badge ${coIsManual?'b-blue':'b-green'}" style="font-size:9px">
          ${coIsManual?'Override Manual':'Otomatis'}
        </span>
      </div>

      <div style="display:flex;gap:12px;font-size:12px;margin-bottom:10px;flex-wrap:wrap">
        <div style="padding:8px 12px;background:var(--bg2);border-radius:7px;flex:1;min-width:100px">
          <div style="font-size:10px;color:var(--tx3);margin-bottom:2px">Sisa Murni ${yr-1}</div>
          <div style="font-weight:700;font-size:16px">${sisaLalu} <span style="font-size:11px;font-weight:400;color:var(--tx3)">hari</span></div>
        </div>
        <div style="padding:8px 12px;background:${CARRY_OVER_ENABLED?'var(--grn-bg)':'var(--bg2)'};border-radius:7px;flex:1;min-width:100px">
          <div style="font-size:10px;color:var(--tx3);margin-bottom:2px">Carry Over ke ${yr}</div>
          <div style="font-weight:700;font-size:16px;color:${CARRY_OVER_ENABLED?'var(--grn-tx)':'var(--tx3)'}">${coAuto} <span style="font-size:11px;font-weight:400">hari</span></div>
          <div style="font-size:9px;color:var(--tx3)">${CARRY_OVER_ENABLED?'(maks '+CARRY_OVER_MAX+' hari)':'Carry over nonaktif'}</div>
        </div>
      </div>

      <div style="margin-bottom:8px">
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:12px;margin-bottom:8px">
          <input type="checkbox" id="co-manual-chk" style="width:14px;height:14px;accent-color:var(--primary)"
            ${coIsManual?'checked':''} onchange="toggleCoManual()">
          Override manual — atur sisa carry over berbeda dari hitungan otomatis
        </label>
        <div id="co-manual-wrap" style="display:${coIsManual?'flex':'none'};align-items:center;gap:10px">
          <input type="number" id="co-ovr-val" value="${coIsManual?coOvr:coAuto}" min="0" max="999"
            style="width:80px;font-size:16px;font-weight:700;text-align:center">
          <span style="font-size:12px;color:var(--tx2)">hari carry over ke ${yr}</span>
          <button class="btn btn-sm" onclick="document.getElementById('co-ovr-val').value=${coAuto}">
            Pakai Otomatis (${coAuto})
          </button>
        </div>
        ${!coIsManual?`<div style="font-size:11px;color:var(--tx3)">Nilai otomatis: sisa murni tahun lalu (${sisaLalu} hari), dibatasi maks ${CARRY_OVER_MAX} hari → <strong>${coAuto} hari</strong></div>`:''}
      </div>
    </div>`;

  document.getElementById('modal-footer').innerHTML=`
    <button class="btn" onclick="closeModal()">Batal</button>
    <button class="btn btn-danger btn-sm" onclick="resetAlokasiPegawai('${asnId}',${yr})">Reset Semua ke Default</button>
    <button class="btn btn-primary" onclick="saveEditAlokasi('${asnId}',${yr})">Simpan</button>`;
  document.getElementById('modal').style.display='flex';
}

function toggleCoManual(){
  const chk=document.getElementById('co-manual-chk');
  const wrap=document.getElementById('co-manual-wrap');
  if(wrap) wrap.style.display=chk?.checked?'flex':'none';
}

async function saveEditAlokasi(asnId, yr){
  const v=parseInt(document.getElementById('ovr-val')?.value);
  if(isNaN(v)||v<0){ showToast('Masukkan jumlah hari valid','error'); return; }
  if(!DB.alokasi[asnId]) DB.alokasi[asnId]={};
  if(!DB.alokasi[asnId][yr]) DB.alokasi[asnId][yr]={};
  DB.alokasi[asnId][yr].alokasi=v;
  const coChk=document.getElementById('co-manual-chk');
  let coVal=null;
  if(coChk?.checked){
    const raw=parseInt(document.getElementById('co-ovr-val')?.value);
    coVal=isNaN(raw)||raw<0?0:raw;
    DB.alokasi[asnId][yr].carryover_override=coVal;
  } else { delete DB.alokasi[asnId][yr].carryover_override; }
  const {error}=await supa.from('alokasi_cuti').upsert(
    {asn_id:asnId, tahun:yr, alokasi:v, carryover_override:coVal},
    {onConflict:'asn_id,tahun'}
  );
  if(error){ showToast('Gagal: '+error.message,'error'); return; }
  closeModal(); renderAlokasiTable();
  const tot=getTotalAlokasi(asnId,yr); const co=getCarryOver(asnId,yr);
  showToast(`Alokasi disimpan — ${v}+${co} = ${tot} hari`,'success');
}

async function resetAlokasiPegawai(asnId, yr){
  if(DB.alokasi[asnId]){ delete DB.alokasi[asnId][yr]; if(!Object.keys(DB.alokasi[asnId]).length) delete DB.alokasi[asnId]; }
  await supa.from('alokasi_cuti').delete().eq('asn_id',asnId).eq('tahun',yr);
  closeModal(); renderAlokasiTable();
  showToast('Alokasi direset ke default','success');
}

function resetAlokasi(asnId, yr){ resetAlokasiPegawai(asnId, yr); }

// ── Export cuti ────────────────────────────────────────────────
function exportCutiExcel(){
  if(!_xlsxReady){ showToast('Library Excel belum siap','error'); return; }
  const yr=new Date().getFullYear();
  const data=DB.cuti.map(c=>({
    'No Surat':c.no_surat||'','Nama':c.nama,'NIP':c.nip,'Unit Kerja':c.unit,
    'Tgl Mulai':c.tgl_mulai,'Tgl Selesai':c.tgl_selesai,'Hari Kerja':c.hari_kerja,
    'Keperluan':c.keperluan||'','Alamat Cuti':c.alamat||'','Status':c.status,
    'Disetujui Kasubbag':c.step1_by||'','Tgl Kasubbag':c.step1_at?c.step1_at.slice(0,10):'',
    'Disetujui Kabid':c.step2_by||'','Tgl Kabid':c.step2_at?c.step2_at.slice(0,10):'',
    'Final Admin':c.final_by||'','Tgl Final':c.final_at?c.final_at.slice(0,10):'',
    'Alasan Tolak':c.step1_note||c.step2_note||'','Tahun':c.tahun,
  }));
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb,ws,'Pengajuan Cuti');
  XLSX.writeFile(wb,`Pengajuan_Cuti_BPKAD_${new Date().getFullYear()}.xlsx`);
  showToast('Export berhasil','success');
}

