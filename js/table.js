function noData(){ return '<div style="font-size:12px;color:var(--tx3);padding:8px 0">Tidak ada data</div>'; }

// ═══════════════════════════════════════════════════
// TABLE RENDERING
// ═══════════════════════════════════════════════════
const tblCfg = {
  asn:{
    heads:['','Nama / NIP','Gol','Pendidikan','Jabatan','J/K','Unit Kerja','TMT Pangkat','Aksi'],
    row:a=>`<td style="width:44px">
        <div class="emp-av" title="Klik untuk ganti foto" onclick="openPhotoModal('asn','${a.id}')"
          style="width:34px;height:34px;font-size:12px;cursor:pointer;position:relative;overflow:hidden;transition:opacity .2s"
          onmouseover="this.style.opacity='.75'" onmouseout="this.style.opacity='1'">
          ${a.foto?`<img src="${a.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.style.display='none'">`:initials(a.nama)}
        </div>
      </td>
      <td>
        <div class="emp-av-wrap" style="gap:0;flex-direction:column;align-items:flex-start">
          <a href="#" onclick="showDetail('asn','${a.id}')" style="color:var(--primary);text-decoration:none;font-weight:600;font-size:12px">${a.nama}</a>
          <span class="emp-av-nip">${a.nip}</span>
        </div>
      </td>
      <td><span class="badge ${golBadge(a.pangkat)}">${a.pangkat}</span></td>
      <td>${a.pendidikan}</td>
      <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px">${a.jabatan}</td>
      <td><span class="badge ${a.jk==='Laki-laki'?'b-blue':'b-amber'}">${a.jk==='Laki-laki'?'L':'P'}</span></td>
      <td style="font-size:11px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${a.unit}">${shortUnit(a.unit)}</td>
      <td>${fmt(a.tmt_pangkat)}</td>
      <td style="white-space:nowrap"><button class="btn btn-sm" onclick="openEditForm('asn','${a.id}')">Edit</button> <button class="btn btn-sm btn-danger" onclick="deleteRec('asn','${a.id}')">Hapus</button></td>`,
    filter:(a,f)=>(a.nama.toLowerCase().includes(f.q)||a.nip.includes(f.q))&&(!f.unit||a.unit===f.unit)&&(!f.sub||a.subunit===f.sub)
  },
  pppk:{
    heads:['','Nama / NIPPPK','Pendidikan','Jabatan','J/K','Unit Kerja','Sub Unit','Akhir Kontrak','Aksi'],
    row:p=>`<td style="width:44px">
        <div class="emp-av" title="Klik untuk ganti foto" onclick="openPhotoModal('pppk','${p.id}')"
          style="width:34px;height:34px;font-size:12px;background:#ecfdf5;color:#065f46;cursor:pointer;overflow:hidden;transition:opacity .2s"
          onmouseover="this.style.opacity='.75'" onmouseout="this.style.opacity='1'">
          ${p.foto?`<img src="${p.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.style.display='none'">`:initials(p.nama)}
        </div>
      </td>
      <td>
        <div style="display:flex;flex-direction:column">
          <a href="#" onclick="showDetail('pppk','${p.id}')" style="color:var(--primary);text-decoration:none;font-weight:600;font-size:12px">${p.nama}</a>
          <span class="emp-av-nip">${p.nipppk}</span>
        </div>
      </td>
      <td>${p.pendidikan}</td><td style="font-size:11px">${p.jabatan}</td>
      <td><span class="badge ${p.jk==='Laki-laki'?'b-blue':'b-amber'}">${p.jk==='Laki-laki'?'L':'P'}</span></td>
      <td style="font-size:11px">${shortUnit(p.unit)}</td><td style="font-size:11px">${shortUnit(p.subunit)}</td>
      <td><span class="badge ${kontrakBadge(p.akhir_kontrak)}">${fmt(p.akhir_kontrak)}</span></td>
      <td style="white-space:nowrap"><button class="btn btn-sm" onclick="openEditForm('pppk','${p.id}')">Edit</button> <button class="btn btn-sm btn-danger" onclick="deleteRec('pppk','${p.id}')">Hapus</button></td>`,
    filter:(p,f)=>(p.nama.toLowerCase().includes(f.q)||p.nipppk.includes(f.q))&&(!f.unit||p.unit===f.unit)&&(!f.sub||p.subunit===f.sub)
  },
  pjlp:{
    heads:['','Nama / No.Pesanan','Pendidikan','Jenis Pekerjaan','Jabatan','J/K','Unit Kerja','Akhir Kontrak','Aksi'],
    row:j=>`<td style="width:44px">
        <div class="emp-av" title="Klik untuk ganti foto" onclick="openPhotoModal('pjlp','${j.id}')"
          style="width:34px;height:34px;font-size:12px;background:#fffbeb;color:#92400e;cursor:pointer;overflow:hidden;transition:opacity .2s"
          onmouseover="this.style.opacity='.75'" onmouseout="this.style.opacity='1'">
          ${j.foto?`<img src="${j.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.style.display='none'">`:initials(j.nama)}
        </div>
      </td>
      <td>
        <div style="display:flex;flex-direction:column">
          <a href="#" onclick="showDetail('pjlp','${j.id}')" style="color:var(--primary);text-decoration:none;font-weight:600;font-size:12px">${j.nama}</a>
          <span class="emp-av-nip">${j.no_pesanan}</span>
        </div>
      </td>
      <td>${j.pendidikan}</td><td style="font-size:11px">${j.jenis_pekerjaan}</td>
      <td style="font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${j.jabatan||'—'}</td>
      <td><span class="badge ${j.jk==='Laki-laki'?'b-blue':'b-amber'}">${j.jk==='Laki-laki'?'L':j.jk==='Perempuan'?'P':'—'}</span></td>
      <td style="font-size:11px">${shortUnit(j.unit)}</td>
      <td><span class="badge ${kontrakBadge(j.akhir_kontrak)}">${fmt(j.akhir_kontrak)}</span></td>
      <td style="white-space:nowrap"><button class="btn btn-sm" onclick="openEditForm('pjlp','${j.id}')">Edit</button> <button class="btn btn-sm btn-danger" onclick="deleteRec('pjlp','${j.id}')">Hapus</button></td>`,
    filter:(j,f)=>(j.nama.toLowerCase().includes(f.q)||j.no_pesanan.toLowerCase().includes(f.q))&&(!f.unit||j.unit===f.unit)&&(!f.sub||j.subunit===f.sub)
  }
};

function renderTable(type, filters={}){
  const cfg=tblCfg[type]; if(!cfg) return;
  const all=DB[type]||[];
  const filtered=all.filter(r=>cfg.filter(r,filters));
  const cEl=document.getElementById(type+'-count');
  if(cEl){ const cfg2=pageConfigs[type]; cEl.textContent=`${cfg2?cfg2.title:type} (${filtered.length} data)`; }
  const th=document.getElementById(type+'-thead');
  if(th) th.innerHTML='<tr>'+cfg.heads.map(h=>`<th>${h}</th>`).join('')+'</tr>';
  const pg=Math.min(pageNums[type]||1, Math.ceil(filtered.length/PER_PAGE)||1);
  pageNums[type]=pg;
  const slice=filtered.slice((pg-1)*PER_PAGE,pg*PER_PAGE);
  const tb=document.getElementById(type+'-tbody');
  if(tb) tb.innerHTML=slice.length?slice.map(r=>`<tr>${cfg.row(r)}</tr>`).join(''):`<tr><td colspan="${cfg.heads.length}" style="text-align:center;color:var(--tx3);padding:20px">Tidak ada data</td></tr>`;
  renderPg(type, filtered.length, filters);
}

function renderPg(type, total, filters){
  const el=document.getElementById(type+'-pg'); if(!el) return;
  const pg=pageNums[type]||1;
  const pages=Math.ceil(total/PER_PAGE)||1;
  let h=`<span class="pg-info">${total} data</span>`;
  if(pg>1) h+=`<button class="pg-btn" onclick="goPage('${type}',${pg-1})">‹</button>`;
  for(let i=Math.max(1,pg-2);i<=Math.min(pages,pg+2);i++) h+=`<button class="pg-btn${i===pg?' active':''}" onclick="goPage('${type}',${i})">${i}</button>`;
  if(pg<pages) h+=`<button class="pg-btn" onclick="goPage('${type}',${pg+1})">›</button>`;
  el.innerHTML=h;
}
function goPage(type,pg){ pageNums[type]=pg; refreshTable(type); }

// ═══════════════════════════════════════════════════
// KP TABLE
// ═══════════════════════════════════════════════════
function renderKP(filters={}){
  const q=(filters.q||'').toLowerCase();
  const unit=filters.unit||'';
  const status=filters.status||'';
  const heads=['NIP','Nama ASN','Gol Saat Ini','Gol Berikutnya','TMT Terakhir','Tgl Jatuh Tempo','Status','Keterangan'];
  const th=document.getElementById('kp-thead');
  if(th) th.innerHTML='<tr>'+heads.map(h=>`<th>${h}</th>`).join('')+'</tr>';
  const data=DB.asn
    .filter(a=>(!q||(a.nama.toLowerCase().includes(q)||a.nip.includes(q)))&&(!unit||a.unit===unit))
    .filter(a=>{ if(!status) return true; const k=calcKP(a); return k.status===status; });
  const pg=Math.min(pageNums['kp']||1,Math.ceil(data.length/PER_PAGE)||1);
  pageNums['kp']=pg;
  const slice=data.slice((pg-1)*PER_PAGE,pg*PER_PAGE);
  const tb=document.getElementById('kp-tbody');
  if(tb) tb.innerHTML=slice.map(a=>{
    const k=calcKP(a);
    return `<tr>
      <td class="td-mono">${a.nip}</td>
      <td style="font-weight:600"><a href="#" onclick="showDetail('asn','${a.id}')" style="color:var(--primary);text-decoration:none">${a.nama}</a></td>
      <td><span class="badge ${golBadge(a.pangkat)}">${a.pangkat}</span></td>
      <td><span class="badge b-green">${k.nextPangkat}</span></td>
      <td>${fmt(a.tmt_pangkat)}</td>
      <td>${fmtDate(k.dueDate)}</td>
      <td><span class="badge ${kpStatusBadge(k.status)}">${k.status}</span></td>
      <td style="font-size:11px;color:var(--tx2);max-width:200px">${k.keterangan}</td>
    </tr>`;
  }).join('')||`<tr><td colspan="${heads.length}" style="text-align:center;color:var(--tx3);padding:20px">Tidak ada data ASN</td></tr>`;
  renderPg2('kp',data.length,filters);
}
function renderPg2(type,total,filters){
  const el=document.getElementById(type+'-pg');if(!el)return;
  const pg=pageNums[type]||1;const pages=Math.ceil(total/PER_PAGE)||1;
  let h=`<span class="pg-info">${total} data</span>`;
  if(pg>1)h+=`<button class="pg-btn" onclick="goPageKP('${type}',${pg-1})">‹</button>`;
  for(let i=Math.max(1,pg-2);i<=Math.min(pages,pg+2);i++)h+=`<button class="pg-btn${i===pg?' active':''}" onclick="goPageKP('${type}',${i})">${i}</button>`;
  if(pg<pages)h+=`<button class="pg-btn" onclick="goPageKP('${type}',${pg+1})">›</button>`;
  el.innerHTML=h;
}
function goPageKP(type,pg){ pageNums[type]=pg; if(type==='kp')renderKP(getFilters('kp')); else if(type==='kgb')renderKGB(getFilters('kgb')); else if(type==='pensiun')renderPensiun(getFilters('pensiun')); }
function refreshTable2(type){ pageNums[type]=1; if(type==='kp')renderKP(getFilters('kp')); else renderKGB(getFilters('kgb')); }

// ═══════════════════════════════════════════════════
// KGB TABLE
// ═══════════════════════════════════════════════════
function renderKGB(filters={}){
  const q=(filters.q||'').toLowerCase();
  const unit=filters.unit||'';
  const status=filters.status||'';
  const heads=['NIP','Nama ASN','Unit Kerja','Gol','TMT KGB','Gaji Saat Ini','Tgl KGB Berikut','Status','Keterangan'];
  const th=document.getElementById('kgb-thead');
  if(th) th.innerHTML='<tr>'+heads.map(h=>`<th>${h}</th>`).join('')+'</tr>';
  const data=DB.asn
    .filter(a=>(!q||(a.nama.toLowerCase().includes(q)||a.nip.includes(q)))&&(!unit||a.unit===unit))
    .filter(a=>{ if(!status) return true; const k=calcKGB(a); return k.status===status; });
  const pg=Math.min(pageNums['kgb']||1,Math.ceil(data.length/PER_PAGE)||1);
  pageNums['kgb']=pg;
  const slice=data.slice((pg-1)*PER_PAGE,pg*PER_PAGE);
  const tb=document.getElementById('kgb-tbody');
  if(tb) tb.innerHTML=slice.map(a=>{
    const k=calcKGB(a);
    return `<tr>
      <td class="td-mono">${a.nip}</td>
      <td style="font-weight:600"><a href="#" onclick="showDetail('asn','${a.id}')" style="color:var(--primary);text-decoration:none">${a.nama}</a></td>
      <td style="font-size:11px">${shortUnit(a.unit)}</td>
      <td><span class="badge ${golBadge(a.pangkat)}">${a.pangkat}</span></td>
      <td>${fmt(a.tmt_kgb)}</td>
      <td>Rp ${num(k.gajiSkrg)}</td>
      <td>${fmtDate(k.due)}</td>
      <td><span class="badge ${kgbBadge(k.status)}">${k.status}</span></td>
      <td style="font-size:11px;color:var(--tx2)">KGB berikutnya ${fmtDate(k.due)}${k.daysToKGB>0?' ('+k.daysToKGB+' hari lagi)':' (Lewat jatuh tempo)'}</td>
    </tr>`;
  }).join('')||`<tr><td colspan="${heads.length}" style="text-align:center;color:var(--tx3);padding:20px">Tidak ada data ASN</td></tr>`;
  renderPg2('kgb',data.length,filters);
}

// ═══════════════════════════════════════════════════
// PENSIUN TABLE
// ═══════════════════════════════════════════════════
function renderPensiun(filters={}){
  const q      = (filters.q||'').toLowerCase();
  const unit   = filters.unit||'';
  const status = filters.status||'';

  const heads = ['NIP','Nama ASN','Unit Kerja','Tgl Lahir','Usia (th)','Batas Usia','Tgl Pensiun','Sisa','Status','Keterangan'];
  const th = document.getElementById('pensiun-thead');
  if(th) th.innerHTML = '<tr>'+heads.map(h=>`<th>${h}</th>`).join('')+'</tr>';

  const data = DB.asn
    .filter(a => (!q||(a.nama.toLowerCase().includes(q)||a.nip.includes(q))) && (!unit||a.unit===unit))
    .filter(a => { if(!status) return true; return calcPensiun(a).status===status; })
    .sort((a,b)=>{
      const pa=calcPensiun(a), pb=calcPensiun(b);
      // Urutkan: Sudah Pensiun dulu, lalu Segera, lalu Aktif; dalam grup sort by sisaHari
      const rank={'Sudah Pensiun':0,'Segera Pensiun':1,'Aktif':2,'Data Tidak Valid':3};
      const ra=rank[pa.status]??3, rb=rank[pb.status]??3;
      if(ra!==rb) return ra-rb;
      return (pa.sisaHari??9999)-(pb.sisaHari??9999);
    });

  const pg    = Math.min(pageNums['pensiun']||1, Math.ceil(data.length/PER_PAGE)||1);
  pageNums['pensiun'] = pg;
  const slice = data.slice((pg-1)*PER_PAGE, pg*PER_PAGE);

  const tb = document.getElementById('pensiun-tbody');
  if(!tb) return;

  if(!slice.length){
    tb.innerHTML = `<tr><td colspan="${heads.length}" style="text-align:center;color:var(--tx3);padding:20px">Tidak ada data ASN</td></tr>`;
    renderPg2('pensiun', 0, filters);
    return;
  }

  tb.innerHTML = slice.map(a => {
    const p = calcPensiun(a);
    const sisaLabel = !p.valid ? '—'
      : p.sisaHari < 0 ? `<span style="color:var(--red-tx)">Lewat ${Math.abs(p.sisaHari)} hari</span>`
      : p.sisaHari <= 180 ? `<span style="color:#d97706;font-weight:700">${p.sisaHari} hari</span>`
      : `${p.sisaBulan} bln`;
    return `<tr>
      <td class="td-mono">${a.nip}</td>
      <td style="font-weight:600"><a href="#" onclick="showDetail('asn','${a.id}')" style="color:var(--primary);text-decoration:none">${a.nama}</a></td>
      <td style="font-size:11px">${shortUnit(a.unit)}</td>
      <td>${p.tglLahir ? fmtDate(p.tglLahir) : '—'}</td>
      <td style="text-align:center">${p.usia??'—'}</td>
      <td style="text-align:center">${p.batasUsia} th</td>
      <td>${p.tglPensiun ? fmtDate(p.tglPensiun) : '—'}</td>
      <td style="text-align:center">${sisaLabel}</td>
      <td><span class="badge ${pensiunBadge(p.status)}">${p.status}</span></td>
      <td style="font-size:11px;color:var(--tx2);max-width:200px">${p.keterangan}</td>
    </tr>`;
  }).join('');

  renderPg2('pensiun', data.length, filters);
}
